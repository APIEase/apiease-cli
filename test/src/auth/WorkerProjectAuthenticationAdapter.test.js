import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const adapterModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'auth', 'WorkerProjectAuthenticationAdapter.js'),
).href;

describe('WorkerProjectAuthenticationAdapter', () => {
  describe('resolveRequestConfiguration', () => {
    it('should retain injected worker configuration in an opaque context', async () => {
      // Arrange
      const { WorkerProjectAuthenticationAdapter } = await import(adapterModuleUrl);
      const adapter = buildAdapter(WorkerProjectAuthenticationAdapter);

      // Act
      const configuration = await adapter.resolveRequestConfiguration();

      // Assert
      assert.deepEqual({
        keys: Object.keys(configuration).sort(),
        contextKeys: Object.keys(configuration.authenticationContext),
      }, {
        keys: ['apiBaseUrl', 'authenticationContext', 'ok'],
        contextKeys: [],
      });
    });

    it('should reject ordinary personal configuration fields', async () => {
      // Arrange
      const {
        WORKER_PROJECT_AUTHENTICATION_CONFIGURATION_ERROR_CODE,
        WorkerProjectAuthenticationAdapter,
      } = await import(adapterModuleUrl);
      const adapter = buildAdapter(WorkerProjectAuthenticationAdapter);

      // Act
      const configuration = await adapter.resolveRequestConfiguration({
        explicitApiKey: 'personal-secret',
      });

      // Assert
      assert.equal(
        configuration.errorCode,
        WORKER_PROJECT_AUTHENTICATION_CONFIGURATION_ERROR_CODE,
      );
    });

    it('should return a stable secret-safe failure for invalid injected context', async () => {
      // Arrange
      const {
        WORKER_PROJECT_AUTHENTICATION_CONFIGURATION_ERROR_CODE,
        WorkerProjectAuthenticationAdapter,
      } = await import(adapterModuleUrl);
      const adapter = new WorkerProjectAuthenticationAdapter({
        apiBaseUrl: 'https://apiease.example.com',
        capabilityBroker: {},
        capabilityBrokerContext: 'private-broker-credential',
      });

      // Act
      const configuration = await adapter.resolveRequestConfiguration();

      // Assert
      assert.deepEqual(configuration, {
        ok: false,
        errorCode: WORKER_PROJECT_AUTHENTICATION_CONFIGURATION_ERROR_CODE,
        message: 'Worker Project authentication configuration is invalid.',
      });
    });
  });

  describe('buildRequestHeaders', () => {
    it('should request only the exact action and opaque broker context', async () => {
      // Arrange
      const {
        WORKER_PROJECT_CAPABILITY_ACTIONS,
        WorkerProjectAuthenticationAdapter,
      } = await import(adapterModuleUrl);
      const brokerRequests = [];
      const capabilityBrokerContext = Object.freeze({ attemptId: 'private-attempt' });
      const adapter = buildAdapter(WorkerProjectAuthenticationAdapter, {
        brokerRequests,
        capabilityBrokerContext,
      });
      const configuration = await adapter.resolveRequestConfiguration();

      // Act
      await adapter.buildRequestHeaders(configuration.authenticationContext, {
        action: WORKER_PROJECT_CAPABILITY_ACTIONS.validate,
      });

      // Assert
      assert.deepEqual(brokerRequests, [{
        action: WORKER_PROJECT_CAPABILITY_ACTIONS.validate,
        brokerContext: capabilityBrokerContext,
      }]);
    });

    for (const actionName of [
      'bootstrap',
      'pull',
      'validate',
      'plan',
      'checkpointPublish',
      'checkpointRetrieve',
      'proposalSubmit',
    ]) {
      it(`should allow only the finalized ${actionName} capability action`, async () => {
        // Arrange
        const {
          WORKER_PROJECT_CAPABILITY_ACTIONS,
          WorkerProjectAuthenticationAdapter,
        } = await import(adapterModuleUrl);
        const adapter = buildAdapter(WorkerProjectAuthenticationAdapter);
        const configuration = await adapter.resolveRequestConfiguration();

        // Act
        const headers = await adapter.buildRequestHeaders(configuration.authenticationContext, {
          action: WORKER_PROJECT_CAPABILITY_ACTIONS[actionName],
        });

        // Assert
        assert.equal(headers.authorization, 'Bearer header.payload.signature');
      });
    }

    it('should build exactly the finalized bearer capability header', async () => {
      // Arrange
      const {
        WORKER_PROJECT_CAPABILITY_ACTIONS,
        WorkerProjectAuthenticationAdapter,
      } = await import(adapterModuleUrl);
      const adapter = buildAdapter(WorkerProjectAuthenticationAdapter);
      const configuration = await adapter.resolveRequestConfiguration();

      // Act
      const headers = await adapter.buildRequestHeaders(configuration.authenticationContext, {
        action: WORKER_PROJECT_CAPABILITY_ACTIONS.validate,
      });

      // Assert
      assert.deepEqual(headers, { authorization: 'Bearer header.payload.signature' });
    });

    it('should obtain a new single-use capability for every request', async () => {
      // Arrange
      const {
        WORKER_PROJECT_CAPABILITY_ACTIONS,
        WorkerProjectAuthenticationAdapter,
      } = await import(adapterModuleUrl);
      let sequence = 0;
      const adapter = new WorkerProjectAuthenticationAdapter({
        apiBaseUrl: 'https://apiease.example.com',
        capabilityBroker: {
          async requestCapability() {
            sequence += 1;
            return { capability: `header.payload.signature${sequence}` };
          },
        },
        capabilityBrokerContext: Object.freeze({ attemptId: 'private-attempt' }),
      });
      const configuration = await adapter.resolveRequestConfiguration();

      // Act
      const firstHeaders = await adapter.buildRequestHeaders(configuration.authenticationContext, {
        action: WORKER_PROJECT_CAPABILITY_ACTIONS.plan,
      });
      const secondHeaders = await adapter.buildRequestHeaders(configuration.authenticationContext, {
        action: WORKER_PROJECT_CAPABILITY_ACTIONS.plan,
      });

      // Assert
      assert.notEqual(firstHeaders.authorization, secondHeaders.authorization);
    });

    it('should reject actions and contexts outside its exact authority', async () => {
      // Arrange
      const {
        WORKER_PROJECT_AUTHENTICATION_ERROR_CODE,
        WorkerProjectAuthenticationAdapter,
      } = await import(adapterModuleUrl);
      const adapter = buildAdapter(WorkerProjectAuthenticationAdapter);

      // Act and Assert
      await assert.rejects(
        adapter.buildRequestHeaders(Object.freeze({}), { action: 'project:apply' }),
        error => error.code === WORKER_PROJECT_AUTHENTICATION_ERROR_CODE,
      );
    });

    it('should replace broker failures with a stable secret-safe error', async () => {
      // Arrange
      const {
        WORKER_PROJECT_AUTHENTICATION_ERROR_CODE,
        WORKER_PROJECT_CAPABILITY_ACTIONS,
        WorkerProjectAuthenticationAdapter,
      } = await import(adapterModuleUrl);
      const adapter = new WorkerProjectAuthenticationAdapter({
        apiBaseUrl: 'https://apiease.example.com',
        capabilityBroker: {
          async requestCapability() {
            throw new Error('Broker rejected private.header.signature');
          },
        },
        capabilityBrokerContext: Object.freeze({ attemptId: 'private-attempt' }),
      });
      const configuration = await adapter.resolveRequestConfiguration();

      // Act
      const rejection = await adapter.buildRequestHeaders(configuration.authenticationContext, {
        action: WORKER_PROJECT_CAPABILITY_ACTIONS.validate,
      }).catch(error => error);

      // Assert
      assert.deepEqual({ code: rejection.code, message: rejection.message }, {
        code: WORKER_PROJECT_AUTHENTICATION_ERROR_CODE,
        message: 'Worker Project authentication failed.',
      });
    });

    it('should keep broker context absent from serializable adapter state', async () => {
      // Arrange
      const { WorkerProjectAuthenticationAdapter } = await import(adapterModuleUrl);
      const adapter = buildAdapter(WorkerProjectAuthenticationAdapter, {
        capabilityBrokerContext: 'private-broker-context',
      });

      // Act
      const serializedAdapter = JSON.stringify(adapter);

      // Assert
      assert.equal(serializedAdapter.includes('private-broker-context'), false);
    });
  });

  describe('readAuthorityMode', () => {
    it('should declare worker authority', async () => {
      // Arrange
      const { WorkerProjectAuthenticationAdapter } = await import(adapterModuleUrl);
      const adapter = buildAdapter(WorkerProjectAuthenticationAdapter);

      // Act
      const authorityMode = adapter.readAuthorityMode();

      // Assert
      assert.equal(authorityMode, 'worker');
    });
  });
});

function buildAdapter(WorkerProjectAuthenticationAdapter, {
  brokerRequests = [],
  capabilityBrokerContext = Object.freeze({ attemptId: 'private-attempt' }),
} = {}) {
  return new WorkerProjectAuthenticationAdapter({
    apiBaseUrl: 'https://apiease.example.com',
    capabilityBroker: {
      async requestCapability(request) {
        brokerRequests.push(request);
        return { capability: 'header.payload.signature' };
      },
    },
    capabilityBrokerContext,
  });
}
