import { isDeepStrictEqual } from 'node:util';

import {
  ProjectCanonicalArtifactService,
} from './ProjectCanonicalArtifactService.js';
import { ProjectContractService } from './ProjectContractService.js';

const BOOTSTRAP_ENDPOINT = '/api/v1/projects/bootstrap';
const PROJECT_METADATA_PATH = '.apiease/project.json';
const MAXIMUM_MANAGED_PATH_BYTES = 1024;
const SYNCHRONIZED_OUTCOMES = new Set([
  'PROJECT_BOOTSTRAP_SYNCHRONIZED',
  'PROJECT_BOOTSTRAP_SYNCHRONIZED_NO_RESOURCES',
]);
const PUBLIC_TEMPLATE_IDENTITY = Object.freeze({
  owner: 'APIEase',
  repository: 'apiease-template',
  ref: 'main',
});
const PROJECT_METADATA_FIELDS = new Set([
  'formatVersion',
  'managedPathContractVersion',
  'projectId',
  'normalizedShopDomain',
  'template',
]);
const PROJECT_METADATA_TEMPLATE_FIELDS = new Set([
  'owner',
  'ref',
  'repository',
  'sourceIdentity',
]);
const IDENTITY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,1023}$/u;
const GIT_COMMIT_PATTERN = /^[a-f0-9]{40,64}$/u;
const SHOP_DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/u;

const PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES = Object.freeze({
  byteTotalMismatch: 'PROJECT_BOOTSTRAP_ARTIFACT_BYTE_TOTAL_MISMATCH',
  contract: 'PROJECT_BOOTSTRAP_ARTIFACT_CONTRACT_INVALID',
  countMismatch: 'PROJECT_BOOTSTRAP_ARTIFACT_COUNT_MISMATCH',
  fileDigestMismatch: 'PROJECT_BOOTSTRAP_ARTIFACT_FILE_DIGEST_MISMATCH',
  limitExceeded: 'PROJECT_BOOTSTRAP_ARTIFACT_LIMIT_EXCEEDED',
  localStateMismatch: 'PROJECT_BOOTSTRAP_ARTIFACT_LOCAL_STATE_MISMATCH',
  metadataInvalid: 'PROJECT_BOOTSTRAP_ARTIFACT_METADATA_INVALID',
  metadataMissing: 'PROJECT_BOOTSTRAP_ARTIFACT_METADATA_MISSING',
  outcome: 'PROJECT_BOOTSTRAP_ARTIFACT_OUTCOME_INVALID',
  pathDuplicate: 'PROJECT_BOOTSTRAP_ARTIFACT_PATH_DUPLICATE',
  pathOrdering: 'PROJECT_BOOTSTRAP_ARTIFACT_PATH_ORDERING_INVALID',
  resourceMappingMismatch: 'PROJECT_BOOTSTRAP_ARTIFACT_RESOURCE_MAPPING_MISMATCH',
  snapshotMismatch: 'PROJECT_BOOTSTRAP_ARTIFACT_SNAPSHOT_MISMATCH',
});

class ProjectBootstrapArtifactError extends Error {
  constructor(code) {
    super('Bootstrap artifact verification failed');
    this.name = 'ProjectBootstrapArtifactError';
    this.code = code;
  }
}

class ProjectBootstrapArtifactService {
  constructor({
    projectCanonicalArtifactService = new ProjectCanonicalArtifactService(),
    projectContractService = new ProjectContractService(),
  } = {}) {
    this.projectCanonicalArtifactService = projectCanonicalArtifactService;
    this.projectContractService = projectContractService;
  }

  verifySynchronizedArtifact(bootstrapResponse) {
    this.requireSynchronizedOutcome(bootstrapResponse);
    this.requireValidContract(bootstrapResponse);
    const artifactPackage = bootstrapResponse.result;
    const exactFiles = this.verifyFiles(artifactPackage, bootstrapResponse.outcome);
    const metadata = this.verifyMetadata(exactFiles, artifactPackage);
    this.verifyResourceMappings(exactFiles, artifactPackage);
    this.verifySnapshotEvidence(exactFiles, artifactPackage);
    this.verifyLocalStateAndMetadata(artifactPackage, metadata);

    return this.buildVerifiedArtifact(artifactPackage, exactFiles);
  }

  requireSynchronizedOutcome(bootstrapResponse) {
    if (!SYNCHRONIZED_OUTCOMES.has(bootstrapResponse?.outcome)) {
      throwArtifactError('outcome');
    }
  }

  requireValidContract(bootstrapResponse) {
    const responseDocument = this.buildResponseDocument(bootstrapResponse);
    const validation = this.projectContractService.validateProjectApiResponse(
      BOOTSTRAP_ENDPOINT,
      responseDocument,
    );
    if (!validation.ok) throwArtifactError('contract');
  }

  buildResponseDocument(bootstrapResponse) {
    const { status, ...responseDocument } = bootstrapResponse;
    if (status !== undefined && status !== 200) throwArtifactError('contract');

    return responseDocument;
  }

  verifyFiles(artifactPackage, outcome) {
    this.requireSortedUniquePaths(artifactPackage.files, 'files');
    this.requireMetadataPresence(artifactPackage.files);
    const exactFiles = artifactPackage.files.map(file => this.verifyFile(file, artifactPackage));
    this.requireCountsAndTotals(exactFiles, artifactPackage, outcome);

    return exactFiles;
  }

  verifyFile(file, artifactPackage) {
    const content = this.encodeExactUtf8(file.content);
    this.requireFileWithinLimits(file, content, artifactPackage.manifest.limits);
    const digest = this.projectCanonicalArtifactService.computeFileDigest(content);
    if (digest !== file.digest) throwArtifactError('fileDigestMismatch');

    return { path: file.path, content, digest: file.digest };
  }

  encodeExactUtf8(content) {
    const contentBytes = Buffer.from(content, 'utf8');
    const decodedContent = new TextDecoder('utf-8', { fatal: true }).decode(contentBytes);
    if (decodedContent !== content) throwArtifactError('fileDigestMismatch');

    return contentBytes;
  }

  requireFileWithinLimits(file, content, limits) {
    const pathByteLength = Buffer.byteLength(file.path, 'utf8');
    if (pathByteLength > MAXIMUM_MANAGED_PATH_BYTES
      || content.byteLength > limits.maximumFileBytes) {
      throwArtifactError('limitExceeded');
    }
  }

  requireCountsAndTotals(exactFiles, artifactPackage, outcome) {
    const { manifest } = artifactPackage;
    const resourceFileCount = exactFiles.filter(file => file.path !== PROJECT_METADATA_PATH).length;
    if (manifest.fileCount !== exactFiles.length
      || manifest.resourceFileCount !== resourceFileCount
      || !this.doesOutcomeMatchResourceCount(outcome, resourceFileCount)) {
      throwArtifactError('countMismatch');
    }
    const totalBytes = exactFiles.reduce((total, file) => total + file.content.byteLength, 0);
    if (manifest.totalBytes !== totalBytes) throwArtifactError('byteTotalMismatch');
    if (exactFiles.length > manifest.limits.maximumFileCount
      || totalBytes > manifest.limits.maximumAggregateBytes) {
      throwArtifactError('limitExceeded');
    }
  }

  doesOutcomeMatchResourceCount(outcome, resourceFileCount) {
    return resourceFileCount === 0
      ? outcome === 'PROJECT_BOOTSTRAP_SYNCHRONIZED_NO_RESOURCES'
      : outcome === 'PROJECT_BOOTSTRAP_SYNCHRONIZED';
  }

  verifyMetadata(exactFiles, artifactPackage) {
    const metadataFile = exactFiles.find(file => file.path === PROJECT_METADATA_PATH);
    let metadata;
    try {
      metadata = JSON.parse(metadataFile.content.toString('utf8'));
    } catch {
      throwArtifactError('metadataInvalid');
    }
    this.requireValidMetadataShape(metadata, metadataFile.content);
    if (metadata.projectId !== artifactPackage.manifest.projectId
      || !isDeepStrictEqual(readTemplateIdentity(metadata.template), artifactPackage.template)) {
      throwArtifactError('metadataInvalid');
    }

    return metadata;
  }

  requireValidMetadataShape(metadata, content) {
    const hasValidFields = isPlainObjectWithExactFields(metadata, PROJECT_METADATA_FIELDS)
      && metadata.formatVersion === 1
      && metadata.managedPathContractVersion === 1
      && IDENTITY_PATTERN.test(metadata.projectId)
      && SHOP_DOMAIN_PATTERN.test(metadata.normalizedShopDomain)
      && isPlainObjectWithExactFields(metadata.template, PROJECT_METADATA_TEMPLATE_FIELDS)
      && GIT_COMMIT_PATTERN.test(metadata.template.sourceIdentity)
      && isDeepStrictEqual(readTemplateIdentity(metadata.template), PUBLIC_TEMPLATE_IDENTITY)
      && `${JSON.stringify(metadata, null, 2)}\n` === content.toString('utf8');
    if (!hasValidFields) throwArtifactError('metadataInvalid');
  }

  verifyResourceMappings(exactFiles, artifactPackage) {
    const resourceFiles = exactFiles.filter(file => file.path !== PROJECT_METADATA_PATH);
    const manifestResources = artifactPackage.manifest.resources;
    const localStateResources = artifactPackage.localState.resources;
    const bindings = artifactPackage.bindings;
    this.requireSortedUniquePaths(manifestResources, 'resources');
    this.requireSortedUniquePaths(localStateResources, 'resources');
    this.requireSortedUniquePaths(bindings, 'resources');
    if (!isDeepStrictEqual(manifestResources, localStateResources)
      || !isDeepStrictEqual(manifestResources, bindings)) {
      throwArtifactError('localStateMismatch');
    }
    if (resourceFiles.length !== manifestResources.length) {
      throwArtifactError('resourceMappingMismatch');
    }
    resourceFiles.forEach((file, index) => this.verifyResourceMapping(
      file,
      manifestResources[index],
    ));
  }

  verifyResourceMapping(file, mapping) {
    let source;
    try {
      source = this.projectCanonicalArtifactService.parseResourceSource({
        path: file.path,
        content: file.content,
      });
    } catch {
      throwArtifactError('resourceMappingMismatch');
    }
    if (mapping.path !== file.path
      || mapping.resourceType !== source.resourceType
      || mapping.handle !== source.handle) {
      throwArtifactError('resourceMappingMismatch');
    }
  }

  verifySnapshotEvidence(exactFiles, artifactPackage) {
    const digestFiles = exactFiles.map(file => ({
      path: file.path,
      content: file.content.toString('utf8'),
    }));
    const recomputedDigest = this.projectCanonicalArtifactService
      .computeResourceSnapshotDigest(digestFiles);
    if (recomputedDigest !== artifactPackage.manifest.snapshotDigest
      || recomputedDigest !== artifactPackage.localState.baseline.snapshotDigest
      || recomputedDigest !== artifactPackage.snapshotDigest) {
      throwArtifactError('snapshotMismatch');
    }
  }

  verifyLocalStateAndMetadata(artifactPackage, metadata) {
    const { manifest, localState, projectIdentity, template } = artifactPackage;
    const stateMatchesManifest = localState.projectId === manifest.projectId
      && localState.baseline.liveRevision === manifest.liveRevision
      && artifactPackage.liveRevision === manifest.liveRevision
      && projectIdentity.projectId === manifest.projectId;
    if (!stateMatchesManifest) throwArtifactError('localStateMismatch');
    if (metadata.projectId !== localState.projectId
      || !isDeepStrictEqual(readTemplateIdentity(metadata.template), template)) {
      throwArtifactError('metadataInvalid');
    }
  }

  requireSortedUniquePaths(values, collectionName) {
    for (let index = 1; index < values.length; index += 1) {
      if (values[index - 1].path === values[index].path) throwArtifactError('pathDuplicate');
      if (values[index - 1].path > values[index].path) {
        throwArtifactError(collectionName === 'files' ? 'pathOrdering' : 'resourceMappingMismatch');
      }
    }
  }

  requireMetadataPresence(files) {
    const metadataFiles = files.filter(file => file.path === PROJECT_METADATA_PATH);
    if (metadataFiles.length !== 1) throwArtifactError('metadataMissing');
  }

  buildVerifiedArtifact(artifactPackage, exactFiles) {
    return {
      files: exactFiles.map(file => ({ ...file, content: Buffer.from(file.content) })),
      localState: {
        localStateVersion: artifactPackage.localState.localStateVersion,
        projectIdentity: structuredClone(artifactPackage.projectIdentity),
        baseline: {
          liveRevision: artifactPackage.liveRevision,
          snapshotDigest: artifactPackage.snapshotDigest,
        },
        resources: structuredClone(artifactPackage.bindings),
      },
      manifest: structuredClone(artifactPackage.manifest),
      skippedResources: structuredClone(artifactPackage.skippedResources),
      template: structuredClone(artifactPackage.template),
    };
  }
}

function isPlainObjectWithExactFields(value, expectedFields) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const valueFields = Object.keys(value);

  return valueFields.length === expectedFields.size
    && valueFields.every(field => expectedFields.has(field));
}

function readTemplateIdentity(template) {
  return {
    owner: template?.owner,
    repository: template?.repository,
    ref: template?.ref,
  };
}

function throwArtifactError(errorName) {
  throw new ProjectBootstrapArtifactError(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES[errorName]);
}

export {
  PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES,
  PUBLIC_TEMPLATE_IDENTITY,
  ProjectBootstrapArtifactError,
  ProjectBootstrapArtifactService,
};
