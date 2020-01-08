/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ext } from '../extensionGlobals'
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
export type zerooneortwo = 0 | 1 | 2
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
                MetricName: 'lambda_delete',
                Value: args?.value ?? 1,
                Unit: 'None',
                Metadata: [
                    { Key: 'duration', Value: args.duration?.toString() ?? '' },
                    { Key: 'result', Value: args.result?.toString() ?? '' }
                ]
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
                MetricName: 'lambda_create',
                Value: args?.value ?? 1,
                Unit: 'None',
                Metadata: [{ Key: 'lambdaruntime', Value: args.lambdaruntime?.toString() ?? '' }]
            }
        ]
    })
}
interface LambdaRemoteinvoke {
    // What lambda runtime was used in the operation
    lambdaruntime?: lambdaruntime
    // The result of the operation
    result: result
    // The time that the event took place,
    createTime?: Date
    // Value based on unit and call type,
    value?: number
}
/**
 * called when invoking lambdas remotely
 * @param args See the LambdaRemoteinvoke interface
 * @returns Nothing
 */
export function recordLambdaRemoteinvoke(args: LambdaRemoteinvoke) {
    ext.telemetry.record({
        createTime: args?.createTime ?? new Date(),
        data: [
            {
                MetricName: 'lambda_remoteinvoke',
                Value: args?.value ?? 1,
                Unit: 'None',
                Metadata: [
                    { Key: 'lambdaruntime', Value: args.lambdaruntime?.toString() ?? '' },
                    { Key: 'result', Value: args.result?.toString() ?? '' }
                ]
            }
        ]
    })
}
export function millisecondsSince(d: Date): number {
    return Date.now() - Number(d)
}
