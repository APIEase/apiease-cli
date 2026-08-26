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
      const pendingResponse = {
        contractVersion: 1,
        ok: true,
        outcome: 'PROJECT_BOOTSTRAP_PENDING',
        result: {},
      };
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
      assert.deepEqual(result.error.diagnostics, [{ code: 'PROJECT_RESPONSE_CONTRACT_INVALID' }]);
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

function findFixture(fixtures, name) {
  return fixtures.find(fixture => fixture.name === name);
}

async function readFixture(fileName) {
  return JSON.parse(await fs.readFile(path.join(fixtureDirectoryPath, fileName), 'utf8'));
}
