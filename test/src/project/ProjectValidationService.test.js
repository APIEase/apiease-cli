import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE,
  ProjectValidationService,
} from '../../../src/project/ProjectValidationService.js';

describe('ProjectValidationService', () => {
  describe('validateCandidate', () => {
    it('should submit the exact retained candidate for authoritative validation', async () => {
      // Arrange
      const candidateBuildResult = buildCandidateBuildResult();
      const calls = [];
      const projectValidationService = buildValidationService({ calls });

      // Act
      const validationResult = await projectValidationService.validateCandidate({
        candidateBuildResult,
        projectApiInvocation: buildProjectApiInvocation(),
      });

      // Assert
      assert.strictEqual(calls[0].request.candidate, candidateBuildResult.candidate);
      assert.strictEqual(validationResult.candidateBuildResult, candidateBuildResult);
      assert.equal(validationResult.outcome, 'PROJECT_VALID');
    });

    it('should preserve an authoritative validation failure and its exact code', async () => {
      // Arrange
      const authoritativeFailure = buildAuthoritativeFailure();
      const projectValidationService = buildValidationService({ authoritativeFailure });

      // Act
      const validationResult = await projectValidationService.validateCandidate({
        candidateBuildResult: buildCandidateBuildResult(),
        projectApiInvocation: buildProjectApiInvocation(),
      });

      // Assert
      assert.strictEqual(validationResult.validationResponse, authoritativeFailure);
      assert.equal(validationResult.outcome, 'PROJECT_CANDIDATE_INVALID');
      assert.equal(validationResult.error.code, 'PROJECT_CANDIDATE_INVALID');
    });

    it('should fail closed when a successful response is not PROJECT_VALID', async () => {
      // Arrange
      const projectValidationService = buildValidationService({
        authoritativeResponse: {
          contractVersion: 1,
          ok: true,
          outcome: 'PROJECT_PLAN_READY',
          result: { diagnostics: [] },
        },
      });

      // Act and Assert
      await assert.rejects(
        projectValidationService.validateCandidate({
          candidateBuildResult: buildCandidateBuildResult(),
          projectApiInvocation: buildProjectApiInvocation(),
        }),
        { code: 'PROJECT_VALIDATION_OUTCOME_INVALID' },
      );
    });

    it('should return bounded safe diagnostics and future secure-value selectors', async () => {
      // Arrange
      const projectValidationService = buildValidationService({
        authoritativeResponse: buildAuthoritativeSuccess({
          diagnostics: [{ code: 'NOTICE', path: '/files/0', secret: 'must-not-appear' }],
          requiredSecureValues: [{
            resourceType: 'request',
            handle: 'inventory-sync',
            fieldPath: 'parameters.api-key.value',
            value: 'must-not-appear',
          }],
        }),
      });

      // Act
      const validationResult = await projectValidationService.validateCandidate({
        candidateBuildResult: buildCandidateBuildResult(),
        projectApiInvocation: buildProjectApiInvocation(),
      });

      // Assert
      assert.deepEqual(validationResult.diagnostics, [{ code: 'NOTICE', path: '/files/0' }]);
      assert.deepEqual(validationResult.requiredSecureValues, [{
        resourceType: 'request',
        handle: 'inventory-sync',
        fieldPath: 'parameters.api-key.value',
      }]);
    });

    it('should state that validation did not execute or verify runtime behavior', async () => {
      // Arrange
      const projectValidationService = buildValidationService();

      // Act
      const validationResult = await projectValidationService.validateCandidate({
        candidateBuildResult: buildCandidateBuildResult(),
        projectApiInvocation: buildProjectApiInvocation(),
      });

      // Assert
      assert.deepEqual(validationResult.guidance, [PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE]);
    });
  });

  describe('buildAndValidateProject', () => {
    it('should build once and submit every locally valid complete candidate', async () => {
      // Arrange
      const candidateBuildResult = buildCandidateBuildResult();
      const calls = [];
      const projectValidationService = buildValidationService({ candidateBuildResult, calls });

      // Act
      await projectValidationService.buildAndValidateProject({
        projectDirectoryPath: '/checkout/nested',
        projectApiInvocation: buildProjectApiInvocation(),
      });

      // Assert
      assert.deepEqual(calls, [
        { projectDirectoryPath: '/checkout/nested' },
        { ...buildProjectApiInvocation(), request: { contractVersion: 1, candidate: candidateBuildResult.candidate } },
      ]);
    });

    it('should preserve a local candidate failure without calling the API', async () => {
      // Arrange
      const calls = [];
      const localFailure = Object.assign(new Error('PROJECT_CANDIDATE_INVALID'), {
        code: 'PROJECT_CANDIDATE_INVALID',
        diagnostics: [{ code: 'CONTRACT_REQUIRED', path: '/files' }],
      });
      const projectValidationService = buildValidationService({ calls, localFailure });

      // Act and Assert
      await assert.rejects(
        projectValidationService.buildAndValidateProject({
          projectDirectoryPath: '/checkout',
          projectApiInvocation: buildProjectApiInvocation(),
        }),
        error => {
          assert.strictEqual(error, localFailure);
          assert.deepEqual(calls, [{ projectDirectoryPath: '/checkout' }]);
          return true;
        },
      );
    });
  });
});

function buildValidationService({
  authoritativeFailure,
  authoritativeResponse,
  calls = [],
  candidateBuildResult = buildCandidateBuildResult(),
  localFailure,
} = {}) {
  return new ProjectValidationService({
    projectCandidateBuilder: {
      async buildCandidate(invocation) {
        calls.push(invocation);
        if (localFailure) throw localFailure;
        return candidateBuildResult;
      },
    },
    apiEaseProjectApiClient: {
      async validateProject(invocation) {
        calls.push(invocation);
        return authoritativeFailure ?? authoritativeResponse ?? buildAuthoritativeSuccess();
      },
    },
  });
}

function buildCandidateBuildResult() {
  return {
    repositoryTopLevelPath: '/checkout',
    localState: { stateFormatVersion: 1 },
    candidate: { candidateFormatVersion: 1, files: [] },
    candidateSnapshotDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    deletionIntents: [],
    requiredSecureValues: [],
  };
}

function buildProjectApiInvocation() {
  return {
    apiBaseUrl: 'https://api.example.test',
    authenticationContext: { opaque: true },
  };
}

function buildAuthoritativeSuccess({ diagnostics = [], requiredSecureValues } = {}) {
  const result = {
    candidateFormatVersion: 1,
    baseline: {
      liveRevision: 1,
      snapshotDigest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    },
    summary: {
      fileCount: 0,
      resourceCount: 0,
      createCount: 0,
      updateCount: 0,
      deleteCount: 0,
      totalBytes: 0,
    },
    diagnostics,
  };
  if (requiredSecureValues) result.requiredSecureValues = requiredSecureValues;

  return { contractVersion: 1, ok: true, outcome: 'PROJECT_VALID', result };
}

function buildAuthoritativeFailure() {
  return {
    status: 422,
    contractVersion: 1,
    ok: false,
    outcome: 'PROJECT_CANDIDATE_INVALID',
    error: {
      code: 'PROJECT_CANDIDATE_INVALID',
      message: 'The candidate is invalid.',
      diagnostics: [{ code: 'PROJECT_CANDIDATE_INVALID', path: '/candidate/files' }],
    },
  };
}
