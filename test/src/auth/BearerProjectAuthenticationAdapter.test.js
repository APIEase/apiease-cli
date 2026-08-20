import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BearerProjectAuthenticationAdapter } from '../../../src/auth/BearerProjectAuthenticationAdapter.js';

describe('BearerProjectAuthenticationAdapter', () => {
  describe('buildRequestHeaders', () => {
    it('should consume one action-scoped bearer token for each request attempt', async () => {
      const adapter = new BearerProjectAuthenticationAdapter({
        apiBaseUrl: 'https://apiease.example.com',
        bearerTokensByAction: {
          'project:validate': ['header.payload.signature1', 'header.payload.signature2'],
        },
      });
      const configuration = await adapter.resolveRequestConfiguration();

      const firstHeaders = await adapter.buildRequestHeaders(
        configuration.authenticationContext,
        { action: 'project:validate' },
      );
      const secondHeaders = await adapter.buildRequestHeaders(
        configuration.authenticationContext,
        { action: 'project:validate' },
      );

      assert.equal(firstHeaders.authorization, 'Bearer header.payload.signature1');
      assert.equal(secondHeaders.authorization, 'Bearer header.payload.signature2');
    });

    it('should fail with a secret-safe error after the token queue is exhausted', async () => {
      const adapter = new BearerProjectAuthenticationAdapter({
        apiBaseUrl: 'https://apiease.example.com',
        bearerTokensByAction: {'project:validate': ['header.payload.signature']},
      });
      const configuration = await adapter.resolveRequestConfiguration();
      await adapter.buildRequestHeaders(configuration.authenticationContext, {
        action: 'project:validate',
      });

      await assert.rejects(
        adapter.buildRequestHeaders(configuration.authenticationContext, {
          action: 'project:validate',
        }),
        error => error.message === 'Bearer authentication failed.'
          && !error.message.includes('header.payload.signature'),
      );
    });
  });

  describe('resolveRequestConfiguration', () => {
    it('should reject bearer and personal API-key authentication together', async () => {
      const adapter = new BearerProjectAuthenticationAdapter({
        apiBaseUrl: 'https://apiease.example.com',
        bearerTokensByAction: {'*': ['header.payload.signature']},
      });

      const configuration = await adapter.resolveRequestConfiguration({
        explicitApiKey: 'personal-secret',
      });

      assert.equal(configuration.ok, false);
      assert.equal(configuration.errorCode, 'PROJECT_AUTHENTICATION_OPTIONS_CONFLICT');
      assert.equal(JSON.stringify(configuration).includes('personal-secret'), false);
    });

    it('should keep bearer tokens out of serializable adapter state', () => {
      const bearerToken = 'header.payload.private-signature';
      const adapter = new BearerProjectAuthenticationAdapter({
        apiBaseUrl: 'https://apiease.example.com',
        bearerTokensByAction: {'project:validate': [bearerToken]},
      });

      const serializedAdapter = JSON.stringify(adapter);

      assert.equal(serializedAdapter.includes(bearerToken), false);
    });
  });
});
