import fs from 'node:fs/promises';

import {
  ProjectCanonicalArtifactService,
  RESOURCE_SOURCE_DIRECTORIES,
} from './ProjectCanonicalArtifactService.js';
import { ProjectLocalStateService } from './ProjectLocalStateService.js';
import { ProjectManagedPathResolver } from './ProjectManagedPathResolver.js';

const RESOURCE_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

class ProjectRenameService {
  constructor({
    fileSystem = fs,
    projectCanonicalArtifactService = new ProjectCanonicalArtifactService(),
    projectLocalStateService = new ProjectLocalStateService(),
    projectManagedPathResolver = new ProjectManagedPathResolver(),
  } = {}) {
    this.fileSystem = fileSystem;
    this.projectCanonicalArtifactService = projectCanonicalArtifactService;
    this.projectLocalStateService = projectLocalStateService;
    this.projectManagedPathResolver = projectManagedPathResolver;
  }

  async renameResource({
    projectDirectoryPath,
    resourceType,
    currentHandle,
    renamedHandle,
  } = {}) {
    this.requireValidRenameIdentity({ resourceType, currentHandle, renamedHandle });
    const stateResult = await this.readRequiredLocalState(projectDirectoryPath);
    const paths = this.buildRenamePaths({ resourceType, currentHandle, renamedHandle });
    this.requireExactBinding(stateResult.localState, resourceType, paths);
    const filePaths = this.resolveFilePaths(stateResult.repositoryTopLevelPath, paths);
    const originalContent = await this.readSourceContent(filePaths.currentFilePath);
    const source = this.projectCanonicalArtifactService.parseResourceSource({
      path: paths.currentPath,
      content: originalContent,
    });
    const renamedContent = this.serializeRenamedSource(source, renamedHandle, paths.renamedPath);
    await this.requireDestinationAbsent(filePaths.renamedFilePath);
    const renamedLocalState = this.projectLocalStateService.deriveRenamedLocalState({
      localState: stateResult.localState,
      currentPath: paths.currentPath,
      renamedPath: paths.renamedPath,
    });
    await this.publishRename({
      projectDirectoryPath: stateResult.repositoryTopLevelPath,
      filePaths,
      originalContent,
      renamedContent,
      renamedLocalState,
    });

    return {
      repositoryTopLevelPath: stateResult.repositoryTopLevelPath,
      currentPath: paths.currentPath,
      renamedPath: paths.renamedPath,
      localState: renamedLocalState,
    };
  }

  requireValidRenameIdentity({ resourceType, currentHandle, renamedHandle }) {
    if (!Object.hasOwn(RESOURCE_SOURCE_DIRECTORIES, resourceType)) {
      throwServiceError('PROJECT_RENAME_RESOURCE_TYPE_INVALID');
    }
    if (![currentHandle, renamedHandle].every(handle => RESOURCE_HANDLE_PATTERN.test(handle))) {
      throwServiceError('PROJECT_RENAME_HANDLE_INVALID');
    }
    if (currentHandle === renamedHandle) throwServiceError('PROJECT_RENAME_HANDLE_UNCHANGED');
  }

  async readRequiredLocalState(projectDirectoryPath) {
    const stateResult = await this.projectLocalStateService.readLocalState(projectDirectoryPath);
    if (!stateResult.ok) throwResultError(stateResult.error);

    return stateResult;
  }

  buildRenamePaths({ resourceType, currentHandle, renamedHandle }) {
    const directoryPath = RESOURCE_SOURCE_DIRECTORIES[resourceType];

    return {
      currentPath: `${directoryPath}/${currentHandle}.json`,
      renamedPath: `${directoryPath}/${renamedHandle}.json`,
    };
  }

  requireExactBinding(localState, resourceType, { currentPath, renamedPath }) {
    const binding = localState.resources.find(resource => resource.path === currentPath);
    if (!binding) throwServiceError('PROJECT_RENAME_BINDING_NOT_FOUND');
    if (binding.resourceType !== resourceType) {
      throwServiceError('PROJECT_RENAME_BINDING_INVALID');
    }
    if (localState.resources.some(resource => resource.path === renamedPath)) {
      throwServiceError('PROJECT_RENAME_DESTINATION_OCCUPIED');
    }
  }

  resolveFilePaths(repositoryTopLevelPath, { currentPath, renamedPath }) {
    return {
      currentFilePath: this.resolveFilePath(repositoryTopLevelPath, currentPath),
      renamedFilePath: this.resolveFilePath(repositoryTopLevelPath, renamedPath),
    };
  }

  resolveFilePath(repositoryTopLevelPath, managedPath) {
    return this.projectManagedPathResolver.resolveManagedPath({
      rootDirectoryPath: repositoryTopLevelPath,
      managedPath,
    });
  }

  async readSourceContent(currentFilePath) {
    try {
      return await this.fileSystem.readFile(currentFilePath);
    } catch (error) {
      throwServiceError('PROJECT_RENAME_SOURCE_INVALID', [{
        code: 'PROJECT_RENAME_SOURCE_INVALID',
        reason: error?.code,
      }]);
    }
  }

  serializeRenamedSource(source, renamedHandle, renamedPath) {
    const renamedContent = this.projectCanonicalArtifactService.serializeParsedResourceSource({
      ...source,
      handle: renamedHandle,
    });
    this.projectCanonicalArtifactService.parseResourceSource({
      path: renamedPath,
      content: renamedContent,
    });

    return renamedContent;
  }

  async requireDestinationAbsent(renamedFilePath) {
    try {
      await this.fileSystem.lstat(renamedFilePath);
      throwServiceError('PROJECT_RENAME_DESTINATION_OCCUPIED');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  async publishRename({
    projectDirectoryPath,
    filePaths,
    originalContent,
    renamedContent,
    renamedLocalState,
  }) {
    await this.writeExclusiveFile(filePaths.renamedFilePath, renamedContent);
    await this.removeCurrentFileOrUndoDestination(filePaths);

    try {
      await this.projectLocalStateService.publishLocalState({
        projectDirectoryPath,
        localState: renamedLocalState,
      });
    } catch (error) {
      await this.rollbackWorkingFileRename(filePaths, originalContent);
      throw error;
    }
  }

  async writeExclusiveFile(filePath, content) {
    let fileHandle;

    try {
      fileHandle = await this.fileSystem.open(filePath, 'wx');
      await fileHandle.writeFile(content);
      await fileHandle.sync();
      await fileHandle.close();
    } catch (error) {
      await fileHandle?.close().catch(() => {});
      if (fileHandle) await this.fileSystem.unlink(filePath).catch(() => {});
      if (error?.code === 'EEXIST') throwServiceError('PROJECT_RENAME_DESTINATION_OCCUPIED');
      throw error;
    }
  }

  async removeCurrentFileOrUndoDestination({ currentFilePath, renamedFilePath }) {
    try {
      await this.fileSystem.unlink(currentFilePath);
    } catch (error) {
      await this.fileSystem.unlink(renamedFilePath).catch(() => {});
      throw error;
    }
  }

  async rollbackWorkingFileRename({ currentFilePath, renamedFilePath }, originalContent) {
    try {
      await this.writeExclusiveFile(currentFilePath, originalContent);
      await this.fileSystem.unlink(renamedFilePath);
    } catch (error) {
      throwServiceError('PROJECT_RENAME_ROLLBACK_FAILED', [{
        code: 'PROJECT_RENAME_ROLLBACK_FAILED',
        reason: error?.code,
      }]);
    }
  }
}

function throwResultError(resultError) {
  const error = new Error(resultError.code);
  Object.assign(error, resultError);
  throw error;
}

function throwServiceError(code, diagnostics = [{ code }]) {
  const error = new Error(code);
  error.code = code;
  error.diagnostics = diagnostics;
  throw error;
}

export { ProjectRenameService, RESOURCE_HANDLE_PATTERN };
