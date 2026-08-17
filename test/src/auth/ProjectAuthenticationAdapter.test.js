import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const projectAuthenticationAdapterModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'auth', 'ProjectAuthenticationAdapter.js'),
).href;

describe('ProjectAuthenticationAdapter', () => {
  describe('authentication boundary', () => {
    it('should allow a complete adapter to resolve opaque request authentication', async () => {
      // Arrange
      const { ProjectAuthenticationAdapter } = await import(projectAuthenticationAdapterModuleUrl);
      const authenticationContext = Object.freeze({ privateValue: 'opaque' });
      class CompleteProjectAuthenticationAdapter extends ProjectAuthenticationAdapter {
        async resolveRequestConfiguration() {
          return {
            apiBaseUrl: 'https://apiease.example.com',
            authenticationContext,
          };
        }

        buildRequestHeaders(resolvedAuthenticationContext) {
          assert.equal(resolvedAuthenticationContext, authenticationContext);

          return { authorization: 'opaque-header' };
        }

        readAuthorityMode() {
          return 'future-authority';
        }
      }
      const projectAuthenticationAdapter = new CompleteProjectAuthenticationAdapter();

      // Act
      const requestConfiguration = await projectAuthenticationAdapter.resolveRequestConfiguration();
      const requestHeaders = projectAuthenticationAdapter.buildRequestHeaders(
        requestConfiguration.authenticationContext,
      );
      const authorityMode = projectAuthenticationAdapter.readAuthorityMode();

      // Assert
      assert.deepEqual(requestConfiguration, {
        apiBaseUrl: 'https://apiease.example.com',
        authenticationContext,
      });
      assert.deepEqual(requestHeaders, { authorization: 'opaque-header' });
      assert.equal(authorityMode, 'future-authority');
    });

    it('should fail fast when an adapter does not implement the required methods', async () => {
      // Arrange
      const { ProjectAuthenticationAdapter } = await import(projectAuthenticationAdapterModuleUrl);
      const projectAuthenticationAdapter = new ProjectAuthenticationAdapter();

      // Act and Assert
      await assert.rejects(
        projectAuthenticationAdapter.resolveRequestConfiguration(),
        /resolveRequestConfiguration must be implemented/,
      );
      assert.throws(
        () => projectAuthenticationAdapter.buildRequestHeaders({}),
        /buildRequestHeaders must be implemented/,
      );
      assert.throws(
        () => projectAuthenticationAdapter.readAuthorityMode(),
        /readAuthorityMode must be implemented/,
      );
    });
  });
});
