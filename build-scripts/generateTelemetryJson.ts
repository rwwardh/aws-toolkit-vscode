/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync, writeFileSync } from 'fs-extra'
import * as jsonParser from 'jsonc-parser'

type AllowedTypes = 'string' | 'int' | 'enum'
type MetricType = 'none' | 'count'

interface MetadataType {
    name: string
    type?: AllowedTypes
    allowedValues?: string[]
    required: boolean
}

type MetricMetadataType = MetadataType | string

interface Metric {
    name: string
    unit: MetricType
    metadata: MetricMetadataType[]
}

function metricToTypeName(m: Metric): string {
    return m.name
        .split('_')
        .map(item => item.replace(item[0], item[0].toUpperCase()))
        .join('')
}

interface MetricDefinitionRoot {
    metadataTypes: MetadataType[]
    metrics: Metric[]
}

function globalArgs(): string[] {
    return ['createTime?: Date', 'value?: number']
}

function getArgsFromMetadata(m: MetadataType): string {
    let t = m.name
    if ((m?.allowedValues?.length ?? 0) === 0) {
        switch (m.type) {
            case undefined: {
                t = 'string'
                break
            }
            case 'string': {
                t = 'string'
                break
            }
            case 'int': {
                t = 'number'
                break
            }
            default: {
                console.log(`unkown type ${m?.type} in metadata ${m.name}`)
                throw undefined
            }
        }
    }

    return `${m.name}${m.required ? '' : '?'}: ${t}`
}

function generateArgs(metadata: MetadataType[]): string[] {
    const args = metadata.map(getArgsFromMetadata)
    args.push(...globalArgs())

    return args
}

//////////
//// begin
//////////

const file = readFileSync('build-scripts/telemetrydefinitions.jsonc', 'utf8')
const errors: jsonParser.ParseError[] = []
const telemetryJson = jsonParser.parse(file, errors) as MetricDefinitionRoot

if(errors.length > 0) {
    console.error(`Errors while trying to parse the definitions file ${errors.join('\n')}`)
    throw undefined
}

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
    if (metadata?.type === 'enum') {
        output += `export enum ${metadata.name.replace('.', '')} { ${metadata!.allowedValues!.map(
            (item: string) => `${item.replace('.', '')} = '${item}'`
        )}}`
    } else {
        const values = metadata!.allowedValues!.map((item: string) => `'${item}'`).join(' | ')

        output += `export type ${metadata.name} = ${values}\n`
    }
})

metrics.forEach((metric: Metric) => {
    const metadata = metric.metadata.map(item => {
        if (typeof item === 'string') {
            const s = item as string
            if (!s.startsWith('$')) {
                console.log('You have to preface your references with the sigil "$"')
                throw undefined
            }
            const foundMetadata: MetadataType | undefined = globalMetadata.find(
                (candidate: MetadataType) => candidate.name === s.substring(1)
            )
            if (!foundMetadata) {
                console.log(`Metric ${metric.name} references metadata ${s.substring(1)} that is not found!`)
                throw undefined
            }

            return foundMetadata
        } else {
            return item
        }
    })

    const name = metricToTypeName(metric)
    const args = generateArgs(metadata)

    output += `interface ${name} {
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

console.log('Done generating, formatting!')
