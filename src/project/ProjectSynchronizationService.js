import {
  ProjectBootstrapArtifactService,
} from './ProjectBootstrapArtifactService.js';
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
  } = {}) {
    this.apiEaseProjectApiClient = apiEaseProjectApiClient;
    this.projectBootstrapArtifactService = projectBootstrapArtifactService;
    this.projectLocalStateService = projectLocalStateService;
    this.projectManagedNamespaceService = projectManagedNamespaceService;
    this.projectManagedPublicationService = projectManagedPublicationService;
  }

  async initializeProject({ projectDirectoryPath, projectApiInvocation }) {
    return await this.synchronizeProject({
      projectDirectoryPath,
      projectApiInvocation,
      synchronizationMode: 'initialize',
    });
  }

  async pullProject({ projectDirectoryPath, projectApiInvocation, force = false }) {
    return await this.synchronizeProject({
      force,
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
      synchronizationRequest,
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

  async prepareSynchronization(synchronizationRequest) {
    return synchronizationRequest.synchronizationMode === 'pull'
      ? await this.preparePullSynchronization(synchronizationRequest)
      : await this.prepareInitialization(synchronizationRequest.projectDirectoryPath);
  }

  async prepareInitialization(projectDirectoryPath) {
    const location = await this.projectLocalStateService
      .resolveLocalStateLocation(projectDirectoryPath);

    return { repositoryTopLevelPath: location.repositoryTopLevelPath, warnings: [] };
  }

  async preparePullSynchronization({ projectDirectoryPath, force }) {
    const localStateRead = await this.projectLocalStateService.readLocalState(projectDirectoryPath);
    this.requireReadableLocalState(localStateRead);
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
