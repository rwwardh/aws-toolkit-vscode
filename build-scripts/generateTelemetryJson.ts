/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync, writeFileSync } from 'fs-extra'
import * as jsonParser from 'jsonc-parser'

type AllowedTypes = 'string' | 'int' | 'boolean'
type MetricType = 'none' | 'count'

interface MetadataType {
    name: string
    type?: AllowedTypes
    allowedValues?: string[]
    required: boolean
    description: string
}

interface Metric {
    name: string
    description: string
    unit: MetricType
    metadata: string[]
}

function metricToTypeName(m: Metric): string {
    return m.name
        .split('_')
        .map(item => item.replace(item[0], item[0].toUpperCase()))
        .join('')
}

interface MetricDefinitionRoot {
    metadata: MetadataType[]
    metrics: Metric[]
}

function globalArgs(): string[] {
    return [
        '// The time that the event took place',
        'createTime?: Date',
        '// Value based on unit and call type',
        'value?: number'
    ]
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
            case 'boolean': {
                t = 'boolean'
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

function parseInput(s: string): MetricDefinitionRoot {
    const file = readFileSync(s, 'utf8')
    const errors: jsonParser.ParseError[] = []
    const telemetryJson = jsonParser.parse(file, errors) as MetricDefinitionRoot

    if (errors.length > 0) {
        console.error(`Errors while trying to parse the definitions file ${errors.join('\n')}`)
        throw undefined
    }

    return telemetryJson
}

//////////
//// begin
//////////

const telemetryJson = parseInput('build-scripts/telemetrydefinitions.json')

const metadatum = telemetryJson.metadata
const metrics = telemetryJson.metrics

let output = `
/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ext } from '../src/shared/extensionGlobals'
`

metadatum.forEach((m: MetadataType) => {
    if ((m?.allowedValues?.length ?? 0) === 0) {
        return
    }
    const values = m!.allowedValues!.map((item: string) => `'${item}'`).join(' | ')

    output += `export type ${m.name} = ${values}\n`
})

metrics.forEach((metric: Metric) => {
    const metadata: MetadataType[] = metric.metadata.map(item => {
        if (!item.startsWith('$')) {
            console.log('You have to preface your references with the sigil "$"')
            throw undefined
        }
        const foundMetadata: MetadataType | undefined = metadatum.find(
            (candidate: MetadataType) => candidate.name === item.substring(1)
        )
        if (!foundMetadata) {
            console.log(`Metric ${metric.name} references metadata ${item.substring(1)} that is not found!`)
            throw undefined
        }

        return foundMetadata
    })

    const name = metricToTypeName(metric)
    output += `interface ${name} {
    ${metadata.map(item => `\n// ${item.description}\n${getArgsFromMetadata(item)}`).join(',')}
    ${globalArgs().join(',\n')}
}`

    output += `\n/**
      * ${metric.description}
      * @param args See the ${name} interface
      * @returns Nothing
      */\n`

    output += `export function record${name}(args${metadata.every(item => !item.required) ? '?' : ''}: ${name}) {
    ext.telemetry.record({
            createTime: args?.createTime ?? new Date(),
            data: [{
                name: '${metric.name}',
                value: args?.value ?? 1,
                unit: '${metric.unit}',
                metadata: new Map<string, string>([${metadata.map(
                    (item: MetadataType) => `['${item.name}', args.${item.name}?.toString() ?? '']`
                )}])
            }]
        })
}`
})

output += `
export function millisecondsSince(d: Date): number {
    return Date.now() - Number(d)
}
`

writeFileSync('build-scripts/telemetry.generated.ts', output)

console.log('Done generating, formatting!')
