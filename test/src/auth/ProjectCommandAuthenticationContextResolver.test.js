import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ProjectCommandAuthenticationContextResolver,
} from '../../../src/auth/ProjectCommandAuthenticationContextResolver.js';

describe('ProjectCommandAuthenticationContextResolver', () => {
  describe('resolveContext', () => {
    it('should retain personal authority for customer Project API commands', () => {
      const resolver = new ProjectCommandAuthenticationContextResolver();

      const context = resolver.resolveContext(['validate']);

      assert.equal(context.projectAuthenticationAdapter.readAuthorityMode(), 'personal');
      assert.equal(Object.hasOwn(context, 'approvalProjectContext'), false);
    });

    it('should not construct internal approval context from command arguments', () => {
      const resolver = new ProjectCommandAuthenticationContextResolver();

      const context = resolver.resolveContext(['apply', '--require-approval']);

      assert.equal(Object.hasOwn(context, 'approvalProjectContext'), false);
      assert.equal(context.projectAuthenticationAdapter.readAuthorityMode(), 'personal');
    });
  });
});
