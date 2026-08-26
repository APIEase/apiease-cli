import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROJECT_REQUIRED_SECURE_VALUES_GUIDANCE,
  PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE,
  ProjectValidationService,
} from '../../../src/project/ProjectValidationService.js';

describe('ProjectValidationService', () => {
  describe('validateChangeSet', () => {
    it('should submit the exact retained change set for authoritative validation', async () => {
      // Arrange
      const changeSetBuildResult = buildChangeSetBuildResult();
      const calls = [];
      const projectValidationService = buildValidationService({ calls });

      // Act
      const validationResult = await projectValidationService.validateChangeSet({
        changeSetBuildResult,
        projectApiInvocation: buildProjectApiInvocation(),
      });

      // Assert
      assert.strictEqual(calls[0].request.changeSet, changeSetBuildResult.changeSet);
      assert.strictEqual(validationResult.changeSetBuildResult, changeSetBuildResult);
      assert.equal(validationResult.outcome, 'PROJECT_VALID');
    });

    it('should preserve an authoritative validation failure and its exact code', async () => {
      // Arrange
      const authoritativeFailure = buildAuthoritativeFailure();
      const projectValidationService = buildValidationService({ authoritativeFailure });

      // Act
      const validationResult = await projectValidationService.validateChangeSet({
        changeSetBuildResult: buildChangeSetBuildResult(),
        projectApiInvocation: buildProjectApiInvocation(),
      });

      // Assert
      assert.strictEqual(validationResult.validationResponse, authoritativeFailure);
      assert.equal(validationResult.outcome, 'PROJECT_CHANGE_SET_INVALID');
      assert.equal(validationResult.error.code, 'PROJECT_CHANGE_SET_INVALID');
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
        projectValidationService.validateChangeSet({
          changeSetBuildResult: buildChangeSetBuildResult(),
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
      const validationResult = await projectValidationService.validateChangeSet({
        changeSetBuildResult: buildChangeSetBuildResult(),
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
      const validationResult = await projectValidationService.validateChangeSet({
        changeSetBuildResult: buildChangeSetBuildResult(),
        projectApiInvocation: buildProjectApiInvocation(),
      });

      // Assert
      assert.deepEqual(validationResult.guidance, [PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE]);
    });

    it('should direct deferred secure-value configuration to the authenticated APIEase UI', async () => {
      // Arrange
      const changeSetBuildResult = buildChangeSetBuildResult();
      changeSetBuildResult.requiredSecureValues = [{
        resourceType: 'variable',
        handle: 'new-token',
        fieldPath: 'value',
      }];
      const projectValidationService = buildValidationService({ changeSetBuildResult });

      // Act
      const validationResult = await projectValidationService.validateChangeSet({
        changeSetBuildResult,
        projectApiInvocation: buildProjectApiInvocation(),
      });

      // Assert
      assert.deepEqual(validationResult.guidance, [
        PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE,
        PROJECT_REQUIRED_SECURE_VALUES_GUIDANCE,
      ]);
    });
  });

  describe('buildAndValidateProject', () => {
    it('should build once and submit every locally valid complete change set', async () => {
      // Arrange
      const changeSetBuildResult = buildChangeSetBuildResult();
      const calls = [];
      const projectValidationService = buildValidationService({ changeSetBuildResult, calls });

      // Act
      await projectValidationService.buildAndValidateProject({
        projectDirectoryPath: '/checkout/nested',
        projectApiInvocation: buildProjectApiInvocation(),
      });

      // Assert
      assert.deepEqual(calls, [
        { projectDirectoryPath: '/checkout/nested' },
        { ...buildProjectApiInvocation(), request: { contractVersion: 1, changeSet: changeSetBuildResult.changeSet } },
      ]);
    });

    it('should preserve a local change-set failure without calling the API', async () => {
      // Arrange
      const calls = [];
      const localFailure = Object.assign(new Error('PROJECT_CHANGE_SET_INVALID'), {
        code: 'PROJECT_CHANGE_SET_INVALID',
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
  changeSetBuildResult = buildChangeSetBuildResult(),
  localFailure,
} = {}) {
  return new ProjectValidationService({
    projectChangeSetBuilder: {
      async buildChangeSet(invocation) {
        calls.push(invocation);
        if (localFailure) throw localFailure;
        return changeSetBuildResult;
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

function buildChangeSetBuildResult() {
  return {
    repositoryTopLevelPath: '/checkout',
    localState: { stateFormatVersion: 1 },
    changeSet: { contractVersion: 1, creates: [], updates: [], deletes: [] },
    changeSetSnapshotDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
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
    changeSetContractVersion: 1,
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
    outcome: 'PROJECT_CHANGE_SET_INVALID',
    error: {
      code: 'PROJECT_CHANGE_SET_INVALID',
      message: 'The canonical change set is invalid.',
      diagnostics: [{ code: 'PROJECT_CHANGE_SET_INVALID', path: '/changeSet/files' }],
    },
  };
}
