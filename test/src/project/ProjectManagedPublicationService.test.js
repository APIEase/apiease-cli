import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProjectCanonicalArtifactService } from '../../../src/project/ProjectCanonicalArtifactService.js';
import {
  PROJECT_MANAGED_PUBLICATION_ERROR_CODE,
  ProjectManagedPublicationService,
} from '../../../src/project/ProjectManagedPublicationService.js';

const metadataContent = Buffer.from('{"formatVersion":1}\n', 'utf8');
const currentRequestContent = Buffer.from('{"current":true}\n', 'utf8');
const replacementRequestContent = Buffer.from('{"replacement":true}\n', 'utf8');

describe('ProjectManagedPublicationService', () => {
  describe('publishManagedSnapshot', () => {
    it('should replace the verified namespace and preserve unmanaged workflow files', async testContext => {
      // Arrange
      const repositoryTopLevelPath = await createProjectDirectory(testContext);
      await writeExistingProject(repositoryTopLevelPath);
      const verifiedArtifact = buildVerifiedArtifact([
        { path: '.apiease/project.json', content: metadataContent },
        { path: 'resources/requests/replacement-request.json', content: replacementRequestContent },
      ]);
      const projectManagedPublicationService = new ProjectManagedPublicationService();

      // Act
      const publication = await projectManagedPublicationService.publishManagedSnapshot({
        repositoryTopLevelPath,
        verifiedArtifact,
      });

      // Assert
      assert.deepEqual(publication, {
        publishedPaths: [
          '.apiease/project.json',
          'resources/requests/replacement-request.json',
        ],
        removedPaths: ['resources/requests/sample-request.json'],
      });
      await assert.rejects(
        fs.access(path.join(repositoryTopLevelPath, 'resources/requests/sample-request.json')),
        { code: 'ENOENT' },
      );
      assert.deepEqual(
        await fs.readFile(path.join(repositoryTopLevelPath, 'resources/requests/replacement-request.json')),
        replacementRequestContent,
      );
      assert.equal(
        await fs.readFile(path.join(repositoryTopLevelPath, 'resources/requests/delete/pending.json'), 'utf8'),
        'delete intent',
      );
      assert.equal(
        await fs.readFile(path.join(repositoryTopLevelPath, 'resources/requests/archive/applied.json'), 'utf8'),
        'archive history',
      );
      assert.equal(
        await fs.readFile(path.join(repositoryTopLevelPath, 'resources/requests/notes.txt'), 'utf8'),
        'unmanaged',
      );
      assert.equal(
        await fs.readFile(path.join(repositoryTopLevelPath, '.codex/intent.md'), 'utf8'),
        'preserve',
      );
      assert.equal(
        await fs.readFile(path.join(repositoryTopLevelPath, '.git/apiease/project-state-v1.json'), 'utf8'),
        'old state',
      );
    });

    it('should report a local-integrity failure without changing operational state', async testContext => {
      // Arrange
      const repositoryTopLevelPath = await createProjectDirectory(testContext);
      await writeExistingProject(repositoryTopLevelPath);
      const verifiedArtifact = buildVerifiedArtifact([
        { path: '.apiease/project.json', content: metadataContent },
        { path: 'resources/requests/replacement-request.json', content: replacementRequestContent },
      ]);
      const fileSystem = buildFailingFileSystem('replacement-request.json');
      const projectManagedPublicationService = new ProjectManagedPublicationService({ fileSystem });

      // Act and assert
      await assert.rejects(
        projectManagedPublicationService.publishManagedSnapshot({
          repositoryTopLevelPath,
          verifiedArtifact,
        }),
        {
          code: PROJECT_MANAGED_PUBLICATION_ERROR_CODE,
          failureType: 'local-integrity',
        },
      );
      assert.equal(
        await fs.readFile(path.join(repositoryTopLevelPath, '.git/apiease/project-state-v1.json'), 'utf8'),
        'old state',
      );
      assert.equal(
        await fs.readFile(path.join(repositoryTopLevelPath, 'resources/requests/sample-request.json'), 'utf8'),
        currentRequestContent.toString('utf8'),
      );
    });

    it('should reject tampered artifact bytes before changing managed files', async testContext => {
      // Arrange
      const repositoryTopLevelPath = await createProjectDirectory(testContext);
      await writeExistingProject(repositoryTopLevelPath);
      const verifiedArtifact = buildVerifiedArtifact([
        { path: '.apiease/project.json', content: metadataContent },
      ]);
      verifiedArtifact.files[0].content = Buffer.from('{"tampered":true}\n', 'utf8');
      const projectManagedPublicationService = new ProjectManagedPublicationService();

      // Act and assert
      await assert.rejects(
        projectManagedPublicationService.publishManagedSnapshot({
          repositoryTopLevelPath,
          verifiedArtifact,
        }),
        { code: PROJECT_MANAGED_PUBLICATION_ERROR_CODE },
      );
      assert.equal(
        await fs.readFile(path.join(repositoryTopLevelPath, 'resources/requests/sample-request.json'), 'utf8'),
        currentRequestContent.toString('utf8'),
      );
    });

    it('should remove isolated staging content when staging fails', async testContext => {
      // Arrange
      const repositoryTopLevelPath = await createProjectDirectory(testContext);
      await writeExistingProject(repositoryTopLevelPath);
      const verifiedArtifact = buildVerifiedArtifact([
        { path: '.apiease/project.json', content: metadataContent },
        { path: 'resources/requests/replacement-request.json', content: replacementRequestContent },
      ]);
      const fileSystem = buildFailingStagingFileSystem('replacement-request.json');
      const projectManagedPublicationService = new ProjectManagedPublicationService({ fileSystem });

      // Act and assert
      await assert.rejects(
        projectManagedPublicationService.publishManagedSnapshot({
          repositoryTopLevelPath,
          verifiedArtifact,
        }),
        { code: PROJECT_MANAGED_PUBLICATION_ERROR_CODE },
      );
      const rootEntries = await fs.readdir(repositoryTopLevelPath);
      assert.equal(rootEntries.some(entry => entry.startsWith('.apiease-publication-')), false);
    });
  });
});

async function createProjectDirectory(testContext) {
  const repositoryTopLevelPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-publication-'));
  testContext.after(() => fs.rm(repositoryTopLevelPath, { recursive: true, force: true }));

  return repositoryTopLevelPath;
}

async function writeExistingProject(repositoryTopLevelPath) {
  await fs.mkdir(path.join(repositoryTopLevelPath, '.apiease'), { recursive: true });
  await fs.mkdir(path.join(repositoryTopLevelPath, '.codex'), { recursive: true });
  await fs.mkdir(path.join(repositoryTopLevelPath, '.git/apiease'), { recursive: true });
  await fs.mkdir(path.join(repositoryTopLevelPath, 'resources/requests/delete'), { recursive: true });
  await fs.mkdir(path.join(repositoryTopLevelPath, 'resources/requests/archive'), { recursive: true });
  await fs.writeFile(path.join(repositoryTopLevelPath, '.apiease/project.json'), '{"old":true}\n');
  await fs.writeFile(path.join(repositoryTopLevelPath, '.codex/intent.md'), 'preserve');
  await fs.writeFile(path.join(repositoryTopLevelPath, '.git/apiease/project-state-v1.json'), 'old state');
  await fs.writeFile(
    path.join(repositoryTopLevelPath, 'resources/requests/sample-request.json'),
    currentRequestContent,
  );
  await fs.writeFile(path.join(repositoryTopLevelPath, 'resources/requests/delete/pending.json'), 'delete intent');
  await fs.writeFile(path.join(repositoryTopLevelPath, 'resources/requests/archive/applied.json'), 'archive history');
  await fs.writeFile(path.join(repositoryTopLevelPath, 'resources/requests/notes.txt'), 'unmanaged');
}

function buildVerifiedArtifact(files) {
  const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
  const exactFiles = files.map(file => ({
    ...file,
    digest: projectCanonicalArtifactService.computeFileDigest(file.content),
  }));

  return {
    files: exactFiles,
    manifest: {
      snapshotDigest: projectCanonicalArtifactService.computeResourceSnapshotDigest(
        exactFiles.map(file => ({ path: file.path, content: file.content.toString('utf8') })),
      ),
    },
  };
}

function buildFailingFileSystem(failingFileName) {
  return {
    ...fs,
    async rename(sourcePath, destinationPath) {
      if (destinationPath.endsWith(failingFileName)) {
        const error = new Error('injected replacement failure');
        error.code = 'EACCES';
        throw error;
      }
      return fs.rename(sourcePath, destinationPath);
    },
  };
}

function buildFailingStagingFileSystem(failingFileName) {
  return {
    ...fs,
    async writeFile(filePath, content, options) {
      if (filePath.endsWith(failingFileName)) {
        const error = new Error('injected staging failure');
        error.code = 'ENOSPC';
        throw error;
      }
      return fs.writeFile(filePath, content, options);
    },
  };
}
