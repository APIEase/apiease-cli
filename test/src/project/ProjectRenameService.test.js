import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProjectCanonicalArtifactService } from '../../../src/project/ProjectCanonicalArtifactService.js';
import { ProjectLocalStateService } from '../../../src/project/ProjectLocalStateService.js';
import { ProjectRenameService } from '../../../src/project/ProjectRenameService.js';

const BASELINE_DIGEST = 'sha256:1111111111111111111111111111111111111111111111111111111111111111';
const RESOURCE_VERSION = 'rv1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const temporaryDirectoryPaths = [];

describe('ProjectRenameService', () => {
  describe('renameResource', () => {
    it('should rewrite only the canonical handle and binding path', async () => {
      // Arrange
      const fixture = await buildFixture();
      const publishedStates = [];
      const projectRenameService = buildRenameService(fixture, { publishedStates });

      // Act
      const result = await projectRenameService.renameResource({
        projectDirectoryPath: fixture.repositoryTopLevelPath,
        resourceType: 'request',
        currentHandle: 'inventory-sync',
        renamedHandle: 'stock-sync',
      });

      // Assert
      const renamedSource = JSON.parse(await fs.readFile(fixture.renamedFilePath, 'utf8'));
      assert.equal(renamedSource.handle, 'stock-sync');
      assert.equal(renamedSource.nextRequestHandle, 'downstream-request');
      assert.deepEqual(publishedStates, [buildRenamedLocalState(fixture.localState)]);
      assert.deepEqual(result.localState, buildRenamedLocalState(fixture.localState));
      await assert.rejects(fs.readFile(fixture.currentFilePath), { code: 'ENOENT' });
    });

    it('should reject an unsupported resource family without changing files or state', async () => {
      // Arrange
      const fixture = await buildFixture();
      const publishedStates = [];
      const projectRenameService = buildRenameService(fixture, { publishedStates });

      // Act and Assert
      await assert.rejects(projectRenameService.renameResource({
        projectDirectoryPath: fixture.repositoryTopLevelPath,
        resourceType: 'workflow',
        currentHandle: 'inventory-sync',
        renamedHandle: 'stock-sync',
      }), { code: 'PROJECT_RENAME_RESOURCE_TYPE_INVALID' });
      await assertFixtureUnchanged(fixture, publishedStates);
    });

    it('should reject an invalid handle without changing files or state', async () => {
      // Arrange
      const fixture = await buildFixture();
      const publishedStates = [];
      const projectRenameService = buildRenameService(fixture, { publishedStates });

      // Act and Assert
      await assert.rejects(projectRenameService.renameResource({
        projectDirectoryPath: fixture.repositoryTopLevelPath,
        resourceType: 'request',
        currentHandle: 'inventory-sync',
        renamedHandle: '../stock-sync',
      }), { code: 'PROJECT_RENAME_HANDLE_INVALID' });
      await assertFixtureUnchanged(fixture, publishedStates);
    });

    it('should reject a missing exact binding without changing files or state', async () => {
      // Arrange
      const fixture = await buildFixture();
      fixture.localState.resources[0].path = 'resources/requests/other-request.json';
      const publishedStates = [];
      const projectRenameService = buildRenameService(fixture, { publishedStates });

      // Act and Assert
      await assert.rejects(projectRenameService.renameResource({
        projectDirectoryPath: fixture.repositoryTopLevelPath,
        resourceType: 'request',
        currentHandle: 'inventory-sync',
        renamedHandle: 'stock-sync',
      }), { code: 'PROJECT_RENAME_BINDING_NOT_FOUND' });
      await assertFixtureUnchanged(fixture, publishedStates);
    });

    it('should reject noncanonical source without changing files or state', async () => {
      // Arrange
      const fixture = await buildFixture();
      await fs.writeFile(fixture.currentFilePath, `${JSON.stringify(fixture.source, null, 2)}\n`);
      fixture.originalContent = await fs.readFile(fixture.currentFilePath);
      const publishedStates = [];
      const projectRenameService = buildRenameService(fixture, { publishedStates });

      // Act and Assert
      await assert.rejects(projectRenameService.renameResource({
        projectDirectoryPath: fixture.repositoryTopLevelPath,
        resourceType: 'request',
        currentHandle: 'inventory-sync',
        renamedHandle: 'stock-sync',
      }), { code: 'CANONICAL_RESOURCE_SOURCE_NONCANONICAL_CONTENT' });
      await assertFixtureUnchanged(fixture, publishedStates);
    });

    it('should reject an occupied destination without changing files or state', async () => {
      // Arrange
      const fixture = await buildFixture();
      await fs.writeFile(fixture.renamedFilePath, 'occupied\n');
      const publishedStates = [];
      const projectRenameService = buildRenameService(fixture, { publishedStates });

      // Act and Assert
      await assert.rejects(projectRenameService.renameResource({
        projectDirectoryPath: fixture.repositoryTopLevelPath,
        resourceType: 'request',
        currentHandle: 'inventory-sync',
        renamedHandle: 'stock-sync',
      }), { code: 'PROJECT_RENAME_DESTINATION_OCCUPIED' });
      assert.deepEqual(await fs.readFile(fixture.currentFilePath), fixture.originalContent);
      assert.equal(await fs.readFile(fixture.renamedFilePath, 'utf8'), 'occupied\n');
      assert.deepEqual(publishedStates, []);
    });

    it('should preserve a destination created during exclusive publication', async () => {
      // Arrange
      const fixture = await buildFixture();
      const unlinkCalls = [];
      const racingFileSystem = {
        ...fs,
        lstat: async () => {
          const error = new Error('missing');
          error.code = 'ENOENT';
          throw error;
        },
        open: async () => {
          const error = new Error('occupied');
          error.code = 'EEXIST';
          throw error;
        },
        unlink: async filePath => unlinkCalls.push(filePath),
      };
      const projectRenameService = buildRenameService(fixture, { fileSystem: racingFileSystem });

      // Act and Assert
      await assert.rejects(projectRenameService.renameResource({
        projectDirectoryPath: fixture.repositoryTopLevelPath,
        resourceType: 'request',
        currentHandle: 'inventory-sync',
        renamedHandle: 'stock-sync',
      }), { code: 'PROJECT_RENAME_DESTINATION_OCCUPIED' });
      assert.deepEqual(unlinkCalls, []);
    });

    it('should roll the working file back when state publication fails', async () => {
      // Arrange
      const fixture = await buildFixture();
      const projectRenameService = buildRenameService(fixture, {
        publishError: Object.assign(new Error('state unavailable'), { code: 'EIO' }),
      });

      // Act and Assert
      await assert.rejects(projectRenameService.renameResource({
        projectDirectoryPath: fixture.repositoryTopLevelPath,
        resourceType: 'request',
        currentHandle: 'inventory-sync',
        renamedHandle: 'stock-sync',
      }), { code: 'EIO' });
      assert.deepEqual(await fs.readFile(fixture.currentFilePath), fixture.originalContent);
      await assert.rejects(fs.readFile(fixture.renamedFilePath), { code: 'ENOENT' });
    });
  });
});

afterEach(async () => {
  await Promise.all(temporaryDirectoryPaths.splice(0).map(temporaryDirectoryPath => (
    fs.rm(temporaryDirectoryPath, { recursive: true, force: true })
  )));
});

function buildRenameService(fixture, {
  fileSystem,
  publishError,
  publishedStates = [],
} = {}) {
  const stateDerivationService = new ProjectLocalStateService();

  return new ProjectRenameService({
    fileSystem,
    projectCanonicalArtifactService: new ProjectCanonicalArtifactService(),
    projectLocalStateService: {
      readLocalState: async () => ({
        ok: true,
        repositoryTopLevelPath: fixture.repositoryTopLevelPath,
        localState: structuredClone(fixture.localState),
      }),
      deriveRenamedLocalState: input => stateDerivationService.deriveRenamedLocalState(input),
      publishLocalState: async ({ localState }) => {
        if (publishError) throw publishError;
        publishedStates.push(structuredClone(localState));
      },
    },
  });
}

async function buildFixture() {
  const repositoryTopLevelPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-rename-'));
  temporaryDirectoryPaths.push(repositoryTopLevelPath);
  const resourceDirectoryPath = path.join(repositoryTopLevelPath, 'resources', 'requests');
  await fs.mkdir(resourceDirectoryPath, { recursive: true });
  const source = {
    contractVersion: 1,
    formatVersion: 1,
    resourceType: 'request',
    handle: 'inventory-sync',
    name: 'Inventory sync',
    type: 'http',
    parameters: [],
    triggers: [],
    nextRequestHandle: 'downstream-request',
  };
  const canonicalArtifactService = new ProjectCanonicalArtifactService();
  const originalContent = Buffer.from(canonicalArtifactService.serializeParsedResourceSource(source));
  const currentFilePath = path.join(resourceDirectoryPath, 'inventory-sync.json');
  await fs.writeFile(currentFilePath, originalContent);
  const localState = {
    localStateVersion: 1,
    projectIdentity: {
      normalizedShopDomain: 'fixture.myshopify.com',
      projectId: 'project_fixture',
      templateOwner: 'APIEase',
      templateRef: 'main',
      templateRepository: 'apiease-template',
    },
    baseline: { liveRevision: 42, snapshotDigest: BASELINE_DIGEST },
    resources: [{
      path: 'resources/requests/inventory-sync.json',
      resourceType: 'request',
      resourceId: 'request_existing',
      handle: 'inventory-original',
      resourceVersion: RESOURCE_VERSION,
    }],
  };

  return {
    repositoryTopLevelPath,
    currentFilePath,
    renamedFilePath: path.join(resourceDirectoryPath, 'stock-sync.json'),
    source,
    originalContent,
    localState,
  };
}

function buildRenamedLocalState(localState) {
  return {
    ...localState,
    resources: [{
      ...localState.resources[0],
      path: 'resources/requests/stock-sync.json',
    }],
  };
}

async function assertFixtureUnchanged(fixture, publishedStates) {
  assert.deepEqual(await fs.readFile(fixture.currentFilePath), fixture.originalContent);
  await assert.rejects(fs.readFile(fixture.renamedFilePath), { code: 'ENOENT' });
  assert.deepEqual(publishedStates, []);
}
