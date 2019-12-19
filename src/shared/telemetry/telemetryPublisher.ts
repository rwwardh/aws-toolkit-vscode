/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TelemetryEvent } from './telemetryEvent'
import { Datum } from './telemetryTypes'

export interface TelemetryPublisher {
    init(): Promise<void>

    enqueue(...events: TelemetryEvent[]): any
    newenqueue(...events: Datum[]): any
    flush(): Promise<any>
}
