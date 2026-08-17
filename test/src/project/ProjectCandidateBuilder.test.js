import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProjectCandidateBuilder } from '../../../src/project/ProjectCandidateBuilder.js';
import { ProjectContractService } from '../../../src/project/ProjectContractService.js';

const BASELINE_DIGEST = 'sha256:1111111111111111111111111111111111111111111111111111111111111111';
const CANDIDATE_DIGEST = 'sha256:2222222222222222222222222222222222222222222222222222222222222222';
const REQUEST_VERSION = 'rv1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const VARIABLE_VERSION = 'rv1_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

describe('ProjectCandidateBuilder', () => {
  describe('buildCandidate', () => {
    it('should build one deterministic complete candidate with immutable authority', async () => {
      // Arrange
      const fixture = buildFixture();
      const projectCandidateBuilder = buildCandidateBuilder(fixture);

      // Act
      const firstResult = await projectCandidateBuilder.buildCandidate({
        projectDirectoryPath: '/checkout/nested',
      });
      const secondResult = await projectCandidateBuilder.buildCandidate({
        projectDirectoryPath: '/checkout/nested',
      });

      // Assert
      assert.deepEqual(firstResult.candidate, buildExpectedCandidate(fixture));
      assert.equal(JSON.stringify(firstResult.candidate), JSON.stringify(secondResult.candidate));
      assert.equal(firstResult.candidateSnapshotDigest, CANDIDATE_DIGEST);
      assert.equal(secondResult.candidateSnapshotDigest, CANDIDATE_DIGEST);
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
      const projectCandidateBuilder = buildCandidateBuilder(fixture);

      // Act and Assert
      await assert.rejects(projectCandidateBuilder.buildCandidate({
        projectDirectoryPath: '/checkout',
      }), error => {
        assert.equal(error.code, 'PROJECT_CANDIDATE_BOUND_FILE_MISSING');
        assert.deepEqual(error.diagnostics, [{
          code: 'PROJECT_CANDIDATE_BOUND_FILE_MISSING',
          path: 'resources/widgets/existing-widget.json',
        }]);
        return true;
      });
    });

    it('should reject a bound file whose canonical resource type disagrees with local state', async () => {
      // Arrange
      const fixture = buildFixture();
      fixture.localState.resources[0].resourceType = 'widget';
      const projectCandidateBuilder = buildCandidateBuilder(fixture);

      // Act and Assert
      await assert.rejects(projectCandidateBuilder.buildCandidate({
        projectDirectoryPath: '/checkout',
      }), { code: 'PROJECT_CANDIDATE_BINDING_MISMATCH' });
    });

    it('should reject a complete candidate that fails the authoritative local schema', async () => {
      // Arrange
      const fixture = buildFixture();
      const projectCandidateBuilder = buildCandidateBuilder(fixture, {
        candidateValidationResult: {
          ok: false,
          diagnostics: [{ code: 'CONTRACT_REQUIRED', path: '/files' }],
        },
      });

      // Act and Assert
      await assert.rejects(projectCandidateBuilder.buildCandidate({
        projectDirectoryPath: '/checkout',
      }), error => {
        assert.equal(error.code, 'PROJECT_CANDIDATE_INVALID');
        assert.deepEqual(error.diagnostics, [{ code: 'CONTRACT_REQUIRED', path: '/files' }]);
        return true;
      });
    });
  });
});

function buildCandidateBuilder(fixture, {
  candidateValidationResult,
} = {}) {
  return new ProjectCandidateBuilder({
    projectCanonicalArtifactService: {
      parseResourceSource: ({ content }) => JSON.parse(content),
    },
    projectContractService: candidateValidationResult
      ? { validateProjectCandidate: () => candidateValidationResult }
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
      projectId: 'project_fixture',
      baseline: { liveRevision: 42, snapshotDigest: BASELINE_DIGEST },
      sourceMainCommit: '3333333333333333333333333333333333333333',
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

function buildExpectedCandidate(fixture) {
  return {
    candidateFormatVersion: 1,
    baseline: { liveRevision: 42, snapshotDigest: BASELINE_DIGEST },
    files: [...fixture.files].sort(comparePath),
    resourceBindings: [{
      path: 'resources/requests/renamed-request.json',
      resourceType: 'request',
      resourceId: 'request_existing',
      originalHandle: 'original-request',
      expectedResourceVersion: REQUEST_VERSION,
    }],
    deletions: fixture.deletions,
    secureInputs: fixture.secureInputs,
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
