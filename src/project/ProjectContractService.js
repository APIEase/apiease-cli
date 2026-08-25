import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

const MAXIMUM_CONTRACT_DIAGNOSTICS = 20;
const CONTRACT_SCHEMA_URL = new URL(
  '../../contracts/apex-projects/v1/project-api-compatibility.schema.json',
  import.meta.url,
);
const PROJECT_ERROR_SCHEMA_DEFINITION = 'projectErrorResponse';
const PROJECT_REQUEST_DEFINITION_BY_ENDPOINT = Object.freeze({
  '/api/v1/projects/apply': 'projectApplyRequest',
  '/api/v1/projects/bootstrap': 'projectBootstrapRequest',
  '/api/v1/projects/design-context': 'projectDesignContextRequest',
  '/api/v1/projects/plan': 'projectPlanRequest',
  '/api/v1/projects/validate': 'projectValidateRequest',
});
const PROJECT_SUCCESS_DEFINITION_BY_ENDPOINT_AND_OUTCOME = Object.freeze({
  '/api/v1/projects/apply': Object.freeze({
    PROJECT_APPLIED: 'projectAppliedResponse',
    PROJECT_APPLY_NO_CHANGE: 'projectApplyNoChangeResponse',
    PROJECT_APPLY_REPLAYED: 'projectApplyReplayedResponse',
  }),
  '/api/v1/projects/bootstrap': Object.freeze({
    PROJECT_BOOTSTRAP_PENDING: 'projectBootstrapPendingResponse',
    PROJECT_BOOTSTRAP_SYNCHRONIZED: 'projectBootstrapSynchronizedResponse',
    PROJECT_BOOTSTRAP_SYNCHRONIZED_NO_RESOURCES:
      'projectBootstrapSynchronizedNoResourcesResponse',
  }),
  '/api/v1/projects/design-context': Object.freeze({
    PROJECT_DESIGN_CONTEXT_READY: 'projectDesignContextResponse',
  }),
  '/api/v1/projects/plan': Object.freeze({
    PROJECT_PLAN_NO_CHANGE: 'projectPlanNoChangeResponse',
    PROJECT_PLAN_READY: 'projectPlanReadyResponse',
  }),
  '/api/v1/projects/validate': Object.freeze({
    PROJECT_VALID: 'projectValidateResponse',
  }),
});

class ProjectContractService {
  constructor() {
    this.contractSchema = this.loadContractSchema();
    this.validatorByDefinition = this.compileNamedDefinitionValidators();
    this.projectErrorOutcomes = new Set(this.contractSchema.$defs.projectErrorCode.enum);
  }

  validateProjectApiRequest(endpoint, document) {
    const schemaDefinition = PROJECT_REQUEST_DEFINITION_BY_ENDPOINT[endpoint];

    return this.validateSupportedDefinition(schemaDefinition, document, 'CONTRACT_ENDPOINT_UNSUPPORTED');
  }

  validateProjectApiResponse(endpoint, document) {
    const schemaDefinition = this.resolveResponseSchemaDefinition(endpoint, document?.outcome);
    const validationResult = this.validateSupportedDefinition(
      schemaDefinition,
      document,
      'CONTRACT_OUTCOME_UNSUPPORTED',
    );

    if (!validationResult.ok || schemaDefinition !== PROJECT_ERROR_SCHEMA_DEFINITION) {
      return validationResult;
    }

    return this.validateMatchingErrorCode(document);
  }

  validateProjectCandidate(candidate) {
    return this.validateFixtureDocument('projectCandidate', candidate);
  }

  validateCanonicalResourceChangeSet(changeSet) {
    return this.validateFixtureDocument('canonicalResourceChangeSet', changeSet);
  }

  validateLocalState(localState) {
    return this.validateFixtureDocument('localState', localState);
  }

  validateFixtureDocument(schemaDefinition, document) {
    return this.validateSupportedDefinition(
      schemaDefinition,
      document,
      'CONTRACT_SCHEMA_DEFINITION_UNSUPPORTED',
    );
  }

  loadContractSchema() {
    return JSON.parse(fs.readFileSync(CONTRACT_SCHEMA_URL, 'utf8'));
  }

  compileNamedDefinitionValidators() {
    const ajv = new Ajv2020({ strict: true });
    ajv.addSchema(this.contractSchema);

    return new Map(Object.keys(this.contractSchema.$defs).map(schemaDefinition => [
      schemaDefinition,
      ajv.getSchema(`${this.contractSchema.$id}#/$defs/${schemaDefinition}`),
    ]));
  }

  resolveResponseSchemaDefinition(endpoint, outcome) {
    const successDefinition = PROJECT_SUCCESS_DEFINITION_BY_ENDPOINT_AND_OUTCOME[endpoint]?.[outcome];

    if (successDefinition) {
      return successDefinition;
    }

    return PROJECT_SUCCESS_DEFINITION_BY_ENDPOINT_AND_OUTCOME[endpoint]
      && this.projectErrorOutcomes.has(outcome)
      ? PROJECT_ERROR_SCHEMA_DEFINITION
      : undefined;
  }

  validateSupportedDefinition(schemaDefinition, document, unsupportedCode) {
    const validator = this.validatorByDefinition.get(schemaDefinition);

    if (!validator) {
      return this.buildFailureResult([{ code: unsupportedCode }]);
    }

    return validator(document)
      ? { ok: true }
      : this.buildFailureResult(this.buildAjvDiagnostics(validator.errors));
  }

  validateMatchingErrorCode(document) {
    return document.outcome === document.error.code
      ? { ok: true }
      : this.buildFailureResult([{
        code: 'CONTRACT_ERROR_CODE_MISMATCH',
        path: '/error/code',
      }]);
  }

  buildAjvDiagnostics(validationErrors = []) {
    return validationErrors.slice(0, MAXIMUM_CONTRACT_DIAGNOSTICS).map(validationError => ({
      code: `CONTRACT_${validationError.keyword.toUpperCase()}`,
      ...(validationError.instancePath ? { path: validationError.instancePath } : {}),
    }));
  }

  buildFailureResult(diagnostics) {
    return {
      ok: false,
      diagnostics: diagnostics.slice(0, MAXIMUM_CONTRACT_DIAGNOSTICS),
    };
  }
}

export {
  MAXIMUM_CONTRACT_DIAGNOSTICS,
  PROJECT_REQUEST_DEFINITION_BY_ENDPOINT,
  PROJECT_SUCCESS_DEFINITION_BY_ENDPOINT_AND_OUTCOME,
  ProjectContractService,
};
