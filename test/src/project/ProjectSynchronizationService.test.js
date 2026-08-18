import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROJECT_FORCE_DISCARD_WARNING,
  ProjectSynchronizationService,
} from '../../../src/project/ProjectSynchronizationService.js';

describe('ProjectSynchronizationService', () => {
  describe('initializeProject', () => {
    it('should verify and publish the synchronized artifact before publishing local state', async () => {
      // Arrange
      const calls = [];
      const fixture = buildServiceFixture({ calls });

      // Act
      const result = await fixture.projectSynchronizationService.initializeProject({
        projectDirectoryPath: '/checkout',
        projectApiInvocation: fixture.projectApiInvocation,
      });

      // Assert
      assert.deepEqual(calls, [
        ['bootstrapProject', fixture.projectApiInvocation],
        ['verifySynchronizedArtifact', fixture.bootstrapResponse],
        ['resolveLocalStateLocation', '/checkout'],
        ['publishManagedSnapshot', {
          repositoryTopLevelPath: '/repository',
          verifiedArtifact: fixture.verifiedArtifact,
        }],
        ['publishLocalState', {
          projectDirectoryPath: '/repository',
          localState: fixture.verifiedArtifact.localState,
        }],
      ]);
      assert.deepEqual(result, {
        bootstrapResponse: fixture.bootstrapResponse,
        publication: fixture.publication,
        skippedResources: fixture.verifiedArtifact.skippedResources,
        warnings: [],
      });
    });

    it('should return an authoritative bootstrap failure without changing local files or state', async () => {
      // Arrange
      const calls = [];
      const bootstrapResponse = buildBootstrapFailure();
      const fixture = buildServiceFixture({ calls, bootstrapResponse });

      // Act
      const result = await fixture.projectSynchronizationService.initializeProject({
        projectDirectoryPath: '/checkout',
        projectApiInvocation: fixture.projectApiInvocation,
      });

      // Assert
      assert.deepEqual(result, {
        bootstrapResponse,
        publication: null,
        skippedResources: [],
        warnings: [],
      });
      assert.deepEqual(calls, [['bootstrapProject', fixture.projectApiInvocation]]);
    });
  });

  describe('pullProject', () => {
    it('should publish a verified pull when the direct namespace matches local state', async () => {
      // Arrange
      const calls = [];
      const fixture = buildServiceFixture({ calls });

      // Act
      const result = await fixture.projectSynchronizationService.pullProject({
        projectDirectoryPath: '/checkout/nested',
        projectApiInvocation: fixture.projectApiInvocation,
      });

      // Assert
      assert.deepEqual(result.warnings, []);
      assert.deepEqual(calls, buildExpectedPullCalls(fixture));
    });

    it('should reject local direct managed edits without publishing files or state', async () => {
      // Arrange
      const calls = [];
      const fixture = buildServiceFixture({ calls, hasLocalEdits: true });

      // Act and assert
      await assert.rejects(
        fixture.projectSynchronizationService.pullProject({
          projectDirectoryPath: '/checkout/nested',
          projectApiInvocation: fixture.projectApiInvocation,
        }),
        { code: 'PROJECT_LOCAL_MANAGED_EDITS', failureType: 'local-integrity' },
      );
      assert.deepEqual(calls, buildExpectedPullCalls(fixture).slice(0, 4));
    });

    it('should deliberately replace local edits with a deterministic bounded force warning', async () => {
      // Arrange
      const calls = [];
      const fixture = buildServiceFixture({ calls, hasLocalEdits: true });

      // Act
      const result = await fixture.projectSynchronizationService.pullProject({
        projectDirectoryPath: '/checkout/nested',
        projectApiInvocation: fixture.projectApiInvocation,
        force: true,
      });

      // Assert
      assert.deepEqual(result.warnings, [PROJECT_FORCE_DISCARD_WARNING]);
      assert.deepEqual(calls, buildExpectedPullCalls(fixture));
    });

    it('should leave old local state unchanged when managed publication fails', async () => {
      // Arrange
      const calls = [];
      const publicationError = Object.assign(new Error('publication failed'), {
        code: 'PROJECT_MANAGED_PUBLICATION_FAILED',
      });
      const fixture = buildServiceFixture({ calls, publicationError });

      // Act and assert
      await assert.rejects(
        fixture.projectSynchronizationService.pullProject({
          projectDirectoryPath: '/checkout/nested',
          projectApiInvocation: fixture.projectApiInvocation,
        }),
        publicationError,
      );
      assert.equal(calls.some(([methodName]) => methodName === 'publishLocalState'), false);
    });
  });
});

function buildServiceFixture({
  calls,
  bootstrapResponse = buildBootstrapResponse(),
  hasLocalEdits = false,
  publicationError,
}) {
  const projectApiInvocation = { request: { contractVersion: 1, wakeProjection: true } };
  const verifiedArtifact = {
    files: [{ path: '.apiease/project.json', content: Buffer.from('{}\n') }],
    skippedResources: [{
      resourceType: 'request',
      resourceId: 'request-broken',
      handle: 'broken-request',
      path: 'resources/requests/broken-request.json',
      diagnostics: [{ code: 'PROJECT_RESOURCE_DEPENDENCY_MISSING' }],
    }],
    localState: {
      localStateVersion: 1,
      baseline: { snapshotDigest: 'sha256:baseline' },
    },
  };
  const publication = { publishedPaths: ['.apiease/project.json'], removedPaths: [] };
  const localStateRead = {
    ok: true,
    repositoryTopLevelPath: '/repository',
    localState: {
      localStateVersion: 1,
      baseline: { snapshotDigest: 'sha256:baseline' },
    },
  };
  const apiEaseProjectApiClient = {
    async bootstrapProject(invocation) {
      calls.push(['bootstrapProject', invocation]);
      return bootstrapResponse;
    },
  };
  const projectBootstrapArtifactService = {
    verifySynchronizedArtifact(response) {
      calls.push(['verifySynchronizedArtifact', response]);
      return verifiedArtifact;
    },
  };
  const projectLocalStateService = {
    async resolveLocalStateLocation(projectDirectoryPath) {
      calls.push(['resolveLocalStateLocation', projectDirectoryPath]);
      return { repositoryTopLevelPath: '/repository' };
    },
    async readLocalState(projectDirectoryPath) {
      calls.push(['readLocalState', projectDirectoryPath]);
      return localStateRead;
    },
    async publishLocalState(invocation) {
      calls.push(['publishLocalState', invocation]);
    },
  };
  const projectManagedNamespaceService = {
    async discoverManagedNamespace(invocation) {
      calls.push(['discoverManagedNamespace', invocation]);
      return { repositoryTopLevelPath: '/repository', hasLocalEdits };
    },
  };
  const projectManagedPublicationService = {
    async publishManagedSnapshot(invocation) {
      calls.push(['publishManagedSnapshot', invocation]);
      if (publicationError) throw publicationError;
      return publication;
    },
  };
  const projectSynchronizationService = new ProjectSynchronizationService({
    apiEaseProjectApiClient,
    projectBootstrapArtifactService,
    projectLocalStateService,
    projectManagedNamespaceService,
    projectManagedPublicationService,
  });

  return {
    bootstrapResponse,
    projectApiInvocation,
    projectSynchronizationService,
    publication,
    localStateRead,
    verifiedArtifact,
  };
}

function buildExpectedPullCalls(fixture) {
  return [
    ['bootstrapProject', fixture.projectApiInvocation],
    ['verifySynchronizedArtifact', fixture.bootstrapResponse],
    ['readLocalState', '/checkout/nested'],
    ['discoverManagedNamespace', {
      projectDirectoryPath: '/checkout/nested',
      baselineSnapshotDigest: fixture.localStateRead.localState.baseline.snapshotDigest,
    }],
    ['publishManagedSnapshot', {
      repositoryTopLevelPath: '/repository',
      verifiedArtifact: fixture.verifiedArtifact,
    }],
    ['publishLocalState', {
      projectDirectoryPath: '/repository',
      localState: fixture.verifiedArtifact.localState,
    }],
  ];
}

function buildBootstrapResponse() {
  return {
    status: 200,
    contractVersion: 1,
    ok: true,
    outcome: 'PROJECT_BOOTSTRAP_SYNCHRONIZED',
    result: {},
  };
}

function buildBootstrapFailure() {
  return {
    status: 503,
    contractVersion: 1,
    ok: false,
    outcome: 'SERVICE_UNAVAILABLE',
    error: { code: 'SERVICE_UNAVAILABLE', message: 'Unavailable', diagnostics: [] },
  };
}
