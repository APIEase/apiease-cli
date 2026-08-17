import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROJECT_CANONICAL_ARTIFACT_ERROR_CODES,
  ProjectCanonicalArtifactService,
} from '../../../src/project/ProjectCanonicalArtifactService.js';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const bootstrapFixturePath = path.join(
  projectDirectoryPath,
  'contracts',
  'apex-projects',
  'v1',
  'fixtures',
  'bootstrap-synchronized.json',
);

describe('ProjectCanonicalArtifactService', () => {
  describe('serializeCanonicalValue', () => {
    it('should serialize equivalent nested objects to byte-identical canonical JSON', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
      const firstValue = { resource: { name: 'Cart', handle: 'cart' }, revision: 4 };
      const secondValue = { revision: 4, resource: { handle: 'cart', name: 'Cart' } };

      // Act
      const firstContent = projectCanonicalArtifactService.serializeCanonicalValue(firstValue);
      const secondContent = projectCanonicalArtifactService.serializeCanonicalValue(secondValue);

      // Assert
      assert.equal(firstContent, secondContent);
    });

    it('should preserve ordinary array order in canonical digest values', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();

      // Act
      const firstContent = projectCanonicalArtifactService.serializeCanonicalValue({ files: ['a', 'b'] });
      const secondContent = projectCanonicalArtifactService.serializeCanonicalValue({ files: ['b', 'a'] });

      // Assert
      assert.notEqual(firstContent, secondContent);
    });

    it('should reject values that JSON would encode lossily', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();

      // Act and assert
      assert.throws(
        () => projectCanonicalArtifactService.serializeCanonicalValue({ value: undefined }),
        /Canonical resource values must be lossless JSON data/u,
      );
    });

    it('should reject raw sensitive values from canonical digest input', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();

      // Act and assert
      assert.throws(
        () => projectCanonicalArtifactService.serializeCanonicalValue({
          sensitive: true,
          value: 'masked-or-raw-value',
        }),
        /Plaintext sensitive values cannot be canonically digested/u,
      );
    });
  });

  describe('serializeResourceSource', () => {
    it('should deterministically sort request parameters and triggers by canonical JSON value', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
      const resource = buildRequestResource();
      resource.parameters.reverse();
      resource.triggers.reverse();

      // Act
      const content = projectCanonicalArtifactService.serializeResourceSource({
        resourceType: 'request',
        resource,
      });
      const source = JSON.parse(content);

      // Assert
      assert.deepEqual(source.parameters.map(parameter => parameter.name), ['Authorization', 'limit']);
      assert.deepEqual(source.triggers.map(trigger => trigger.type), ['cron', 'webhook']);
    });

    it('should replace protected values without reading or serializing operational fields', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
      const resource = buildRequestResource();
      resource.resourceVersion = 'rv1_operational';
      Object.defineProperty(resource.parameters[0], 'value', {
        enumerable: true,
        get: () => { throw new Error('must not read protected source'); },
      });

      // Act
      const content = projectCanonicalArtifactService.serializeResourceSource({
        resourceType: 'request',
        resource,
      });

      // Assert
      assert.deepEqual(JSON.parse(content).parameters[0].value, { mode: 'preserve' });
      assert.equal(content.includes('resourceVersion'), false);
    });

    it('should produce byte-identical source from equivalent family-array input order', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
      const firstResource = buildRequestResource();
      const secondResource = buildRequestResource();
      secondResource.parameters.reverse();
      secondResource.triggers.reverse();

      // Act
      const firstContent = projectCanonicalArtifactService.serializeResourceSource({
        resourceType: 'request',
        resource: firstResource,
      });
      const secondContent = projectCanonicalArtifactService.serializeResourceSource({
        resourceType: 'request',
        resource: secondResource,
      });

      // Assert
      assert.equal(firstContent, secondContent);
    });
  });

  describe('parseResourceSource', () => {
    it('should parse canonical resource bytes without altering the supplied buffer', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
      const content = projectCanonicalArtifactService.serializeResourceSource({
        resourceType: 'request',
        resource: buildRequestResource(),
      });
      const contentBuffer = Buffer.from(content, 'utf8');
      const originalBytes = Buffer.from(contentBuffer);

      // Act
      const source = projectCanonicalArtifactService.parseResourceSource({
        path: 'resources/requests/fetch-products.json',
        content: contentBuffer,
      });

      // Assert
      assert.equal(source.handle, 'fetch-products');
      assert.deepEqual(contentBuffer, originalBytes);
    });

    it('should reject invalid UTF-8, BOMs, CRLF, NUL bytes, and invalid final newlines', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
      const canonicalContent = projectCanonicalArtifactService.serializeResourceSource({
        resourceType: 'request',
        resource: buildRequestResource(),
      });
      const invalidContents = [
        Buffer.from([0xc3, 0x28, 0x0a]),
        `\uFEFF${canonicalContent}`,
        canonicalContent.replace(/\n/gu, '\r\n'),
        canonicalContent.replace('Fetch', 'Fetch\0'),
        canonicalContent.trimEnd(),
        `${canonicalContent}\n`,
      ];

      // Act and assert
      invalidContents.forEach(content => assert.throws(() => (
        projectCanonicalArtifactService.parseResourceSource({
          path: 'resources/requests/fetch-products.json',
          content,
        })
      )));
    });

    it('should reject noncanonical family-array ordering', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
      const canonicalContent = projectCanonicalArtifactService.serializeResourceSource({
        resourceType: 'request',
        resource: buildRequestResource(),
      });
      const source = JSON.parse(canonicalContent);
      source.parameters.reverse();

      // Act and assert
      assert.throws(
        () => projectCanonicalArtifactService.parseResourceSource({
          path: 'resources/requests/fetch-products.json',
          content: `${projectCanonicalArtifactService.serializeCanonicalValue(source)}\n`,
        }),
        error => error.code === PROJECT_CANONICAL_ARTIFACT_ERROR_CODES.nonCanonicalContent,
      );
    });

    it('should reject unsafe paths and path, type, or handle mismatches', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
      const canonicalContent = projectCanonicalArtifactService.serializeResourceSource({
        resourceType: 'request',
        resource: buildRequestResource(),
      });
      const invalidPaths = [
        '../resources/requests/fetch-products.json',
        'resources/requests/nested/fetch-products.json',
        'resources/widgets/fetch-products.json',
        'resources/requests/other-handle.json',
      ];

      // Act and assert
      invalidPaths.forEach(resourcePath => assert.throws(() => (
        projectCanonicalArtifactService.parseResourceSource({
          path: resourcePath,
          content: canonicalContent,
        })
      )));
    });

    it('should reject unsupported operational fields and raw or modified protected values', () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
      const canonicalContent = projectCanonicalArtifactService.serializeResourceSource({
        resourceType: 'request',
        resource: buildRequestResource(),
      });
      const sourceWithOperationalField = JSON.parse(canonicalContent);
      sourceWithOperationalField.resourceVersion = 'rv1_operational';
      const sourceWithRawProtectedValue = JSON.parse(canonicalContent);
      sourceWithRawProtectedValue.parameters[0].value = '********';
      const sourceWithModifiedPlaceholder = JSON.parse(canonicalContent);
      sourceWithModifiedPlaceholder.parameters[0].value = {
        mode: 'preserve',
        ciphertext: 'forbidden',
      };

      // Act and assert
      [sourceWithOperationalField, sourceWithRawProtectedValue, sourceWithModifiedPlaceholder]
        .forEach(source => assert.throws(() => (
          projectCanonicalArtifactService.parseResourceSource({
            path: 'resources/requests/fetch-products.json',
            content: `${JSON.stringify(source)}\n`,
          })
        )));
    });
  });

  describe('digests', () => {
    it('should recompute every bootstrap file and aggregate snapshot digest exactly', async () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
      const fixtureBundle = JSON.parse(await fs.readFile(bootstrapFixturePath, 'utf8'));
      const synchronizedFixtures = fixtureBundle.fixtures.filter(fixture => fixture.fileByteLengths);

      // Act
      const verificationResults = synchronizedFixtures.map(fixture => {
        const files = fixture.document.result.files;

        return {
          fileDigestsMatch: files.every(file => (
            projectCanonicalArtifactService.computeFileDigest(file.content) === file.digest
          )),
          snapshotDigest: projectCanonicalArtifactService.computeResourceSnapshotDigest(files),
          expectedSnapshotDigest: fixture.document.result.manifest.snapshotDigest,
        };
      });

      // Assert
      assert.equal(verificationResults.every(result => result.fileDigestsMatch), true);
      assert.equal(verificationResults.every(result => (
        result.snapshotDigest === result.expectedSnapshotDigest
      )), true);
    });

    it('should change exact file and snapshot digests after content or ordering tampering', async () => {
      // Arrange
      const projectCanonicalArtifactService = new ProjectCanonicalArtifactService();
      const fixtureBundle = JSON.parse(await fs.readFile(bootstrapFixturePath, 'utf8'));
      const fixture = fixtureBundle.fixtures.find(({ name }) => name === 'bootstrap-synchronized');
      const files = fixture.document.result.files;
      const tamperedContent = `${files[0].content} `;

      // Act
      const tamperedFileDigest = projectCanonicalArtifactService.computeFileDigest(tamperedContent);
      const reversedSnapshotDigest = projectCanonicalArtifactService.computeResourceSnapshotDigest(
        [...files].reverse(),
      );

      // Assert
      assert.notEqual(tamperedFileDigest, files[0].digest);
      assert.notEqual(reversedSnapshotDigest, fixture.document.result.manifest.snapshotDigest);
    });
  });
});

function buildRequestResource() {
  return {
    address: 'https://example.com/products',
    handle: 'fetch-products',
    method: 'GET',
    name: 'Fetch products',
    parameters: [
      { name: 'Authorization', sensitive: true, type: 'header' },
      { name: 'limit', sensitive: false, type: 'query', value: '10' },
    ],
    triggers: [
      { cron: { value: '0 * * * *' }, type: 'cron' },
      { type: 'webhook', webhook: { event: 'orders/create' } },
    ],
    type: 'http',
  };
}
