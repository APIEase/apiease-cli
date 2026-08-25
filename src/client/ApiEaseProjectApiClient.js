import { createHash } from 'node:crypto';

import { ProjectContractService } from '../project/ProjectContractService.js';
import {
  PROJECT_BEARER_AUTHENTICATION_ACTIONS,
} from '../auth/ProjectBearerAuthenticationContract.js';

const PROJECT_API_ENDPOINTS = Object.freeze({
  apply: '/api/v1/projects/apply',
  bootstrap: '/api/v1/projects/bootstrap',
  checkpointPublish: '/api/v1/projects/checkpoints/publish',
  checkpointRetrieve: '/api/v1/projects/checkpoints/retrieve',
  designContext: '/api/v1/projects/design-context',
  plan: '/api/v1/projects/plan',
  proposalSubmit: '/api/v1/projects/apply',
  pull: '/api/v1/projects/bootstrap',
  validate: '/api/v1/projects/validate',
});
const PROJECT_API_ACTION_BY_OPERATION = Object.freeze({
  bootstrap: PROJECT_BEARER_AUTHENTICATION_ACTIONS.bootstrap,
  checkpointPublish: PROJECT_BEARER_AUTHENTICATION_ACTIONS.checkpointPublish,
  checkpointRetrieve: PROJECT_BEARER_AUTHENTICATION_ACTIONS.checkpointRetrieve,
  plan: PROJECT_BEARER_AUTHENTICATION_ACTIONS.plan,
  proposalSubmit: PROJECT_BEARER_AUTHENTICATION_ACTIONS.proposalSubmit,
  pull: PROJECT_BEARER_AUTHENTICATION_ACTIONS.pull,
  validate: PROJECT_BEARER_AUTHENTICATION_ACTIONS.validate,
});
const PROJECT_API_STATUS_BY_OUTCOME = Object.freeze({
  PROJECT_APPLIED: 200,
  PROJECT_APPLY_NO_CHANGE: 200,
  PROJECT_APPLY_REPLAYED: 200,
  PROJECT_BOOTSTRAP_SYNCHRONIZED: 200,
  PROJECT_BOOTSTRAP_SYNCHRONIZED_NO_RESOURCES: 200,
  PROJECT_CHECKPOINT_PUBLISHED: 200,
  PROJECT_CHECKPOINT_RETRIEVED: 200,
  PROJECT_DESIGN_CONTEXT_READY: 200,
  PROJECT_PLAN_NO_CHANGE: 200,
  PROJECT_PLAN_READY: 200,
  PROJECT_PROPOSAL_ACCEPTED: 202,
  PROJECT_PROPOSAL_REJECTED: 200,
  PROJECT_VALID: 200,
  INVALID_JSON: 400,
  CONTRACT_INVALID: 400,
  CONTRACT_VERSION_UNSUPPORTED: 400,
  CANDIDATE_FORMAT_VERSION_UNSUPPORTED: 400,
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 403,
  PROJECT_WORKER_AUTHORITY_UNAVAILABLE: 403,
  PROJECT_NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  RESOURCE_ALREADY_EXISTS: 409,
  RESOURCE_VERSION_CONFLICT: 409,
  PROJECT_BASELINE_CONFLICT: 409,
  PROJECT_IDEMPOTENCY_CONFLICT: 409,
  PROJECT_CHECKPOINT_CONFLICT: 409,
  PROJECT_PROPOSAL_CANCELLED: 409,
  PROJECT_PROPOSAL_STALE: 409,
  PROJECT_PROPOSAL_SUPERSEDED: 409,
  PROJECT_PROJECTION_CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  PROJECT_FILE_COUNT_EXCEEDED: 413,
  PROJECT_FILE_SIZE_EXCEEDED: 413,
  PROJECT_AGGREGATE_SIZE_EXCEEDED: 413,
  CONTENT_TYPE_UNSUPPORTED: 415,
  RESOURCE_VALIDATION_FAILED: 422,
  PROJECT_CANDIDATE_INVALID: 422,
  PROJECT_DEPENDENCY_INVALID: 422,
  PROJECT_SECURE_INPUT_INVALID: 422,
  PROJECT_CHECKPOINT_INVALID: 422,
  RATE_LIMITED: 429,
  PROJECT_PROJECTION_UNAVAILABLE: 503,
  SERVICE_UNAVAILABLE: 503,
  WORKER_CAPABILITY_ACTION_FORBIDDEN: 403,
  WORKER_CAPABILITY_CANCELLED: 403,
  WORKER_CAPABILITY_CONTEXT_MISMATCH: 403,
  WORKER_CAPABILITY_EXPIRED: 401,
  WORKER_CAPABILITY_INVALID_SIGNATURE: 401,
  WORKER_CAPABILITY_MALFORMED: 401,
  WORKER_CAPABILITY_NOT_YET_VALID: 401,
  WORKER_CAPABILITY_REPLAY: 403,
  WORKER_CAPABILITY_REVOKED: 403,
  WORKER_CAPABILITY_STALE_FENCE: 403,
});
const DEFAULT_PROJECT_API_RETRY_SETTINGS = Object.freeze({
  maximumRetries: 3,
  backoffMilliseconds: Object.freeze([250, 500, 1000]),
});
const DEFAULT_PROJECT_API_OPERATION_LIMITS = Object.freeze({
  apply: Object.freeze({
    requestTimeoutMilliseconds: 120000,
    overallDeadlineMilliseconds: 600000,
  }),
  bootstrap: Object.freeze({
    requestTimeoutMilliseconds: 120000,
    overallDeadlineMilliseconds: 900000,
  }),
  checkpointPublish: Object.freeze({
    requestTimeoutMilliseconds: 120000,
    overallDeadlineMilliseconds: 600000,
  }),
  checkpointRetrieve: Object.freeze({
    requestTimeoutMilliseconds: 120000,
    overallDeadlineMilliseconds: 600000,
  }),
  designContext: Object.freeze({
    requestTimeoutMilliseconds: 120000,
    overallDeadlineMilliseconds: 300000,
  }),
  plan: Object.freeze({
    requestTimeoutMilliseconds: 60000,
    overallDeadlineMilliseconds: 300000,
  }),
  proposalSubmit: Object.freeze({
    requestTimeoutMilliseconds: 120000,
    overallDeadlineMilliseconds: 600000,
  }),
  pull: Object.freeze({
    requestTimeoutMilliseconds: 120000,
    overallDeadlineMilliseconds: 900000,
  }),
  validate: Object.freeze({
    requestTimeoutMilliseconds: 60000,
    overallDeadlineMilliseconds: 300000,
  }),
});
const JSON_CONTENT_TYPE_PATTERN = /^application\/json(?:\s*;|$)/i;

class ApiEaseProjectApiClient {
  constructor({
    projectContractService = new ProjectContractService(),
    projectAuthenticationAdapter,
    fetchImplementation = globalThis.fetch,
    delayImplementation = defaultDelayImplementation,
    clock = Date,
    abortTimeoutImplementation = defaultAbortTimeoutImplementation,
    retrySettings = DEFAULT_PROJECT_API_RETRY_SETTINGS,
    operationLimits = DEFAULT_PROJECT_API_OPERATION_LIMITS,
  } = {}) {
    this.projectContractService = projectContractService;
    this.projectAuthenticationAdapter = projectAuthenticationAdapter;
    this.fetchImplementation = fetchImplementation;
    this.delayImplementation = delayImplementation;
    this.clock = clock;
    this.abortTimeoutImplementation = abortTimeoutImplementation;
    this.retrySettings = retrySettings;
    this.operationLimits = operationLimits;
  }

  async bootstrapProject(invocation) {
    return await this.executeProjectRequest('bootstrap', invocation);
  }

  async pullProject(invocation) {
    return await this.executeProjectRequest('pull', invocation);
  }

  async validateProject(invocation) {
    return await this.executeProjectRequest('validate', invocation);
  }

  async retrieveProjectDesignContext(invocation) {
    return await this.executeProjectRequest('designContext', invocation);
  }

  async planProject(invocation) {
    return await this.executeProjectRequest('plan', invocation);
  }

  async applyProject(invocation) {
    return await this.executeProjectRequest('apply', invocation);
  }

  async publishProjectCheckpoint(invocation) {
    return await this.executeProjectRequest('checkpointPublish', invocation);
  }

  async retrieveProjectCheckpoint(invocation) {
    return await this.executeProjectRequest('checkpointRetrieve', invocation);
  }

  async submitProjectProposal(invocation) {
    return await this.executeProjectRequest('proposalSubmit', invocation);
  }

  async executeProjectRequest(operationName, { apiBaseUrl, authenticationContext, request }) {
    const endpoint = PROJECT_API_ENDPOINTS[operationName];
    const requestValidation = this.validateRequest(endpoint, request);
    if (!requestValidation.ok) {
      return this.buildContractFailure(requestValidation.diagnostics);
    }

    const serializedBody = JSON.stringify(request);
    const headers = await this.buildPersonalRequestHeaders(authenticationContext);
    const deadline = this.clock.now()
      + this.operationLimits[operationName].overallDeadlineMilliseconds;

    return await this.executeAttempts({
      operationName,
      endpoint,
      url: this.buildEndpointUrl(apiBaseUrl, endpoint),
      serializedBody,
      headers,
      authenticationContext,
      authenticationAction: PROJECT_API_ACTION_BY_OPERATION[operationName],
      deadline,
    });
  }

  validateRequest(endpoint, request) {
    try {
      return this.projectContractService.validateProjectApiRequest(endpoint, request);
    } catch {
      return { ok: false, diagnostics: [{ code: 'PROJECT_REQUEST_CONTRACT_INVALID' }] };
    }
  }

  buildRequestHeaders(authenticationContext) {
    return this.buildHeadersWithJsonContentType(
      this.projectAuthenticationAdapter.buildRequestHeaders(authenticationContext),
    );
  }

  async buildPersonalRequestHeaders(authenticationContext) {
    if (this.projectAuthenticationAdapter.readAuthorityMode() !== 'personal') {
      return null;
    }
    return this.buildRequestHeaders(authenticationContext);
  }

  async buildAttemptRequestHeaders(requestContext) {
    if (requestContext.headers) return requestContext.headers;
    const authenticationHeaders = await this.projectAuthenticationAdapter.buildRequestHeaders(
      requestContext.authenticationContext,
      { action: requestContext.authenticationAction },
    );
    return this.buildHeadersWithJsonContentType(authenticationHeaders);
  }

  buildHeadersWithJsonContentType(authenticationHeaders) {
    return {
      ...authenticationHeaders,
      'content-type': 'application/json',
    };
  }

  buildEndpointUrl(apiBaseUrl, endpoint) {
    return `${apiBaseUrl.replace(/\/+$/, '')}${endpoint}`;
  }

  async executeAttempts(requestContext) {
    let retryCount = 0;

    while (this.hasDeadlineRemaining(requestContext.deadline)) {
      const attemptResult = await this.executeAttempt(requestContext);
      if (attemptResult.kind === 'response') {
        return attemptResult.result;
      }

      if (retryCount >= this.retrySettings.maximumRetries) {
        return attemptResult.kind === 'retryableResponse'
          ? attemptResult.result
          : this.buildTransportFailure('PROJECT_TRANSPORT_RETRIES_EXHAUSTED');
      }

      const retryDelay = this.resolveRetryDelay(attemptResult, retryCount);
      const didWait = await this.waitWithinDeadline(retryDelay, requestContext.deadline);
      if (!didWait) {
        return this.buildTransportFailure('PROJECT_OPERATION_DEADLINE_EXCEEDED');
      }
      retryCount += 1;
    }

    return this.buildTransportFailure('PROJECT_OPERATION_DEADLINE_EXCEEDED');
  }

  async executeAttempt(requestContext) {
    const remainingMilliseconds = requestContext.deadline - this.clock.now();
    const operationLimit = this.operationLimits[requestContext.operationName];
    const timeoutMilliseconds = Math.min(
      operationLimit.requestTimeoutMilliseconds,
      remainingMilliseconds,
    );

    try {
      const headers = await this.buildAttemptRequestHeaders(requestContext);
      const response = await this.fetchImplementation(requestContext.url, {
        method: 'POST',
        headers,
        body: requestContext.serializedBody,
        signal: this.abortTimeoutImplementation(timeoutMilliseconds),
      });
      return await this.readResponse(requestContext.endpoint, response);
    } catch {
      return { kind: 'transportFailure' };
    }
  }

  async readResponse(endpoint, response) {
    if (!JSON_CONTENT_TYPE_PATTERN.test(response.headers.get('content-type') ?? '')) {
      return this.buildInvalidResponse('PROJECT_RESPONSE_CONTENT_TYPE_INVALID');
    }

    const responseDocument = await this.parseResponseDocument(response);
    if (!responseDocument) {
      return this.buildInvalidResponse('PROJECT_RESPONSE_JSON_INVALID');
    }

    const responseValidation = this.projectContractService.validateProjectApiResponse(
      endpoint,
      responseDocument,
    );
    if (!responseValidation.ok) {
      return this.buildInvalidResponse('PROJECT_RESPONSE_CONTRACT_INVALID');
    }

    if (PROJECT_API_STATUS_BY_OUTCOME[responseDocument.outcome] !== response.status) {
      return this.buildInvalidResponse('PROJECT_RESPONSE_STATUS_INVALID');
    }

    if (!this.hasValidProjectDesignProtocolDigest(endpoint, responseDocument)) {
      return this.buildInvalidResponse('PROJECT_DESIGN_PROTOCOL_DIGEST_MISMATCH');
    }

    return this.classifyValidResponse(response, responseDocument);
  }

  hasValidProjectDesignProtocolDigest(endpoint, responseDocument) {
    if (endpoint !== PROJECT_API_ENDPOINTS.designContext || !responseDocument.ok) return true;
    const protocol = responseDocument.result.protocol;
    const digest = createHash('sha256').update(protocol.commonInstructions, 'utf8').digest('hex');
    return protocol.commonInstructionDigest === `sha256:${digest}`;
  }

  async parseResponseDocument(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  classifyValidResponse(response, responseDocument) {
    const result = { status: response.status, ...responseDocument };
    if (response.status === 429 || response.status === 503) {
      return {
        kind: 'retryableResponse',
        result,
        retryAfterHeader: response.headers.get('retry-after'),
      };
    }

    return { kind: 'response', result };
  }

  resolveRetryDelay(attemptResult, retryCount) {
    if (attemptResult.result?.status === 429) {
      return this.parseRetryAfterMilliseconds(attemptResult.retryAfterHeader)
        ?? this.readBackoffMilliseconds(retryCount);
    }

    return this.readBackoffMilliseconds(retryCount);
  }

  parseRetryAfterMilliseconds(retryAfterHeader) {
    if (!retryAfterHeader) {
      return null;
    }

    if (/^\d+$/.test(retryAfterHeader.trim())) {
      return Number(retryAfterHeader.trim()) * 1000;
    }

    const retryTimestamp = Date.parse(retryAfterHeader);
    return Number.isFinite(retryTimestamp)
      ? Math.max(0, retryTimestamp - this.clock.now())
      : null;
  }

  readBackoffMilliseconds(retryCount) {
    return this.retrySettings.backoffMilliseconds[
      Math.min(retryCount, this.retrySettings.backoffMilliseconds.length - 1)
    ];
  }

  async waitWithinDeadline(delayMilliseconds, deadline) {
    if (delayMilliseconds > deadline - this.clock.now()) {
      return false;
    }

    await this.delayImplementation(delayMilliseconds);
    return true;
  }

  hasDeadlineRemaining(deadline) {
    return deadline > this.clock.now();
  }

  buildInvalidResponse(diagnosticCode) {
    return {
      kind: 'response',
      result: this.buildContractFailure([{ code: diagnosticCode }]),
    };
  }

  buildContractFailure(diagnostics) {
    return this.buildFailureResult({
      status: 400,
      outcome: 'CONTRACT_INVALID',
      message: 'The Project API contract is invalid.',
      diagnostics,
    });
  }

  buildTransportFailure(diagnosticCode) {
    return this.buildFailureResult({
      status: 503,
      outcome: 'SERVICE_UNAVAILABLE',
      message: 'The Project API request could not be completed.',
      diagnostics: [{ code: diagnosticCode }],
    });
  }

  buildFailureResult({ status, outcome, message, diagnostics }) {
    return {
      status,
      contractVersion: 1,
      ok: false,
      outcome,
      error: { code: outcome, message, diagnostics },
    };
  }
}

function defaultDelayImplementation(delayMilliseconds) {
  return new Promise(resolve => setTimeout(resolve, delayMilliseconds));
}

function defaultAbortTimeoutImplementation(timeoutMilliseconds) {
  return AbortSignal.timeout(timeoutMilliseconds);
}

export {
  ApiEaseProjectApiClient,
  DEFAULT_PROJECT_API_OPERATION_LIMITS,
  DEFAULT_PROJECT_API_RETRY_SETTINGS,
  PROJECT_API_ENDPOINTS,
  PROJECT_API_STATUS_BY_OUTCOME,
};
