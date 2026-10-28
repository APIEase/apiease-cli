import { isDeepStrictEqual } from 'node:util';

import {
  ProjectBootstrapArtifactService,
} from './ProjectBootstrapArtifactService.js';
import { ProjectMetadataFileService } from './ProjectMetadataFileService.js';
import { ProjectLocalStateService } from './ProjectLocalStateService.js';
import { ProjectManagedNamespaceService } from './ProjectManagedNamespaceService.js';
import { ProjectManagedPublicationService } from './ProjectManagedPublicationService.js';

const PROJECT_FORCE_DISCARD_WARNING = 'Forced pull discarded local edits to direct managed files.';

class ProjectSynchronizationService {
  constructor({
    apiEaseProjectApiClient,
    projectBootstrapArtifactService = new ProjectBootstrapArtifactService(),
    projectLocalStateService = new ProjectLocalStateService(),
    projectManagedNamespaceService = new ProjectManagedNamespaceService(),
    projectManagedPublicationService = new ProjectManagedPublicationService(),
    projectMetadataFileService = new ProjectMetadataFileService(),
  } = {}) {
    this.apiEaseProjectApiClient = apiEaseProjectApiClient;
    this.projectBootstrapArtifactService = projectBootstrapArtifactService;
    this.projectLocalStateService = projectLocalStateService;
    this.projectManagedNamespaceService = projectManagedNamespaceService;
    this.projectManagedPublicationService = projectManagedPublicationService;
    this.projectMetadataFileService = projectMetadataFileService;
  }

  async initializeProject({ projectDirectoryPath, projectApiInvocation }) {
    return await this.synchronizeProject({
      projectDirectoryPath,
      projectApiInvocation,
      synchronizationMode: 'initialize',
    });
  }

  async pullProject({ projectDirectoryPath, projectApiInvocation, force = false, legacyMetadata }) {
    return await this.synchronizeProject({
      force,
      legacyMetadata,
      projectDirectoryPath,
      projectApiInvocation,
      synchronizationMode: 'pull',
    });
  }

  async synchronizeProject(synchronizationRequest) {
    const bootstrapResponse = await this.apiEaseProjectApiClient.bootstrapProject(
      synchronizationRequest.projectApiInvocation,
    );
    if (!bootstrapResponse.ok) return buildApiFailureResult(bootstrapResponse);
    const verifiedArtifact = this.projectBootstrapArtifactService
      .verifySynchronizedArtifact(bootstrapResponse);
    const synchronizationContext = await this.prepareSynchronization(
      synchronizationRequest, verifiedArtifact,
    );
    const publication = await this.publishVerifiedArtifact(
      synchronizationContext.repositoryTopLevelPath,
      verifiedArtifact,
    );
    await this.publishVerifiedLocalState(synchronizationContext, verifiedArtifact.localState);

    return {
      bootstrapResponse,
      publication,
      skippedResources: verifiedArtifact.skippedResources,
      warnings: synchronizationContext.warnings,
    };
  }

  async prepareSynchronization(synchronizationRequest, verifiedArtifact) {
    if (synchronizationRequest.legacyMetadata) {
      return await this.prepareLegacySynchronization(synchronizationRequest, verifiedArtifact);
    }
    return synchronizationRequest.synchronizationMode === 'pull'
      ? await this.preparePullSynchronization(synchronizationRequest, verifiedArtifact)
      : await this.prepareInitialization(synchronizationRequest.projectDirectoryPath);
  }

  async prepareInitialization(projectDirectoryPath) {
    const location = await this.projectLocalStateService
      .resolveLocalStateLocation(projectDirectoryPath);

    return { repositoryTopLevelPath: location.repositoryTopLevelPath, warnings: [] };
  }

  async preparePullSynchronization({ projectDirectoryPath, force }, verifiedArtifact) {
    const localStateRead = await this.projectLocalStateService.readLocalState(projectDirectoryPath);
    this.requireReadableLocalState(localStateRead);
    if (!isDeepStrictEqual(localStateRead.localState.projectIdentity, verifiedArtifact.localState.projectIdentity)) {
      throw buildSynchronizationError('PROJECT_CHECKOUT_IDENTITY_MISMATCH');
    }
    const managedNamespace = await this.discoverCurrentNamespace(
      projectDirectoryPath,
      localStateRead.localState,
    );
    this.requireSafePull(managedNamespace.hasLocalEdits, force);

    return {
      repositoryTopLevelPath: managedNamespace.repositoryTopLevelPath,
      warnings: managedNamespace.hasLocalEdits ? [PROJECT_FORCE_DISCARD_WARNING] : [],
    };
  }

  async prepareLegacySynchronization({ projectDirectoryPath, legacyMetadata }, verifiedArtifact) {
    const localStateRead = await this.projectLocalStateService.readLocalState(projectDirectoryPath);
    if (localStateRead.ok || localStateRead.error.code !== 'PROJECT_LOCAL_STATE_NOT_FOUND') {
      throw buildSynchronizationError('PROJECT_CHECKOUT_STATE_MISMATCH');
    }
    const namespace = await this.discoverLegacyNamespace(projectDirectoryPath);
    this.requireMatchingLegacyMetadata(namespace, legacyMetadata);
    this.requireMatchingLegacyResources(namespace.files, verifiedArtifact.files);
    await this.projectMetadataFileService.preserveTemplateMetadata({
      projectDirectoryPath: namespace.repositoryTopLevelPath, projectMetadata: legacyMetadata,
    });
    return { repositoryTopLevelPath: namespace.repositoryTopLevelPath, warnings: [] };
  }

  async discoverLegacyNamespace(projectDirectoryPath) {
    try {
      return await this.projectManagedNamespaceService.discoverManagedNamespace({ projectDirectoryPath });
    } catch (error) {
      if (error?.code?.startsWith('CANONICAL_RESOURCE_SOURCE_')
        || ['PROJECT_MANAGED_FILE_NOT_REGULAR', 'PROJECT_MANAGED_PATH_INVALID'].includes(error?.code)) {
        throw buildSynchronizationError('PROJECT_LEGACY_RESOURCE_CONFLICT');
      }
      throw error;
    }
  }

  requireMatchingLegacyMetadata(namespace, legacyMetadata) {
    const currentMetadata = JSON.parse(namespace.files.find(file => file.path === '.apiease/project.json').content);
    if (!this.projectMetadataFileService.isLegacyTemplateMetadata(currentMetadata)
      || !isDeepStrictEqual(currentMetadata, legacyMetadata)) {
      throw buildSynchronizationError('PROJECT_CHECKOUT_METADATA_INVALID');
    }
  }

  requireMatchingLegacyResources(currentFiles, verifiedFiles) {
    const verifiedByPath = new Map(verifiedFiles.map(file => [file.path, file.content.toString('utf8')]));
    const conflicts = currentFiles.filter(file => file.path !== '.apiease/project.json'
      && file.content !== verifiedByPath.get(file.path));
    if (conflicts.length) {
      throw buildSynchronizationError('PROJECT_LEGACY_RESOURCE_CONFLICT', conflicts.map(file => ({
        code: 'PROJECT_LEGACY_RESOURCE_CONFLICT', path: file.path,
      })));
    }
  }

  requireReadableLocalState(localStateRead) {
    if (localStateRead.ok) return;
    throw buildSynchronizationError(
      localStateRead.error.code,
      localStateRead.error.diagnostics,
    );
  }

  async discoverCurrentNamespace(projectDirectoryPath, localState) {
    return await this.projectManagedNamespaceService.discoverManagedNamespace({
      projectDirectoryPath,
      baselineSnapshotDigest: localState.baseline.snapshotDigest,
    });
  }

  requireSafePull(hasLocalEdits, force) {
    if (hasLocalEdits && !force) {
      throw buildSynchronizationError('PROJECT_LOCAL_MANAGED_EDITS');
    }
  }

  async publishVerifiedArtifact(repositoryTopLevelPath, verifiedArtifact) {
    return await this.projectManagedPublicationService.publishManagedSnapshot({
      repositoryTopLevelPath,
      verifiedArtifact,
    });
  }

  async publishVerifiedLocalState(synchronizationContext, localState) {
    await this.projectLocalStateService.publishLocalState({
      projectDirectoryPath: synchronizationContext.repositoryTopLevelPath,
      localState,
    });
  }
}

function buildApiFailureResult(bootstrapResponse) {
  return { bootstrapResponse, publication: null, skippedResources: [], warnings: [] };
}

function buildSynchronizationError(code, diagnostics = [{ code }]) {
  const error = new Error(code);
  error.code = code;
  error.diagnostics = diagnostics;
  error.failureType = 'local-integrity';

  return error;
}

export { PROJECT_FORCE_DISCARD_WARNING, ProjectSynchronizationService };
