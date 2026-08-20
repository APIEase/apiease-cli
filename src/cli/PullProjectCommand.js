import { PersonalProjectAuthenticationAdapter } from '../auth/PersonalProjectAuthenticationAdapter.js';
import { ApiEaseProjectApiClient } from '../client/ApiEaseProjectApiClient.js';
import { ProjectGitCheckoutService } from '../project/ProjectGitCheckoutService.js';
import { ProjectSynchronizationService } from '../project/ProjectSynchronizationService.js';
import { ProjectCommandResultService } from './ProjectCommandResultService.js';

const FORCE_FLAG = '--force';
const JSON_FLAG = '--json';
const PROJECT_CONFIGURATION_OPTION_FIELDS = Object.freeze({
  '--api-key': 'apiKey',
  '--bearer-token': 'bearerToken',
  '--base-url': 'apiBaseUrl',
  '--shop-domain': 'shopDomain',
});
const PROJECT_BOOTSTRAP_REQUEST = Object.freeze({ contractVersion: 1, wakeProjection: true });

class PullProjectCommand {
  constructor({
    personalProjectAuthenticationAdapter = new PersonalProjectAuthenticationAdapter(),
    projectGitCheckoutService = new ProjectGitCheckoutService(),
    projectSynchronizationService,
    stdout = process.stdout,
    stderr = process.stderr,
    projectCommandResultService = new ProjectCommandResultService({ stdout, stderr }),
  } = {}) {
    this.personalProjectAuthenticationAdapter = personalProjectAuthenticationAdapter;
    this.projectGitCheckoutService = projectGitCheckoutService;
    this.projectSynchronizationService = projectSynchronizationService;
    this.projectCommandResultService = projectCommandResultService;
  }

  async run(commandArguments = [], { currentWorkingDirectoryPath = process.cwd() } = {}) {
    const parseResult = this.parseCommandArguments(commandArguments);
    if (!parseResult.ok) return this.renderResult(this.buildUsageFailure(), parseResult.json);

    try {
      return await this.runVerifiedPull({ currentWorkingDirectoryPath, parseResult });
    } catch (error) {
      return this.renderResult(this.buildCommandErrorFailure(error), parseResult.json);
    }
  }

  parseCommandArguments(commandArguments) {
    const parseResult = this.buildParseResult(commandArguments);
    if (commandArguments[0] !== 'pull') return this.buildParseFailure(commandArguments);

    for (let argumentIndex = 1; argumentIndex < commandArguments.length; argumentIndex += 1) {
      const nextArgumentIndex = this.parseOption(commandArguments, argumentIndex, parseResult);
      if (nextArgumentIndex === null) return this.buildParseFailure(commandArguments);
      argumentIndex = nextArgumentIndex;
    }

    return parseResult;
  }

  buildParseResult(commandArguments) {
    return {
      ok: true,
      force: false,
      json: commandArguments.includes(JSON_FLAG),
      seenOptions: new Set(),
    };
  }

  parseOption(commandArguments, argumentIndex, parseResult) {
    const argument = commandArguments[argumentIndex];
    if ([FORCE_FLAG, JSON_FLAG].includes(argument)) {
      return this.parseBooleanOption(argument, argumentIndex, parseResult);
    }
    if (Object.hasOwn(PROJECT_CONFIGURATION_OPTION_FIELDS, argument)) {
      return this.parseValueOption(commandArguments, argumentIndex, parseResult);
    }
    return null;
  }

  parseBooleanOption(argument, argumentIndex, parseResult) {
    if (parseResult.seenOptions.has(argument)) return null;
    parseResult.seenOptions.add(argument);
    if (argument === FORCE_FLAG) parseResult.force = true;
    return argumentIndex;
  }

  parseValueOption(commandArguments, argumentIndex, parseResult) {
    const argument = commandArguments[argumentIndex];
    const optionValue = commandArguments[argumentIndex + 1];
    if (parseResult.seenOptions.has(argument) || !optionValue || optionValue.startsWith('--')) return null;
    parseResult.seenOptions.add(argument);
    parseResult[PROJECT_CONFIGURATION_OPTION_FIELDS[argument]] = optionValue;
    return argumentIndex + 1;
  }

  buildParseFailure(commandArguments) {
    return { ok: false, json: commandArguments.includes(JSON_FLAG) };
  }

  async runVerifiedPull({ currentWorkingDirectoryPath, parseResult }) {
    const requestConfiguration = await this.resolveRequestConfiguration(parseResult);
    if (!requestConfiguration.ok) {
      return this.renderResult(this.buildConfigurationFailure(requestConfiguration), parseResult.json);
    }
    return await this.synchronizeCheckout({ currentWorkingDirectoryPath, parseResult, requestConfiguration });
  }

  async resolveRequestConfiguration(parseResult) {
    const configurationOptions = {
      explicitApiBaseUrl: parseResult.apiBaseUrl,
      explicitApiKey: parseResult.apiKey,
      explicitShopDomain: parseResult.shopDomain,
    };
    if (parseResult.bearerToken) {
      configurationOptions.explicitBearerToken = parseResult.bearerToken;
    }
    return await this.personalProjectAuthenticationAdapter
      .resolveRequestConfiguration(configurationOptions);
  }

  async synchronizeCheckout({ currentWorkingDirectoryPath, parseResult, requestConfiguration }) {
    const checkout = await this.projectGitCheckoutService.validateProjectCheckout(currentWorkingDirectoryPath);
    const synchronization = await this.pullVerifiedProject({
      checkout,
      force: parseResult.force,
      requestConfiguration,
    });
    return this.renderSynchronizationResult({ checkout, json: parseResult.json, synchronization });
  }

  async pullVerifiedProject({ checkout, force, requestConfiguration }) {
    return await this.resolveProjectSynchronizationService().pullProject({
      force,
      projectDirectoryPath: checkout.repositoryTopLevelPath,
      projectApiInvocation: {
        apiBaseUrl: requestConfiguration.apiBaseUrl,
        authenticationContext: requestConfiguration.authenticationContext,
        request: PROJECT_BOOTSTRAP_REQUEST,
      },
    });
  }

  resolveProjectSynchronizationService() {
    this.projectSynchronizationService ??= new ProjectSynchronizationService({
      apiEaseProjectApiClient: new ApiEaseProjectApiClient({
        projectAuthenticationAdapter: this.personalProjectAuthenticationAdapter,
      }),
    });
    return this.projectSynchronizationService;
  }

  renderSynchronizationResult({ checkout, json, synchronization }) {
    const commandResult = this.buildSynchronizationCommandResult({ checkout, synchronization });
    const guidance = synchronization.bootstrapResponse.ok
      ? this.buildSynchronizationGuidance(synchronization)
      : [];
    return this.renderResult(commandResult, json, guidance);
  }

  buildSynchronizationGuidance(synchronization) {
    return [
      ...synchronization.warnings,
      ...this.projectCommandResultService
        .buildSkippedResourceGuidance(synchronization.skippedResources),
    ];
  }

  buildSynchronizationCommandResult({ checkout, synchronization }) {
    if (!synchronization.bootstrapResponse.ok) {
      return this.buildBootstrapFailure(synchronization.bootstrapResponse);
    }
    return {
      command: 'pull',
      state: 'success',
      outcome: synchronization.bootstrapResponse.outcome,
      result: {
        projectDirectoryPath: checkout.repositoryTopLevelPath,
        publishedPaths: synchronization.publication.publishedPaths,
        removedPaths: synchronization.publication.removedPaths,
        skippedResources: synchronization.skippedResources,
        warnings: synchronization.warnings,
      },
    };
  }

  buildUsageFailure() {
    return {
      command: 'pull',
      state: 'failure',
      error: { code: 'PROJECT_PULL_USAGE_INVALID', category: 'usage' },
      diagnostics: [{ code: 'PROJECT_PULL_ARGUMENT_INVALID' }],
    };
  }

  buildConfigurationFailure(configurationFailure) {
    return {
      command: 'pull',
      state: 'failure',
      error: { code: configurationFailure.errorCode, category: 'configuration' },
      diagnostics: (configurationFailure.fieldErrors ?? [])
        .map(({ code, path: fieldPath }) => ({ code, path: fieldPath })),
    };
  }

  buildBootstrapFailure(bootstrapResponse) {
    return {
      command: 'pull',
      state: 'failure',
      outcome: bootstrapResponse.outcome,
      error: {
        code: bootstrapResponse.error.code,
        category: this.resolveBootstrapFailureCategory(bootstrapResponse.status),
      },
      diagnostics: bootstrapResponse.error.diagnostics,
    };
  }

  resolveBootstrapFailureCategory(status) {
    if (status === 401) return 'authentication';
    if (status === 403 || status === 404) return 'authorization';
    if ([400, 413, 415].includes(status)) return 'contract';
    if (status === 422) return 'validation';
    if (status === 409) return 'conflict';
    if ([429, 503].includes(status)) return 'service';
    return 'internal';
  }

  buildCommandErrorFailure(error) {
    const errorCode = typeof error?.code === 'string' ? error.code : 'PROJECT_PULL_FAILED';
    return {
      command: 'pull',
      state: 'failure',
      error: { code: errorCode, category: this.resolveCommandErrorCategory(error) },
      diagnostics: error?.diagnostics ?? [{ code: errorCode }],
    };
  }

  resolveCommandErrorCategory(error) {
    if (error?.code?.startsWith('PROJECT_BOOTSTRAP_ARTIFACT_')) return 'contract';
    if (error?.failureType === 'local-integrity') return 'local-integrity';
    if (/^PROJECT_(?:CHECKOUT|GIT|LOCAL|MANAGED|PUBLICATION)/.test(error?.code ?? '')) {
      return 'local-integrity';
    }
    return 'internal';
  }

  renderResult(commandResult, json, guidance = []) {
    const envelope = this.projectCommandResultService.normalizeResult(commandResult);
    this.projectCommandResultService.renderResult(envelope, { json, guidance });
    return this.projectCommandResultService.resolveExitCode(envelope);
  }
}

export { PullProjectCommand };
