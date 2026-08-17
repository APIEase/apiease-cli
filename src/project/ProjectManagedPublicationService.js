import fs from 'node:fs/promises';
import path from 'node:path';

import {
  ProjectCanonicalArtifactService,
  RESOURCE_SOURCE_DIRECTORIES,
} from './ProjectCanonicalArtifactService.js';
import { ProjectManagedPathResolver } from './ProjectManagedPathResolver.js';

const PROJECT_MANAGED_PUBLICATION_ERROR_CODE = 'PROJECT_MANAGED_PUBLICATION_FAILED';
const PROJECT_METADATA_PATH = '.apiease/project.json';
const RESOURCE_FILE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u;

class ProjectManagedPublicationError extends Error {
  constructor() {
    super('Verified managed snapshot publication failed');
    this.name = 'ProjectManagedPublicationError';
    this.code = PROJECT_MANAGED_PUBLICATION_ERROR_CODE;
    this.failureType = 'local-integrity';
  }
}

class ProjectManagedPublicationService {
  constructor({
    fileSystem = fs,
    projectCanonicalArtifactService = new ProjectCanonicalArtifactService(),
    projectManagedPathResolver = new ProjectManagedPathResolver(),
  } = {}) {
    this.fileSystem = fileSystem;
    this.projectCanonicalArtifactService = projectCanonicalArtifactService;
    this.projectManagedPathResolver = projectManagedPathResolver;
  }

  async publishManagedSnapshot({ repositoryTopLevelPath, verifiedArtifact } = {}) {
    let stagingDirectoryPath;
    try {
      const files = this.requireVerifiedArtifact(verifiedArtifact);
      stagingDirectoryPath = await this.stageFiles(repositoryTopLevelPath, files);
      const removedPaths = await this.findAbsentManagedPaths(repositoryTopLevelPath, files);
      await this.replaceManagedFiles({ files, repositoryTopLevelPath, stagingDirectoryPath });
      await this.removeAbsentManagedFiles(repositoryTopLevelPath, removedPaths);

      return { publishedPaths: files.map(file => file.path), removedPaths };
    } catch (error) {
      if (error instanceof ProjectManagedPublicationError) throw error;
      throw new ProjectManagedPublicationError();
    } finally {
      if (stagingDirectoryPath) {
        await this.fileSystem.rm(stagingDirectoryPath, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  requireVerifiedArtifact(verifiedArtifact) {
    const files = verifiedArtifact?.files;
    if (!Array.isArray(files) || files.length === 0) throw new ProjectManagedPublicationError();
    this.requireValidFiles(files);
    const snapshotFiles = files.map(file => ({
      path: file.path,
      content: file.content.toString('utf8'),
    }));
    const snapshotDigest = this.projectCanonicalArtifactService
      .computeResourceSnapshotDigest(snapshotFiles);
    if (snapshotDigest !== verifiedArtifact?.manifest?.snapshotDigest) {
      throw new ProjectManagedPublicationError();
    }

    return files;
  }

  requireValidFiles(files) {
    const managedPaths = new Set();
    files.forEach(file => {
      this.requireValidFile(file);
      if (managedPaths.has(file.path)) throw new ProjectManagedPublicationError();
      managedPaths.add(file.path);
    });
    if (!managedPaths.has(PROJECT_METADATA_PATH)) throw new ProjectManagedPublicationError();
  }

  requireValidFile(file) {
    if (!this.isDirectManagedPath(file?.path) || !Buffer.isBuffer(file?.content)) {
      throw new ProjectManagedPublicationError();
    }
    const digest = this.projectCanonicalArtifactService.computeFileDigest(file.content);
    if (digest !== file.digest) throw new ProjectManagedPublicationError();
  }

  isDirectManagedPath(managedPath) {
    if (managedPath === PROJECT_METADATA_PATH) return true;
    if (typeof managedPath !== 'string') return false;

    return Object.values(RESOURCE_SOURCE_DIRECTORIES).some(resourceDirectory => (
      path.posix.dirname(managedPath) === resourceDirectory
        && RESOURCE_FILE_NAME_PATTERN.test(path.posix.basename(managedPath))
    ));
  }

  async stageFiles(repositoryTopLevelPath, files) {
    const stagingDirectoryPath = await this.fileSystem.mkdtemp(
      path.join(path.resolve(repositoryTopLevelPath), '.apiease-publication-'),
    );
    try {
      for (const file of files) await this.stageFile(stagingDirectoryPath, file);
      return stagingDirectoryPath;
    } catch (error) {
      await this.fileSystem.rm(stagingDirectoryPath, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  async stageFile(stagingDirectoryPath, file) {
    const stagedFilePath = this.resolveManagedPath(stagingDirectoryPath, file.path);
    await this.fileSystem.mkdir(path.dirname(stagedFilePath), { recursive: true });
    await this.fileSystem.writeFile(stagedFilePath, file.content, { flag: 'wx' });
  }

  async findAbsentManagedPaths(repositoryTopLevelPath, files) {
    const publishedPaths = new Set(files.map(file => file.path));
    const absentPaths = [];
    for (const resourceDirectory of Object.values(RESOURCE_SOURCE_DIRECTORIES)) {
      await this.appendAbsentPaths({
        absentPaths,
        publishedPaths,
        repositoryTopLevelPath,
        resourceDirectory,
      });
    }

    return absentPaths.sort();
  }

  async appendAbsentPaths({
    absentPaths,
    publishedPaths,
    repositoryTopLevelPath,
    resourceDirectory,
  }) {
    const directoryPath = this.resolveManagedPath(repositoryTopLevelPath, resourceDirectory);
    const entries = await this.readOptionalDirectory(directoryPath);
    for (const entry of entries) {
      const managedPath = `${resourceDirectory}/${entry.name}`;
      if (!entry.isDirectory() && RESOURCE_FILE_NAME_PATTERN.test(entry.name)
        && !publishedPaths.has(managedPath)) absentPaths.push(managedPath);
    }
  }

  async readOptionalDirectory(directoryPath) {
    try {
      const status = await this.fileSystem.lstat(directoryPath);
      if (!status.isDirectory() || status.isSymbolicLink()) {
        throw new ProjectManagedPublicationError();
      }
      return await this.fileSystem.readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  }

  async replaceManagedFiles({ files, repositoryTopLevelPath, stagingDirectoryPath }) {
    for (const file of files) {
      const stagedFilePath = this.resolveManagedPath(stagingDirectoryPath, file.path);
      const destinationPath = this.resolveManagedPath(repositoryTopLevelPath, file.path);
      await this.requireManagedParentDirectory(repositoryTopLevelPath, path.dirname(file.path));
      await this.fileSystem.rename(stagedFilePath, destinationPath);
    }
  }

  async requireManagedParentDirectory(repositoryTopLevelPath, managedDirectoryPath) {
    let currentDirectoryPath = path.resolve(repositoryTopLevelPath);
    for (const directoryName of managedDirectoryPath.split('/')) {
      currentDirectoryPath = path.join(currentDirectoryPath, directoryName);
      await this.requireOrCreateDirectory(currentDirectoryPath);
    }
  }

  async requireOrCreateDirectory(directoryPath) {
    try {
      const status = await this.fileSystem.lstat(directoryPath);
      if (!status.isDirectory() || status.isSymbolicLink()) throw new ProjectManagedPublicationError();
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      await this.fileSystem.mkdir(directoryPath);
    }
  }

  async removeAbsentManagedFiles(repositoryTopLevelPath, removedPaths) {
    for (const managedPath of removedPaths) {
      await this.fileSystem.unlink(this.resolveManagedPath(repositoryTopLevelPath, managedPath));
    }
  }

  resolveManagedPath(rootDirectoryPath, managedPath) {
    return this.projectManagedPathResolver.resolveManagedPath({ managedPath, rootDirectoryPath });
  }
}

export {
  PROJECT_MANAGED_PUBLICATION_ERROR_CODE,
  ProjectManagedPublicationError,
  ProjectManagedPublicationService,
};
