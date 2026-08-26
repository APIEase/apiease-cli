import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProjectApplyRequestPolicy } from '../../../src/project/ProjectApplyRequestPolicy.js';

describe('ProjectApplyRequestPolicy', () => {
  describe('selectRequestPolicy', () => {
    it('should select explicit personal immediate apply', () => {
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
        applyRequestFields: { requireApproval: false },
      });
    });

    it('should select personal deferred approval', () => {
      // Arrange
      const personalProjectAuthenticationAdapter = { readAuthorityMode: () => 'personal' };
      const projectApplyRequestPolicy = new ProjectApplyRequestPolicy({
        personalProjectAuthenticationAdapter,
      });

      // Act
      const requestPolicy = projectApplyRequestPolicy.selectRequestPolicy({
        requireApproval: true,
      });

      // Assert
      assert.deepEqual(requestPolicy, {
        ok: true,
        authorityMode: 'personal',
        projectAuthenticationAdapter: personalProjectAuthenticationAdapter,
        applyRequestFields: { requireApproval: true },
      });
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
