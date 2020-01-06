/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync, writeFileSync } from 'fs-extra'
import * as jsonParser from 'jsonc-parser'

type MetricType = 'none' | 'count'

interface MetadataType {
    name: string
    alias?: string
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

const file = readFileSync('build-scripts/telemetrydefinitions.json', 'utf8')
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
    output += `    ${metric.name.toUpperCase()} = '${metric.name}'\n`
})

output += '}\n\n'

globalMetadata.forEach((metadata: MetadataType) => {
    if ((metadata?.allowedValues?.length ?? 0) === 0) {
        return
    }
    const values = metadata!.allowedValues!.map((item: string) => `'${item}'`).join(' | ')

    output += `type ${metadata.alias ?? metadata.name} = ${values}`

    output += '\n'
})

output += '\n'

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

    const args = metadata
        .map((m: MetadataType) => {
            let t = m.name
            if ((m?.allowedValues?.length ?? 0) === 0) {
                t = 'string'
            }

            return `${m.name}${m.required ? '' : '?'}: ${t},`
        })
        .join('\n    ')

    output += `interface ${name} {
    value?: number
    ${args}
}\n\n`
    output += `export function record${name}(args: ${name}) {
    ext.telemetry.newrecord(
            {
                name: TelemetryType.${metric.name.toUpperCase()},
                value: args.value ?? 1,
                unit: '${metric.unit}',
                metadata: new Map<string, string>([\n                    ${metadata
                    .map((m: MetadataType) => `['${m.name}', args.${m.name}?.toString() ?? '']`)
                    .join(',\n                    ')}\n                ])
            }
    )
}\n`
})

writeFileSync('build-scripts/telemetry.generated.ts', output)
console.log(output)
