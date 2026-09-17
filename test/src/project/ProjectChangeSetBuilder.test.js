import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProjectChangeSetBuilder } from '../../../src/project/ProjectChangeSetBuilder.js';
import { ProjectContractService } from '../../../src/project/ProjectContractService.js';

const BASELINE_DIGEST = 'sha256:1111111111111111111111111111111111111111111111111111111111111111';
const CANDIDATE_DIGEST = 'sha256:2222222222222222222222222222222222222222222222222222222222222222';
const REQUEST_VERSION = 'rv1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const VARIABLE_VERSION = 'rv1_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

describe('ProjectChangeSetBuilder', () => {
  describe('buildChangeSet', () => {
    it('should build one deterministic Canonical Resource Change Set from local files', async () => {
      // Arrange
      const fixture = buildFixture();
      const projectChangeSetBuilder = buildChangeSetBuilder(fixture);

      // Act
      const firstResult = await projectChangeSetBuilder.buildChangeSet({
        projectDirectoryPath: '/checkout/nested',
      });
      const secondResult = await projectChangeSetBuilder.buildChangeSet({
        projectDirectoryPath: '/checkout/nested',
      });

      // Assert
      assert.deepEqual(firstResult.changeSet, buildExpectedChangeSet(fixture));
      assert.equal(JSON.stringify(firstResult.changeSet), JSON.stringify(secondResult.changeSet));
      assert.equal(firstResult.changeSetSnapshotDigest, CANDIDATE_DIGEST);
      assert.equal(secondResult.changeSetSnapshotDigest, CANDIDATE_DIGEST);
      assert.deepEqual(firstResult.deletionIntents, fixture.deletionIntents);
    });

    it('should fail when a bound file is missing without valid deletion intent', async () => {
      // Arrange
      const fixture = buildFixture();
      fixture.files.push(buildFile('resources/widgets/manually-renamed.json', {
        contractVersion: 1,
        formatVersion: 1,
        resourceType: 'widget',
        handle: 'manually-renamed',
        name: 'Existing widget',
        liquid: '',
        javascript: '',
        externalJavascriptUrls: [],
        disableJavascript: false,
      }));
      fixture.localState.resources.push({
        path: 'resources/widgets/existing-widget.json',
        resourceType: 'widget',
        resourceId: 'widget_existing',
        handle: 'existing-widget',
        resourceVersion: REQUEST_VERSION,
      });
      const projectChangeSetBuilder = buildChangeSetBuilder(fixture);

      // Act and Assert
      await assert.rejects(projectChangeSetBuilder.buildChangeSet({
        projectDirectoryPath: '/checkout',
      }), error => {
        assert.equal(error.code, 'PROJECT_CHANGE_SET_BOUND_FILE_MISSING');
        assert.deepEqual(error.diagnostics, [{
          code: 'PROJECT_CHANGE_SET_BOUND_FILE_MISSING',
          path: 'resources/widgets/existing-widget.json',
        }]);
        return true;
      });
    });

    it('should reject a bound file whose canonical resource type disagrees with local state', async () => {
      // Arrange
      const fixture = buildFixture();
      fixture.localState.resources[0].resourceType = 'widget';
      const projectChangeSetBuilder = buildChangeSetBuilder(fixture);

      // Act and Assert
      await assert.rejects(projectChangeSetBuilder.buildChangeSet({
        projectDirectoryPath: '/checkout',
      }), { code: 'PROJECT_CHANGE_SET_BINDING_MISMATCH' });
    });

    it('should reject a complete change set that fails the authoritative local schema', async () => {
      // Arrange
      const fixture = buildFixture();
      const projectChangeSetBuilder = buildChangeSetBuilder(fixture, {
        candidateValidationResult: {
          ok: false,
          diagnostics: [{ code: 'CONTRACT_REQUIRED', path: '/files' }],
        },
      });

      // Act and Assert
      await assert.rejects(projectChangeSetBuilder.buildChangeSet({
        projectDirectoryPath: '/checkout',
      }), error => {
        assert.equal(error.code, 'PROJECT_CHANGE_SET_INVALID');
        assert.deepEqual(error.diagnostics, [{ code: 'CONTRACT_REQUIRED', path: '/files' }]);
        return true;
      });
    });
  });
});

function buildChangeSetBuilder(fixture, {
  candidateValidationResult,
} = {}) {
  return new ProjectChangeSetBuilder({
    projectCanonicalArtifactService: {
      parseResourceSource: ({ content }) => JSON.parse(content),
      serializeCanonicalValue: value => JSON.stringify(sortCanonicalValue(value)),
    },
    projectContractService: candidateValidationResult
      ? { validateCanonicalResourceChangeSet: () => candidateValidationResult }
      : new ProjectContractService(),
    projectDeletionIntentService: {
      discoverDeletionIntents: async () => ({
        deletions: fixture.deletions.map(deletion => ({ ...deletion })),
        deletionIntents: fixture.deletionIntents.map(intent => ({ ...intent })),
      }),
    },
    projectGitCheckoutService: {
      validateProjectCheckout: async () => ({
        repositoryTopLevelPath: '/checkout',
      localState: structuredClone(fixture.localState),
      }),
    },
    projectManagedNamespaceService: {
      discoverManagedNamespace: async () => ({
        repositoryTopLevelPath: '/checkout',
        files: fixture.files.map(file => ({ ...file })).reverse(),
        snapshotDigest: CANDIDATE_DIGEST,
      }),
    },
    projectSecureInputService: {
      buildSecureInputs: () => ({
        secureInputs: fixture.secureInputs.map(secureInput => ({ ...secureInput })).reverse(),
        requiredSecureValues: [],
      }),
    },
  });
}

function buildFixture() {
  const requestSource = {
    contractVersion: 1,
    formatVersion: 1,
    resourceType: 'request',
    handle: 'renamed-request',
    name: 'Renamed request',
    description: 'Synchronizes renamed request data.',
    type: 'http',
    parameters: [],
    triggers: [],
  };
  const functionSource = {
    contractVersion: 1,
    formatVersion: 1,
    resourceType: 'function',
    handle: 'new-function',
    name: 'New function',
    description: 'New',
    type: 'liquid',
    liquid: '',
    parameters: [],
  };
  const metadataFile = buildFile('.apiease/project.json', { formatVersion: 1 });
  const requestFile = buildFile('resources/requests/renamed-request.json', requestSource);
  const functionFile = buildFile('resources/functions/new-function.json', functionSource);

  return {
    files: [metadataFile, requestFile, functionFile],
    localState: {
      localStateVersion: 1,
      projectIdentity: {
        normalizedShopDomain: 'merchant.myshopify.com',
        projectId: 'project_fixture',
        templateOwner: 'APIEase',
        templateRef: 'main',
        templateRepository: 'apiease-template',
      },
      baseline: { liveRevision: 42, snapshotDigest: BASELINE_DIGEST },
      resources: [
        {
          path: requestFile.path,
          resourceType: 'request',
          resourceId: 'request_existing',
          handle: 'original-request',
          resourceVersion: REQUEST_VERSION,
        },
        {
          path: 'resources/variables/deleted-variable.json',
          resourceType: 'variable',
          resourceId: 'variable_deleted',
          handle: 'deleted-variable',
          resourceVersion: VARIABLE_VERSION,
        },
      ],
    },
    deletions: [{
      resourceType: 'variable',
      resourceId: 'variable_deleted',
      originalHandle: 'deleted-variable',
      expectedResourceVersion: VARIABLE_VERSION,
    }],
    deletionIntents: [{
      sourcePath: 'resources/variables/deleted-variable.json',
      deletePath: 'resources/variables/delete/deleted-variable.json',
    }],
    secureInputs: [{
      resourceType: 'request',
      handle: 'renamed-request',
      fieldPath: 'parameters.api-key.value',
      mode: 'preserve',
    }],
  };
}

function buildExpectedChangeSet(fixture) {
  return {
    contractVersion: 1,
    changeSetId: `change_set_${CANDIDATE_DIGEST.slice('sha256:'.length)}`,
    changeSetDigest: 'sha256:7d5638878df3400366e5d177e265a192dee7dd71c8c17f02e563f9f5a0506111',
    baseline: { liveRevision: 42, snapshotDigest: BASELINE_DIGEST },
    creates: [{
      resourceType: 'function',
      handle: 'new-function',
      source: JSON.parse(fixture.files[2].content),
    }],
    updates: [{
      resourceType: 'request',
      handle: 'renamed-request',
      bindingId: 'binding_request_original_request',
      source: JSON.parse(fixture.files[1].content),
    }],
    deletes: [{
      resourceType: 'variable',
      handle: 'deleted-variable',
      bindingId: 'binding_variable_deleted_variable',
    }],
    secureInputs: fixture.secureInputs,
    verifiedBindings: [{
      bindingId: 'binding_request_original_request',
      resourceType: 'request',
      handle: 'original-request',
      resourceId: 'request_existing',
      expectedResourceVersion: REQUEST_VERSION,
    }, {
      bindingId: 'binding_variable_deleted_variable',
      resourceType: 'variable',
      handle: 'deleted-variable',
      resourceId: 'variable_deleted',
      expectedResourceVersion: VARIABLE_VERSION,
    }],
  };
}

function buildFile(filePath, source) {
  return {
    path: filePath,
    encoding: 'utf-8',
    content: JSON.stringify(source),
    digest: filePath === '.apiease/project.json'
      ? BASELINE_DIGEST
      : CANDIDATE_DIGEST,
  };
}

function comparePath(leftValue, rightValue) {
  return leftValue.path.localeCompare(rightValue.path);
}

function sortCanonicalValue(value) {
  if (Array.isArray(value)) return value.map(sortCanonicalValue);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortCanonicalValue(value[key])]));
}
