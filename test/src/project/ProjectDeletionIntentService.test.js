import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ProjectCanonicalArtifactService } from '../../../src/project/ProjectCanonicalArtifactService.js';
import { ProjectDeletionIntentService } from '../../../src/project/ProjectDeletionIntentService.js';

const resourceVersions = Object.freeze({
  function: 'rv1_CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
  request: 'rv1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
});

describe('ProjectDeletionIntentService', () => {
  describe('discoverDeletionIntents', () => {
    it('should build deterministic version-bound deletions from canonical delete files', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'request',
        handle: 'zebra-request',
      });
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'function',
        handle: 'alpha-function',
      });
      const localState = buildLocalState([
        buildBinding('request', 'zebra-request'),
        buildBinding('function', 'alpha-function'),
      ]);

      // Act
      const result = await projectDeletionIntentService.discoverDeletionIntents({
        repositoryTopLevelPath,
        localState,
      });

      // Assert
      assert.deepEqual(result.deletions, [
        {
          resourceType: 'function',
          resourceId: 'function_alpha_function',
          originalHandle: 'alpha-function',
          expectedResourceVersion: resourceVersions.function,
        },
        {
          resourceType: 'request',
          resourceId: 'request_zebra_request',
          originalHandle: 'zebra-request',
          expectedResourceVersion: resourceVersions.request,
        },
      ]);
      assert.deepEqual(result.deletionIntents.map(intent => intent.deletePath), [
        'resources/functions/delete/alpha-function.json',
        'resources/requests/delete/zebra-request.json',
      ]);
    });

    it('should reject a delete file whose canonical identity does not match its path', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'request',
        handle: 'path-handle',
        sourceHandle: 'content-handle',
      });

      // Act and Assert
      await assert.rejects(projectDeletionIntentService.discoverDeletionIntents({
        repositoryTopLevelPath,
        localState: buildLocalState([buildBinding('request', 'path-handle')]),
      }), { code: 'CANONICAL_RESOURCE_SOURCE_HANDLE_PATH_MISMATCH' });
    });

    it('should reject live and delete source coexistence', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'request',
        handle: 'inventory-sync',
      });
      await writeLiveFile(repositoryTopLevelPath, 'request', 'inventory-sync');

      // Act and Assert
      await assert.rejects(projectDeletionIntentService.discoverDeletionIntents({
        repositoryTopLevelPath,
        localState: buildLocalState([buildBinding('request', 'inventory-sync')]),
      }), { code: 'PROJECT_DELETION_LIVE_SOURCE_CONFLICT' });
    });

    it('should reject an unbound delete intent', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'request',
        handle: 'unbound-request',
      });

      // Act and Assert
      await assert.rejects(projectDeletionIntentService.discoverDeletionIntents({
        repositoryTopLevelPath,
        localState: buildLocalState([]),
      }), { code: 'PROJECT_DELETION_BINDING_NOT_FOUND' });
    });

    it('should reject missing immutable deletion authority', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'request',
        handle: 'missing-authority',
      });
      const binding = buildBinding('request', 'missing-authority');
      delete binding.resourceVersion;

      // Act and Assert
      await assert.rejects(projectDeletionIntentService.discoverDeletionIntents({
        repositoryTopLevelPath,
        localState: buildLocalState([binding]),
      }), { code: 'PROJECT_DELETION_AUTHORITY_MISSING' });
    });

    it('should reject conflicting delete and archive intent for one source identity', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'request',
        handle: 'inventory-sync',
      });
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'archive',
        resourceType: 'request',
        handle: 'inventory-sync',
      });

      // Act and Assert
      await assert.rejects(projectDeletionIntentService.discoverDeletionIntents({
        repositoryTopLevelPath,
        localState: buildLocalState([buildBinding('request', 'inventory-sync')]),
      }), { code: 'PROJECT_DELETION_ARCHIVE_CONFLICT' });
    });

    it('should reject duplicate immutable authority across delete intents', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'request',
        handle: 'first-request',
      });
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'request',
        handle: 'second-request',
      });
      const firstBinding = buildBinding('request', 'first-request');
      const secondBinding = buildBinding('request', 'second-request');
      secondBinding.resourceId = firstBinding.resourceId;

      // Act and Assert
      await assert.rejects(projectDeletionIntentService.discoverDeletionIntents({
        repositoryTopLevelPath,
        localState: buildLocalState([firstBinding, secondBinding]),
      }), { code: 'PROJECT_DELETION_AUTHORITY_DUPLICATE' });
    });

    it('should reject non-file and noncanonical archive entries', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const archiveDirectoryPath = path.join(repositoryTopLevelPath, 'resources/requests/archive');
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await fs.mkdir(path.join(archiveDirectoryPath, 'nested'), { recursive: true });

      // Act and Assert
      await assert.rejects(projectDeletionIntentService.discoverDeletionIntents({
        repositoryTopLevelPath,
        localState: buildLocalState([]),
      }), { code: 'PROJECT_DELETION_INTENT_PATH_INVALID' });
    });
  });

  describe('archiveCommittedDeletionIntents', () => {
    it('should move only receipt-proven committed deletion files into archive', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'function',
        handle: 'legacy-transform',
      });
      const discovery = await projectDeletionIntentService.discoverDeletionIntents({
        repositoryTopLevelPath,
        localState: buildLocalState([buildBinding('function', 'legacy-transform')]),
      });
      const applyReceipt = await readWorkflowApplyReceipt('apply');

      // Act
      const result = await projectDeletionIntentService.archiveCommittedDeletionIntents({
        repositoryTopLevelPath,
        deletionIntents: discovery.deletionIntents,
        applyReceipt,
      });

      // Assert
      assert.deepEqual(result.archivedPaths, [
        'resources/functions/archive/legacy-transform.json',
      ]);
      await assert.rejects(
        fs.access(path.join(repositoryTopLevelPath, discovery.deletionIntents[0].deletePath)),
        { code: 'ENOENT' },
      );
      await fs.access(path.join(repositoryTopLevelPath, result.archivedPaths[0]));
    });

    it('should treat a replay of an already archived matching intent as idempotent', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'function',
        handle: 'legacy-transform',
      });
      const discovery = await projectDeletionIntentService.discoverDeletionIntents({
        repositoryTopLevelPath,
        localState: buildLocalState([buildBinding('function', 'legacy-transform')]),
      });
      await projectDeletionIntentService.archiveCommittedDeletionIntents({
        repositoryTopLevelPath,
        deletionIntents: discovery.deletionIntents,
        applyReceipt: await readWorkflowApplyReceipt('apply'),
      });

      // Act
      const result = await projectDeletionIntentService.archiveCommittedDeletionIntents({
        repositoryTopLevelPath,
        deletionIntents: discovery.deletionIntents,
        applyReceipt: await readWorkflowApplyReceipt('replay'),
      });

      // Assert
      assert.deepEqual(result, {
        archivedPaths: [],
        alreadyArchivedPaths: ['resources/functions/archive/legacy-transform.json'],
      });
    });

    it('should reject replay when the existing archive bytes differ from the delete source', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'function',
        handle: 'legacy-transform',
      });
      const discovery = await projectDeletionIntentService.discoverDeletionIntents({
        repositoryTopLevelPath,
        localState: buildLocalState([buildBinding('function', 'legacy-transform')]),
      });
      await projectDeletionIntentService.archiveCommittedDeletionIntents({
        repositoryTopLevelPath,
        deletionIntents: discovery.deletionIntents,
        applyReceipt: await readWorkflowApplyReceipt('apply'),
      });
      const archiveFilePath = path.join(
        repositoryTopLevelPath,
        discovery.deletionIntents[0].archivePath,
      );
      const changedSource = JSON.parse(await fs.readFile(archiveFilePath, 'utf8'));
      changedSource.description = 'Changed after archival';
      await fs.writeFile(
        archiveFilePath,
        new ProjectCanonicalArtifactService().serializeParsedResourceSource(changedSource),
      );

      // Act and Assert
      await assert.rejects(projectDeletionIntentService.archiveCommittedDeletionIntents({
        repositoryTopLevelPath,
        deletionIntents: discovery.deletionIntents,
        applyReceipt: await readWorkflowApplyReceipt('replay'),
      }), { code: 'PROJECT_DELETION_ARCHIVE_CONTENT_MISMATCH' });
    });

    it('should reject an uncommitted outcome without moving delete intent', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'request',
        handle: 'inventory-sync',
      });
      const deleteFilePath = path.join(
        repositoryTopLevelPath,
        'resources/requests/delete/inventory-sync.json',
      );

      // Act and Assert
      await assert.rejects(projectDeletionIntentService.archiveCommittedDeletionIntents({
        repositoryTopLevelPath,
        deletionIntents: [{
          deletePath: 'resources/requests/delete/inventory-sync.json',
          archivePath: 'resources/requests/archive/inventory-sync.json',
          deletion: buildDeletion('request', 'inventory-sync'),
        }],
        applyReceipt: { outcome: 'PROJECT_PLAN_READY' },
      }), { code: 'PROJECT_APPLY_RECEIPT_INVALID' });
      await fs.access(deleteFilePath);
    });

    it('should reject a committed receipt that does not prove the requested deletion', async () => {
      // Arrange
      const repositoryTopLevelPath = await createRepositoryFixture();
      const projectDeletionIntentService = new ProjectDeletionIntentService();
      await writeIntentFile({
        repositoryTopLevelPath,
        namespace: 'delete',
        resourceType: 'request',
        handle: 'inventory-sync',
      });
      const deleteFilePath = path.join(
        repositoryTopLevelPath,
        'resources/requests/delete/inventory-sync.json',
      );

      // Act and Assert
      await assert.rejects(projectDeletionIntentService.archiveCommittedDeletionIntents({
        repositoryTopLevelPath,
        deletionIntents: [{
          deletePath: 'resources/requests/delete/inventory-sync.json',
          archivePath: 'resources/requests/archive/inventory-sync.json',
          deletion: buildDeletion('request', 'inventory-sync'),
        }],
        applyReceipt: await readWorkflowApplyReceipt('apply'),
      }), { code: 'PROJECT_DELETION_RECEIPT_MISMATCH' });
      await fs.access(deleteFilePath);
    });
  });
});

async function createRepositoryFixture() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'apiease-deletion-intent-'));
}

async function writeIntentFile({
  repositoryTopLevelPath,
  namespace,
  resourceType,
  handle,
  sourceHandle = handle,
}) {
  const directoryName = resourceType === 'request' ? 'requests' : `${resourceType}s`;
  const filePath = path.join(
    repositoryTopLevelPath,
    `resources/${directoryName}/${namespace}/${handle}.json`,
  );
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buildCanonicalSource(resourceType, sourceHandle));
}

async function writeLiveFile(repositoryTopLevelPath, resourceType, handle) {
  const directoryName = resourceType === 'request' ? 'requests' : `${resourceType}s`;
  const filePath = path.join(repositoryTopLevelPath, `resources/${directoryName}/${handle}.json`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buildCanonicalSource(resourceType, handle));
}

function buildCanonicalSource(resourceType, handle) {
  const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
  const resources = {
    function: {
      handle,
      name: handle,
      description: 'Function description',
      type: 'liquid',
      liquid: '{{ value }}',
      parameters: [],
    },
    request: {
      handle,
      name: handle,
      type: 'http',
      method: 'GET',
      address: 'https://example.invalid',
      parameters: [],
      triggers: [],
    },
  };

  return projectCanonicalArtifactService.serializeResourceSource({
    resourceType,
    resource: resources[resourceType],
  });
}

function buildLocalState(resources) {
  return { resources };
}

function buildBinding(resourceType, handle) {
  const directoryName = resourceType === 'request' ? 'requests' : `${resourceType}s`;

  return {
    path: `resources/${directoryName}/${handle}.json`,
    resourceType,
    resourceId: `${resourceType}_${handle.replaceAll('-', '_')}`,
    handle,
    resourceVersion: resourceVersions[resourceType],
  };
}

function buildDeletion(resourceType, handle) {
  const binding = buildBinding(resourceType, handle);

  return {
    resourceType,
    resourceId: binding.resourceId,
    originalHandle: binding.handle,
    expectedResourceVersion: binding.resourceVersion,
  };
}

async function readWorkflowApplyReceipt(pairName) {
  const fixturePath = path.resolve(
    'contracts/apex-projects/v1/fixtures/project-workflow-success.json',
  );
  const workflowFixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));

  return workflowFixture.pairs.find(pair => pair.name === pairName).response.document.result;
}
