import { PersonalProjectAuthenticationAdapter } from '../auth/PersonalProjectAuthenticationAdapter.js';
import { ApiEaseProjectApiClient } from '../client/ApiEaseProjectApiClient.js';
import { ProjectDesignContextService } from '../project/ProjectDesignContextService.js';
import {
  CLI_RESULT_VERSION,
  ProjectCommandResultService,
} from './ProjectCommandResultService.js';

const JSON_FLAG = '--json';
const RESOURCE_PATH_OPTION = '--resource-path';
const PROJECT_CONFIGURATION_OPTION_FIELDS = Object.freeze({
  '--api-key': 'apiKey',
  '--base-url': 'apiBaseUrl',
  '--shop-domain': 'shopDomain',
});

class DesignContextCommand {
  constructor({
    personalProjectAuthenticationAdapter = new PersonalProjectAuthenticationAdapter(),
    projectDesignContextService,
    stdout = process.stdout,
    stderr = process.stderr,
    projectCommandResultService = new ProjectCommandResultService({ stdout, stderr }),
  } = {}) {
    this.personalProjectAuthenticationAdapter = personalProjectAuthenticationAdapter;
    this.projectDesignContextService = projectDesignContextService;
    this.stdout = stdout;
    this.projectCommandResultService = projectCommandResultService;
  }

  async run(commandArguments = [], { currentWorkingDirectoryPath = process.cwd() } = {}) {
    const parseResult = this.parseCommandArguments(commandArguments);
    if (!parseResult.ok) return this.renderFailure(this.buildUsageFailure(parseResult));

    try {
      return await this.runDesignContext({ currentWorkingDirectoryPath, parseResult });
    } catch (error) {
      return this.renderFailure(this.buildCommandErrorFailure(error));
    }
  }

  parseCommandArguments(commandArguments) {
    const parseResult = this.buildParseResult();
    if (commandArguments[0] !== 'design-context') return this.buildParseFailure();

    for (let argumentIndex = 1; argumentIndex < commandArguments.length; argumentIndex += 1) {
      const nextIndex = this.parseOption(commandArguments, argumentIndex, parseResult);
      if (nextIndex === null) return this.buildParseFailure(parseResult.diagnosticCode);
      argumentIndex = nextIndex;
    }
    return parseResult;
  }

  buildParseResult() {
    return { ok: true, seenOptions: new Set() };
  }

  parseOption(commandArguments, argumentIndex, parseResult) {
    const argument = commandArguments[argumentIndex];
    if (argument === JSON_FLAG) return this.parseJsonFlag(argumentIndex, parseResult);
    if (argument === RESOURCE_PATH_OPTION) {
      const resourcePath = commandArguments[argumentIndex + 1];
      if (!resourcePath || !/^resources\/(functions|requests|variables|widgets)\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u.test(resourcePath)) return null;
      parseResult.resourcePaths ??= [];
      if (parseResult.resourcePaths.includes(resourcePath) || parseResult.resourcePaths.length >= 1000) return null;
      parseResult.resourcePaths.push(resourcePath);
      return argumentIndex + 1;
    }
    if (Object.hasOwn(PROJECT_CONFIGURATION_OPTION_FIELDS, argument)) {
      return this.parseConfigurationOption(commandArguments, argumentIndex, parseResult);
    }
    return null;
  }

  parseJsonFlag(argumentIndex, parseResult) {
    if (parseResult.seenOptions.has(JSON_FLAG)) return null;
    parseResult.seenOptions.add(JSON_FLAG);
    return argumentIndex;
  }

  parseConfigurationOption(commandArguments, argumentIndex, parseResult) {
    const optionValue = this.readOptionValue(commandArguments, argumentIndex, parseResult);
    if (optionValue === null) return null;
    parseResult[PROJECT_CONFIGURATION_OPTION_FIELDS[commandArguments[argumentIndex]]] = optionValue;
    return argumentIndex + 1;
  }

  readOptionValue(commandArguments, argumentIndex, parseResult) {
    const argument = commandArguments[argumentIndex];
    const optionValue = commandArguments[argumentIndex + 1];
    if (parseResult.seenOptions.has(argument) || !optionValue || optionValue.startsWith('--')) {
      return null;
    }
    parseResult.seenOptions.add(argument);
    return optionValue;
  }

  buildParseFailure(diagnosticCode = 'PROJECT_DESIGN_CONTEXT_ARGUMENT_INVALID') {
    return { ok: false, diagnosticCode };
  }

  async runDesignContext({ currentWorkingDirectoryPath, parseResult }) {
    const requestConfiguration = await this.resolveRequestConfiguration(parseResult);
    if (!requestConfiguration.ok) {
      return this.renderFailure(this.buildConfigurationFailure(requestConfiguration));
    }
    const designContext = await this.buildDesignContext({
      currentWorkingDirectoryPath,
      parseResult,
      requestConfiguration,
    });
    return await this.renderDesignContextResult(designContext);
  }

  async resolveRequestConfiguration(parseResult) {
    return await this.personalProjectAuthenticationAdapter.resolveRequestConfiguration({
      explicitApiBaseUrl: parseResult.apiBaseUrl,
      explicitApiKey: parseResult.apiKey,
      explicitShopDomain: parseResult.shopDomain,
    });
  }

  async buildDesignContext({ currentWorkingDirectoryPath, parseResult, requestConfiguration }) {
    return await this.resolveProjectDesignContextService().buildDesignContext({
      projectDirectoryPath: currentWorkingDirectoryPath,
      projectApiInvocation: {
        apiBaseUrl: requestConfiguration.apiBaseUrl,
        authenticationContext: requestConfiguration.authenticationContext,
      },
      resourcePaths: parseResult.resourcePaths ?? [],
    });
  }

  resolveProjectDesignContextService() {
    this.projectDesignContextService ??= new ProjectDesignContextService({
      apiEaseProjectApiClient: new ApiEaseProjectApiClient({
        projectAuthenticationAdapter: this.personalProjectAuthenticationAdapter,
      }),
    });
    return this.projectDesignContextService;
  }

  async renderDesignContextResult(designContext) {
    if (!designContext.ok) return this.renderFailure(this.buildApiFailure(designContext));
    const envelope = this.buildSuccessEnvelope(designContext);
    this.writeEnvelope(envelope);
    return this.projectCommandResultService.resolveExitCode(envelope);
  }

  buildSuccessEnvelope(designContext) {
    return {
      cliResultVersion: CLI_RESULT_VERSION,
      command: 'design-context',
      state: 'success',
      outcome: designContext.outcome,
      result: designContext,
      diagnostics: designContext.diagnostics,
      requiredSecureValues: [],
    };
  }

  buildApiFailure(designContext) {
    return {
      command: 'design-context',
      state: 'failure',
      outcome: designContext.outcome,
      error: {
        code: designContext.error.code,
        category: this.resolveApiFailureCategory(designContext.status),
      },
      diagnostics: designContext.error.diagnostics,
    };
  }

  resolveApiFailureCategory(status) {
    if (status === 401) return 'authentication';
    if (status === 403 || status === 404) return 'authorization';
    if ([400, 413, 415, 422].includes(status)) return 'contract';
    if (status === 409) return 'conflict';
    if ([429, 503].includes(status)) return 'service';
    return 'internal';
  }

  buildUsageFailure(parseResult) {
    return {
      command: 'design-context',
      state: 'failure',
      error: { code: 'PROJECT_DESIGN_CONTEXT_USAGE_INVALID', category: 'usage' },
      diagnostics: [{ code: parseResult.diagnosticCode }],
    };
  }

  buildConfigurationFailure(configurationFailure) {
    return {
      command: 'design-context',
      state: 'failure',
      error: { code: configurationFailure.errorCode, category: 'configuration' },
      diagnostics: (configurationFailure.fieldErrors ?? [])
        .map(({ code, path: fieldPath }) => ({ code, path: fieldPath })),
    };
  }

  buildCommandErrorFailure(error) {
    const errorCode = typeof error?.code === 'string'
      ? error.code
      : 'PROJECT_DESIGN_CONTEXT_FAILED';
    return {
      command: 'design-context',
      state: 'failure',
      error: { code: errorCode, category: this.resolveCommandErrorCategory(error) },
      diagnostics: error?.diagnostics ?? [{ code: errorCode }],
    };
  }

  resolveCommandErrorCategory(error) {
    if (error?.failureType === 'local-integrity') return 'local-integrity';
    if (error?.failureType === 'contract') return 'contract';
    if (error?.failureType === 'transport') return 'transport';
    return 'internal';
  }

  renderFailure(commandResult) {
    const envelope = this.projectCommandResultService.normalizeResult(commandResult);
    this.projectCommandResultService.renderResult(envelope, {
      json: true,
      guidance: this.buildFailureGuidance(commandResult),
    });
    return this.projectCommandResultService.resolveExitCode(envelope);
  }

  buildFailureGuidance(commandResult) {
    if (commandResult.outcome === 'CONTRACT_VERSION_UNSUPPORTED') return [
      'This CLI requires project-status contract version 3. Update the APIEase server and CLI together.',
    ];
    if (commandResult.error?.category === 'usage') return [
      'Use "apiease design-context [--resource-path <path>] [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]".',
      'Instructions are installed by "apiease init" and "apiease upgrade". Read docs/resource-instructions/README.md. The --inline, --output-dir and --project-requirements options are retired; keep intent in the conversation and CUSTOM_* files.',
    ];
    return [];
  }

  writeEnvelope(envelope) {
    this.stdout.write(`${JSON.stringify(envelope)}\n`);
  }
}

export { DesignContextCommand };
