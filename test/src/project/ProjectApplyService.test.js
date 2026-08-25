import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROJECT_APPLY_CONFLICT_GUIDANCE,
  PROJECT_APPLY_RUNTIME_VERIFICATION_GUIDANCE,
  ProjectApplyService,
} from '../../../src/project/ProjectApplyService.js';

describe('ProjectApplyService', () => {
  describe('applyProject', () => {
    it('should retain one candidate, exact plan operations, and one operation key through committed apply', async () => {
      // Arrange
      const fixture = buildServiceFixture();

      // Act
      const result = await fixture.projectApplyService.applyProject(buildInvocation());

      // Assert
      assert.deepEqual(fixture.events, [
        'policy',
        'authentication',
        'candidate',
        'validate',
        'plan',
        'operation-key',
        'apply',
        'derive-state',
        'publish-state',
        'archive-deletions',
      ]);
      assert.strictEqual(fixture.validationCalls[0].candidateBuildResult, fixture.candidateBuildResult);
      assert.strictEqual(fixture.planCalls[0].request.changeSet, fixture.candidateBuildResult.changeSet);
      assert.strictEqual(fixture.applyCalls[0].request.changeSet, fixture.candidateBuildResult.changeSet);
      assert.equal(fixture.applyCalls[0].request.operationKey, 'opaque-operation-key');
      assert.equal(fixture.applyCalls[0].request.requireApproval, false);
      assert.equal(fixture.applyCalls[0].request.authorityMode, 'personal');
      assert.equal(Object.hasOwn(fixture.applyCalls[0].request, 'operations'), false);
      assert.strictEqual(result.plan, fixture.planResponse.result);
      assert.strictEqual(result.receipt, fixture.applyResponse.result);
      assert.deepEqual(result.guidance, [PROJECT_APPLY_RUNTIME_VERIFICATION_GUIDANCE]);
    });

    it('should validate plan and submit an accepted proposal without local transitions', async () => {
      // Arrange
      const proposalResponse = buildProposalAcceptedResponse();
      const fixture = buildServiceFixture({
        approvalRequired: true,
        applyResponse: proposalResponse,
      });

      // Act
      const result = await fixture.projectApplyService.applyProject({
        ...buildInvocation(),
        requireApproval: true,
      });

      // Assert
      assert.deepEqual(fixture.events, [
        'policy',
        'authentication',
        'candidate',
        'validate',
        'plan',
        'operation-key',
        'apply',
      ]);
      assert.strictEqual(fixture.applyCalls[0].request.changeSet, fixture.candidateBuildResult.changeSet);
      assert.equal(fixture.applyCalls[0].request.operationKey, 'opaque-operation-key');
      assert.equal(fixture.applyCalls[0].request.requireApproval, true);
      assert.equal(fixture.applyCalls[0].request.authorityMode, 'personal');
      assert.equal(Object.hasOwn(fixture.applyCalls[0].request, 'proposalCheckpoint'), false);
      assert.equal(Object.hasOwn(fixture.applyCalls[0].request, 'operations'), false);
      assert.deepEqual(fixture.applyCalls[0].request.changeSet.deletes, [{
        bindingId: 'binding_request_inventory_sync',
        handle: 'inventory-sync',
        resourceType: 'request',
      }]);
      assert.deepEqual(fixture.applyCalls[0].request.changeSet.secureInputs, [{
        fieldPath: 'parameters.api-key.value',
        handle: 'inventory-sync',
        mode: 'preserve',
        resourceType: 'request',
      }]);
      assert.equal(fixture.applyCalls[0].request.changeSet.verifiedBindings.length, 1);
      assert.deepEqual(fixture.applyCalls[0].request.changeSet.baseline, {
        liveRevision: 7,
        snapshotDigest: 'sha256:baseline',
      });
      assert.equal(result.state, 'accepted');
      assert.strictEqual(result.proposal, proposalResponse.result);
      assert.equal(result.receipt, null);
      assert.equal(fixture.events.includes('publish-state'), false);
      assert.equal(fixture.events.includes('archive-deletions'), false);
    });

    it('should reject a committed response to an approval-required submission', async () => {
      // Arrange
      const fixture = buildServiceFixture({ approvalRequired: true });

      // Act and Assert
      await assert.rejects(
        fixture.projectApplyService.applyProject({
          ...buildInvocation(),
          requireApproval: true,
        }),
        { code: 'PROJECT_PROPOSAL_SUBMISSION_OUTCOME_INVALID' },
      );
      assert.equal(fixture.events.includes('publish-state'), false);
      assert.equal(fixture.events.includes('archive-deletions'), false);
    });

    it('should stop after authoritative validation failure without planning or local transitions', async () => {
      // Arrange
      const validationResult = buildValidationFailure();
      const fixture = buildServiceFixture({ validationResult });

      // Act
      const result = await fixture.projectApplyService.applyProject(buildInvocation());

      // Assert
      assert.equal(result.stage, 'validation');
      assert.equal(result.outcome, 'PROJECT_CANDIDATE_INVALID');
      assert.deepEqual(fixture.events, ['policy', 'authentication', 'candidate', 'validate']);
    });

    it('should stop after a conflict plan and preserve source, state, and deletion intent', async () => {
      // Arrange
      const planResponse = buildFailureResponse('PROJECT_BASELINE_CONFLICT', 409);
      const fixture = buildServiceFixture({ planResponse });

      // Act
      const result = await fixture.projectApplyService.applyProject(buildInvocation());

      // Assert
      assert.equal(result.stage, 'plan');
      assert.equal(result.outcome, 'PROJECT_BASELINE_CONFLICT');
      assert.deepEqual(result.guidance, [PROJECT_APPLY_CONFLICT_GUIDANCE]);
      assert.deepEqual(fixture.events, [
        'policy',
        'authentication',
        'candidate',
        'validate',
        'plan',
      ]);
    });

    it('should reject an unexpected successful plan outcome before apply', async () => {
      // Arrange
      const fixture = buildServiceFixture({
        planResponse: { ok: true, outcome: 'PROJECT_VALID', result: {} },
      });

      // Act and Assert
      await assert.rejects(
        fixture.projectApplyService.applyProject(buildInvocation()),
        { code: 'PROJECT_PLAN_OUTCOME_INVALID' },
      );
      assert.equal(fixture.events.includes('apply'), false);
    });

    it('should return the exact plan but leave local state unchanged on apply conflict', async () => {
      // Arrange
      const applyResponse = buildFailureResponse('RESOURCE_VERSION_CONFLICT', 409);
      const fixture = buildServiceFixture({ applyResponse });

      // Act
      const result = await fixture.projectApplyService.applyProject(buildInvocation());

      // Assert
      assert.strictEqual(result.plan, fixture.planResponse.result);
      assert.equal(result.stage, 'apply');
      assert.equal(result.outcome, 'RESOURCE_VERSION_CONFLICT');
      assert.deepEqual(result.guidance, [PROJECT_APPLY_CONFLICT_GUIDANCE]);
      assert.equal(fixture.events.includes('publish-state'), false);
      assert.equal(fixture.events.includes('archive-deletions'), false);
    });

    it('should perform idempotent local transitions for a replayed committed receipt', async () => {
      // Arrange
      const applyResponse = buildApplyResponse({ outerOutcome: 'PROJECT_APPLY_REPLAYED', replayed: true });
      const fixture = buildServiceFixture({ applyResponse });

      // Act
      const result = await fixture.projectApplyService.applyProject(buildInvocation());

      // Assert
      assert.equal(result.outcome, 'PROJECT_APPLY_REPLAYED');
      assert.strictEqual(fixture.deriveStateCalls[0].changeSet, fixture.candidateBuildResult.changeSet);
      assert.strictEqual(fixture.deriveStateCalls[0].applyReceipt, applyResponse.result);
      assert.strictEqual(fixture.archiveCalls[0].applyReceipt, applyResponse.result);
      assert.equal(fixture.events.at(-1), 'archive-deletions');
    });

    it('should update state for an applicable no-change receipt without archiving deletions', async () => {
      // Arrange
      const applyResponse = buildApplyResponse({ outerOutcome: 'PROJECT_APPLY_NO_CHANGE' });
      applyResponse.result.outcome = 'PROJECT_APPLY_NO_CHANGE';
      applyResponse.result.resources = [];
      const candidateBuildResult = buildCandidateBuildResult({ deletionIntents: [] });
      const planResponse = buildPlanResponse();
      planResponse.outcome = 'PROJECT_PLAN_NO_CHANGE';
      planResponse.result.operations = [];
      const fixture = buildServiceFixture({ applyResponse, candidateBuildResult, planResponse });

      // Act
      const result = await fixture.projectApplyService.applyProject(buildInvocation());

      // Assert
      assert.equal(result.outcome, 'PROJECT_APPLY_NO_CHANGE');
      assert.equal(fixture.events.includes('publish-state'), true);
      assert.equal(fixture.events.includes('archive-deletions'), false);
    });

    it('should return safe required-value selectors with APIEase UI guidance', async () => {
      // Arrange
      const candidateBuildResult = buildCandidateBuildResult();
      const validationResult = buildValidationSuccess(candidateBuildResult);
      validationResult.requiredSecureValues = [{
        resourceType: 'request',
        handle: 'inventory-sync',
        fieldPath: 'parameters.api-key.value',
      }];
      const fixture = buildServiceFixture({ candidateBuildResult, validationResult });

      // Act
      const result = await fixture.projectApplyService.applyProject(buildInvocation());

      // Assert
      assert.strictEqual(result.requiredSecureValues, validationResult.requiredSecureValues);
      assert.equal(result.guidance.length, 2);
      assert.match(result.guidance[1], /APIEase UI/);
    });

    it('should publish committed local state before archiving receipt-proven deletions', async () => {
      // Arrange
      const publishFailure = Object.assign(new Error('state publication failed'), {
        code: 'PROJECT_LOCAL_STATE_PUBLICATION_FAILED',
      });
      const fixture = buildServiceFixture({ publishFailure });

      // Act and Assert
      await assert.rejects(
        fixture.projectApplyService.applyProject(buildInvocation()),
        error => error === publishFailure,
      );
      assert.equal(fixture.events.at(-1), 'publish-state');
      assert.equal(fixture.events.includes('archive-deletions'), false);
    });
  });
});

function buildServiceFixture({
  approvalRequired = false,
  applyResponse = buildApplyResponse(),
  candidateBuildResult = buildCandidateBuildResult(),
  planResponse = buildPlanResponse(),
  publishFailure,
  validationResult,
} = {}) {
  const events = [];
  const validationCalls = [];
  const planCalls = [];
  const applyCalls = [];
  const deriveStateCalls = [];
  const archiveCalls = [];
  const projectAuthenticationAdapter = {
    async resolveRequestConfiguration(configurationOptions) {
      events.push('authentication');
      assert.deepEqual(configurationOptions, buildInvocation().configurationOptions);
      return {
        ok: true,
        apiBaseUrl: 'https://api.example.test',
        authenticationContext: { opaque: true },
      };
    },
  };
  const projectApplyRequestPolicy = {
    selectRequestPolicy({ requireApproval }) {
      events.push('policy');
      assert.equal(requireApproval, approvalRequired);
      return {
        ok: true,
        authorityMode: 'personal',
        projectAuthenticationAdapter,
        applyRequestFields: { requireApproval: approvalRequired },
      };
    },
    permitsCommittedLocalTransitions({ state, outcome }) {
      return state === 'success' && [
        'PROJECT_APPLIED',
        'PROJECT_APPLY_NO_CHANGE',
        'PROJECT_APPLY_REPLAYED',
      ].includes(outcome);
    },
  };
  const apiEaseProjectApiClient = {
    async planProject(invocation) {
      events.push('plan');
      planCalls.push(invocation);
      return planResponse;
    },
    async applyProject(invocation) {
      events.push('apply');
      applyCalls.push(invocation);
      return applyResponse;
    },
  };
  const projectApplyService = new ProjectApplyService({
    projectApplyRequestPolicy,
    projectCandidateBuilder: {
      async buildCandidate({ projectDirectoryPath }) {
        events.push('candidate');
        assert.equal(projectDirectoryPath, '/checkout/nested');
        return candidateBuildResult;
      },
    },
    projectValidationService: {
      async validateCandidate(invocation) {
        events.push('validate');
        validationCalls.push(invocation);
        return validationResult ?? buildValidationSuccess(candidateBuildResult);
      },
    },
    apiEaseProjectApiClient,
    operationKeyFactory() {
      events.push('operation-key');
      return 'opaque-operation-key';
    },
    projectLocalStateService: {
      deriveCommittedLocalState(invocation) {
        events.push('derive-state');
        deriveStateCalls.push(invocation);
        return { stateFormatVersion: 1, committed: true };
      },
      async publishLocalState() {
        events.push('publish-state');
        if (publishFailure) throw publishFailure;
        return { localStateFilePath: '/git/apiease/project-state-v1.json' };
      },
    },
    projectDeletionIntentService: {
      async archiveCommittedDeletionIntents(invocation) {
        events.push('archive-deletions');
        archiveCalls.push(invocation);
        return { archivedPaths: ['resources/functions/archive/old.json'] };
      },
    },
  });

  return {
    apiEaseProjectApiClient,
    applyCalls,
    applyResponse,
    archiveCalls,
    candidateBuildResult,
    deriveStateCalls,
    events,
    planCalls,
    planResponse,
    projectApplyService,
    validationCalls,
  };
}

function buildInvocation() {
  return {
    projectDirectoryPath: '/checkout/nested',
    requireApproval: false,
    configurationOptions: {
      explicitApiBaseUrl: 'https://api.example.test',
      explicitApiKey: 'must-remain-opaque',
      explicitShopDomain: 'fixture.myshopify.com',
    },
  };
}

function buildCandidateBuildResult({ deletionIntents = [{ deletePath: 'delete.json' }] } = {}) {
  return {
    repositoryTopLevelPath: '/checkout',
    localState: { stateFormatVersion: 1 },
    changeSet: {
      contractVersion: 1,
      changeSetId: 'change_set_01',
      changeSetDigest: 'sha256:change-set',
      baseline: { liveRevision: 7, snapshotDigest: 'sha256:baseline' },
      creates: [],
      updates: [],
      deletes: [{
        bindingId: 'binding_request_inventory_sync',
        handle: 'inventory-sync',
        resourceType: 'request',
      }],
      secureInputs: [{
        fieldPath: 'parameters.api-key.value',
        handle: 'inventory-sync',
        mode: 'preserve',
        resourceType: 'request',
      }],
      verifiedBindings: [{
        bindingId: 'binding_request_inventory_sync',
        expectedResourceVersion: 'rv1_fixture',
        handle: 'inventory-sync',
        resourceId: 'request_01',
        resourceType: 'request',
      }],
    },
    candidateSnapshotDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    deletionIntents,
    requiredSecureValues: [],
  };
}

function buildValidationSuccess(candidateBuildResult) {
  return {
    ok: true,
    outcome: 'PROJECT_VALID',
    candidateBuildResult,
    validationResponse: { ok: true, outcome: 'PROJECT_VALID' },
    result: { diagnostics: [] },
    diagnostics: [],
    requiredSecureValues: [],
    guidance: [],
  };
}

function buildValidationFailure() {
  const validationResponse = buildFailureResponse('PROJECT_CANDIDATE_INVALID', 422);
  return {
    ok: false,
    outcome: validationResponse.outcome,
    validationResponse,
    result: null,
    error: validationResponse.error,
    diagnostics: validationResponse.error.diagnostics,
    requiredSecureValues: [],
    guidance: [],
  };
}

function buildPlanResponse() {
  return {
    ok: true,
    outcome: 'PROJECT_PLAN_READY',
    result: {
      baseline: { liveRevision: 1 },
      operations: [{ operation: 'delete', path: 'resources/functions/old.json' }],
      operationDigest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      summary: { operationCount: 1 },
    },
  };
}

function buildApplyResponse({ outerOutcome = 'PROJECT_APPLIED', replayed = false } = {}) {
  return {
    ok: true,
    outcome: outerOutcome,
    result: {
      applyReceiptVersion: 1,
      operationKey: 'opaque-operation-key',
      replayed,
      outcome: 'PROJECT_APPLIED',
      resultingLiveRevision: 2,
      resources: [{ operation: 'delete', resourceId: 'resource-old' }],
    },
  };
}

function buildProposalAcceptedResponse() {
  return {
    status: 202,
    ok: true,
    outcome: 'PROJECT_PROPOSAL_ACCEPTED',
    result: {
      proposalId: 'proposal_01',
      designSessionId: 'design_session_01',
      status: 'pending',
      replayed: false,
      branchName: 'apiease/proposals/project_01/design_session_01',
      commit: '1111111111111111111111111111111111111111',
      candidateSnapshotDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      operationDigest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      approvalBindingDigest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      requiredSecureValues: [],
      requiredSecureValuesWarning: 'Configure deferred values in APIEase.',
    },
  };
}

function buildFailureResponse(outcome, status) {
  return {
    status,
    ok: false,
    outcome,
    error: {
      code: outcome,
      message: 'Authoritative failure.',
      diagnostics: [{ code: outcome }],
    },
  };
}
