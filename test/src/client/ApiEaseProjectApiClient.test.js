import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ApiEaseProjectApiClient,
  DEFAULT_PROJECT_API_OPERATION_LIMITS,
  DEFAULT_PROJECT_API_RETRY_SETTINGS,
} from '../../../src/client/ApiEaseProjectApiClient.js';
import {
  PROJECT_BEARER_AUTHENTICATION_ACTIONS,
} from '../../../src/auth/ProjectBearerAuthenticationContract.js';
import { ProjectContractService } from '../../../src/project/ProjectContractService.js';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const fixtureDirectoryPath = path.join(
  projectDirectoryPath,
  'contracts',
  'apex-projects',
  'v1',
  'fixtures',
);

describe('ApiEaseProjectApiClient', () => {
  describe('bootstrapProject', () => {
    it('should return the Mongo-authoritative snapshot without projection polling', async () => {
      // Arrange
      const bootstrapFixtures = await readFixture('bootstrap-synchronized.json');
      const synchronizedResponse = findFixture(
        bootstrapFixtures.fixtures,
        'bootstrap-synchronized',
      ).document;
      const requestBodies = [];
      const delays = [];
      const fetchCalls = [];
      const authenticationHeaderCalls = [];
      const apiEaseProjectApiClient = buildClient({
        responses: [buildJsonResponse(200, synchronizedResponse)],
        requestBodies,
        delays,
        fetchCalls,
        authenticationHeaderCalls,
      });

      // Act
      const result = await apiEaseProjectApiClient.bootstrapProject(buildInvocation({
        contractVersion: 1,
      }));

      // Assert
      assert.equal(result.outcome, 'PROJECT_BOOTSTRAP_SYNCHRONIZED');
      assert.deepEqual(delays, []);
      assert.equal(requestBodies.length, 1);
      assert.deepEqual(authenticationHeaderCalls, [authenticationContext]);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/projects/bootstrap');
      assert.equal(fetchCalls[0].options.method, 'POST');
      assert.deepEqual(fetchCalls[0].options.headers, {
        'x-apiease-api-key': 'opaque-key',
        'x-shop-myshopify-domain': 'fixture.myshopify.com',
        'content-type': 'application/json',
      });
    });

    it('should reject an obsolete projection-pending response without polling', async () => {
      // Arrange
      const bootstrapFixtures = await readFixture('bootstrap-synchronized.json');
      const pendingResponse = findFixture(bootstrapFixtures.fixtures, 'bootstrap-pending').document;
      const fetchCalls = [];
      const delays = [];
      const apiEaseProjectApiClient = buildClient({
        responses: [buildJsonResponse(202, pendingResponse)],
        fetchCalls,
        delays,
      });

      // Act
      const result = await apiEaseProjectApiClient.bootstrapProject(buildInvocation({
        contractVersion: 1,
      }));

      // Assert
      assert.equal(result.outcome, 'CONTRACT_INVALID');
      assert.deepEqual(result.error.diagnostics, [{ code: 'PROJECT_RESPONSE_STATUS_INVALID' }]);
      assert.equal(fetchCalls.length, 1);
      assert.deepEqual(delays, []);
    });

    it('should return a stable contract failure without transport for an invalid request', async () => {
      // Arrange
      const fetchCalls = [];
      const apiEaseProjectApiClient = buildClient({ fetchCalls });

      // Act
      const result = await apiEaseProjectApiClient.bootstrapProject(buildInvocation({
        contractVersion: 1,
        unsupported: 'protected-value-must-not-appear',
      }));

      // Assert
      assert.equal(result.outcome, 'CONTRACT_INVALID');
      assert.equal(fetchCalls.length, 0);
      assert.equal(JSON.stringify(result).includes('protected-value-must-not-appear'), false);
    });
  });

  describe('retrieveProjectDesignContext', () => {
    it('should return the exact verified common instructions, Codex envelope, and context', async () => {
      // Arrange
      const responseDocument = buildProjectDesignContextResponse();
      const fetchCalls = [];
      const apiEaseProjectApiClient = buildClient({
        responses: [buildJsonResponse(200, responseDocument)],
        fetchCalls,
      });

      // Act
      const result = await apiEaseProjectApiClient.retrieveProjectDesignContext(
        buildInvocation(buildProjectDesignContextRequest()),
      );

      // Assert
      assert.deepEqual(result.result, responseDocument.result);
      assert.equal(
        fetchCalls[0].url,
        'https://apiease.example.com/root/api/v1/projects/design-context',
      );
    });

    it('should reject a protocol version mismatch', async () => {
      // Arrange
      const responseDocument = buildProjectDesignContextResponse();
      responseDocument.result.protocol.protocolVersion = '2.0.0';
      const apiEaseProjectApiClient = buildClient({
        responses: [buildJsonResponse(200, responseDocument)],
      });

      // Act
      const result = await apiEaseProjectApiClient.retrieveProjectDesignContext(
        buildInvocation(buildProjectDesignContextRequest()),
      );

      // Assert
      assert.deepEqual(result.error.diagnostics, [{
        code: 'PROJECT_RESPONSE_CONTRACT_INVALID',
      }]);
    });

    it('should reject a common-instruction digest mismatch without exposing response content', async () => {
      // Arrange
      const responseDocument = buildProjectDesignContextResponse();
      responseDocument.result.protocol.commonInstructions = 'protected-value-must-not-appear';
      const apiEaseProjectApiClient = buildClient({
        responses: [buildJsonResponse(200, responseDocument)],
      });

      // Act
      const result = await apiEaseProjectApiClient.retrieveProjectDesignContext(
        buildInvocation(buildProjectDesignContextRequest()),
      );

      // Assert
      assert.deepEqual(result.error.diagnostics, [{
        code: 'PROJECT_DESIGN_PROTOCOL_DIGEST_MISMATCH',
      }]);
      assert.equal(JSON.stringify(result).includes('protected-value-must-not-appear'), false);
    });
  });

  describe('validateProject', () => {
    it('should retry an eligible transport failure with the serialized body unchanged', async () => {
      // Arrange
      const workflow = await readFixture('project-workflow-success.json');
      const validatePair = findFixture(workflow.pairs, 'validate');
      const requestBodies = [];
      const delays = [];
      const apiEaseProjectApiClient = buildClient({
        responses: [new TypeError('network details must remain private'), buildJsonResponse(
          200,
          validatePair.response.document,
        )],
        requestBodies,
        delays,
      });

      // Act
      const result = await apiEaseProjectApiClient.validateProject(
        buildInvocation(validatePair.request.document),
      );

      // Assert
      assert.equal(result.outcome, 'PROJECT_VALID');
      assert.equal(requestBodies[0], requestBodies[1]);
      assert.deepEqual(delays, [DEFAULT_PROJECT_API_RETRY_SETTINGS.backoffMilliseconds[0]]);
    });

    it('should wait for Retry-After before retrying a rate-limited request', async () => {
      // Arrange
      const workflow = await readFixture('project-workflow-success.json');
      const validatePair = findFixture(workflow.pairs, 'validate');
      const delays = [];
      const apiEaseProjectApiClient = buildClient({
        responses: [
          buildJsonResponse(429, buildErrorResponse('RATE_LIMITED'), { 'retry-after': '3' }),
          buildJsonResponse(200, validatePair.response.document),
        ],
        delays,
      });

      // Act
      const result = await apiEaseProjectApiClient.validateProject(
        buildInvocation(validatePair.request.document),
      );

      // Assert
      assert.equal(result.outcome, 'PROJECT_VALID');
      assert.deepEqual(delays, [3000]);
    });

    it('should reject a non-JSON response without reading or returning its body', async () => {
      // Arrange
      const workflow = await readFixture('project-workflow-success.json');
      const validatePair = findFixture(workflow.pairs, 'validate');
      const apiEaseProjectApiClient = buildClient({
        responses: [{
          status: 200,
          headers: buildHeaders({ 'content-type': 'text/html' }),
          async json() {
            throw new Error('json must not be read');
          },
          async text() {
            throw new Error('body must not be read');
          },
        }],
      });

      // Act
      const result = await apiEaseProjectApiClient.validateProject(
        buildInvocation(validatePair.request.document),
      );

      // Assert
      assert.deepEqual(result.error.diagnostics, [{ code: 'PROJECT_RESPONSE_CONTENT_TYPE_INVALID' }]);
    });

    it('should reject a valid envelope when its HTTP status does not match its outcome', async () => {
      // Arrange
      const workflow = await readFixture('project-workflow-success.json');
      const validatePair = findFixture(workflow.pairs, 'validate');
      const apiEaseProjectApiClient = buildClient({
        responses: [buildJsonResponse(202, validatePair.response.document)],
      });

      // Act
      const result = await apiEaseProjectApiClient.validateProject(
        buildInvocation(validatePair.request.document),
      );

      // Assert
      assert.deepEqual(result.error.diagnostics, [{ code: 'PROJECT_RESPONSE_STATUS_INVALID' }]);
    });
  });

  describe('planProject', () => {
    it('should retry a schema-valid 503 response and return the authoritative plan', async () => {
      // Arrange
      const workflow = await readFixture('project-workflow-success.json');
      const planPair = findFixture(workflow.pairs, 'plan');
      const requestBodies = [];
      const apiEaseProjectApiClient = buildClient({
        responses: [
          buildJsonResponse(503, buildErrorResponse('SERVICE_UNAVAILABLE')),
          buildJsonResponse(200, planPair.response.document),
        ],
        requestBodies,
      });

      // Act
      const result = await apiEaseProjectApiClient.planProject(
        buildInvocation(planPair.request.document),
      );

      // Assert
      assert.equal(result.outcome, 'PROJECT_PLAN_READY');
      assert.equal(requestBodies[0], requestBodies[1]);
    });

    it('should stop immediately on a non-retryable authoritative failure', async () => {
      // Arrange
      const workflow = await readFixture('project-workflow-success.json');
      const planPair = findFixture(workflow.pairs, 'plan');
      const fetchCalls = [];
      const apiEaseProjectApiClient = buildClient({
        responses: [buildJsonResponse(409, buildErrorResponse('PROJECT_BASELINE_CONFLICT'))],
        fetchCalls,
      });

      // Act
      const result = await apiEaseProjectApiClient.planProject(
        buildInvocation(planPair.request.document),
      );

      // Assert
      assert.equal(result.outcome, 'PROJECT_BASELINE_CONFLICT');
      assert.equal(fetchCalls.length, 1);
    });

    it('should preserve the authoritative 503 outcome after exhausting retries', async () => {
      // Arrange
      const workflow = await readFixture('project-workflow-success.json');
      const planPair = findFixture(workflow.pairs, 'plan');
      const fetchCalls = [];
      const unavailableResponse = buildErrorResponse('PROJECT_PROJECTION_UNAVAILABLE');
      const apiEaseProjectApiClient = buildClient({
        responses: Array.from(
          { length: DEFAULT_PROJECT_API_RETRY_SETTINGS.maximumRetries + 1 },
          () => buildJsonResponse(503, unavailableResponse),
        ),
        fetchCalls,
      });

      // Act
      const result = await apiEaseProjectApiClient.planProject(
        buildInvocation(planPair.request.document),
      );

      // Assert
      assert.equal(result.outcome, 'PROJECT_PROJECTION_UNAVAILABLE');
      assert.equal(
        fetchCalls.length,
        DEFAULT_PROJECT_API_RETRY_SETTINGS.maximumRetries + 1,
      );
    });
  });

  describe('applyProject', () => {
    it('should submit personal deferred approval through the shared apply endpoint', async () => {
      // Arrange
      const requestBodies = [];
      const proposalWorkflow = await readFixture('project-proposal-workflow.json');
      const responseDocument = findFixture(
        proposalWorkflow.fixtures,
        'proposal-accepted',
      ).document;
      const apiEaseProjectApiClient = buildClient({
        responses: [buildJsonResponse(202, responseDocument)],
        requestBodies,
      });
      const changeSet = await readCanonicalChangeSetFixture();
      const request = {
        authorityMode: 'personal',
        changeSet,
        contractVersion: 1,
        operationKey: 'personal-deferred-operation',
        requireApproval: true,
      };

      // Act
      const result = await apiEaseProjectApiClient.applyProject(buildInvocation(request));

      // Assert
      assert.equal(result.outcome, 'PROJECT_PROPOSAL_ACCEPTED');
      assert.deepEqual(JSON.parse(requestBodies[0]), request);
    });

    it('should retry an ambiguous apply with the identical operation key and body', async () => {
      // Arrange
      const workflow = await readFixture('project-workflow-success.json');
      const applyPair = findFixture(workflow.pairs, 'apply');
      const replayPair = findFixture(workflow.pairs, 'replay');
      const requestBodies = [];
      const apiEaseProjectApiClient = buildClient({
        responses: [
          new DOMException('request timeout details', 'AbortError'),
          buildJsonResponse(200, replayPair.response.document),
        ],
        requestBodies,
      });

      // Act
      const result = await apiEaseProjectApiClient.applyProject(
        buildInvocation(applyPair.request.document),
      );

      // Assert
      assert.equal(result.outcome, 'PROJECT_APPLY_REPLAYED');
      assert.equal(result.result.outcome, 'PROJECT_APPLIED');
      assert.equal(requestBodies[0], requestBodies[1]);
      assert.equal(JSON.parse(requestBodies[1]).operationKey, applyPair.request.document.operationKey);
    });

    it('should stop immediately on an idempotency conflict', async () => {
      // Arrange
      const workflow = await readFixture('project-workflow-success.json');
      const applyPair = findFixture(workflow.pairs, 'apply');
      const fetchCalls = [];
      const apiEaseProjectApiClient = buildClient({
        responses: [buildJsonResponse(409, buildErrorResponse('PROJECT_IDEMPOTENCY_CONFLICT'))],
        fetchCalls,
      });

      // Act
      const result = await apiEaseProjectApiClient.applyProject(
        buildInvocation(applyPair.request.document),
      );

      // Assert
      assert.equal(result.outcome, 'PROJECT_IDEMPOTENCY_CONFLICT');
      assert.equal(fetchCalls.length, 1);
    });

    it('should return a secret-safe stable failure after exhausting ambiguous retries', async () => {
      // Arrange
      const workflow = await readFixture('project-workflow-success.json');
      const applyPair = findFixture(workflow.pairs, 'apply');
      const fetchCalls = [];
      const apiEaseProjectApiClient = buildClient({
        responses: Array.from(
          { length: DEFAULT_PROJECT_API_RETRY_SETTINGS.maximumRetries + 1 },
          () => new Error('raw socket and credential details'),
        ),
        fetchCalls,
      });

      // Act
      const result = await apiEaseProjectApiClient.applyProject(
        buildInvocation(applyPair.request.document),
      );

      // Assert
      assert.equal(result.status, 503);
      assert.equal(result.outcome, 'SERVICE_UNAVAILABLE');
      assert.equal(
        fetchCalls.length,
        DEFAULT_PROJECT_API_RETRY_SETTINGS.maximumRetries + 1,
      );
      assert.equal(JSON.stringify(result).includes('raw socket'), false);
    });
  });

  describe('worker transport', () => {
    it('should publish a checkpoint with a freshly resolved publication capability', async () => {
      // Arrange
      const contractCalls = [];
      const authenticationHeaderCalls = [];
      const request = { contractVersion: 1, checkpoint: 'publish' };
      const response = buildWorkerSuccessResponse('PROJECT_CHECKPOINT_PUBLISHED');
      const apiEaseProjectApiClient = buildWorkerClient({
        responses: [buildJsonResponse(200, response)],
        contractCalls,
        authenticationHeaderCalls,
      });

      // Act
      const result = await apiEaseProjectApiClient.publishProjectCheckpoint(
        buildInvocation(request),
      );

      // Assert
      assert.equal(result.outcome, response.outcome);
      assert.deepEqual(authenticationHeaderCalls, [{
        authenticationContext,
        action: PROJECT_BEARER_AUTHENTICATION_ACTIONS.checkpointPublish,
      }]);
      assert.deepEqual(contractCalls.map(({ endpoint }) => endpoint), [
        '/api/v1/projects/checkpoints/publish',
        '/api/v1/projects/checkpoints/publish',
      ]);
    });

    it('should retrieve a checkpoint through the shared strict envelope path', async () => {
      // Arrange
      const fetchCalls = [];
      const authenticationHeaderCalls = [];
      const request = { contractVersion: 1, checkpoint: 'retrieve' };
      const response = buildWorkerSuccessResponse('PROJECT_CHECKPOINT_RETRIEVED');
      const apiEaseProjectApiClient = buildWorkerClient({
        responses: [buildJsonResponse(200, response)],
        fetchCalls,
        authenticationHeaderCalls,
      });

      // Act
      const result = await apiEaseProjectApiClient.retrieveProjectCheckpoint(
        buildInvocation(request),
      );

      // Assert
      assert.equal(result.outcome, response.outcome);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/projects/checkpoints/retrieve');
      assert.equal(
        authenticationHeaderCalls[0].action,
        PROJECT_BEARER_AUTHENTICATION_ACTIONS.checkpointRetrieve,
      );
    });

    it('should preserve a durable accepted proposal response from HTTP 202', async () => {
      // Arrange
      const authenticationHeaderCalls = [];
      const request = { contractVersion: 1, proposal: 'submit' };
      const response = buildWorkerSuccessResponse('PROJECT_PROPOSAL_ACCEPTED');
      const apiEaseProjectApiClient = buildWorkerClient({
        responses: [buildJsonResponse(202, response)],
        authenticationHeaderCalls,
      });

      // Act
      const result = await apiEaseProjectApiClient.submitProjectProposal(
        buildInvocation(request),
      );

      // Assert
      assert.equal(result.status, 202);
      assert.equal(result.outcome, response.outcome);
      assert.equal(
        authenticationHeaderCalls[0].action,
        PROJECT_BEARER_AUTHENTICATION_ACTIONS.proposalSubmit,
      );
    });

    it('should obtain a new single-use capability when retrying a service failure', async () => {
      // Arrange
      const authenticationHeaderCalls = [];
      const fetchCalls = [];
      const requestBodies = [];
      const response = buildWorkerSuccessResponse('PROJECT_PROPOSAL_ACCEPTED');
      const apiEaseProjectApiClient = buildWorkerClient({
        responses: [
          buildJsonResponse(503, buildErrorResponse('SERVICE_UNAVAILABLE')),
          buildJsonResponse(202, response),
        ],
        authenticationHeaderCalls,
        fetchCalls,
        requestBodies,
      });

      // Act
      const result = await apiEaseProjectApiClient.submitProjectProposal(
        buildInvocation({ contractVersion: 1, proposal: 'submit' }),
      );

      // Assert
      assert.equal(result.outcome, response.outcome);
      assert.equal(authenticationHeaderCalls.length, 2);
      assert.notEqual(
        fetchCalls[0].options.headers.authorization,
        fetchCalls[1].options.headers.authorization,
      );
      assert.equal(requestBodies[0], requestBodies[1]);
      assert.equal(JSON.parse(requestBodies[0]).proposal, 'submit');
    });

    for (const [outcome, status] of [
      ['PROJECT_PROPOSAL_REJECTED', 200],
      ['PROJECT_PROPOSAL_STALE', 409],
      ['PROJECT_PROPOSAL_CANCELLED', 409],
      ['WORKER_CAPABILITY_STALE_FENCE', 403],
    ]) {
      it(`should preserve ${outcome} without retrying`, async () => {
        // Arrange
        const fetchCalls = [];
        const response = status === 200
          ? buildWorkerSuccessResponse(outcome)
          : buildErrorResponse(outcome);
        const apiEaseProjectApiClient = buildWorkerClient({
          responses: [buildJsonResponse(status, response)],
          fetchCalls,
        });

        // Act
        const result = await apiEaseProjectApiClient.submitProjectProposal(
          buildInvocation({ contractVersion: 1, proposal: 'submit' }),
        );

        // Assert
        assert.equal(result.outcome, outcome);
        assert.equal(fetchCalls.length, 1);
      });
    }
  });

  describe('request limits', () => {
    it('should inject operation-specific timeout signals and stop at the overall deadline', async () => {
      // Arrange
      const bootstrapRequest = { contractVersion: 1 };
      const timeoutCalls = [];
      const fetchCalls = [];
      let currentTime = 1000;
      const apiEaseProjectApiClient = buildClient({
        responses: [new Error('unavailable')],
        fetchCalls,
        clock: { now: () => currentTime },
        delayImplementation: async delayMilliseconds => {
          currentTime += delayMilliseconds;
        },
        abortTimeoutImplementation(timeoutMilliseconds) {
          timeoutCalls.push(timeoutMilliseconds);
          return { timeoutMilliseconds };
        },
        operationLimits: {
          ...DEFAULT_PROJECT_API_OPERATION_LIMITS,
          bootstrap: {
            requestTimeoutMilliseconds: 7,
            overallDeadlineMilliseconds: 1,
          },
        },
      });

      // Act
      const result = await apiEaseProjectApiClient.bootstrapProject(
        buildInvocation(bootstrapRequest),
      );

      // Assert
      assert.deepEqual(timeoutCalls, [1]);
      assert.equal(fetchCalls.length, 1);
      assert.equal(result.outcome, 'SERVICE_UNAVAILABLE');
    });
  });
});

const authenticationContext = Object.freeze({ opaque: true });

function buildClient({
  responses = [],
  fetchCalls = [],
  requestBodies = [],
  delays = [],
  authenticationHeaderCalls = [],
  delayImplementation = async delayMilliseconds => {
    delays.push(delayMilliseconds);
  },
  clock = { now: () => 1000 },
  abortTimeoutImplementation = timeoutMilliseconds => ({ timeoutMilliseconds }),
  operationLimits = DEFAULT_PROJECT_API_OPERATION_LIMITS,
} = {}) {
  const responseQueue = [...responses];
  const fetchImplementation = async (url, options) => {
    fetchCalls.push({ url, options });
    requestBodies.push(options.body);
    const response = responseQueue.shift();

    if (response instanceof Error || response instanceof DOMException) {
      throw response;
    }

    return response;
  };
  const projectAuthenticationAdapter = {
    buildRequestHeaders(receivedAuthenticationContext) {
      authenticationHeaderCalls.push(receivedAuthenticationContext);
      return {
        'x-apiease-api-key': 'opaque-key',
        'x-shop-myshopify-domain': 'fixture.myshopify.com',
      };
    },
    readAuthorityMode() {
      return 'personal';
    },
  };

  return new ApiEaseProjectApiClient({
    projectContractService: new ProjectContractService(),
    projectAuthenticationAdapter,
    fetchImplementation,
    delayImplementation,
    clock,
    abortTimeoutImplementation,
    operationLimits,
  });
}

async function readCanonicalChangeSetFixture() {
  const unifiedContracts = await readFixture('unified-project-contracts.json');

  return structuredClone(findFixture(
    unifiedContracts.fixtures,
    'canonical-resource-change-set',
  ).document);
}

function buildWorkerClient({
  responses,
  fetchCalls = [],
  requestBodies = [],
  authenticationHeaderCalls = [],
  contractCalls = [],
} = {}) {
  let capabilitySequence = 0;
  const projectAuthenticationAdapter = {
    async buildRequestHeaders(receivedAuthenticationContext, { action }) {
      authenticationHeaderCalls.push({
        authenticationContext: receivedAuthenticationContext,
        action,
      });
      capabilitySequence += 1;
      return { authorization: `Bearer header.payload.signature${capabilitySequence}` };
    },
    readAuthorityMode() {
      return 'bearer';
    },
  };
  const projectContractService = {
    validateProjectApiRequest(endpoint, document) {
      contractCalls.push({ endpoint, document, type: 'request' });
      return { ok: true };
    },
    validateProjectApiResponse(endpoint, document) {
      contractCalls.push({ endpoint, document, type: 'response' });
      return { ok: true };
    },
  };

  return buildClientWithCollaborators({
    responses,
    fetchCalls,
    requestBodies,
    projectAuthenticationAdapter,
    projectContractService,
  });
}

function buildClientWithCollaborators({
  responses = [],
  fetchCalls,
  requestBodies = [],
  projectAuthenticationAdapter,
  projectContractService,
}) {
  const responseQueue = [...responses];
  const fetchImplementation = async (url, options) => {
    fetchCalls.push({ url, options });
    requestBodies.push(options.body);
    return responseQueue.shift();
  };
  return new ApiEaseProjectApiClient({
    projectAuthenticationAdapter,
    projectContractService,
    fetchImplementation,
    delayImplementation: async () => {},
    clock: { now: () => 1000 },
    abortTimeoutImplementation: timeoutMilliseconds => ({ timeoutMilliseconds }),
  });
}

function buildInvocation(request) {
  return {
    apiBaseUrl: 'https://apiease.example.com/root/',
    authenticationContext,
    request,
  };
}

function buildJsonResponse(status, document, headers = {}) {
  return {
    status,
    headers: buildHeaders({ 'content-type': 'application/json; charset=utf-8', ...headers }),
    async json() {
      return structuredClone(document);
    },
  };
}

function buildHeaders(headerValues) {
  const normalizedHeaders = new Map(Object.entries(headerValues).map(([name, value]) => [
    name.toLowerCase(),
    value,
  ]));

  return { get: name => normalizedHeaders.get(name.toLowerCase()) ?? null };
}

function buildErrorResponse(outcome) {
  return {
    contractVersion: 1,
    ok: false,
    outcome,
    error: {
      code: outcome,
      message: 'The Project API request did not complete.',
      diagnostics: [],
    },
  };
}

function buildProjectDesignContextRequest() {
  return {
    contractVersion: 1,
    designContextContractVersion: 1,
    projectId: 'project-1',
    projectRequirements: {
      projectName: 'Inventory tools',
      customerRequirements: [{
        id: 'requirement-1',
        text: 'Keep inventory tools current.',
      }],
      confirmedDecisions: ['Preserve the existing protected token.'],
    },
  };
}

function buildProjectDesignContextResponse() {
  const commonInstructions = 'exact common instructions\n';
  return {
    contractVersion: 1,
    designContextContractVersion: 1,
    ok: true,
    outcome: 'PROJECT_DESIGN_CONTEXT_READY',
    result: {
      protocol: {
        protocolVersion: '1.0.0',
        commonInstructions,
        commonInstructionDigest: buildTextDigest(commonInstructions),
        codexEnvelope: 'exact Codex envelope\n',
      },
      projectRequirements: buildProjectDesignContextRequest().projectRequirements,
      snapshot: {
        projectIdentity: {
          normalizedShopDomain: 'fixture.myshopify.com',
          projectId: 'project-1',
        },
        liveRevision: 7,
        snapshotDigest: `sha256:${'b'.repeat(64)}`,
      },
      inventory: [],
      canonicalBodies: [],
      bindings: [],
      limits: {
        maximumFileCount: 1_000,
        maximumAggregateBytes: 25_000_000,
      },
      diagnostics: [],
    },
  };
}

function buildTextDigest(value) {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

function buildWorkerSuccessResponse(outcome) {
  return {
    contractVersion: 1,
    ok: true,
    outcome,
    result: { safe: true },
  };
}

function findFixture(fixtures, name) {
  return fixtures.find(fixture => fixture.name === name);
}

async function readFixture(fileName) {
  return JSON.parse(await fs.readFile(path.join(fixtureDirectoryPath, fileName), 'utf8'));
}
