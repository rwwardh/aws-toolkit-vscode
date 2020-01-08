/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ext } from '../src/shared/extensionGlobals'
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
export type result = 'succeeded' | 'failed' | 'cancelled'
interface LambdaDelete {
    // The duration of the operation in miliseconds
    duration: number
    // The result of the operation
    result: result
    // The time that the event took place,
    createTime?: Date
    // Value based on unit and call type,
    value?: number
}
/**
 * called when deleting lambdas remotely
 * @param args See the LambdaDelete interface
 * @returns Nothing
 */
export function recordLambdaDelete(args: LambdaDelete) {
    ext.telemetry.record({
        createTime: args?.createTime ?? new Date(),
        data: [
            {
                name: 'lambda_delete',
                value: args?.value ?? 1,
                unit: 'None',
                metadata: new Map<string, string>([
                    ['duration', args.duration?.toString() ?? ''],
                    ['result', args.result?.toString() ?? '']
                ])
            }
        ]
    })
}
interface LambdaCreate {
    // What lambda runtime was used in the operation
    lambdaruntime: lambdaruntime
    // The time that the event took place,
    createTime?: Date
    // Value based on unit and call type,
    value?: number
}
/**
 * called when creating lambdas remotely
 * @param args See the LambdaCreate interface
 * @returns Nothing
 */
export function recordLambdaCreate(args: LambdaCreate) {
    ext.telemetry.record({
        createTime: args?.createTime ?? new Date(),
        data: [
            {
                name: 'lambda_create',
                value: args?.value ?? 1,
                unit: 'None',
                metadata: new Map<string, string>([['lambdaruntime', args.lambdaruntime?.toString() ?? '']])
            }
        ]
    })
}
export function millisecondsSince(d: Date): number {
    return Date.now() - Number(d)
}
