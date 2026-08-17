import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProjectSecureInputService } from '../../../src/project/ProjectSecureInputService.js';

describe('ProjectSecureInputService', () => {
  describe('buildSecureInputs', () => {
    it('should build deterministic preserve instructions for protected targets on bound resources', () => {
      // Arrange
      const projectSecureInputService = new ProjectSecureInputService();
      const parsedResourceSources = [
        buildParsedVariableSource('inventory-token'),
        buildParsedRequestSource('inventory-sync', [
          buildRequestParameter('z-token', true),
          buildRequestParameter('limit', false, '10'),
          buildRequestParameter('a-token', true),
        ]),
      ];
      const localState = buildLocalState([
        buildBinding('variable', 'inventory-token'),
        buildBinding('request', 'inventory-sync'),
      ]);

      // Act
      const result = projectSecureInputService.buildSecureInputs({
        parsedResourceSources,
        localState,
      });

      // Assert
      assert.deepEqual(result, {
        secureInputs: [
          {
            resourceType: 'request',
            handle: 'inventory-sync',
            fieldPath: 'parameters.a-token.value',
            mode: 'preserve',
          },
          {
            resourceType: 'request',
            handle: 'inventory-sync',
            fieldPath: 'parameters.z-token.value',
            mode: 'preserve',
          },
          {
            resourceType: 'variable',
            handle: 'inventory-token',
            fieldPath: 'value',
            mode: 'preserve',
          },
        ],
        requiredSecureValues: [],
      });
    });

    it('should fail closed with only a safe selector for a protected target on a new resource', () => {
      // Arrange
      const projectSecureInputService = new ProjectSecureInputService();
      const parsedResourceSources = [buildParsedVariableSource('new-token')];

      // Act and Assert
      assert.throws(() => projectSecureInputService.buildSecureInputs({
        parsedResourceSources,
        localState: buildLocalState([]),
      }), error => {
        assert.equal(error.code, 'PROJECT_SECURE_INPUT_DEFERRED_UNAVAILABLE');
        assert.deepEqual(error.requiredSecureValues, [{
          resourceType: 'variable',
          handle: 'new-token',
          fieldPath: 'value',
        }]);
        assert.equal(Object.hasOwn(error.requiredSecureValues[0], 'value'), false);
        return true;
      });
    });

    it('should not treat a mismatched local-state resource as an existing binding', () => {
      // Arrange
      const projectSecureInputService = new ProjectSecureInputService();
      const mismatchedBinding = buildBinding('variable', 'new-token');
      mismatchedBinding.resourceType = 'request';

      // Act and Assert
      assert.throws(() => projectSecureInputService.buildSecureInputs({
        parsedResourceSources: [buildParsedVariableSource('new-token')],
        localState: buildLocalState([mismatchedBinding]),
      }), { code: 'PROJECT_SECURE_INPUT_DEFERRED_UNAVAILABLE' });
    });

    for (const [representationName, protectedValue] of [
      ['raw', 'do-not-retain-this-value'],
      ['masked', '********'],
      ['empty', ''],
      ['replace', { mode: 'replace', value: 'do-not-retain-this-value' }],
      ['reference', { mode: 'reference', sourceResourceId: 'request_source' }],
    ]) {
      it(`should reject the ${representationName} protected input representation without exposing it`, () => {
        // Arrange
        const projectSecureInputService = new ProjectSecureInputService();
        const parsedResourceSources = [buildParsedVariableSource(
          'existing-token',
          protectedValue,
        )];

        // Act and Assert
        assert.throws(() => projectSecureInputService.buildSecureInputs({
          parsedResourceSources,
          localState: buildLocalState([buildBinding('variable', 'existing-token')]),
        }), error => {
          assert.equal(error.code, 'PROJECT_SECURE_INPUT_VALUE_INVALID');
          assert.equal(JSON.stringify(error).includes('do-not-retain-this-value'), false);
          assert.equal(Object.hasOwn(error, 'requiredSecureValues'), false);
          return true;
        });
      });
    }

    it('should reject a protected request parameter that cannot form a canonical field path', () => {
      // Arrange
      const projectSecureInputService = new ProjectSecureInputService();
      const parsedResourceSources = [buildParsedRequestSource('inventory-sync', [
        buildRequestParameter('invalid.name', true),
      ])];

      // Act and Assert
      assert.throws(() => projectSecureInputService.buildSecureInputs({
        parsedResourceSources,
        localState: buildLocalState([buildBinding('request', 'inventory-sync')]),
      }), { code: 'PROJECT_SECURE_INPUT_TARGET_INVALID' });
    });

    it('should reject a protected placeholder on a non-sensitive field', () => {
      // Arrange
      const projectSecureInputService = new ProjectSecureInputService();
      const parsedResourceSources = [buildParsedRequestSource('inventory-sync', [
        buildRequestParameter('api-key', false),
      ])];

      // Act and Assert
      assert.throws(() => projectSecureInputService.buildSecureInputs({
        parsedResourceSources,
        localState: buildLocalState([buildBinding('request', 'inventory-sync')]),
      }), { code: 'PROJECT_SECURE_INPUT_VALUE_INVALID' });
    });
  });
});

function buildParsedVariableSource(handle, value = { mode: 'preserve' }) {
  return {
    path: `resources/variables/${handle}.json`,
    source: {
      contractVersion: 1,
      formatVersion: 1,
      resourceType: 'variable',
      handle,
      name: handle,
      sensitive: true,
      value,
    },
  };
}

function buildParsedRequestSource(handle, parameters) {
  return {
    path: `resources/requests/${handle}.json`,
    source: {
      contractVersion: 1,
      formatVersion: 1,
      resourceType: 'request',
      handle,
      name: handle,
      type: 'http',
      parameters,
      triggers: [],
    },
  };
}

function buildRequestParameter(name, sensitive, value = { mode: 'preserve' }) {
  return { type: 'header', name, sensitive, value };
}

function buildBinding(resourceType, handle) {
  return {
    path: `resources/${resourceType}s/${handle}.json`,
    resourceType,
    resourceId: `${resourceType}_${handle.replaceAll('-', '_')}`,
    handle,
    resourceVersion: 'rv1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  };
}

function buildLocalState(resources) {
  return { resources };
}
