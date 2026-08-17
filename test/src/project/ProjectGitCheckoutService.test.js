import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProjectGitCheckoutService } from '../../../src/project/ProjectGitCheckoutService.js';

const executeFile = promisify(execFile);

describe('ProjectGitCheckoutService', () => {
  describe('clonePublicTemplate', () => {
    it('should clone the fixed public template main branch into a new destination', async testContext => {
      // Arrange
      const parentDirectoryPath = await createTemporaryDirectory(testContext);
      const destinationDirectoryPath = path.join(parentDirectoryPath, 'project');
      const gitInvocations = [];
      const projectGitCheckoutService = buildService({ gitInvocations, performClone: true });

      // Act
      const result = await projectGitCheckoutService.clonePublicTemplate({
        destinationDirectoryPath,
      });

      // Assert
      assert.deepEqual(gitInvocations, [{
        arguments: [
          'clone',
          '--branch',
          'main',
          '--single-branch',
          'https://github.com/APIEase/apiease-template.git',
          destinationDirectoryPath,
        ],
        workingDirectoryPath: parentDirectoryPath,
      }]);
      assert.equal(result.repositoryTopLevelPath, destinationDirectoryPath);
      assert.equal((await executeFile('git', ['rev-parse', '--is-inside-work-tree'], {
        cwd: destinationDirectoryPath,
      })).stdout.trim(), 'true');
    });

    it('should clone into an existing empty destination', async testContext => {
      // Arrange
      const parentDirectoryPath = await createTemporaryDirectory(testContext);
      const destinationDirectoryPath = path.join(parentDirectoryPath, 'project');
      await fs.mkdir(destinationDirectoryPath);
      const projectGitCheckoutService = buildService({ performClone: true });

      // Act
      const result = await projectGitCheckoutService.clonePublicTemplate({
        destinationDirectoryPath,
      });

      // Assert
      assert.equal(result.repositoryTopLevelPath, destinationDirectoryPath);
    });

    it('should reject a populated destination before invoking Git', async testContext => {
      // Arrange
      const destinationDirectoryPath = await createTemporaryDirectory(testContext);
      await fs.writeFile(path.join(destinationDirectoryPath, 'customer-file.txt'), 'preserve');
      const gitInvocations = [];
      const projectGitCheckoutService = buildService({ gitInvocations });

      // Act and Assert
      await assert.rejects(
        projectGitCheckoutService.clonePublicTemplate({ destinationDirectoryPath }),
        {
          code: 'PROJECT_CLONE_DESTINATION_NOT_EMPTY',
          failureType: 'local-integrity',
        },
      );
      assert.deepEqual(gitInvocations, []);
    });
  });

  describe('validateProjectCheckout', () => {
    it('should validate repository top-level metadata and ignored local state', async testContext => {
      // Arrange
      const repositoryTopLevelPath = await createTemporaryDirectory(testContext);
      await writeProjectMetadata(repositoryTopLevelPath);
      const localState = buildLocalState();
      const projectLocalStateService = {
        async readLocalState(projectDirectoryPath) {
          assert.equal(projectDirectoryPath, repositoryTopLevelPath);
          return { ok: true, repositoryTopLevelPath, localState };
        },
      };
      const projectGitCheckoutService = buildService({
        gitOutputs: [`${repositoryTopLevelPath}\n`],
        projectLocalStateService,
      });

      // Act
      const checkout = await projectGitCheckoutService.validateProjectCheckout(
        path.join(repositoryTopLevelPath, 'resources'),
      );

      // Assert
      assert.deepEqual(checkout, { repositoryTopLevelPath, localState });
    });

    it('should reject checkout metadata that does not identify the fixed public template', async testContext => {
      // Arrange
      const repositoryTopLevelPath = await createTemporaryDirectory(testContext);
      await writeProjectMetadata(repositoryTopLevelPath, { repository: 'private-project' });
      const projectGitCheckoutService = buildService({
        gitOutputs: [repositoryTopLevelPath],
        projectLocalStateService: {
          async readLocalState() {
            return { ok: true, repositoryTopLevelPath, localState: buildLocalState() };
          },
        },
      });

      // Act and Assert
      await assert.rejects(
        projectGitCheckoutService.validateProjectCheckout(repositoryTopLevelPath),
        { code: 'PROJECT_CHECKOUT_METADATA_INVALID', failureType: 'local-integrity' },
      );
    });

    it('should reject a checkout without valid ignored local state', async testContext => {
      // Arrange
      const repositoryTopLevelPath = await createTemporaryDirectory(testContext);
      await writeProjectMetadata(repositoryTopLevelPath);
      const projectGitCheckoutService = buildService({
        gitOutputs: [repositoryTopLevelPath],
        projectLocalStateService: {
          async readLocalState() {
            return {
              ok: false,
              error: {
                code: 'PROJECT_LOCAL_STATE_NOT_FOUND',
                diagnostics: [{ code: 'PROJECT_LOCAL_STATE_NOT_FOUND' }],
              },
            };
          },
        },
      });

      // Act and Assert
      await assert.rejects(
        projectGitCheckoutService.validateProjectCheckout(repositoryTopLevelPath),
        { code: 'PROJECT_LOCAL_STATE_NOT_FOUND', failureType: 'local-integrity' },
      );
    });

    it('should normalize an ignored local-state read failure as local integrity', async testContext => {
      // Arrange
      const repositoryTopLevelPath = await createTemporaryDirectory(testContext);
      await writeProjectMetadata(repositoryTopLevelPath);
      const projectGitCheckoutService = buildService({
        gitOutputs: [repositoryTopLevelPath],
        projectLocalStateService: {
          async readLocalState() {
            throw new Error('unreadable state');
          },
        },
      });

      // Act and Assert
      await assert.rejects(
        projectGitCheckoutService.validateProjectCheckout(repositoryTopLevelPath),
        { code: 'PROJECT_CHECKOUT_STATE_INVALID', failureType: 'local-integrity' },
      );
    });
  });
});

function buildService({
  gitInvocations = [],
  gitOutputs = [],
  performClone = false,
  projectLocalStateService = { async readLocalState() {} },
} = {}) {
  return new ProjectGitCheckoutService({
    projectLocalStateService,
    async gitExecution(invocation) {
      gitInvocations.push(invocation);
      if (performClone) {
        await fs.mkdir(invocation.arguments.at(-1), { recursive: true });
        await executeFile('git', ['init', '--quiet'], { cwd: invocation.arguments.at(-1) });
      }

      return gitOutputs.shift() ?? '';
    },
  });
}

async function createTemporaryDirectory(testContext) {
  const temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-checkout-'));
  testContext.after(() => fs.rm(temporaryDirectoryPath, { recursive: true, force: true }));

  return temporaryDirectoryPath;
}

async function writeProjectMetadata(repositoryTopLevelPath, templateOverrides = {}) {
  const metadata = {
    formatVersion: 1,
    managedPathContractVersion: 1,
    projectId: 'project_01',
    normalizedShopDomain: 'example.myshopify.com',
    template: {
      owner: 'APIEase',
      ref: 'main',
      repository: 'apiease-template',
      sourceIdentity: '0123456789abcdef0123456789abcdef01234567',
      ...templateOverrides,
    },
  };
  await fs.mkdir(path.join(repositoryTopLevelPath, '.apiease'), { recursive: true });
  await fs.writeFile(
    path.join(repositoryTopLevelPath, '.apiease', 'project.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
}

function buildLocalState() {
  return {
    localStateVersion: 1,
    projectId: 'project_01',
    baseline: {
      liveRevision: 1,
      snapshotDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
    sourceMainCommit: '0123456789abcdef0123456789abcdef01234567',
    resources: [],
  };
}
