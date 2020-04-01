/*!
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as assert from 'assert'
import * as path from 'path'
import * as vscode from 'vscode'

import { nodeJsRuntimes } from '../../../../lambda/models/samLambdaRuntime'
import { CloudFormationTemplateRegistry, TemplateData } from '../../../../shared/cloudformation/templateRegistry'
import { mkdir, rmrf } from '../../../../shared/filesystem'
import { makeTemporaryToolkitFolder } from '../../../../shared/filesystemUtilities'
import { TemplateTargetProperties } from '../../../../shared/sam/debugger/awsSamDebugConfiguration'
import {
    AWS_SAM_DEBUG_TYPE,
    AwsSamDebugConfigurationProvider,
    CODE_TARGET_TYPE,
    createDirectInvokeSamDebugConfiguration,
    DIRECT_INVOKE_TYPE,
    parseCloudFormationResources,
    TEMPLATE_TARGET_TYPE
} from '../../../../shared/sam/debugger/awsSamDebugger'
import {
    makeSampleSamTemplateYaml,
    makeSampleYamlResource,
    strToYamlFile
} from '../../cloudformation/cloudformationTestUtils'

// TODO!!!!! Remove all tests prefaced with 'TEMP!!! - '
describe('AwsSamDebugConfigurationProvider', async () => {
    let debugConfigProvider: AwsSamDebugConfigurationProvider
    let registry: CloudFormationTemplateRegistry
    let tempFolder: string
    let tempFolderSimilarName: string | undefined
    let tempFile: vscode.Uri
    let fakeWorkspaceFolder: vscode.WorkspaceFolder
    const validRuntime = [...nodeJsRuntimes.values()][0]
    const resourceName = 'myResource'

    beforeEach(async () => {
        tempFolder = await makeTemporaryToolkitFolder()
        tempFile = vscode.Uri.file(path.join(tempFolder, 'test.yaml'))
        registry = new CloudFormationTemplateRegistry()
        debugConfigProvider = new AwsSamDebugConfigurationProvider(registry)
        fakeWorkspaceFolder = {
            uri: vscode.Uri.file(tempFolder),
            name: 'It was me, fakeWorkspaceFolder!',
            index: 0
        }
        tempFolderSimilarName = undefined
    })

    afterEach(async () => {
        await rmrf(tempFolder)
        if (tempFolderSimilarName) {
            await rmrf(tempFolderSimilarName)
        }
    })

    describe('provideDebugConfig', async () => {
        it('returns undefined if no workspace folder is provided', async () => {
            const provided = await debugConfigProvider.provideDebugConfigurations(undefined)
            assert.strictEqual(provided, undefined)
        })

        it('returns a blank array if no templates are in the workspace', async () => {
            const provided = await debugConfigProvider.provideDebugConfigurations(fakeWorkspaceFolder)
            assert.deepStrictEqual(provided, [])
        })

        it('returns an array with a single item if a template with one resource is in the workspace', async () => {
            await strToYamlFile(makeSampleSamTemplateYaml(true), tempFile.fsPath)
            await registry.addTemplateToRegistry(tempFile)
            const provided = await debugConfigProvider.provideDebugConfigurations(fakeWorkspaceFolder)
            assert.notStrictEqual(provided, undefined)
            if (provided) {
                assert.strictEqual(provided.length, 1)
                assert.strictEqual(provided[0].name, 'TestResource')
            }
        })

        it('returns an array with multiple items if a template with more than one resource is in the workspace', async () => {
            const resources = ['resource1', 'resource2']
            const bigYamlStr = `${makeSampleSamTemplateYaml(true, {
                resourceName: resources[0]
            })}\n${makeSampleYamlResource({ resourceName: resources[1] })}`
            await strToYamlFile(bigYamlStr, tempFile.fsPath)
            await registry.addTemplateToRegistry(tempFile)
            const provided = await debugConfigProvider.provideDebugConfigurations(fakeWorkspaceFolder)
            assert.notStrictEqual(provided, undefined)
            if (provided) {
                assert.strictEqual(provided.length, 2)
                assert.ok(resources.includes(provided[0].name))
                assert.ok(resources.includes(provided[1].name))
            }
        })

        it('only detects the specifically targeted workspace folder (and its subfolders)', async () => {
            const resources = ['resource1', 'resource2']
            const badResourceName = 'notIt'

            const nestedDir = path.join(tempFolder, 'nested')
            const nestedYaml = vscode.Uri.file(path.join(nestedDir, 'test.yaml'))
            tempFolderSimilarName = tempFolder + 'SimilarName'
            const similarNameYaml = vscode.Uri.file(path.join(tempFolderSimilarName, 'test.yaml'))

            await mkdir(nestedDir)
            await mkdir(tempFolderSimilarName)

            await strToYamlFile(makeSampleSamTemplateYaml(true, { resourceName: resources[0] }), tempFile.fsPath)
            await strToYamlFile(makeSampleSamTemplateYaml(true, { resourceName: resources[1] }), nestedYaml.fsPath)
            await strToYamlFile(
                makeSampleSamTemplateYaml(true, { resourceName: badResourceName }),
                similarNameYaml.fsPath
            )

            await registry.addTemplateToRegistry(tempFile)
            await registry.addTemplateToRegistry(nestedYaml)
            await registry.addTemplateToRegistry(similarNameYaml)

            const provided = await debugConfigProvider.provideDebugConfigurations(fakeWorkspaceFolder)
            assert.notStrictEqual(provided, undefined)
            if (provided) {
                assert.strictEqual(provided.length, 2)
                assert.ok(resources.includes(provided[0].name))
                assert.ok(resources.includes(provided[1].name))
                assert.ok(!resources.includes(badResourceName))
            }
        })
    })

    describe('resolveDebugConfiguration', async () => {
        it('returns undefined when resolving debug configurations with an invalid request type', async () => {
            const resolved = await debugConfigProvider.resolveDebugConfiguration(undefined, {
                type: AWS_SAM_DEBUG_TYPE,
                name: 'whats in a name',
                request: 'not-direct-invoke',
                invokeTarget: {
                    target: CODE_TARGET_TYPE,
                    lambdaHandler: 'sick handles',
                    projectRoot: 'root as in beer'
                }
            })
            assert.strictEqual(resolved, undefined)
        })

        it('returns undefined when resolving debug configurations with an invalid target type', async () => {
            const tgt = 'not-code' as 'code'
            const resolved = await debugConfigProvider.resolveDebugConfiguration(undefined, {
                type: AWS_SAM_DEBUG_TYPE,
                name: 'whats in a name',
                request: DIRECT_INVOKE_TYPE,
                invokeTarget: {
                    target: tgt,
                    lambdaHandler: 'sick handles',
                    projectRoot: 'root as in beer'
                }
            })
            assert.strictEqual(resolved, undefined)
        })

        it("returns undefined when resolving template debug configurations with a template that isn't in the registry", async () => {
            const resolved = await debugConfigProvider.resolveDebugConfiguration(undefined, {
                type: AWS_SAM_DEBUG_TYPE,
                name: 'whats in a name',
                request: DIRECT_INVOKE_TYPE,
                invokeTarget: {
                    target: TEMPLATE_TARGET_TYPE,
                    samTemplatePath: 'not here',
                    samTemplateResource: 'you lack resources'
                }
            })
            assert.strictEqual(resolved, undefined)
        })

        it("returns undefined when resolving template debug configurations with a template that doesn't have the set resource", async () => {
            await strToYamlFile(makeSampleSamTemplateYaml(true), tempFile.fsPath)
            await registry.addTemplateToRegistry(tempFile)
            const resolved = await debugConfigProvider.resolveDebugConfiguration(undefined, {
                type: AWS_SAM_DEBUG_TYPE,
                name: 'whats in a name',
                request: DIRECT_INVOKE_TYPE,
                invokeTarget: {
                    target: TEMPLATE_TARGET_TYPE,
                    samTemplatePath: tempFile.fsPath,
                    samTemplateResource: 'you lack resources'
                }
            })
            assert.strictEqual(resolved, undefined)
        })

        it('returns undefined when resolving template debug configurations with a resource that has an invalid runtime in template', async () => {
            await strToYamlFile(
                makeSampleSamTemplateYaml(true, { resourceName, runtime: 'moreLikeRanOutOfTime' }),
                tempFile.fsPath
            )
            await registry.addTemplateToRegistry(tempFile)
            const resolved = await debugConfigProvider.resolveDebugConfiguration(undefined, {
                type: AWS_SAM_DEBUG_TYPE,
                name: 'whats in a name',
                request: DIRECT_INVOKE_TYPE,
                invokeTarget: {
                    target: TEMPLATE_TARGET_TYPE,
                    samTemplatePath: tempFile.fsPath,
                    samTemplateResource: resourceName
                }
            })
            assert.strictEqual(resolved, undefined)
        })

        it('returns undefined when resolving code debug configurations with invalid runtimes', async () => {
            const resolved = await debugConfigProvider.resolveDebugConfiguration(undefined, {
                type: AWS_SAM_DEBUG_TYPE,
                name: 'whats in a name',
                request: DIRECT_INVOKE_TYPE,
                invokeTarget: {
                    target: CODE_TARGET_TYPE,
                    lambdaHandler: 'sick handles',
                    projectRoot: 'root as in beer'
                },
                lambda: {
                    runtime: 'COBOL'
                }
            })
            assert.strictEqual(resolved, undefined)
        })

        it('TEMP!!! - returns undefined when resolving a valid code debug configuration', async () => {
            const debugConfig = {
                type: AWS_SAM_DEBUG_TYPE,
                name: 'whats in a name',
                request: DIRECT_INVOKE_TYPE,
                invokeTarget: {
                    target: CODE_TARGET_TYPE,
                    lambdaHandler: 'sick handles',
                    projectRoot: 'root as in beer'
                },
                lambda: {
                    runtime: validRuntime
                }
            }
            assert.deepStrictEqual(
                await debugConfigProvider.resolveDebugConfiguration(undefined, debugConfig),
                undefined
            )
        })

        it('TEMP!!! - returns undefined when resolving a valid template debug configuration', async () => {
            const debugConfig = {
                type: AWS_SAM_DEBUG_TYPE,
                name: 'whats in a name',
                request: DIRECT_INVOKE_TYPE,
                invokeTarget: {
                    target: TEMPLATE_TARGET_TYPE,
                    samTemplatePath: tempFile.fsPath,
                    samTemplateResource: resourceName
                }
            }
            await strToYamlFile(
                makeSampleSamTemplateYaml(true, { resourceName, runtime: validRuntime }),
                tempFile.fsPath
            )
            await registry.addTemplateToRegistry(tempFile)
            assert.deepStrictEqual(
                await debugConfigProvider.resolveDebugConfiguration(undefined, debugConfig),
                undefined
            )
        })

        it('TEMP!!! - returns undefined when resolving a valid template debug configuration that specifies extraneous environment variables', async () => {
            const debugConfig = {
                type: AWS_SAM_DEBUG_TYPE,
                name: 'whats in a name',
                request: DIRECT_INVOKE_TYPE,
                invokeTarget: {
                    target: TEMPLATE_TARGET_TYPE,
                    samTemplatePath: tempFile.fsPath,
                    samTemplateResource: resourceName
                },
                lambda: {
                    environmentVariables: {
                        var1: 2,
                        var2: '1'
                    }
                }
            }
            await strToYamlFile(
                makeSampleSamTemplateYaml(true, { resourceName, runtime: validRuntime }),
                tempFile.fsPath
            )
            await registry.addTemplateToRegistry(tempFile)
            assert.deepStrictEqual(
                await debugConfigProvider.resolveDebugConfiguration(undefined, debugConfig),
                undefined
            )
        })
    })
})

describe('parseCloudFormationResources', () => {
    const templateDatum: TemplateData = {
        path: path.join('the', 'path', 'led', 'us', 'here', 'today'),
        template: {
            Resources: {
                resource1: {
                    Type: 'AWS::Serverless::Function',
                    Properties: {
                        Handler: 'tooHotTo.handler',
                        CodeUri: 'rightHere'
                    }
                }
            }
        }
    }

    it('calls a callback for a single resource', () => {
        let count = 0
        parseCloudFormationResources(templateDatum, (resourceKey, resource) => {
            assert.strictEqual(resourceKey, 'resource1')
            assert.deepStrictEqual(resource, templateDatum.template.Resources!.resource1)
            count++
        })
        assert.strictEqual(count, 1)
    })

    it('calls a callback per resource, if the resource exists', () => {
        let count = 0
        const biggerDatum: TemplateData = {
            ...templateDatum,
            template: {
                Resources: {
                    ...templateDatum.template.Resources,
                    resource2: {
                        Type: 'AWS::Serverless::Function',
                        Properties: {
                            Handler: 'handledWith.care',
                            CodeUri: 'overThere'
                        }
                    },
                    undefinedResource: undefined
                }
            }
        }
        parseCloudFormationResources(biggerDatum, () => {
            count++
        })
        assert.strictEqual(count, 2)
    })
})

describe('createDirectInvokeSamDebugConfiguration', () => {
    const name = 'my body is a template'
    const templatePath = path.join('two', 'roads', 'diverged', 'in', 'a', 'yellow', 'wood')

    it('creates a template-type SAM debugger configuration with minimal configurations', () => {
        const config = createDirectInvokeSamDebugConfiguration(name, templatePath)
        assert.strictEqual(config.invokeTarget.target, TEMPLATE_TARGET_TYPE)
        const invokeTarget = config.invokeTarget as TemplateTargetProperties
        assert.strictEqual(config.name, name)
        assert.strictEqual(invokeTarget.samTemplateResource, name)
        assert.strictEqual(invokeTarget.samTemplatePath, templatePath)
        assert.ok(!config.hasOwnProperty('lambda'))
    })

    it('creates a template-type SAM debugger configuration with additional params', () => {
        const params = {
            eventJson: {
                event: 'uneventufl'
            },
            environmentVariables: {
                varial: 'invert to fakie'
            },
            dockerNetwork: 'rockerFretwork'
        }
        const config = createDirectInvokeSamDebugConfiguration(name, templatePath, params)
        assert.deepStrictEqual(config.lambda?.event?.json, params.eventJson)
        assert.deepStrictEqual(config.lambda?.environmentVariables, params.environmentVariables)
        assert.strictEqual(config.sam?.dockerNetwork, params.dockerNetwork)
        assert.strictEqual(config.sam?.containerBuild, undefined)
    })
})
