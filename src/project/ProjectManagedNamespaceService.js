import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import {
  ProjectCanonicalArtifactService,
  RESOURCE_SOURCE_DIRECTORIES,
} from './ProjectCanonicalArtifactService.js';

const executeFile = promisify(execFile);
const PROJECT_METADATA_PATH = '.apiease/project.json';
const RESOURCE_FILE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u;
const UNMANAGED_RESOURCE_DIRECTORY_NAMES = new Set(['archive', 'delete']);

class ProjectManagedNamespaceService {
  constructor({
    projectCanonicalArtifactService = new ProjectCanonicalArtifactService(),
    gitExecution = defaultGitExecution,
  } = {}) {
    this.projectCanonicalArtifactService = projectCanonicalArtifactService;
    this.gitExecution = gitExecution;
  }

  async discoverManagedNamespace({ projectDirectoryPath, baselineSnapshotDigest } = {}) {
    const repositoryTopLevelPath = await this.resolveRepositoryTopLevelPath(projectDirectoryPath);
    await this.requireNoManagedSubmodules(repositoryTopLevelPath);
    const files = [await this.readMetadataFile(repositoryTopLevelPath)];
    await this.appendResourceFiles({ files, repositoryTopLevelPath });
    files.sort(compareFilesByPath);
    this.requireUniquePaths(files);
    const snapshotDigest = this.projectCanonicalArtifactService
      .computeResourceSnapshotDigest(files);

    return {
      repositoryTopLevelPath,
      files,
      snapshotDigest,
      hasLocalEdits: baselineSnapshotDigest !== undefined
        && snapshotDigest !== baselineSnapshotDigest,
    };
  }

  async resolveRepositoryTopLevelPath(projectDirectoryPath) {
    const gitOutput = await this.gitExecution({
      arguments: ['rev-parse', '--show-toplevel'],
      workingDirectoryPath: projectDirectoryPath,
    });
    const resolvedPath = readGitOutput(gitOutput);

    return path.resolve(resolvedPath);
  }

  async readMetadataFile(repositoryTopLevelPath) {
    const metadataDirectoryPath = path.join(repositoryTopLevelPath, '.apiease');
    await this.requireDirectory(metadataDirectoryPath);

    return this.readManagedFile({
      absoluteFilePath: path.join(repositoryTopLevelPath, PROJECT_METADATA_PATH),
      managedPath: PROJECT_METADATA_PATH,
      validateCanonicalContent: false,
    });
  }

  async requireNoManagedSubmodules(repositoryTopLevelPath) {
    const gitOutput = await this.gitExecution({
      arguments: ['ls-files', '--stage', '-z', '--', '.apiease', 'resources'],
      workingDirectoryPath: repositoryTopLevelPath,
    });
    const output = typeof gitOutput === 'string' ? gitOutput : gitOutput.stdout;
    const hasSubmodule = output.split('\0').some(entry => entry.startsWith('160000 '));

    if (hasSubmodule) throw buildServiceError('PROJECT_MANAGED_SUBMODULE');
  }

  async appendResourceFiles({ files, repositoryTopLevelPath }) {
    for (const resourceDirectory of Object.values(RESOURCE_SOURCE_DIRECTORIES)) {
      await this.appendResourceDirectoryFiles({ files, repositoryTopLevelPath, resourceDirectory });
    }
  }

  async appendResourceDirectoryFiles({ files, repositoryTopLevelPath, resourceDirectory }) {
    const directoryPath = path.join(repositoryTopLevelPath, resourceDirectory);
    const directoryStatus = await this.readOptionalStatus(directoryPath);
    if (!directoryStatus) return;
    this.requireDirectoryStatus(directoryStatus);
    await this.requireNoGitMarker(directoryPath);
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
      await this.appendResourceDirectoryEntry({
        entry,
        files,
        repositoryTopLevelPath,
        resourceDirectory,
      });
    }
  }

  async appendResourceDirectoryEntry({
    entry,
    files,
    repositoryTopLevelPath,
    resourceDirectory,
  }) {
    const entryPath = path.join(repositoryTopLevelPath, resourceDirectory, entry.name);
    if (entry.isDirectory()) {
      await this.inspectUnmanagedDirectory(entryPath, entry.name);
      return;
    }
    if (!entry.name.endsWith('.json')) return;
    if (!RESOURCE_FILE_NAME_PATTERN.test(entry.name)) {
      throw buildServiceError('PROJECT_MANAGED_PATH_INVALID');
    }
    const managedPath = `${resourceDirectory}/${entry.name}`;
    files.push(await this.readManagedFile({
      absoluteFilePath: entryPath,
      managedPath,
      validateCanonicalContent: true,
    }));
  }

  async inspectUnmanagedDirectory(directoryPath, directoryName) {
    if (UNMANAGED_RESOURCE_DIRECTORY_NAMES.has(directoryName)) return;
    await this.requireNoGitMarker(directoryPath);
  }

  async readManagedFile({ absoluteFilePath, managedPath, validateCanonicalContent }) {
    const fileStatus = await this.readRequiredStatus(absoluteFilePath);
    if (!fileStatus.isFile() || fileStatus.isSymbolicLink()) {
      throw buildServiceError('PROJECT_MANAGED_FILE_NOT_REGULAR');
    }
    const contentBuffer = await fs.readFile(absoluteFilePath);
    const digest = this.projectCanonicalArtifactService.computeFileDigest(contentBuffer);
    if (validateCanonicalContent) {
      this.projectCanonicalArtifactService.parseResourceSource({
        path: managedPath,
        content: contentBuffer,
      });
    }

    return {
      path: managedPath,
      encoding: 'utf-8',
      content: new TextDecoder('utf-8', { fatal: true }).decode(contentBuffer),
      digest,
    };
  }

  async requireDirectory(directoryPath) {
    const directoryStatus = await this.readRequiredStatus(directoryPath);
    this.requireDirectoryStatus(directoryStatus);
    await this.requireNoGitMarker(directoryPath);
  }

  requireDirectoryStatus(directoryStatus) {
    if (!directoryStatus.isDirectory() || directoryStatus.isSymbolicLink()) {
      throw buildServiceError('PROJECT_MANAGED_DIRECTORY_INVALID');
    }
  }

  async requireNoGitMarker(directoryPath) {
    if (await this.readOptionalStatus(path.join(directoryPath, '.git'))) {
      throw buildServiceError('PROJECT_MANAGED_NESTED_REPOSITORY');
    }
  }

  async readRequiredStatus(managedPath) {
    try {
      return await fs.lstat(managedPath);
    } catch (error) {
      if (error?.code === 'ENOENT') throw buildServiceError('PROJECT_MANAGED_FILE_MISSING');
      throw error;
    }
  }

  async readOptionalStatus(managedPath) {
    try {
      return await fs.lstat(managedPath);
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }

  requireUniquePaths(files) {
    const managedPaths = files.map(file => file.path);
    if (new Set(managedPaths).size !== managedPaths.length) {
      throw buildServiceError('PROJECT_MANAGED_PATH_DUPLICATE');
    }
  }
}

async function defaultGitExecution({ arguments: gitArguments, workingDirectoryPath }) {
  const result = await executeFile('git', gitArguments, { cwd: workingDirectoryPath });
  return result.stdout;
}

function readGitOutput(gitOutput) {
  const output = typeof gitOutput === 'string' ? gitOutput : gitOutput.stdout;
  const trimmedOutput = output.trim();
  if (!trimmedOutput) throw buildServiceError('PROJECT_GIT_PATH_INVALID');

  return trimmedOutput;
}

function compareFilesByPath(leftFile, rightFile) {
  if (leftFile.path === rightFile.path) return 0;

  return leftFile.path < rightFile.path ? -1 : 1;
}

function buildServiceError(code) {
  const error = new Error(code);
  error.code = code;

  return error;
}

export { PROJECT_METADATA_PATH, ProjectManagedNamespaceService };
