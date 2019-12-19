/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ext } from '../src/shared/extensionGlobals'

enum TelemetryType {
    LAMBDA_DELETE = 'lambda_delete'
}

type runtime = 'linux' | 'windows' | 'mac'

interface LambdaDelete {
    value?: number
    runtime: runtime
}

export function recordLambdaDelete(args: LambdaDelete) {
    ext.telemetry.newrecord({
        name: TelemetryType.LAMBDA_DELETE,
        value: args.value ?? 1,
        unit: 'none',
        metadata: new Map<string, string>([['runtime', args.runtime?.toString() ?? '']])
    })
}
