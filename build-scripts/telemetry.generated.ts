/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ext } from '../src/shared/extensionGlobals'

enum TelemetryType {
    LAMBDA_DELETE = 'lambda_delete',
    LAMBDA_CREATE = 'lambda_create'
}
export type lambdaruntime =
    | 'dotnetcore2.1'
    | 'nodejs12.x'
    | 'nodejs10.x'
    | 'nodejs8.10'
    | 'ruby2.5'
    | 'java8'
    | 'java11'
    | 'go1.x'
    | 'python3.8'
    | 'python3.7'
    | 'python3.6'
    | 'python2.7'
export enum result {
    succeeded = 'succeeded',
    failed = 'failed',
    cancelled = 'cancelled'
}
interface LambdaDelete {
    value?: number
    duration: number
    result: result
    createTime?: Date
}
export function recordLambdaDelete(args: LambdaDelete) {
    ext.telemetry.record({
        createTime: args?.createTime ?? new Date(),
        data: [
            {
                name: TelemetryType.LAMBDA_DELETE,
                value: args?.value ?? 1,
                unit: 'none',
                metadata: new Map<string, string>([
                    ['duration', args.duration?.toString() ?? ''],
                    ['result', args.result?.toString() ?? '']
                ])
            }
        ]
    })
}
interface LambdaCreate {
    value?: number
    lambdaruntime: lambdaruntime
    createTime?: Date
}
export function recordLambdaCreate(args: LambdaCreate) {
    ext.telemetry.record({
        createTime: args?.createTime ?? new Date(),
        data: [
            {
                name: TelemetryType.LAMBDA_CREATE,
                value: args?.value ?? 1,
                unit: 'none',
                metadata: new Map<string, string>([['lambdaruntime', args.lambdaruntime?.toString() ?? '']])
            }
        ]
    })
}
