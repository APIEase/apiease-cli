import crypto from 'node:crypto';

import { ProjectCanonicalArtifactService } from './ProjectCanonicalArtifactService.js';
import { ProjectContractService } from './ProjectContractService.js';
import { ProjectDeletionIntentService } from './ProjectDeletionIntentService.js';
import { ProjectGitCheckoutService } from './ProjectGitCheckoutService.js';
import { ProjectManagedNamespaceService } from './ProjectManagedNamespaceService.js';
import { ProjectSecureInputService } from './ProjectSecureInputService.js';

const PROJECT_METADATA_PATH = '.apiease/project.json';
const CHANGE_SET_DIGEST_DOMAIN = 'apiease-canonical-resource-change-set-v1';

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
    const changeSet = this.buildCandidateValue({
      deletionResult,
      localState: checkout.localState,
      managedSnapshotDigest: managedNamespace.snapshotDigest,
      parsedResourceSources,
      secureInputResult,
    });
    this.requireValidCandidate(changeSet);

    return {
      repositoryTopLevelPath: checkout.repositoryTopLevelPath,
      localState: checkout.localState,
      changeSet,
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
    localState,
    managedSnapshotDigest,
    parsedResourceSources,
    secureInputResult,
  }) {
    const verifiedBindings = this.buildVerifiedBindings(localState.resources);
    const bindingByPath = new Map(localState.resources.map(binding => (
      [binding.path, this.buildVerifiedBinding(binding)]
    )));
    const operations = this.buildOperations({
      bindingByPath,
      deletionResult,
      parsedResourceSources,
    });
    const changeSet = {
      contractVersion: 1,
      changeSetId: `change_set_${managedSnapshotDigest.slice('sha256:'.length)}`,
      changeSetDigest: '',
      baseline: { ...localState.baseline },
      ...operations,
      secureInputs: this.sortSecureInputs(secureInputResult.secureInputs),
      verifiedBindings,
    };
    changeSet.changeSetDigest = this.computeChangeSetDigest(changeSet);

    return changeSet;
  }

  buildOperations({ bindingByPath, deletionResult, parsedResourceSources }) {
    const sourcesByPath = new Map(parsedResourceSources.map(source => [source.path, source.source]));
    const deletionPaths = new Set(deletionResult.deletionIntents.map(intent => intent.sourcePath));
    const creates = [];
    const updates = [];

    for (const [sourcePath, source] of sourcesByPath) {
      const binding = bindingByPath.get(sourcePath);
      if (binding) this.requireMatchingBinding(binding, source);
      const operation = { resourceType: source.resourceType, handle: source.handle, source };
      if (binding) operation.bindingId = binding.bindingId;
      (binding ? updates : creates).push(operation);
    }
    for (const [sourcePath] of bindingByPath) {
      if (!sourcesByPath.has(sourcePath) && !deletionPaths.has(sourcePath)) {
        this.throwMissingBoundFile(sourcePath);
      }
    }

    return {
      creates: creates.sort(compareResources),
      updates: updates.sort(compareResources),
      deletes: this.buildDeletes(deletionResult.deletions, bindingByPath),
    };
  }

  buildDeletes(deletions, bindingByPath) {
    return deletions.map(deletion => {
      const binding = [...bindingByPath.values()].find(value => (
        value.resourceId === deletion.resourceId
      ));
      if (!binding) throwServiceError('PROJECT_CANDIDATE_BINDING_MISMATCH');
      return {
        resourceType: binding.resourceType,
        handle: binding.handle,
        bindingId: binding.bindingId,
      };
    }).sort(compareResources);
  }

  requireMatchingBinding(localResource, source) {
    if (localResource.resourceType !== source.resourceType) {
      throwServiceError('PROJECT_CANDIDATE_BINDING_MISMATCH', [{
        code: 'PROJECT_CANDIDATE_BINDING_MISMATCH',
        path: localResource.path,
      }]);
    }
  }

  buildVerifiedBindings(localBindings) {
    return localBindings.map(binding => this.buildVerifiedBinding(binding))
      .sort((leftBinding, rightBinding) => compareText(
        leftBinding.bindingId,
        rightBinding.bindingId,
      ));
  }

  buildVerifiedBinding(binding) {
    return {
      bindingId: buildBindingId(binding),
      resourceType: binding.resourceType,
      handle: binding.handle,
      resourceId: binding.resourceId,
      expectedResourceVersion: binding.resourceVersion,
    };
  }

  throwMissingBoundFile(resourcePath) {
    const code = 'PROJECT_CANDIDATE_BOUND_FILE_MISSING';
    throwServiceError(code, [{ code, path: resourcePath }]);
  }

  computeChangeSetDigest(changeSet) {
    const { changeSetDigest, ...digestIdentity } = changeSet;
    const canonicalIdentity = this.projectCanonicalArtifactService
      .serializeCanonicalValue(digestIdentity);
    const digest = crypto.createHash('sha256')
      .update(`${CHANGE_SET_DIGEST_DOMAIN}\0${canonicalIdentity}`, 'utf8')
      .digest('hex');

    return `sha256:${digest}`;
  }

  sortSecureInputs(secureInputs) {
    return secureInputs.map(secureInput => ({ ...secureInput }))
      .sort((leftInput, rightInput) => (
        compareText(buildSecureInputIdentity(leftInput), buildSecureInputIdentity(rightInput))
      ));
  }

  requireValidCandidate(candidate) {
    const validationResult = this.projectContractService
      .validateCanonicalResourceChangeSet(candidate);
    if (!validationResult.ok) {
      throwServiceError('PROJECT_CANDIDATE_INVALID', validationResult.diagnostics);
    }
  }
}

function buildBindingId(binding) {
  return `binding_${binding.resourceType}_${binding.handle.replaceAll('-', '_')}`;
}

function buildSecureInputIdentity(secureInput) {
  return [secureInput.resourceType, secureInput.handle, secureInput.fieldPath].join('\0');
}

function compareText(leftText, rightText) {
  if (leftText === rightText) return 0;

  return leftText < rightText ? -1 : 1;
}

function compareResources(leftResource, rightResource) {
  return compareText(
    `${leftResource.resourceType}:${leftResource.handle}`,
    `${rightResource.resourceType}:${rightResource.handle}`,
  );
}

function throwServiceError(code, diagnostics = [{ code }]) {
  const error = new Error(code);
  error.code = code;
  error.diagnostics = diagnostics;
  throw error;
}

export { ProjectCandidateBuilder };
