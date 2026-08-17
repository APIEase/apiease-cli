import { ProjectCandidateBuilder } from './ProjectCandidateBuilder.js';

const MAXIMUM_PROJECT_VALIDATION_ITEMS = 100;
const PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE =
  'Validation did not execute resources or verify external runtime behavior.';
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
    projectCandidateBuilder = new ProjectCandidateBuilder(),
  } = {}) {
    this.apiEaseProjectApiClient = apiEaseProjectApiClient;
    this.projectCandidateBuilder = projectCandidateBuilder;
  }

  async buildAndValidateProject({ projectDirectoryPath, projectApiInvocation }) {
    const candidateBuildResult = await this.projectCandidateBuilder.buildCandidate({
      projectDirectoryPath,
    });

    return await this.validateCandidate({ candidateBuildResult, projectApiInvocation });
  }

  async validateCandidate({ candidateBuildResult, projectApiInvocation }) {
    const validationResponse = await this.apiEaseProjectApiClient.validateProject({
      ...projectApiInvocation,
      request: { contractVersion: 1, candidate: candidateBuildResult.candidate },
    });
    this.requireExpectedSuccessOutcome(validationResponse);

    return this.buildValidationResult(candidateBuildResult, validationResponse);
  }

  requireExpectedSuccessOutcome(validationResponse) {
    if (!validationResponse.ok || validationResponse.outcome === 'PROJECT_VALID') return;

    throw buildValidationError('PROJECT_VALIDATION_OUTCOME_INVALID');
  }

  buildValidationResult(candidateBuildResult, validationResponse) {
    const diagnostics = this.normalizeDiagnostics(validationResponse);
    const requiredSecureValues = this.normalizeRequiredSecureValues(
      candidateBuildResult,
      validationResponse,
    );

    return {
      candidateBuildResult,
      validationResponse,
      ok: validationResponse.ok,
      outcome: validationResponse.outcome,
      result: validationResponse.ok ? validationResponse.result : null,
      error: validationResponse.ok ? null : validationResponse.error,
      diagnostics,
      requiredSecureValues,
      guidance: [PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE],
    };
  }

  normalizeDiagnostics(validationResponse) {
    const diagnostics = validationResponse.ok
      ? validationResponse.result?.diagnostics
      : validationResponse.error?.diagnostics;

    return normalizeSafeItems(diagnostics, SAFE_DIAGNOSTIC_FIELDS);
  }

  normalizeRequiredSecureValues(candidateBuildResult, validationResponse) {
    return normalizeSafeItems([
      ...(candidateBuildResult.requiredSecureValues ?? []),
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
  PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE,
  ProjectValidationService,
};
