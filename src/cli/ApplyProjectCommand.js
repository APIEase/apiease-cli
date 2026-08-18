import { PersonalProjectAuthenticationAdapter } from '../auth/PersonalProjectAuthenticationAdapter.js';
import { ProjectApplyRequestPolicy } from '../project/ProjectApplyRequestPolicy.js';
import { ProjectApplyService } from '../project/ProjectApplyService.js';
import { ProjectCommandResultService } from './ProjectCommandResultService.js';

const JSON_FLAG = '--json';
const REQUIRE_APPROVAL_FLAG = '--require-approval';
const PROJECT_CONFIGURATION_OPTION_FIELDS = Object.freeze({
  '--api-key': 'apiKey',
  '--base-url': 'apiBaseUrl',
  '--shop-domain': 'shopDomain',
});

class ApplyProjectCommand {
  constructor({
    personalProjectAuthenticationAdapter = new PersonalProjectAuthenticationAdapter(),
    projectApplyService,
    stdout = process.stdout,
    stderr = process.stderr,
    projectCommandResultService = new ProjectCommandResultService({ stdout, stderr }),
  } = {}) {
    this.personalProjectAuthenticationAdapter = personalProjectAuthenticationAdapter;
    this.projectApplyService = projectApplyService;
    this.projectCommandResultService = projectCommandResultService;
  }

  async run(commandArguments = [], { currentWorkingDirectoryPath = process.cwd() } = {}) {
    const parseResult = this.parseCommandArguments(commandArguments);
    if (!parseResult.ok) return this.renderResult(this.buildUsageFailure(), parseResult.json);

    try {
      return await this.runApply({ currentWorkingDirectoryPath, parseResult });
    } catch (error) {
      return this.renderResult(this.buildCommandErrorFailure(error), parseResult.json);
    }
  }

  parseCommandArguments(commandArguments) {
    const parseResult = this.buildParseResult(commandArguments);
    if (commandArguments[0] !== 'apply') return this.buildParseFailure(commandArguments);

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
      requireApproval: false,
      seenOptions: new Set(),
    };
  }

  parseOption(commandArguments, argumentIndex, parseResult) {
    const argument = commandArguments[argumentIndex];
    if ([JSON_FLAG, REQUIRE_APPROVAL_FLAG].includes(argument)) {
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
    if (argument === REQUIRE_APPROVAL_FLAG) parseResult.requireApproval = true;
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

  async runApply({ currentWorkingDirectoryPath, parseResult }) {
    const applyResult = await this.resolveProjectApplyService().applyProject({
      projectDirectoryPath: currentWorkingDirectoryPath,
      requireApproval: parseResult.requireApproval,
      configurationOptions: this.buildConfigurationOptions(parseResult),
    });
    return this.renderApplyResult(applyResult, parseResult.json);
  }

  buildConfigurationOptions(parseResult) {
    const configurationOptions = {
      explicitApiBaseUrl: parseResult.apiBaseUrl,
      explicitApiKey: parseResult.apiKey,
      explicitShopDomain: parseResult.shopDomain,
    };
    return parseResult.requireApproval && Object.values(configurationOptions).every(
      optionValue => optionValue === undefined,
    ) ? {} : configurationOptions;
  }

  resolveProjectApplyService() {
    this.projectApplyService ??= new ProjectApplyService({
      projectApplyRequestPolicy: new ProjectApplyRequestPolicy({
        personalProjectAuthenticationAdapter: this.personalProjectAuthenticationAdapter,
      }),
    });
    return this.projectApplyService;
  }

  renderApplyResult(applyResult, json) {
    const commandResult = this.buildApplyCommandResult(applyResult);
    return this.renderResult(commandResult, json, applyResult.guidance);
  }

  buildApplyCommandResult(applyResult) {
    const commandResult = {
      command: 'apply',
      state: applyResult.state,
      outcome: applyResult.outcome,
      diagnostics: applyResult.diagnostics,
      requiredSecureValues: applyResult.requiredSecureValues,
    };
    if (applyResult.plan) commandResult.result = this.buildApplyResult(applyResult);
    if (!applyResult.ok) commandResult.error = applyResult.error;
    return commandResult;
  }

  buildApplyResult(applyResult) {
    const result = { plan: applyResult.plan };
    if (applyResult.receipt) result.receipt = applyResult.receipt;
    if (applyResult.proposal) result.proposal = applyResult.proposal;
    return result;
  }

  buildUsageFailure() {
    return {
      command: 'apply',
      state: 'failure',
      error: { code: 'PROJECT_APPLY_USAGE_INVALID', category: 'usage' },
      diagnostics: [{ code: 'PROJECT_APPLY_ARGUMENT_INVALID' }],
    };
  }

  buildCommandErrorFailure(error) {
    const errorCode = typeof error?.code === 'string' ? error.code : 'PROJECT_APPLY_FAILED';
    return {
      command: 'apply',
      state: 'failure',
      error: { code: errorCode, category: this.resolveCommandErrorCategory(error) },
      diagnostics: error?.diagnostics ?? [{ code: errorCode }],
    };
  }

  resolveCommandErrorCategory(error) {
    if (error?.failureType === 'local-integrity') return 'local-integrity';
    if (error?.failureType === 'contract') return 'contract';
    if (error?.failureType === 'transport') return 'transport';
    if (/^PROJECT_(?:CHECKOUT|GIT|LOCAL|MANAGED|PUBLICATION)/.test(error?.code ?? '')) {
      return 'local-integrity';
    }
    return 'internal';
  }

  renderResult(commandResult, json, guidance = []) {
    const envelope = this.projectCommandResultService.normalizeResult(commandResult);
    const progress = json ? [] : this.buildHumanPlanProgress(envelope);
    this.projectCommandResultService.renderResult(envelope, { json, progress, guidance });
    return this.projectCommandResultService.resolveExitCode(envelope);
  }

  buildHumanPlanProgress(envelope) {
    return envelope.result?.plan ? [`Plan: ${JSON.stringify(envelope.result.plan)}`] : [];
  }
}

export { ApplyProjectCommand };
