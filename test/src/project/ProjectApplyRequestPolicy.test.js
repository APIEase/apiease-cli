import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PROJECT_CLI_EXIT_CODES, ProjectCommandResultService } from '../../../src/cli/ProjectCommandResultService.js';
import {
  PROJECT_WORKER_AUTHORITY_UNAVAILABLE_ERROR_CODE,
  ProjectApplyRequestPolicy,
} from '../../../src/project/ProjectApplyRequestPolicy.js';

const proposalCheckpoint = Object.freeze({
  designSessionId: 'design_session_01',
  proposalId: 'proposal_01',
  branchName: 'apiease/proposals/project_01/design_session_01',
  commit: '1111111111111111111111111111111111111111',
});

describe('ProjectApplyRequestPolicy', () => {
  describe('selectRequestPolicy', () => {
    it('should select personal authority without adding an approval wire field', () => {
      // Arrange
      const personalProjectAuthenticationAdapter = { readAuthorityMode: () => 'personal' };
      const projectApplyRequestPolicy = new ProjectApplyRequestPolicy({
        personalProjectAuthenticationAdapter,
      });

      // Act
      const requestPolicy = projectApplyRequestPolicy.selectRequestPolicy();

      // Assert
      assert.deepEqual(requestPolicy, {
        ok: true,
        authorityMode: 'personal',
        projectAuthenticationAdapter: personalProjectAuthenticationAdapter,
        applyRequestFields: {},
      });
      assert.equal(Object.hasOwn(requestPolicy.applyRequestFields, 'requireApproval'), false);
    });

    it('should select worker authority only from an exact injected worker context', () => {
      // Arrange
      const workerProjectAuthenticationAdapter = { readAuthorityMode: () => 'worker' };
      const projectApplyRequestPolicy = new ProjectApplyRequestPolicy({
        personalProjectAuthenticationAdapter: {},
        workerProjectContext: {
          projectAuthenticationAdapter: workerProjectAuthenticationAdapter,
          proposalCheckpoint,
        },
      });

      // Act
      const requestPolicy = projectApplyRequestPolicy.selectRequestPolicy({
        requireApproval: true,
      });

      // Assert
      assert.deepEqual(requestPolicy, {
        ok: true,
        authorityMode: 'worker',
        projectAuthenticationAdapter: workerProjectAuthenticationAdapter,
        applyRequestFields: { requireApproval: true, proposalCheckpoint },
      });
    });

    it('should fail approval-required selection without an exact worker context', () => {
      // Arrange
      let personalAuthorityAccessed = false;
      const personalProjectAuthenticationAdapter = {
        readAuthorityMode() {
          personalAuthorityAccessed = true;
          return 'personal';
        },
      };
      const projectApplyRequestPolicy = new ProjectApplyRequestPolicy({
        personalProjectAuthenticationAdapter,
      });
      const projectCommandResultService = new ProjectCommandResultService();

      // Act
      const requestPolicy = projectApplyRequestPolicy.selectRequestPolicy({
        requireApproval: true,
      });
      const exitCode = projectCommandResultService.resolveExitCode({
        state: 'failure',
        error: requestPolicy.error,
      });

      // Assert
      assert.deepEqual(requestPolicy, {
        ok: false,
        error: {
          code: PROJECT_WORKER_AUTHORITY_UNAVAILABLE_ERROR_CODE,
          category: 'authorization',
        },
        diagnostics: [{ code: PROJECT_WORKER_AUTHORITY_UNAVAILABLE_ERROR_CODE }],
      });
      assert.equal(personalAuthorityAccessed, false);
      assert.equal(exitCode, PROJECT_CLI_EXIT_CODES.authenticationOrAuthorization);
    });

    it('should reject a worker context containing additional authority fields', () => {
      // Arrange
      const projectApplyRequestPolicy = new ProjectApplyRequestPolicy({
        personalProjectAuthenticationAdapter: {},
        workerProjectContext: {
          projectAuthenticationAdapter: { readAuthorityMode: () => 'worker' },
          proposalCheckpoint,
          apiKey: 'must-not-be-accepted',
        },
      });

      // Act
      const requestPolicy = projectApplyRequestPolicy.selectRequestPolicy({
        requireApproval: true,
      });

      // Assert
      assert.equal(requestPolicy.error.code, PROJECT_WORKER_AUTHORITY_UNAVAILABLE_ERROR_CODE);
    });

    it('should fail closed for malformed exact worker context fields', () => {
      // Arrange
      const projectApplyRequestPolicy = new ProjectApplyRequestPolicy({
        personalProjectAuthenticationAdapter: {},
        workerProjectContext: {
          projectAuthenticationAdapter: undefined,
          proposalCheckpoint: {},
        },
      });

      // Act
      const requestPolicy = projectApplyRequestPolicy.selectRequestPolicy({
        requireApproval: true,
      });

      // Assert
      assert.equal(requestPolicy.error.code, PROJECT_WORKER_AUTHORITY_UNAVAILABLE_ERROR_CODE);
    });
  });

  describe('permitsCommittedLocalTransitions', () => {
    it('should permit local transitions for a committed immediate apply outcome', () => {
      // Arrange
      const projectApplyRequestPolicy = new ProjectApplyRequestPolicy({
        personalProjectAuthenticationAdapter: {},
      });

      // Act
      const permitsCommittedLocalTransitions = projectApplyRequestPolicy
        .permitsCommittedLocalTransitions({ state: 'success', outcome: 'PROJECT_APPLIED' });

      // Assert
      assert.equal(permitsCommittedLocalTransitions, true);
    });

    it('should keep an accepted apply result explicitly noncommitted', () => {
      // Arrange
      const projectApplyRequestPolicy = new ProjectApplyRequestPolicy({
        personalProjectAuthenticationAdapter: {},
      });

      // Act
      const permitsCommittedLocalTransitions = projectApplyRequestPolicy
        .permitsCommittedLocalTransitions({ state: 'accepted' });

      // Assert
      assert.equal(permitsCommittedLocalTransitions, false);
    });
  });
});
