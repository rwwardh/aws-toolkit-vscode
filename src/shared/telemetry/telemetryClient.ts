/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TelemetryEvent } from './telemetryEvent'
import { Datum } from './telemetryTypes'

export interface TelemetryClient {
    newPostMetrics(payload: Datum[]): Promise<Datum[] | undefined>
    postMetrics(payload: TelemetryEvent[]): Promise<TelemetryEvent[] | undefined>
}
