#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CreateRequestCommand } from '../src/cli/CreateRequestCommand.js';
import { DeleteRequestCommand } from '../src/cli/DeleteRequestCommand.js';
import { InitProjectCommand } from '../src/cli/InitProjectCommand.js';
import { PullProjectCommand } from '../src/cli/PullProjectCommand.js';
import { ReadRequestCommand } from '../src/cli/ReadRequestCommand.js';
import { ApplyProjectCommand } from '../src/cli/ApplyProjectCommand.js';
import { RenameProjectResourceCommand } from '../src/cli/RenameProjectResourceCommand.js';
import { UpgradeProjectCommand } from '../src/cli/UpgradeProjectCommand.js';
import { UpdateRequestCommand } from '../src/cli/UpdateRequestCommand.js';
import { ValidateProjectCommand } from '../src/cli/ValidateProjectCommand.js';
import { VersionCommand } from '../src/cli/VersionCommand.js';
import { RequestDefinitionFileLoader } from '../src/cli/RequestDefinitionFileLoader.js';
import { TopLevelCliCommandRouter } from '../src/cli/TopLevelCliCommandRouter.js';
import { ApiEaseCreateRequestClient } from '../src/client/ApiEaseCreateRequestClient.js';
import { ApiEaseCreateRequestContractValidator } from '../src/client/ApiEaseCreateRequestContractValidator.js';
import { ApiEaseDeleteRequestClient } from '../src/client/ApiEaseDeleteRequestClient.js';
import { ApiEaseReadRequestClient } from '../src/client/ApiEaseReadRequestClient.js';
import { ApiEaseUpdateRequestClient } from '../src/client/ApiEaseUpdateRequestClient.js';
import { ApiEaseProjectApiClient } from '../src/client/ApiEaseProjectApiClient.js';
import { ProjectCommandAuthenticationContextResolver } from '../src/auth/ProjectCommandAuthenticationContextResolver.js';
import { ProjectCommandResultService } from '../src/cli/ProjectCommandResultService.js';
import { ProjectApplyRequestPolicy } from '../src/project/ProjectApplyRequestPolicy.js';
import { ProjectApplyService } from '../src/project/ProjectApplyService.js';
import { ProjectBootstrapArtifactService } from '../src/project/ProjectBootstrapArtifactService.js';
import { ProjectCandidateBuilder } from '../src/project/ProjectCandidateBuilder.js';
import { ProjectCanonicalArtifactService } from '../src/project/ProjectCanonicalArtifactService.js';
import { ProjectContractService } from '../src/project/ProjectContractService.js';
import { ProjectDeletionIntentService } from '../src/project/ProjectDeletionIntentService.js';
import { ProjectGitCheckoutService } from '../src/project/ProjectGitCheckoutService.js';
import { ProjectLocalStateService } from '../src/project/ProjectLocalStateService.js';
import { ProjectManagedNamespaceService } from '../src/project/ProjectManagedNamespaceService.js';
import { ProjectManagedPublicationService } from '../src/project/ProjectManagedPublicationService.js';
import { ProjectRenameService } from '../src/project/ProjectRenameService.js';
import { ProjectSecureInputService } from '../src/project/ProjectSecureInputService.js';
import { ProjectSynchronizationService } from '../src/project/ProjectSynchronizationService.js';
import { ProjectValidationService } from '../src/project/ProjectValidationService.js';

const JSON_FLAG = '--json';
const DEFAULT_FAILURE_STATUS = 500;
const UNEXPECTED_CLI_ERROR = 'UNEXPECTED_CLI_ERROR';
const CLI_VERSION = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

function buildCreateRequestCommand({ stdout = process.stdout, stderr = process.stderr } = {}) {
  const apiEaseCreateRequestContractValidator = new ApiEaseCreateRequestContractValidator();
  const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
    apiEaseCreateRequestContractValidator,
  });
  const requestDefinitionFileLoader = new RequestDefinitionFileLoader();

  return new CreateRequestCommand({
    requestDefinitionFileLoader,
    apiEaseCreateRequestClient,
    stdout,
    stderr,
  });
}

function buildReadRequestCommand({ stdout = process.stdout, stderr = process.stderr } = {}) {
  const apiEaseReadRequestClient = new ApiEaseReadRequestClient();

  return new ReadRequestCommand({
    apiEaseReadRequestClient,
    stdout,
    stderr,
  });
}

function buildUpdateRequestCommand({ stdout = process.stdout, stderr = process.stderr } = {}) {
  const apiEaseCreateRequestContractValidator = new ApiEaseCreateRequestContractValidator();
  const apiEaseUpdateRequestClient = new ApiEaseUpdateRequestClient({
    apiEaseCreateRequestContractValidator,
  });
  const requestDefinitionFileLoader = new RequestDefinitionFileLoader();

  return new UpdateRequestCommand({
    requestDefinitionFileLoader,
    apiEaseUpdateRequestClient,
    stdout,
    stderr,
  });
}

function buildDeleteRequestCommand({ stdout = process.stdout, stderr = process.stderr } = {}) {
  const apiEaseDeleteRequestClient = new ApiEaseDeleteRequestClient();

  return new DeleteRequestCommand({
    apiEaseDeleteRequestClient,
    stdout,
    stderr,
  });
}

function buildProjectCommands({
  commandArguments = [],
  projectCommandAuthenticationContextResolver =
    new ProjectCommandAuthenticationContextResolver(),
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  const projectContractService = new ProjectContractService();
  const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
  const authenticationContext = projectCommandAuthenticationContextResolver
    .resolveContext(commandArguments);
  const personalProjectAuthenticationAdapter =
    authenticationContext.projectAuthenticationAdapter;
  const apiEaseProjectApiClient = new ApiEaseProjectApiClient({
    projectContractService,
    projectAuthenticationAdapter: personalProjectAuthenticationAdapter,
  });
  const projectLocalStateService = new ProjectLocalStateService({ projectContractService });
  const projectManagedNamespaceService = new ProjectManagedNamespaceService({
    projectCanonicalArtifactService,
  });
  const projectDeletionIntentService = new ProjectDeletionIntentService({
    projectCanonicalArtifactService,
    projectContractService,
  });
  const projectGitCheckoutService = new ProjectGitCheckoutService({ projectLocalStateService });
  const projectCandidateBuilder = new ProjectCandidateBuilder({
    projectCanonicalArtifactService,
    projectContractService,
    projectDeletionIntentService,
    projectGitCheckoutService,
    projectManagedNamespaceService,
    projectSecureInputService: new ProjectSecureInputService(),
  });
  const projectValidationService = new ProjectValidationService({
    apiEaseProjectApiClient,
    projectCandidateBuilder,
  });
  const projectSynchronizationService = new ProjectSynchronizationService({
    apiEaseProjectApiClient,
    projectBootstrapArtifactService: new ProjectBootstrapArtifactService({
      projectCanonicalArtifactService,
      projectContractService,
    }),
    projectLocalStateService,
    projectManagedNamespaceService,
    projectManagedPublicationService: new ProjectManagedPublicationService({
      projectCanonicalArtifactService,
    }),
  });
  const projectCommandResultService = new ProjectCommandResultService({ stdout, stderr });
  const sharedDependencies = {
    personalProjectAuthenticationAdapter,
    projectGitCheckoutService,
    projectSynchronizationService,
    projectCommandResultService,
  };

  const initProjectCommand = new InitProjectCommand({
    cliVersion: CLI_VERSION,
    ...sharedDependencies,
    stdout,
    stderr,
  });
  const pullProjectCommand = new PullProjectCommand(sharedDependencies);
  const validateProjectCommand = new ValidateProjectCommand({
    personalProjectAuthenticationAdapter,
    projectValidationService,
    projectCommandResultService,
  });
  const projectApplyRequestPolicy = new ProjectApplyRequestPolicy({
    personalProjectAuthenticationAdapter,
    approvalProjectContext: authenticationContext.approvalProjectContext,
  });
  const applyProjectCommand = new ApplyProjectCommand({
    personalProjectAuthenticationAdapter,
    projectApplyService: new ProjectApplyService({
      projectApplyRequestPolicy,
      projectCandidateBuilder,
      apiEaseProjectApiClient,
      projectValidationService,
      projectLocalStateService,
      projectDeletionIntentService,
    }),
    projectCommandResultService,
  });
  const renameProjectResourceCommand = new RenameProjectResourceCommand({
    projectRenameService: new ProjectRenameService({
      projectCanonicalArtifactService,
      projectLocalStateService,
    }),
    projectCommandResultService,
  });

  return {
    initProjectCommand,
    pullProjectCommand,
    validateProjectCommand,
    applyProjectCommand,
    renameProjectResourceCommand,
  };
}

function buildUpgradeProjectCommand({ stdout = process.stdout, stderr = process.stderr } = {}) {
  return new UpgradeProjectCommand({
    stdout,
    stderr,
  });
}

function buildVersionCommand({ stdout = process.stdout } = {}) {
  return new VersionCommand({
    cliVersion: CLI_VERSION,
    stdout,
  });
}

function buildTopLevelCliCommandRouter() {
  return new TopLevelCliCommandRouter();
}

async function runCli({
  commandArguments = process.argv.slice(2),
  createRequestCommand,
  readRequestCommand,
  updateRequestCommand,
  deleteRequestCommand,
  initProjectCommand,
  pullProjectCommand,
  validateProjectCommand,
  applyProjectCommand,
  renameProjectResourceCommand,
  upgradeProjectCommand,
  versionCommand,
  topLevelCliCommandRouter = buildTopLevelCliCommandRouter(),
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  createRequestCommand ??= buildCreateRequestCommand({ stdout, stderr });
  readRequestCommand ??= buildReadRequestCommand({ stdout, stderr });
  updateRequestCommand ??= buildUpdateRequestCommand({ stdout, stderr });
  deleteRequestCommand ??= buildDeleteRequestCommand({ stdout, stderr });
  const commandName = commandArguments[0];
  const requiresProjectCommands = (
    (commandName === 'init' && !initProjectCommand)
    || (commandName === 'pull' && !pullProjectCommand)
    || (commandName === 'validate' && !validateProjectCommand)
    || (commandName === 'apply' && !applyProjectCommand)
    || (commandName === 'rename' && !renameProjectResourceCommand)
  );
  if (requiresProjectCommands) {
    const projectCommands = buildProjectCommands({ commandArguments, stdout, stderr });
    initProjectCommand ??= projectCommands.initProjectCommand;
    pullProjectCommand ??= projectCommands.pullProjectCommand;
    validateProjectCommand ??= projectCommands.validateProjectCommand;
    applyProjectCommand ??= projectCommands.applyProjectCommand;
    renameProjectResourceCommand ??= projectCommands.renameProjectResourceCommand;
  }
  upgradeProjectCommand ??= buildUpgradeProjectCommand({ stdout, stderr });
  versionCommand ??= buildVersionCommand({ stdout });

  const commandResult = topLevelCliCommandRouter.resolveCommand({
    commandArguments,
    createRequestCommand,
    readRequestCommand,
    updateRequestCommand,
    deleteRequestCommand,
    initProjectCommand,
    pullProjectCommand,
    validateProjectCommand,
    applyProjectCommand,
    renameProjectResourceCommand,
    upgradeProjectCommand,
    versionCommand,
  });
  if (!commandResult.ok) {
    stderr.write(`${commandResult.message}\n${topLevelCliCommandRouter.buildUsageText()}\n`);
    return 1;
  }

  if (commandResult.help) {
    stdout.write(`${topLevelCliCommandRouter.buildUsageText()}\n`);
    return 0;
  }

  try {
    return await commandResult.command.run(commandArguments);
  } catch (error) {
    const failureResult = buildUnexpectedFailureResult(error);
    const output = buildFailureOutput({
      commandArguments,
      failureResult,
    });
    writeFailureOutput({ stderr, output });
    return 1;
  }
}

function buildUnexpectedFailureResult(error) {
  return {
    status: DEFAULT_FAILURE_STATUS,
    ok: false,
    errorCode: UNEXPECTED_CLI_ERROR,
    message: buildFailureMessage(error),
    fieldErrors: [],
  };
}

function buildFailureMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function buildFailureOutput({ commandArguments, failureResult }) {
  if (commandArguments.includes(JSON_FLAG)) {
    return `${JSON.stringify(failureResult, null, 2)}\n`;
  }

  return [
    'Command failed.',
    `Error Code: ${failureResult.errorCode}`,
    `Message: ${failureResult.message}`,
    `Status: ${failureResult.status}`,
    '',
  ].join('\n');
}

function writeFailureOutput({ stderr, output }) {
  stderr.write(output);
}

async function runEntrypoint() {
  process.exitCode = await runCli();
}

if (isExecutedAsEntrypoint()) {
  await runEntrypoint();
}

function isExecutedAsEntrypoint() {
  if (!process.argv[1]) {
    return false;
  }

  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

export { buildCreateRequestCommand, buildProjectCommands, runCli };
