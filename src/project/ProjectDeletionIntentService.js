import fs from 'node:fs/promises';
import path from 'node:path';

import {
  ProjectCanonicalArtifactService,
  RESOURCE_SOURCE_DIRECTORIES,
} from './ProjectCanonicalArtifactService.js';
import { ProjectContractService } from './ProjectContractService.js';

const COMMITTED_APPLY_OUTCOMES = new Set(['PROJECT_APPLIED', 'PROJECT_APPLY_NO_CHANGE']);
const INTENT_FILE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/u;
const INTENT_NAMESPACES = Object.freeze(['archive', 'delete']);

class ProjectDeletionIntentService {
  constructor({
    projectCanonicalArtifactService = new ProjectCanonicalArtifactService(),
    projectContractService = new ProjectContractService(),
  } = {}) {
    this.projectCanonicalArtifactService = projectCanonicalArtifactService;
    this.projectContractService = projectContractService;
  }

  async discoverDeletionIntents({ repositoryTopLevelPath, localState } = {}) {
    const intentFiles = await this.discoverIntentFiles(repositoryTopLevelPath);
    this.requireNoDeleteArchiveConflicts(intentFiles);
    const deletionIntents = [];

    for (const intentFile of intentFiles.filter(file => file.namespace === 'delete')) {
      deletionIntents.push(await this.buildDeletionIntent({
        intentFile,
        localState,
        repositoryTopLevelPath,
      }));
    }

    deletionIntents.sort(compareDeletionIntents);
    this.requireUniqueDeletionAuthority(deletionIntents);

    return {
      deletions: deletionIntents.map(intent => ({ ...intent.deletion })),
      deletionIntents,
    };
  }

  async archiveCommittedDeletionIntents({
    repositoryTopLevelPath,
    deletionIntents,
    applyReceipt,
  } = {}) {
    this.requireCommittedApplyReceipt(applyReceipt);
    this.requireReceiptProof(deletionIntents, applyReceipt);
    const transitions = [];

    for (const deletionIntent of deletionIntents) {
      transitions.push(await this.prepareArchiveTransition({
        repositoryTopLevelPath,
        deletionIntent,
      }));
    }

    return this.applyArchiveTransitions(transitions);
  }

  async discoverIntentFiles(repositoryTopLevelPath) {
    const intentFiles = [];

    for (const [resourceType, resourceDirectory] of Object.entries(RESOURCE_SOURCE_DIRECTORIES)) {
      for (const namespace of INTENT_NAMESPACES) {
        await this.appendIntentFiles({
          intentFiles,
          namespace,
          repositoryTopLevelPath,
          resourceDirectory,
          resourceType,
        });
      }
    }

    return intentFiles.sort(compareIntentFiles);
  }

  async appendIntentFiles({
    intentFiles,
    namespace,
    repositoryTopLevelPath,
    resourceDirectory,
    resourceType,
  }) {
    const directoryPath = path.join(repositoryTopLevelPath, resourceDirectory, namespace);
    const directoryStatus = await readOptionalStatus(directoryPath);
    if (!directoryStatus) return;
    requireRegularDirectory(directoryStatus);
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
      intentFiles.push(await this.readIntentFile({
        entry,
        namespace,
        repositoryTopLevelPath,
        resourceDirectory,
        resourceType,
      }));
    }
  }

  async readIntentFile({
    entry,
    namespace,
    repositoryTopLevelPath,
    resourceDirectory,
    resourceType,
  }) {
    requireValidIntentEntry(entry);
    const handle = entry.name.slice(0, -'.json'.length);
    const intentPath = `${resourceDirectory}/${namespace}/${entry.name}`;
    const sourcePath = `${resourceDirectory}/${entry.name}`;
    const absolutePath = path.join(repositoryTopLevelPath, intentPath);
    const fileStatus = await fs.lstat(absolutePath);
    if (!fileStatus.isFile() || fileStatus.isSymbolicLink()) {
      throwServiceError('PROJECT_DELETION_INTENT_PATH_INVALID');
    }
    const content = await fs.readFile(absolutePath);
    this.projectCanonicalArtifactService.parseResourceSource({ path: sourcePath, content });

    return {
      digest: this.projectCanonicalArtifactService.computeFileDigest(content),
      handle,
      intentPath,
      namespace,
      resourceType,
      sourcePath,
    };
  }

  requireNoDeleteArchiveConflicts(intentFiles) {
    const intentNamespacesByIdentity = new Map();

    for (const intentFile of intentFiles) {
      const identity = buildSourceIdentity(intentFile);
      const namespaces = intentNamespacesByIdentity.get(identity) ?? new Set();
      namespaces.add(intentFile.namespace);
      intentNamespacesByIdentity.set(identity, namespaces);
      if (namespaces.size > 1) throwServiceError('PROJECT_DELETION_ARCHIVE_CONFLICT');
    }
  }

  async buildDeletionIntent({ intentFile, localState, repositoryTopLevelPath }) {
    if (await readOptionalStatus(path.join(repositoryTopLevelPath, intentFile.sourcePath))) {
      throwServiceError('PROJECT_DELETION_LIVE_SOURCE_CONFLICT');
    }
    const binding = localState?.resources?.find(resource => resource.path === intentFile.sourcePath);
    if (!binding) throwServiceError('PROJECT_DELETION_BINDING_NOT_FOUND');
    this.requireBindingAuthority(binding, intentFile.resourceType);

    return {
      deletePath: intentFile.intentPath,
      archivePath: intentFile.intentPath.replace('/delete/', '/archive/'),
      sourcePath: intentFile.sourcePath,
      resourceType: intentFile.resourceType,
      handle: intentFile.handle,
      sourceDigest: intentFile.digest,
      deletion: {
        resourceType: binding.resourceType,
        resourceId: binding.resourceId,
        originalHandle: binding.handle,
        expectedResourceVersion: binding.resourceVersion,
      },
    };
  }

  requireBindingAuthority(binding, expectedResourceType) {
    const requiredValues = [
      binding.resourceType,
      binding.resourceId,
      binding.handle,
      binding.resourceVersion,
    ];
    if (requiredValues.some(value => typeof value !== 'string' || value.length === 0)) {
      throwServiceError('PROJECT_DELETION_AUTHORITY_MISSING');
    }
    if (binding.resourceType !== expectedResourceType) {
      throwServiceError('PROJECT_DELETION_BINDING_MISMATCH');
    }
  }

  requireUniqueDeletionAuthority(deletionIntents) {
    const resourceIds = deletionIntents.map(intent => intent.deletion.resourceId);
    if (new Set(resourceIds).size !== resourceIds.length) {
      throwServiceError('PROJECT_DELETION_AUTHORITY_DUPLICATE');
    }
  }

  requireCommittedApplyReceipt(applyReceipt) {
    const validationResult = this.projectContractService.validateFixtureDocument(
      'applyReceiptResult',
      applyReceipt,
    );
    if (!validationResult.ok || !COMMITTED_APPLY_OUTCOMES.has(applyReceipt?.outcome)) {
      throwServiceError('PROJECT_APPLY_RECEIPT_INVALID', validationResult.diagnostics);
    }
  }

  requireReceiptProof(deletionIntents, applyReceipt) {
    if (!Array.isArray(deletionIntents)) {
      throwServiceError('PROJECT_DELETION_INTENTS_INVALID');
    }

    for (const deletionIntent of deletionIntents) {
      const hasReceiptProof = applyReceipt.resources.some(resource => (
        resource.operation === 'delete'
        && resource.resourceType === deletionIntent.deletion?.resourceType
        && resource.resourceId === deletionIntent.deletion?.resourceId
        && resource.handle === deletionIntent.deletion?.originalHandle
      ));
      if (!hasReceiptProof) throwServiceError('PROJECT_DELETION_RECEIPT_MISMATCH');
    }
  }

  async prepareArchiveTransition({ repositoryTopLevelPath, deletionIntent }) {
    const deleteFilePath = path.join(repositoryTopLevelPath, deletionIntent.deletePath);
    const archiveFilePath = path.join(repositoryTopLevelPath, deletionIntent.archivePath);
    const deleteStatus = await readOptionalStatus(deleteFilePath);
    const archiveStatus = await readOptionalStatus(archiveFilePath);
    if (deleteStatus && archiveStatus) throwServiceError('PROJECT_DELETION_ARCHIVE_CONFLICT');
    if (!deleteStatus && !archiveStatus) throwServiceError('PROJECT_DELETION_INTENT_NOT_FOUND');

    const existingFilePath = deleteStatus ? deleteFilePath : archiveFilePath;
    requireRegularFile(deleteStatus ?? archiveStatus);
    await this.validateTransitionSource({
      alreadyArchived: !deleteStatus,
      deletionIntent,
      existingFilePath,
    });

    return { archiveFilePath, deleteFilePath, deletionIntent, alreadyArchived: !deleteStatus };
  }

  async validateTransitionSource({ alreadyArchived, deletionIntent, existingFilePath }) {
    const sourcePath = deletionIntent.sourcePath ?? buildSourcePath(deletionIntent.deletePath);
    const content = await fs.readFile(existingFilePath);
    this.projectCanonicalArtifactService.parseResourceSource({ path: sourcePath, content });
    const digest = this.projectCanonicalArtifactService.computeFileDigest(content);
    if (digest !== deletionIntent.sourceDigest) {
      throwServiceError(alreadyArchived
        ? 'PROJECT_DELETION_ARCHIVE_CONTENT_MISMATCH'
        : 'PROJECT_DELETION_INTENT_CONTENT_CHANGED');
    }
  }

  async applyArchiveTransitions(transitions) {
    const archivedPaths = [];
    const alreadyArchivedPaths = [];

    for (const transition of transitions) {
      const resultPaths = transition.alreadyArchived ? alreadyArchivedPaths : archivedPaths;
      if (!transition.alreadyArchived) {
        await fs.mkdir(path.dirname(transition.archiveFilePath), { recursive: true });
        await fs.rename(transition.deleteFilePath, transition.archiveFilePath);
      }
      resultPaths.push(transition.deletionIntent.archivePath);
    }

    return { archivedPaths, alreadyArchivedPaths };
  }
}

function requireValidIntentEntry(entry) {
  if (!entry.isFile() || entry.isSymbolicLink() || !INTENT_FILE_NAME_PATTERN.test(entry.name)) {
    throwServiceError('PROJECT_DELETION_INTENT_PATH_INVALID');
  }
}

function requireRegularDirectory(directoryStatus) {
  if (!directoryStatus.isDirectory() || directoryStatus.isSymbolicLink()) {
    throwServiceError('PROJECT_DELETION_INTENT_PATH_INVALID');
  }
}

function requireRegularFile(fileStatus) {
  if (!fileStatus.isFile() || fileStatus.isSymbolicLink()) {
    throwServiceError('PROJECT_DELETION_INTENT_PATH_INVALID');
  }
}

async function readOptionalStatus(filePath) {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function buildSourceIdentity(intentFile) {
  return `${intentFile.resourceType}:${intentFile.handle}`;
}

function buildSourcePath(deletePath) {
  return deletePath.replace('/delete/', '/');
}

function compareIntentFiles(leftFile, rightFile) {
  return compareText(leftFile.intentPath, rightFile.intentPath);
}

function compareDeletionIntents(leftIntent, rightIntent) {
  return compareText(leftIntent.sourcePath, rightIntent.sourcePath);
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

export { ProjectDeletionIntentService };
