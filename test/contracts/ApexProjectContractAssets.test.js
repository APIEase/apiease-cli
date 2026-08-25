import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..');
const contractDirectoryPath = path.join(projectDirectoryPath, 'contracts', 'apex-projects', 'v1');

const expectedSourceCommit = '0f2b9e1b2a594e33820199d0891df7e81688161c';
const expectedFileHashes = {
  'apiease-project-contract.schema.json': 'bf5abf2a081409e2cde075a8274f4749c1a0a0f1e9ee6769a2dbe65cc783a72c',
  'fixtures/unified-project-contracts.json': 'c0fb82b203b926bae7095902b78d7ef4db88c35f7eb5edd02300f07e17cc9fbc',
};

describe('Apex Project contract assets', () => {
  describe('provenance', () => {
    it('should identify the authoritative APIEase commit and exact hashes of every vendored asset', async () => {
      // Arrange
      const provenanceManifest = await readJson('provenance.json');

      // Act
      const vendoredFileHashes = await hashVendoredFiles(Object.keys(expectedFileHashes));

      // Assert
      assert.deepEqual(provenanceManifest, {
        provenanceVersion: 1,
        sourceRepository: 'https://github.com/APIEase/apiease.git',
        sourceCommit: expectedSourceCommit,
        sourceDirectory: 'contracts/apex-projects/v1',
        files: expectedFileHashes,
      });
      assert.deepEqual(vendoredFileHashes, expectedFileHashes);
    });
  });

  describe('runtime schema engine', () => {
    it('should keep the transitional Project API schema behind a compatibility adapter', async () => {
      // Arrange
      const contractSchema = await readJson('project-api-compatibility.schema.json');
      const ajv = new Ajv2020({ strict: true });
      ajv.addSchema(contractSchema);
      const validateCanonicalVariable = ajv.compile({
        $ref: `${contractSchema.$id}#/$defs/canonicalVariableSource`,
      });

      // Act
      const isValid = validateCanonicalVariable({
        contractVersion: 1,
        formatVersion: 1,
        resourceType: 'variable',
        handle: 'api-origin',
        name: 'API Origin',
        sensitive: false,
        value: 'https://example.invalid',
      });

      // Assert
      assert.equal(isValid, true);
    });

    it('should reject incompatible unknown fields without coercing the canonical source', async () => {
      // Arrange
      const contractSchema = await readJson('project-api-compatibility.schema.json');
      const ajv = new Ajv2020({ strict: true });
      ajv.addSchema(contractSchema);
      const validateCanonicalVariable = ajv.getSchema(
        `${contractSchema.$id}#/$defs/canonicalVariableSource`,
      );
      const canonicalVariable = {
        contractVersion: 1,
        formatVersion: 1,
        resourceType: 'variable',
        handle: 'api-origin',
        name: 'API Origin',
        sensitive: false,
        value: 'https://example.invalid',
        protectedValue: 'must-not-be-accepted',
      };

      // Act
      const isValid = validateCanonicalVariable(canonicalVariable);

      // Assert
      assert.equal(isValid, false);
      assert.equal('protectedValue' in canonicalVariable, true);
    });

    it('should keep retired worker and candidate vocabulary out of the authoritative contract', async () => {
      // Arrange
      const contractSchema = await readJson('apiease-project-contract.schema.json');

      // Act
      const serializedContract = JSON.stringify(contractSchema);

      // Assert
      assert.doesNotMatch(serializedContract, /candidate|workerCapability|checkpoint|branchName/u);
    });
  });
});

async function readJson(relativePath) {
  const fileContent = await fs.readFile(path.join(contractDirectoryPath, relativePath), 'utf8');

  return JSON.parse(fileContent);
}

async function hashVendoredFiles(relativePaths) {
  const fileHashes = await Promise.all(relativePaths.map(async (relativePath) => {
    const fileContent = await fs.readFile(path.join(contractDirectoryPath, relativePath));
    const fileHash = createHash('sha256').update(fileContent).digest('hex');

    return [relativePath, fileHash];
  }));

  return Object.fromEntries(fileHashes);
}
