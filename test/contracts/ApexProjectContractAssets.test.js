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

const expectedSourceCommit = '09809d63f7a68cf78810c95708f45784e37e57d6';
const expectedFileHashes = {
  'apiease-project-contract.schema.json': 'cec72c0e8ff4c3586f0c7db141ad5451b8e2b36ad628e6895adae5c39fd26faa',
  'fixtures/bootstrap-synchronized.json': 'e3fbbab878393014aea4b647e4c66449cb4fac0b30177753b8814d289b2fca94',
  'fixtures/project-failures.json': '8a9dc6db0650a1ecb42b4bc6759aaff924b23dd8ccb18ce61d76a171df30859b',
  'fixtures/project-proposal-failures.json': '8ed27188db17f38fc2e5352064f6ad982a5b8681550d559655fad6adafa4f70f',
  'fixtures/project-proposal-workflow.json': '256dd00a29706741341a0df80936be724036c6756decce0b422cba6b7dca6ff4',
  'fixtures/project-workflow-success.json': '721310bc64068e570843b5a1599b8d3b17daa01c7eb45e41364871f69fee4c29',
  'fixtures/resource-operations.json': 'f4c0d297513a421bdf90ca6e72547add369879ef8ca2f6e3a8feea01b0027627',
  'fixtures/unified-project-contracts.json': 'e2532b0e446395a2abf8624d6e0d3135ae9eece75c8845421a101cb2a930fc03',
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
    it('should compile the authoritative JSON Schema 2020-12 bundle and accept canonical source', async () => {
      // Arrange
      const contractSchema = await readJson('apiease-project-contract.schema.json');
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
      const contractSchema = await readJson('apiease-project-contract.schema.json');
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
