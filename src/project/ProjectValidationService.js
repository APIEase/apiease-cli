import { ProjectChangeSetBuilder } from './ProjectChangeSetBuilder.js';

const MAXIMUM_PROJECT_VALIDATION_ITEMS = 100;
const PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE =
  'Validation did not execute resources or verify external runtime behavior.';
const PROJECT_REQUIRED_SECURE_VALUES_GUIDANCE =
  'Configure every deferred secure value in the authenticated APIEase UI before runtime use.';
const SAFE_DIAGNOSTIC_FIELDS = Object.freeze([
  'code',
  'path',
  'resourceType',
  'handle',
  'fieldPath',
  'operationIndex',
]);
const SAFE_SECURE_VALUE_FIELDS = Object.freeze(['resourceType', 'handle', 'fieldPath']);

class ProjectValidationService {
  constructor({
    apiEaseProjectApiClient,
    projectChangeSetBuilder = new ProjectChangeSetBuilder(),
  } = {}) {
    this.apiEaseProjectApiClient = apiEaseProjectApiClient;
    this.projectChangeSetBuilder = projectChangeSetBuilder;
  }

  async buildAndValidateProject({ projectDirectoryPath, projectApiInvocation }) {
    const changeSetBuildResult = await this.projectChangeSetBuilder.buildChangeSet({
      projectDirectoryPath,
    });

    return await this.validateChangeSet({ changeSetBuildResult, projectApiInvocation });
  }

  async validateChangeSet({ changeSetBuildResult, projectApiInvocation }) {
    const validationResponse = await this.apiEaseProjectApiClient.validateProject({
      ...projectApiInvocation,
      request: { contractVersion: 1, changeSet: changeSetBuildResult.changeSet },
    });
    this.requireExpectedSuccessOutcome(validationResponse);

    return this.buildValidationResult(changeSetBuildResult, validationResponse);
  }

  requireExpectedSuccessOutcome(validationResponse) {
    if (!validationResponse.ok || validationResponse.outcome === 'PROJECT_VALID') return;

    throw buildValidationError('PROJECT_VALIDATION_OUTCOME_INVALID');
  }

  buildValidationResult(changeSetBuildResult, validationResponse) {
    const diagnostics = this.normalizeDiagnostics(validationResponse);
    const requiredSecureValues = this.normalizeRequiredSecureValues(
      changeSetBuildResult,
      validationResponse,
    );

    return {
      changeSetBuildResult,
      validationResponse,
      ok: validationResponse.ok,
      outcome: validationResponse.outcome,
      result: validationResponse.ok ? validationResponse.result : null,
      error: validationResponse.ok ? null : validationResponse.error,
      diagnostics,
      requiredSecureValues,
      guidance: this.buildGuidance(requiredSecureValues),
    };
  }

  buildGuidance(requiredSecureValues) {
    return requiredSecureValues.length > 0
      ? [PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE, PROJECT_REQUIRED_SECURE_VALUES_GUIDANCE]
      : [PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE];
  }

  normalizeDiagnostics(validationResponse) {
    const diagnostics = validationResponse.ok
      ? validationResponse.result?.diagnostics
      : validationResponse.error?.diagnostics;

    return normalizeSafeItems(diagnostics, SAFE_DIAGNOSTIC_FIELDS);
  }

  normalizeRequiredSecureValues(changeSetBuildResult, validationResponse) {
    return normalizeSafeItems([
      ...(changeSetBuildResult.requiredSecureValues ?? []),
      ...(validationResponse.result?.requiredSecureValues ?? []),
      ...(validationResponse.error?.requiredSecureValues ?? []),
    ], SAFE_SECURE_VALUE_FIELDS);
  }
}

function normalizeSafeItems(items = [], safeFields) {
  const normalizedItems = items
    .map(item => copySafeFields(item, safeFields))
    .filter(item => item !== null);

  return [...new Map(normalizedItems.map(item => [JSON.stringify(item), item])).values()]
    .sort(compareCanonicalValues)
    .slice(0, MAXIMUM_PROJECT_VALIDATION_ITEMS);
}

function copySafeFields(item, safeFields) {
  if (!item || typeof item !== 'object') return null;
  const safeEntries = safeFields
    .filter(fieldName => isSafeFieldValue(item[fieldName]))
    .map(fieldName => [fieldName, item[fieldName]]);

  return safeEntries.length > 0 ? Object.fromEntries(safeEntries) : null;
}

function isSafeFieldValue(fieldValue) {
  return typeof fieldValue === 'string' || Number.isSafeInteger(fieldValue);
}

function compareCanonicalValues(leftValue, rightValue) {
  return JSON.stringify(leftValue).localeCompare(JSON.stringify(rightValue));
}

function buildValidationError(code) {
  const error = new Error(code);
  error.code = code;
  error.diagnostics = [{ code }];
  error.failureType = 'contract';

  return error;
}

export {
  MAXIMUM_PROJECT_VALIDATION_ITEMS,
  PROJECT_REQUIRED_SECURE_VALUES_GUIDANCE,
  PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE,
  ProjectValidationService,
};
