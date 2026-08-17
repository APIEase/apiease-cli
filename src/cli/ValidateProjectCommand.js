import { PersonalProjectAuthenticationAdapter } from '../auth/PersonalProjectAuthenticationAdapter.js';
import { ApiEaseProjectApiClient } from '../client/ApiEaseProjectApiClient.js';
import {
  PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE,
  ProjectValidationService,
} from '../project/ProjectValidationService.js';
import { ProjectCommandResultService } from './ProjectCommandResultService.js';

const JSON_FLAG = '--json';
const PROJECT_CONFIGURATION_OPTION_FIELDS = Object.freeze({
  '--api-key': 'apiKey',
  '--base-url': 'apiBaseUrl',
  '--shop-domain': 'shopDomain',
});

class ValidateProjectCommand {
  constructor({
    personalProjectAuthenticationAdapter = new PersonalProjectAuthenticationAdapter(),
    projectValidationService,
    stdout = process.stdout,
    stderr = process.stderr,
    projectCommandResultService = new ProjectCommandResultService({ stdout, stderr }),
  } = {}) {
    this.personalProjectAuthenticationAdapter = personalProjectAuthenticationAdapter;
    this.projectValidationService = projectValidationService;
    this.projectCommandResultService = projectCommandResultService;
  }

  async run(commandArguments = [], { currentWorkingDirectoryPath = process.cwd() } = {}) {
    const parseResult = this.parseCommandArguments(commandArguments);
    if (!parseResult.ok) return this.renderResult(this.buildUsageFailure(), parseResult.json);

    try {
      return await this.runValidation({ currentWorkingDirectoryPath, parseResult });
    } catch (error) {
      return this.renderResult(this.buildCommandErrorFailure(error), parseResult.json);
    }
  }

  parseCommandArguments(commandArguments) {
    const parseResult = this.buildParseResult(commandArguments);
    if (commandArguments[0] !== 'validate') return this.buildParseFailure(commandArguments);

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
      json: commandArguments.includes(JSON_FLAG),
      seenOptions: new Set(),
    };
  }

  parseOption(commandArguments, argumentIndex, parseResult) {
    const argument = commandArguments[argumentIndex];
    if (argument === JSON_FLAG) return this.parseJsonOption(argumentIndex, parseResult);
    if (Object.hasOwn(PROJECT_CONFIGURATION_OPTION_FIELDS, argument)) {
      return this.parseValueOption(commandArguments, argumentIndex, parseResult);
    }
    return null;
  }

  parseJsonOption(argumentIndex, parseResult) {
    if (parseResult.seenOptions.has(JSON_FLAG)) return null;
    parseResult.seenOptions.add(JSON_FLAG);
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

  async runValidation({ currentWorkingDirectoryPath, parseResult }) {
    const requestConfiguration = await this.resolveRequestConfiguration(parseResult);
    if (!requestConfiguration.ok) {
      return this.renderResult(this.buildConfigurationFailure(requestConfiguration), parseResult.json);
    }

    const validationResult = await this.validateProject({
      currentWorkingDirectoryPath,
      requestConfiguration,
    });
    return this.renderValidationResult(validationResult, parseResult.json);
  }

  async resolveRequestConfiguration(parseResult) {
    return await this.personalProjectAuthenticationAdapter.resolveRequestConfiguration({
      explicitApiBaseUrl: parseResult.apiBaseUrl,
      explicitApiKey: parseResult.apiKey,
      explicitShopDomain: parseResult.shopDomain,
    });
  }

  async validateProject({ currentWorkingDirectoryPath, requestConfiguration }) {
    return await this.resolveProjectValidationService().buildAndValidateProject({
      projectDirectoryPath: currentWorkingDirectoryPath,
      projectApiInvocation: {
        apiBaseUrl: requestConfiguration.apiBaseUrl,
        authenticationContext: requestConfiguration.authenticationContext,
      },
    });
  }

  resolveProjectValidationService() {
    this.projectValidationService ??= new ProjectValidationService({
      apiEaseProjectApiClient: new ApiEaseProjectApiClient({
        projectAuthenticationAdapter: this.personalProjectAuthenticationAdapter,
      }),
    });
    return this.projectValidationService;
  }

  renderValidationResult(validationResult, json) {
    const commandResult = this.buildValidationCommandResult(validationResult);
    return this.renderResult(commandResult, json, validationResult.guidance);
  }

  buildValidationCommandResult(validationResult) {
    const sharedFields = {
      command: 'validate',
      outcome: validationResult.outcome,
      diagnostics: validationResult.diagnostics,
      requiredSecureValues: validationResult.requiredSecureValues,
    };
    if (validationResult.ok) {
      return { ...sharedFields, state: 'success', result: validationResult.result };
    }
    return {
      ...sharedFields,
      state: 'failure',
      error: {
        code: validationResult.error.code,
        category: this.resolveAuthoritativeFailureCategory(
          validationResult.validationResponse?.status,
        ),
      },
    };
  }

  resolveAuthoritativeFailureCategory(status) {
    if (status === 401) return 'authentication';
    if (status === 403 || status === 404) return 'authorization';
    if ([400, 413, 415].includes(status)) return 'contract';
    if (status === 422) return 'validation';
    if (status === 409) return 'conflict';
    if ([429, 503].includes(status)) return 'service';
    return 'internal';
  }

  buildUsageFailure() {
    return {
      command: 'validate',
      state: 'failure',
      error: { code: 'PROJECT_VALIDATE_USAGE_INVALID', category: 'usage' },
      diagnostics: [{ code: 'PROJECT_VALIDATE_ARGUMENT_INVALID' }],
    };
  }

  buildConfigurationFailure(configurationFailure) {
    return {
      command: 'validate',
      state: 'failure',
      error: { code: configurationFailure.errorCode, category: 'configuration' },
      diagnostics: (configurationFailure.fieldErrors ?? [])
        .map(({ code, path: fieldPath }) => ({ code, path: fieldPath })),
    };
  }

  buildCommandErrorFailure(error) {
    const errorCode = typeof error?.code === 'string' ? error.code : 'PROJECT_VALIDATE_FAILED';
    return {
      command: 'validate',
      state: 'failure',
      error: { code: errorCode, category: this.resolveCommandErrorCategory(error) },
      diagnostics: error?.diagnostics ?? [{ code: errorCode }],
    };
  }

  resolveCommandErrorCategory(error) {
    if (error?.failureType === 'local-integrity') return 'local-integrity';
    if (error?.failureType === 'contract') return 'contract';
    if (this.isLocalValidationErrorCode(error?.code)) return 'contract';
    return 'internal';
  }

  isLocalValidationErrorCode(errorCode = '') {
    return /^(?:CANONICAL_RESOURCE_SOURCE_|PROJECT_(?:CANDIDATE|DELETION|SECURE_INPUT))/.test(errorCode)
      || errorCode === 'PROJECT_MANAGED_PATH_INVALID';
  }

  renderResult(commandResult, json, guidance = [PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE]) {
    const envelope = this.projectCommandResultService.normalizeResult(commandResult);
    this.projectCommandResultService.renderResult(envelope, { json, guidance });
    return this.projectCommandResultService.resolveExitCode(envelope);
  }
}

export { ValidateProjectCommand };
