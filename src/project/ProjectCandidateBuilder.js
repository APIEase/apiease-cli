import { ProjectCanonicalArtifactService } from './ProjectCanonicalArtifactService.js';
import { ProjectContractService } from './ProjectContractService.js';
import { ProjectDeletionIntentService } from './ProjectDeletionIntentService.js';
import { ProjectGitCheckoutService } from './ProjectGitCheckoutService.js';
import { ProjectManagedNamespaceService } from './ProjectManagedNamespaceService.js';
import { ProjectSecureInputService } from './ProjectSecureInputService.js';

const PROJECT_METADATA_PATH = '.apiease/project.json';

class ProjectCandidateBuilder {
  constructor({
    projectCanonicalArtifactService = new ProjectCanonicalArtifactService(),
    projectContractService = new ProjectContractService(),
    projectDeletionIntentService = new ProjectDeletionIntentService(),
    projectGitCheckoutService = new ProjectGitCheckoutService(),
    projectManagedNamespaceService = new ProjectManagedNamespaceService(),
    projectSecureInputService = new ProjectSecureInputService(),
  } = {}) {
    this.projectCanonicalArtifactService = projectCanonicalArtifactService;
    this.projectContractService = projectContractService;
    this.projectDeletionIntentService = projectDeletionIntentService;
    this.projectGitCheckoutService = projectGitCheckoutService;
    this.projectManagedNamespaceService = projectManagedNamespaceService;
    this.projectSecureInputService = projectSecureInputService;
  }

  async buildCandidate({ projectDirectoryPath } = {}) {
    const checkout = await this.projectGitCheckoutService
      .validateProjectCheckout(projectDirectoryPath);
    const managedNamespace = await this.discoverManagedNamespace(checkout);
    this.requireMatchingRepositoryRoot(checkout, managedNamespace);
    const deletionResult = await this.projectDeletionIntentService.discoverDeletionIntents({
      repositoryTopLevelPath: checkout.repositoryTopLevelPath,
      localState: checkout.localState,
    });
    const files = this.sortFiles(managedNamespace.files);
    const parsedResourceSources = this.parseResourceSources(files);
    const secureInputResult = this.projectSecureInputService.buildSecureInputs({
      parsedResourceSources,
      localState: checkout.localState,
    });
    const candidate = this.buildCandidateValue({
      deletionResult,
      files,
      localState: checkout.localState,
      parsedResourceSources,
      secureInputResult,
    });
    this.requireValidCandidate(candidate);

    return {
      repositoryTopLevelPath: checkout.repositoryTopLevelPath,
      localState: checkout.localState,
      candidate,
      candidateSnapshotDigest: managedNamespace.snapshotDigest,
      deletionIntents: deletionResult.deletionIntents,
      requiredSecureValues: secureInputResult.requiredSecureValues,
    };
  }

  discoverManagedNamespace(checkout) {
    return this.projectManagedNamespaceService.discoverManagedNamespace({
      projectDirectoryPath: checkout.repositoryTopLevelPath,
    });
  }

  requireMatchingRepositoryRoot(checkout, managedNamespace) {
    if (managedNamespace.repositoryTopLevelPath !== checkout.repositoryTopLevelPath) {
      throwServiceError('PROJECT_CANDIDATE_CHECKOUT_MISMATCH');
    }
  }

  sortFiles(files) {
    return files.map(file => ({ ...file })).sort((leftFile, rightFile) => (
      compareText(leftFile.path, rightFile.path)
    ));
  }

  parseResourceSources(files) {
    return files
      .filter(file => file.path !== PROJECT_METADATA_PATH)
      .map(file => ({
        path: file.path,
        source: this.projectCanonicalArtifactService.parseResourceSource({
          path: file.path,
          content: file.content,
        }),
      }));
  }

  buildCandidateValue({
    deletionResult,
    files,
    localState,
    parsedResourceSources,
    secureInputResult,
  }) {
    return {
      candidateFormatVersion: 1,
      baseline: { ...localState.baseline },
      files,
      resourceBindings: this.buildResourceBindings({
        deletionIntents: deletionResult.deletionIntents,
        localState,
        parsedResourceSources,
      }),
      deletions: this.sortDeletions(deletionResult.deletions),
      secureInputs: this.sortSecureInputs(secureInputResult.secureInputs),
    };
  }

  buildResourceBindings({ deletionIntents, localState, parsedResourceSources }) {
    const sourcesByPath = new Map(parsedResourceSources.map(source => [source.path, source.source]));
    const deletionPaths = new Set(deletionIntents.map(intent => intent.sourcePath));
    const resourceBindings = [];

    for (const localResource of localState.resources) {
      const source = sourcesByPath.get(localResource.path);
      if (!source && deletionPaths.has(localResource.path)) continue;
      if (!source) this.throwMissingBoundFile(localResource.path);
      this.requireMatchingBinding(localResource, source);
      resourceBindings.push(this.buildResourceBinding(localResource));
    }

    return resourceBindings.sort((leftBinding, rightBinding) => (
      compareText(leftBinding.path, rightBinding.path)
    ));
  }

  requireMatchingBinding(localResource, source) {
    if (localResource.resourceType !== source.resourceType) {
      throwServiceError('PROJECT_CANDIDATE_BINDING_MISMATCH', [{
        code: 'PROJECT_CANDIDATE_BINDING_MISMATCH',
        path: localResource.path,
      }]);
    }
  }

  buildResourceBinding(localResource) {
    return {
      path: localResource.path,
      resourceType: localResource.resourceType,
      resourceId: localResource.resourceId,
      originalHandle: localResource.handle,
      expectedResourceVersion: localResource.resourceVersion,
    };
  }

  throwMissingBoundFile(resourcePath) {
    const code = 'PROJECT_CANDIDATE_BOUND_FILE_MISSING';
    throwServiceError(code, [{ code, path: resourcePath }]);
  }

  sortDeletions(deletions) {
    return deletions.map(deletion => ({ ...deletion })).sort((leftDeletion, rightDeletion) => (
      compareText(buildDeletionIdentity(leftDeletion), buildDeletionIdentity(rightDeletion))
    ));
  }

  sortSecureInputs(secureInputs) {
    return secureInputs.map(secureInput => ({ ...secureInput }))
      .sort((leftInput, rightInput) => (
        compareText(buildSecureInputIdentity(leftInput), buildSecureInputIdentity(rightInput))
      ));
  }

  requireValidCandidate(candidate) {
    const validationResult = this.projectContractService.validateProjectCandidate(candidate);
    if (!validationResult.ok) {
      throwServiceError('PROJECT_CANDIDATE_INVALID', validationResult.diagnostics);
    }
  }
}

function buildDeletionIdentity(deletion) {
  return [
    deletion.resourceType,
    deletion.resourceId,
    deletion.originalHandle,
    deletion.expectedResourceVersion,
  ].join('\0');
}

function buildSecureInputIdentity(secureInput) {
  return [secureInput.resourceType, secureInput.handle, secureInput.fieldPath].join('\0');
}

function compareText(leftText, rightText) {
  if (leftText === rightText) return 0;

  return leftText < rightText ? -1 : 1;
}

function throwServiceError(code, diagnostics = [{ code }]) {
  const error = new Error(code);
  error.code = code;
  error.diagnostics = diagnostics;
  throw error;
}

export { ProjectCandidateBuilder };
