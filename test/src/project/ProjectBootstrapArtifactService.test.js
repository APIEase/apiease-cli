import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES,
  ProjectBootstrapArtifactService,
} from '../../../src/project/ProjectBootstrapArtifactService.js';
import {
  ProjectCanonicalArtifactService,
} from '../../../src/project/ProjectCanonicalArtifactService.js';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const bootstrapFixturePath = path.resolve(
  currentDirectoryPath,
  '..',
  '..',
  '..',
  'contracts',
  'apex-projects',
  'v1',
  'fixtures',
  'bootstrap-synchronized.json',
);

describe('ProjectBootstrapArtifactService', () => {
  describe('verifySynchronizedArtifact', () => {
    it('should verify both synchronized fixtures and return exact bytes with validated state', async () => {
      // Arrange
      const projectBootstrapArtifactService = new ProjectBootstrapArtifactService();
      const synchronizedFixtures = await readSynchronizedFixtures();

      // Act
      const verifiedArtifacts = synchronizedFixtures.map(({ document }) => (
        projectBootstrapArtifactService.verifySynchronizedArtifact(document)
      ));

      // Assert
      verifiedArtifacts.forEach((verifiedArtifact, fixtureIndex) => {
        const expectedResult = synchronizedFixtures[fixtureIndex].document.result;
        assert.deepEqual(
          verifiedArtifact.files.map(file => file.content),
          expectedResult.files.map(file => Buffer.from(file.content, 'utf8')),
        );
        assert.deepEqual(verifiedArtifact.localState, expectedResult.localState);
        assert.deepEqual(verifiedArtifact.skippedResources, expectedResult.skippedResources);
      });
    });

    it('should preserve validated skipped-resource diagnostics', async () => {
      // Arrange
      const projectBootstrapArtifactService = new ProjectBootstrapArtifactService();
      const bootstrapResponse = await readBootstrapResponse();
      const skippedResource = {
        resourceType: 'request',
        resourceId: 'request-broken',
        handle: 'broken-request',
        path: 'resources/requests/broken-request.json',
        diagnostics: [{
          code: 'PROJECT_RESOURCE_DEPENDENCY_MISSING',
          path: 'resources/requests/broken-request.json',
          resourceType: 'request',
          handle: 'broken-request',
        }],
      };
      bootstrapResponse.result.skippedResources = [skippedResource];

      // Act
      const verifiedArtifact = projectBootstrapArtifactService
        .verifySynchronizedArtifact(bootstrapResponse);

      // Assert
      assert.deepEqual(verifiedArtifact.skippedResources, [skippedResource]);
    });

    it('should reject a synchronized artifact without skipped-resource disclosure', async () => {
      // Arrange
      const projectBootstrapArtifactService = new ProjectBootstrapArtifactService();
      const bootstrapResponse = await readBootstrapResponse();
      delete bootstrapResponse.result.skippedResources;

      // Act and assert
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(bootstrapResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.contract),
      );
    });

    it('should reject unsupported versions or a different public template identity', async () => {
      // Arrange
      const projectBootstrapArtifactService = new ProjectBootstrapArtifactService();
      const bootstrapResponse = await readBootstrapResponse();
      const tamperedResponses = [
        mutateResponse(bootstrapResponse, response => { response.contractVersion = 2; }),
        mutateResponse(bootstrapResponse, response => {
          response.result.artifactEnvelopeVersion = 2;
        }),
        mutateResponse(bootstrapResponse, response => {
          response.result.template.repository = 'private-customer-project';
        }),
      ];

      // Act and assert
      tamperedResponses.forEach(response => assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(response),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.contract),
      ));
    });

    it('should reject missing, duplicate, or reordered managed paths', async () => {
      // Arrange
      const projectBootstrapArtifactService = new ProjectBootstrapArtifactService();
      const bootstrapResponse = await readBootstrapResponse();
      const missingMetadataResponse = mutateResponse(bootstrapResponse, response => {
        response.result.files.shift();
      });
      const duplicatePathResponse = mutateResponse(bootstrapResponse, response => {
        response.result.files[1].path = response.result.files[0].path;
      });
      const reorderedResponse = mutateResponse(bootstrapResponse, response => {
        response.result.files.reverse();
      });

      // Act and assert
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(missingMetadataResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.metadataMissing),
      );
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(duplicatePathResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.pathDuplicate),
      );
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(reorderedResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.pathOrdering),
      );
    });

    it('should reject mismatched counts, byte totals, and advertised limits', async () => {
      // Arrange
      const projectBootstrapArtifactService = new ProjectBootstrapArtifactService();
      const bootstrapResponse = await readBootstrapResponse();
      const countResponse = mutateResponse(bootstrapResponse, response => {
        response.result.manifest.resourceFileCount = 0;
      });
      const byteTotalResponse = mutateResponse(bootstrapResponse, response => {
        response.result.manifest.totalBytes -= 1;
      });
      const limitResponse = mutateResponse(bootstrapResponse, response => {
        response.result.manifest.limits.maximumFileBytes = 100;
      });

      // Act and assert
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(countResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.countMismatch),
      );
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(byteTotalResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.byteTotalMismatch),
      );
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(limitResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.limitExceeded),
      );
    });

    it('should reject a synchronized outcome that disagrees with the resource count', async () => {
      // Arrange
      const projectBootstrapArtifactService = new ProjectBootstrapArtifactService();
      const bootstrapResponse = await readBootstrapResponse();
      bootstrapResponse.outcome = 'PROJECT_BOOTSTRAP_SYNCHRONIZED_NO_RESOURCES';

      // Act and assert
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(bootstrapResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.countMismatch),
      );
    });

    it('should reject tampered exact bytes, file digests, or aggregate digest evidence', async () => {
      // Arrange
      const projectBootstrapArtifactService = new ProjectBootstrapArtifactService();
      const bootstrapResponse = await readBootstrapResponse();
      const bytesResponse = mutateResponse(bootstrapResponse, response => {
        response.result.files[1].content = response.result.files[1].content.replace(
          'API Origin',
          'API origin',
        );
      });
      const fileDigestResponse = mutateResponse(bootstrapResponse, response => {
        response.result.files[1].digest = response.result.files[0].digest;
      });
      const snapshotResponse = mutateResponse(bootstrapResponse, response => {
        response.result.localState.baseline.snapshotDigest = response.result.files[0].digest;
      });

      // Act and assert
      [bytesResponse, fileDigestResponse].forEach(response => assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(response),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.fileDigestMismatch),
      ));
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(snapshotResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.snapshotMismatch),
      );
    });

    it('should reject metadata and resource mapping inconsistencies', async () => {
      // Arrange
      const projectBootstrapArtifactService = new ProjectBootstrapArtifactService();
      const bootstrapResponse = await readBootstrapResponse();
      const metadataResponse = mutateResponse(bootstrapResponse, response => {
        response.result.files[0].content = response.result.files[0].content.replace(
          'project_01',
          'project_other',
        );
      });
      const mappingResponse = mutateResponse(bootstrapResponse, response => {
        response.result.manifest.resources[0].handle = 'different-handle';
        response.result.localState.resources[0].handle = 'different-handle';
      });
      const stateResponse = mutateResponse(bootstrapResponse, response => {
        response.result.localState.resources[0].resourceVersion = 'rv1_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
      });

      // Act and assert
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(metadataResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.fileDigestMismatch),
      );
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(mappingResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.resourceMappingMismatch),
      );
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(stateResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.localStateMismatch),
      );
    });

    it('should reject noncanonical metadata even when all digest evidence is recomputed', async () => {
      // Arrange
      const projectBootstrapArtifactService = new ProjectBootstrapArtifactService();
      const bootstrapResponse = await readBootstrapResponse();
      bootstrapResponse.result.files[0].content = JSON.stringify(
        JSON.parse(bootstrapResponse.result.files[0].content),
      );
      refreshArtifactEvidence(bootstrapResponse);

      // Act and assert
      assert.throws(
        () => projectBootstrapArtifactService.verifySynchronizedArtifact(bootstrapResponse),
        hasArtifactErrorCode(PROJECT_BOOTSTRAP_ARTIFACT_ERROR_CODES.metadataInvalid),
      );
    });
  });
});

async function readSynchronizedFixtures() {
  const fixtureBundle = JSON.parse(await fs.readFile(bootstrapFixturePath, 'utf8'));

  return fixtureBundle.fixtures.filter(fixture => fixture.fileByteLengths);
}

async function readBootstrapResponse() {
  const synchronizedFixtures = await readSynchronizedFixtures();

  return structuredClone(synchronizedFixtures[0].document);
}

function mutateResponse(bootstrapResponse, mutation) {
  const mutatedResponse = structuredClone(bootstrapResponse);
  mutation(mutatedResponse);

  return mutatedResponse;
}

function hasArtifactErrorCode(code) {
  return error => error.code === code;
}

function refreshArtifactEvidence(bootstrapResponse) {
  const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
  const { files, localState, manifest } = bootstrapResponse.result;
  files.forEach(file => {
    file.digest = projectCanonicalArtifactService.computeFileDigest(file.content);
  });
  manifest.totalBytes = files.reduce(
    (totalBytes, file) => totalBytes + Buffer.byteLength(file.content, 'utf8'),
    0,
  );
  manifest.snapshotDigest = projectCanonicalArtifactService.computeResourceSnapshotDigest(files);
  localState.baseline.snapshotDigest = manifest.snapshotDigest;
}
