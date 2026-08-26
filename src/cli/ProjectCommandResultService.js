const CLI_RESULT_VERSION = 1;
const MAX_DIAGNOSTIC_COUNT = 100;
const MAX_REQUIRED_SECURE_VALUE_COUNT = 100;
const MAX_SAFE_STRING_LENGTH = 1024;

const PROJECT_CLI_EXIT_CODES = Object.freeze({
  success: 0,
  internal: 1,
  usageOrConfiguration: 2,
  authenticationOrAuthorization: 3,
  validationOrContract: 4,
  conflict: 5,
  localIntegrity: 6,
  serviceOrTransport: 7,
});

const EXIT_CODE_BY_FAILURE_CATEGORY = Object.freeze({
  internal: PROJECT_CLI_EXIT_CODES.internal,
  usage: PROJECT_CLI_EXIT_CODES.usageOrConfiguration,
  configuration: PROJECT_CLI_EXIT_CODES.usageOrConfiguration,
  authentication: PROJECT_CLI_EXIT_CODES.authenticationOrAuthorization,
  authorization: PROJECT_CLI_EXIT_CODES.authenticationOrAuthorization,
  validation: PROJECT_CLI_EXIT_CODES.validationOrContract,
  contract: PROJECT_CLI_EXIT_CODES.validationOrContract,
  conflict: PROJECT_CLI_EXIT_CODES.conflict,
  'local-integrity': PROJECT_CLI_EXIT_CODES.localIntegrity,
  state: PROJECT_CLI_EXIT_CODES.localIntegrity,
  git: PROJECT_CLI_EXIT_CODES.localIntegrity,
  publication: PROJECT_CLI_EXIT_CODES.localIntegrity,
  retry: PROJECT_CLI_EXIT_CODES.serviceOrTransport,
  service: PROJECT_CLI_EXIT_CODES.serviceOrTransport,
  transport: PROJECT_CLI_EXIT_CODES.serviceOrTransport,
});

const AUTHENTICATION_ERROR_CODES = new Set([
  'UNAUTHENTICATED',
  'UNAUTHORIZED',
]);
const CONFLICT_ERROR_CODES = new Set([
  'RESOURCE_ALREADY_EXISTS',
  'RESOURCE_VERSION_CONFLICT',
  'PROJECT_BASELINE_CONFLICT',
  'PROJECT_IDEMPOTENCY_CONFLICT',
  'PROJECT_PROJECTION_CONFLICT',
]);
const SERVICE_ERROR_CODES = new Set([
  'RATE_LIMITED',
  'PROJECT_PROJECTION_UNAVAILABLE',
  'SERVICE_UNAVAILABLE',
  'PROJECT_OPERATION_DEADLINE_EXCEEDED',
  'PROJECT_TRANSPORT_RETRIES_EXHAUSTED',
]);
const CONTRACT_ERROR_CODES = new Set([
  'INVALID_JSON',
  'CONTRACT_INVALID',
  'CONTRACT_VERSION_UNSUPPORTED',
  'CANDIDATE_FORMAT_VERSION_UNSUPPORTED',
  'PAYLOAD_TOO_LARGE',
  'PROJECT_FILE_COUNT_EXCEEDED',
  'PROJECT_FILE_SIZE_EXCEEDED',
  'PROJECT_AGGREGATE_SIZE_EXCEEDED',
  'CONTENT_TYPE_UNSUPPORTED',
  'RESOURCE_VALIDATION_FAILED',
  'PROJECT_CANDIDATE_INVALID',
  'PROJECT_DEPENDENCY_INVALID',
  'PROJECT_SECURE_INPUT_INVALID',
]);
const SAFE_DIAGNOSTIC_FIELDS = Object.freeze([
  'code',
  'path',
  'resourceType',
  'handle',
  'fieldPath',
  'operationIndex',
]);
const FORBIDDEN_RESULT_KEY_PATTERN = /(?:api[-_]?key|authentication|provider[-_]?body|secret|stack|secureInputs|headers|^message$|^value$)/i;

class ProjectCommandResultService {
  constructor({
    stdout = process.stdout,
    stderr = process.stderr,
  } = {}) {
    this.stdout = stdout;
    this.stderr = stderr;
  }

  normalizeResult(commandResult) {
    this.requireValidCommandResult(commandResult);
    const envelope = this.buildEnvelope(commandResult);
    const normalizedResult = this.normalizeSafeResult(commandResult.result);
    const normalizedError = this.normalizeError(commandResult.error);
    if (normalizedResult !== undefined) envelope.result = normalizedResult;
    if (normalizedError !== undefined) envelope.error = normalizedError;
    envelope.diagnostics = this.normalizeDiagnostics(commandResult.diagnostics);
    envelope.requiredSecureValues = this.normalizeRequiredSecureValues(
      commandResult.requiredSecureValues,
    );
    return envelope;
  }

  buildEnvelope({ command, state, outcome }) {
    const envelope = { cliResultVersion: CLI_RESULT_VERSION, command, state };
    if (typeof outcome === 'string' && outcome.length > 0) envelope.outcome = outcome;
    return envelope;
  }

  requireValidCommandResult(commandResult) {
    if (!commandResult || typeof commandResult.command !== 'string') {
      throw new TypeError('Project command result requires a command.');
    }
    if (!['success', 'accepted', 'failure'].includes(commandResult.state)) {
      throw new TypeError('Project command result state is invalid.');
    }
  }

  normalizeError(error) {
    if (!error || typeof error.code !== 'string' || error.code.length === 0) return undefined;
    const normalizedError = { code: this.normalizeSafeString(error.code, 256) };
    if (Object.hasOwn(EXIT_CODE_BY_FAILURE_CATEGORY, error.category)) {
      normalizedError.category = error.category;
    }
    return normalizedError;
  }

  normalizeDiagnostics(diagnostics = []) {
    const safeDiagnostics = diagnostics
      .map(diagnostic => this.normalizeDiagnostic(diagnostic))
      .filter(Boolean);
    return this.sortDeduplicateAndBound(safeDiagnostics, MAX_DIAGNOSTIC_COUNT);
  }

  normalizeDiagnostic(diagnostic) {
    if (!diagnostic || typeof diagnostic.code !== 'string' || diagnostic.code.length === 0) {
      return null;
    }
    return Object.fromEntries(SAFE_DIAGNOSTIC_FIELDS
      .filter(fieldName => this.isSafeDiagnosticField(diagnostic, fieldName))
      .map(fieldName => [fieldName, this.normalizeDiagnosticField(diagnostic[fieldName])]));
  }

  isSafeDiagnosticField(diagnostic, fieldName) {
    const fieldValue = diagnostic[fieldName];
    return typeof fieldValue === 'string'
      || (fieldName === 'operationIndex' && Number.isInteger(fieldValue) && fieldValue >= 0);
  }

  normalizeDiagnosticField(fieldValue) {
    return typeof fieldValue === 'string'
      ? this.normalizeSafeString(fieldValue, 256)
      : fieldValue;
  }

  normalizeRequiredSecureValues(requiredSecureValues = []) {
    const safeSelectors = requiredSecureValues
      .map(selector => this.normalizeRequiredSecureValue(selector))
      .filter(Boolean);
    return this.sortDeduplicateAndBound(safeSelectors, MAX_REQUIRED_SECURE_VALUE_COUNT);
  }

  normalizeRequiredSecureValue(selector) {
    if (!this.hasCompleteSecureValueSelector(selector)) return null;
    return {
      resourceType: this.normalizeSafeString(selector.resourceType, 256),
      handle: this.normalizeSafeString(selector.handle, 256),
      fieldPath: this.normalizeSafeString(selector.fieldPath, MAX_SAFE_STRING_LENGTH),
    };
  }

  hasCompleteSecureValueSelector(selector) {
    return selector
      && ['resourceType', 'handle', 'fieldPath'].every(fieldName => (
        typeof selector[fieldName] === 'string' && selector[fieldName].length > 0
      ));
  }

  sortDeduplicateAndBound(values, maximumCount) {
    const serializedValues = values.map(value => JSON.stringify(value));
    return [...new Set(serializedValues)].sort()
      .slice(0, maximumCount)
      .map(serializedValue => JSON.parse(serializedValue));
  }

  normalizeSafeResult(result) {
    if (result === undefined) return undefined;
    return this.normalizeSafeResultValue(result);
  }

  normalizeSafeResultValue(value) {
    if (typeof value === 'string') return this.normalizeSafeString(value);
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
    if (Array.isArray(value)) return value.map(item => this.normalizeSafeResultValue(item));
    if (!value || typeof value !== 'object') return undefined;
    return this.normalizeSafeResultObject(value);
  }

  normalizeSafeResultObject(value) {
    return Object.fromEntries(Object.entries(value)
      .filter(([fieldName]) => !FORBIDDEN_RESULT_KEY_PATTERN.test(fieldName))
      .map(([fieldName, fieldValue]) => [fieldName, this.normalizeSafeResultValue(fieldValue)])
      .filter(([, fieldValue]) => fieldValue !== undefined));
  }

  normalizeSafeString(value, maximumLength = MAX_SAFE_STRING_LENGTH) {
    return value.slice(0, maximumLength);
  }

  resolveExitCode(envelope) {
    if (envelope.state === 'success' || envelope.state === 'accepted') {
      return PROJECT_CLI_EXIT_CODES.success;
    }
    const categoryExitCode = EXIT_CODE_BY_FAILURE_CATEGORY[envelope.error?.category];
    return categoryExitCode ?? this.inferExitCodeFromErrorCode(envelope.error?.code);
  }

  inferExitCodeFromErrorCode(errorCode) {
    if (AUTHENTICATION_ERROR_CODES.has(errorCode)) return PROJECT_CLI_EXIT_CODES.authenticationOrAuthorization;
    if (CONFLICT_ERROR_CODES.has(errorCode)) return PROJECT_CLI_EXIT_CODES.conflict;
    if (CONTRACT_ERROR_CODES.has(errorCode)) return PROJECT_CLI_EXIT_CODES.validationOrContract;
    if (SERVICE_ERROR_CODES.has(errorCode)) return PROJECT_CLI_EXIT_CODES.serviceOrTransport;
    if (/^(?:PROJECT_)?(?:LOCAL|STATE|GIT|CHECKOUT|MANAGED|PUBLICATION)/.test(errorCode ?? '')) {
      return PROJECT_CLI_EXIT_CODES.localIntegrity;
    }
    return PROJECT_CLI_EXIT_CODES.internal;
  }

  renderResult(envelope, { json = false, progress = [], guidance = [] } = {}) {
    this.writeMessagesToStderr(progress);
    if (json) {
      this.writeMessagesToStderr(guidance);
      this.stdout.write(`${JSON.stringify(envelope)}\n`);
      return;
    }
    this.writeHumanResult(envelope);
    this.writeMessagesToStderr(guidance);
  }

  buildSkippedResourceGuidance(skippedResources = []) {
    return skippedResources.map(resource => this.buildSkippedResourceMessage(resource));
  }

  buildSkippedResourceMessage(resource) {
    const identity = resource.handle ?? resource.resourceId;
    const location = resource.path ? ` (${resource.path})` : '';
    const codes = resource.diagnostics.map(diagnostic => diagnostic.code).join(', ');
    return `Skipped ${resource.resourceType} ${identity}${location}: ${codes}. `
      + 'The APIEase record was not deleted.';
  }

  writeMessagesToStderr(messages) {
    messages.filter(message => typeof message === 'string')
      .forEach(message => this.stderr.write(`${this.normalizeSafeString(message)}\n`));
  }

  writeHumanResult(envelope) {
    const outputStream = envelope.state === 'failure' ? this.stderr : this.stdout;
    outputStream.write(`${this.buildHumanSummary(envelope)}\n`);
  }

  buildHumanSummary(envelope) {
    const outcome = envelope.outcome ?? envelope.error?.code;
    return outcome
      ? `${envelope.command}: ${envelope.state} (${outcome})`
      : `${envelope.command}: ${envelope.state}`;
  }
}

export {
  CLI_RESULT_VERSION,
  PROJECT_CLI_EXIT_CODES,
  ProjectCommandResultService,
};
