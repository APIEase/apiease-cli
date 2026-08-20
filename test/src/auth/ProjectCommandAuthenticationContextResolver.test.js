import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ProjectCommandAuthenticationContextResolver,
} from '../../../src/auth/ProjectCommandAuthenticationContextResolver.js';
import {
  PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES,
} from '../../../src/auth/ProjectBearerAuthenticationContract.js';

describe('ProjectCommandAuthenticationContextResolver', () => {
  describe('resolveContext', () => {
    it('should retain personal authority when no bearer option is present', () => {
      const resolver = new ProjectCommandAuthenticationContextResolver({ environment: {} });

      const context = resolver.resolveContext(['validate']);

      assert.equal(context.projectAuthenticationAdapter.readAuthorityMode(), 'personal');
      assert.equal(context.approvalProjectContext, undefined);
    });

    it('should build generic bearer authority from an explicit command option', async () => {
      const resolver = new ProjectCommandAuthenticationContextResolver({ environment: {} });

      const context = resolver.resolveContext([
        'validate',
        '--base-url', 'https://apiease.example.com',
        '--bearer-token', 'header.payload.signature',
      ]);
      const configuration = await context.projectAuthenticationAdapter
        .resolveRequestConfiguration();

      assert.equal(context.projectAuthenticationAdapter.readAuthorityMode(), 'bearer');
      assert.equal(configuration.ok, true);
    });

    it('should build action-scoped bearer authority from the generic environment', async () => {
      const resolver = new ProjectCommandAuthenticationContextResolver({ environment: {
        [PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES.apiBaseUrl]:
          'https://apiease.example.com',
        [PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES.tokenSet]: JSON.stringify({
          'project:validate': ['header.payload.signature'],
        }),
      } });

      const context = resolver.resolveContext(['validate']);
      const configuration = await context.projectAuthenticationAdapter
        .resolveRequestConfiguration();
      const headers = await context.projectAuthenticationAdapter.buildRequestHeaders(
        configuration.authenticationContext,
        {action: 'project:validate'},
      );

      assert.equal(headers.authorization, 'Bearer header.payload.signature');
    });

    it('should build the approval checkpoint from generic proposal context', () => {
      const proposalCheckpoint = {
        branchName: 'apiease/proposals/project-1/session-1',
        commit: 'a'.repeat(40),
        designSessionId: 'session-1',
        proposalId: 'proposal-1',
      };
      const resolver = new ProjectCommandAuthenticationContextResolver({ environment: {
        [PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES.apiBaseUrl]:
          'https://apiease.example.com',
        [PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES.proposalContext]:
          JSON.stringify(proposalCheckpoint),
        [PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES.tokenSet]: JSON.stringify({
          'proposal:submit': ['header.payload.signature'],
        }),
      } });

      const context = resolver.resolveContext(['apply', '--require-approval']);

      assert.deepEqual(
        context.approvalProjectContext.proposalCheckpoint,
        proposalCheckpoint,
      );
    });

    it('should reject bearer authentication when a personal API key is configured', async () => {
      const resolver = new ProjectCommandAuthenticationContextResolver({ environment: {
        APIEASE_API_KEY: 'personal-secret',
      } });
      const context = resolver.resolveContext([
        'validate',
        '--base-url', 'https://apiease.example.com',
        '--bearer-token', 'header.payload.signature',
      ]);

      const configuration = await context.projectAuthenticationAdapter
        .resolveRequestConfiguration();

      assert.equal(configuration.errorCode, 'PROJECT_AUTHENTICATION_OPTIONS_CONFLICT');
      assert.equal(JSON.stringify(configuration).includes('personal-secret'), false);
    });
  });
});
