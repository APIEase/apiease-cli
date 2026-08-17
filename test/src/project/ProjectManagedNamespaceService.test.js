import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ProjectManagedNamespaceService } from '../../../src/project/ProjectManagedNamespaceService.js';

const executeFile = promisify(execFile);
const metadataContent = '{"formatVersion":1}\n';
const requestContent = '{"contractVersion":1,"formatVersion":1,"handle":"example-request","name":"Example request","parameters":[],"resourceType":"request","triggers":[],"type":"http"}\n';

describe('ProjectManagedNamespaceService', () => {
  describe('discoverManagedNamespace', () => {
    it('should discover only sorted direct managed files from a nested working directory', async testContext => {
      // Arrange
      const projectDirectoryPath = await createProjectDirectory(testContext);
      await writeManagedProject(projectDirectoryPath);
      await fs.mkdir(path.join(projectDirectoryPath, 'resources', 'requests', 'delete'), {
        recursive: true,
      });
      await fs.mkdir(path.join(projectDirectoryPath, 'resources', 'requests', 'archive'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(projectDirectoryPath, 'resources', 'requests', 'delete', 'ignored.json'),
        'not canonical',
      );
      await fs.writeFile(
        path.join(projectDirectoryPath, 'resources', 'requests', 'archive', 'ignored.json'),
        'not canonical',
      );
      await fs.writeFile(path.join(projectDirectoryPath, 'resources', 'requests', 'notes.txt'), 'x');
      const nestedWorkingDirectoryPath = path.join(projectDirectoryPath, 'docs', 'nested');
      await fs.mkdir(nestedWorkingDirectoryPath, { recursive: true });
      const projectManagedNamespaceService = new ProjectManagedNamespaceService();

      // Act
      const managedNamespace = await projectManagedNamespaceService.discoverManagedNamespace({
        projectDirectoryPath: nestedWorkingDirectoryPath,
      });

      // Assert
      assert.deepEqual(
        managedNamespace.files.map(file => file.path),
        ['.apiease/project.json', 'resources/requests/example-request.json'],
      );
    });

    it('should report deterministic local edits relative to the stored baseline digest', async testContext => {
      // Arrange
      const projectDirectoryPath = await createProjectDirectory(testContext);
      await writeManagedProject(projectDirectoryPath);
      const projectManagedNamespaceService = new ProjectManagedNamespaceService();
      const initialNamespace = await projectManagedNamespaceService.discoverManagedNamespace({
        projectDirectoryPath,
      });
      await fs.writeFile(
        path.join(projectDirectoryPath, 'resources', 'requests', 'example-request.json'),
        requestContent.replace('Example request', 'Edited request'),
      );

      // Act
      const editedNamespace = await projectManagedNamespaceService.discoverManagedNamespace({
        projectDirectoryPath,
        baselineSnapshotDigest: initialNamespace.snapshotDigest,
      });

      // Assert
      assert.equal(editedNamespace.hasLocalEdits, true);
    });

    it('should reject a symlink at a direct managed file path', async testContext => {
      // Arrange
      const projectDirectoryPath = await createProjectDirectory(testContext);
      await writeManagedProject(projectDirectoryPath);
      const linkedFilePath = path.join(
        projectDirectoryPath,
        'resources',
        'requests',
        'linked-request.json',
      );
      await fs.symlink('example-request.json', linkedFilePath);
      const projectManagedNamespaceService = new ProjectManagedNamespaceService();

      // Act and assert
      await assert.rejects(
        projectManagedNamespaceService.discoverManagedNamespace({ projectDirectoryPath }),
        { code: 'PROJECT_MANAGED_FILE_NOT_REGULAR' },
      );
    });

    it('should reject an unsafe direct JSON resource path', async testContext => {
      // Arrange
      const projectDirectoryPath = await createProjectDirectory(testContext);
      await writeManagedProject(projectDirectoryPath);
      await fs.writeFile(
        path.join(projectDirectoryPath, 'resources', 'requests', 'Unsafe.json'),
        requestContent,
      );
      const projectManagedNamespaceService = new ProjectManagedNamespaceService();

      // Act and assert
      await assert.rejects(
        projectManagedNamespaceService.discoverManagedNamespace({ projectDirectoryPath }),
        { code: 'PROJECT_MANAGED_PATH_INVALID' },
      );
    });

    it('should reject a nested repository in a managed resource family directory', async testContext => {
      // Arrange
      const projectDirectoryPath = await createProjectDirectory(testContext);
      await writeManagedProject(projectDirectoryPath);
      await fs.mkdir(path.join(projectDirectoryPath, 'resources', 'requests', '.git'));
      const projectManagedNamespaceService = new ProjectManagedNamespaceService();

      // Act and assert
      await assert.rejects(
        projectManagedNamespaceService.discoverManagedNamespace({ projectDirectoryPath }),
        { code: 'PROJECT_MANAGED_NESTED_REPOSITORY' },
      );
    });

    it('should reject an indexed submodule without inspecting its contents', async testContext => {
      // Arrange
      const projectDirectoryPath = await createProjectDirectory(testContext);
      await writeManagedProject(projectDirectoryPath);
      await executeFile('git', ['config', 'user.email', 'tests@example.invalid'], {
        cwd: projectDirectoryPath,
      });
      await executeFile('git', ['config', 'user.name', 'APIEase Tests'], {
        cwd: projectDirectoryPath,
      });
      await executeFile('git', ['add', '.'], { cwd: projectDirectoryPath });
      await executeFile('git', ['commit', '--quiet', '-m', 'fixture'], { cwd: projectDirectoryPath });
      const { stdout: commitOutput } = await executeFile('git', ['rev-parse', 'HEAD'], {
        cwd: projectDirectoryPath,
      });
      await executeFile('git', [
        'update-index',
        '--add',
        '--cacheinfo',
        `160000,${commitOutput.trim()},resources/requests/uninitialized-submodule`,
      ], { cwd: projectDirectoryPath });
      const projectManagedNamespaceService = new ProjectManagedNamespaceService();

      // Act and assert
      await assert.rejects(
        projectManagedNamespaceService.discoverManagedNamespace({ projectDirectoryPath }),
        { code: 'PROJECT_MANAGED_SUBMODULE' },
      );
    });
  });
});

async function createProjectDirectory(testContext) {
  const projectDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-namespace-'));
  testContext.after(() => fs.rm(projectDirectoryPath, { recursive: true, force: true }));
  await executeFile('git', ['init', '--quiet'], { cwd: projectDirectoryPath });

  return projectDirectoryPath;
}

async function writeManagedProject(projectDirectoryPath) {
  await fs.mkdir(path.join(projectDirectoryPath, '.apiease'), { recursive: true });
  await fs.mkdir(path.join(projectDirectoryPath, 'resources', 'requests'), { recursive: true });
  await fs.writeFile(path.join(projectDirectoryPath, '.apiease', 'project.json'), metadataContent);
  await fs.writeFile(
    path.join(projectDirectoryPath, 'resources', 'requests', 'example-request.json'),
    requestContent,
  );
}
