/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync } from 'fs-extra'
import * as jsonParser from 'jsonc-parser'

/*
function isSorted(m: string[]): Boolean {
    for (let iterator = 0; iterator < m.length - 1; iterator++) {
        if (!m[iterator].localeCompare(m[iterator + 1])) {
            console.log(`${m[iterator + 1]} and ${m[iterator]} are not in order`)

            return false
        }
    }

    return true
}

type Unit = 'none' | 'count'
type MetadataType = 'string' | 'number'

interface Metadata {
    name: string,
    metadataType: MetadataType
    optional: boolean
    allowedValues: any[]
}

interface Metric {
    name: string,
    unit: Unit,
    metadata: Metadata[]
}*/

type MetricType = 'none' | 'count'

interface TypeDefinition {
    name: string
    type: string
    allowedValues: string[]
    required: boolean
}

type MetricMetadataType = TypeDefinition | string

interface Metric {
    name: string
    type: MetricType
    metadata: MetricMetadataType[]
}

interface MetricDefinitionRoot {
    metadataTypes: TypeDefinition[]
    metrics: Metric[]
}

const file = readFileSync('build-scripts/telemetrydefinitions.json', 'utf8')
const errors: jsonParser.ParseError[] = []
const telemetryJson = jsonParser.parse(file, errors) as MetricDefinitionRoot

//const allowedMetadataTypes = telemetryJson.metadataTypes
console.log(telemetryJson.metadataTypes)
console.log(telemetryJson.metrics)

telemetryJson.metadataTypes.forEach(item => console.log(item.name))

/*
const allMetadata = file.slice(0, file.findIndex((item: string) => item.trim() === 'metrics:')).filter((item: string) => item.trim() !== '')
const allMetrics = file.slice(file.findIndex((item: string) => item.trim() === 'metrics:') + 1).filter((item: string) => item.trim() !== '')

if (!isSorted(allMetrics)) {
    console.log('telemetry definitions are not in alphabetical order!')
    throw undefined
}

const metadata: Metadata[] = allMetadata.map((mtype) => {
    const parts = mtype.split(',').map((x: string) => x.trim())

    return {
        name: parts[0],
        metadataType: parts[1] as MetadataType,
        optional: false,
        allowedValues: parts.slice(3) as any[]
    }
})

const metrics: Metric[] = allMetrics.map((metric) => {
    const parts = metric.split(',').map((x: string) => x.trim())

    return {
        name: parts[0],
        unit: parts[1] as Unit,
        metadata: metadata
    }
})

let output =
`
import { ext } from '../../shared/extensionGlobals'

enum TelemetryType {
`
metrics.forEach((metric: Metric) => {
    output += `    ${metric.name.toUpperCase()} = "${metric.name}"\n`
})

output += '}\n\n'

metrics.forEach((metric) => {
    output +=
`function record${metric.name.split('_').map(item => item.replace(item[0], item[0].toUpperCase())).join('')}(${metric.metadata.map(metric => metric.name).join(', ')})}){
    ext.record(
            {
                name: TelemetryType.${metric.name.toUpperCase()},
                value: 0,
                unit: ${metric.unit},
                metadata: [{${metric.metadata.map((metric) => `${metric.name}: ${metric.name}` )}}]
            }
    ),
}\n\n`
})

console.log(output)
*/
