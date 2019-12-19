/*!
 * Copyright 2018-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AwsContext } from '../awsContext'
import { TelemetryEvent } from './telemetryEvent'
import { Datum } from './telemetryTypes'

export interface TelemetryService {
    telemetryEnabled: boolean
    persistFilePath: string

    start(): Promise<void>
    shutdown(): Promise<void>
    record(event: TelemetryEvent, awsContext?: AwsContext): void
    newrecord(event: Datum): void
    clearRecords(): void
    notifyOptOutOptionMade(): void
}
