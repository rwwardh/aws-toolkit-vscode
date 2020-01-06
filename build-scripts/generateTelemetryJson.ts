/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync, writeFileSync } from 'fs-extra'
import * as jsonParser from 'jsonc-parser'

type MetricType = 'none' | 'count'

interface MetadataType {
    name: string
    allowedValues?: string[]
    required: boolean
}

type MetricMetadataType = MetadataType | string

interface Metric {
    name: string
    unit: MetricType
    metadata: MetricMetadataType[]
}

interface MetricDefinitionRoot {
    metadataTypes: MetadataType[]
    metrics: Metric[]
}

const file = readFileSync('build-scripts/telemetrydefinitions.jsonc', 'utf8')
const errors: jsonParser.ParseError[] = []
const telemetryJson = jsonParser.parse(file, errors) as MetricDefinitionRoot
const globalMetadata = telemetryJson.metadataTypes
const metrics = telemetryJson.metrics

let output = `
/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ext } from '../src/shared/extensionGlobals'

enum TelemetryType {
`
metrics.forEach((metric: Metric) => {
    output += `    ${metric.name.toUpperCase()} = '${metric.name}',\n`
})

output += '}'

globalMetadata.forEach((metadata: MetadataType) => {
    if ((metadata?.allowedValues?.length ?? 0) === 0) {
        return
    }
    const values = metadata!.allowedValues!.map((item: string) => `'${item}'`).join(' | ')

    output += `type ${metadata.name} = ${values}\n`
})

metrics.forEach(metric => {
    const metadata = metric.metadata.map(item => {
        if (typeof item === 'string') {
            const s = item as string
            if (!s.startsWith('$')) {
                console.log('you messed up son, you have to preface your references with the sigil "$"')
                throw undefined
            }
            const foundMetadata = globalMetadata.find((candidate: MetadataType) => candidate.name === s.substring(1))
            if (!foundMetadata) {
                console.log('Come on you can not reference things that do not exist')
                throw undefined
            }

            return foundMetadata
        } else {
            return item
        }
    })

    const name = metric.name
        .split('_')
        .map(item => item.replace(item[0], item[0].toUpperCase()))
        .join('')

    const args = metadata.map((m: MetadataType) => {
        let t = m.name
        if ((m?.allowedValues?.length ?? 0) === 0) {
            t = 'string'
        }

        return `${m.name}${m.required ? '' : '?'}: ${t}`
    })
    args.push(...globalArgs())

    output += `interface ${name} {
    value?: number
    ${args.join(',')}
}`
    output += `export function record${name}(args${metadata.every(item => !item.required) ? '?' : ''}: ${name}) {
    ext.telemetry.record({
            createTime: args?.createTime ?? new Date(),
            data: [{
                name: TelemetryType.${metric.name.toUpperCase()},
                value: args?.value ?? 1,
                unit: '${metric.unit}',
                metadata: new Map<string, string>([\n                    ${metadata.map(
                    (m: MetadataType) => `['${m.name}', args.${m.name}?.toString() ?? '']`
                )}])
            }]
        })
}`
})

writeFileSync('build-scripts/telemetry.generated.ts', output)
console.log(output)

///////////////////
function globalArgs(): string[] {
    return ['createTime?: Date']
}
