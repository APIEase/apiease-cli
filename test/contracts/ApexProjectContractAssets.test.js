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

const expectedSourceCommit = '217b7d38180c11d77c0ca88aba0e7c02ab7a9379';
const expectedFileHashes = {
  'apiease-project-contract.schema.json': '5992c05949189214adeeacc0a9c2e82ac05587b6d49de1876bb4041ec29d9395',
  'fixtures/bootstrap-synchronized.json': 'ec82c6786caac6be8ab3c07dec98a679a49b863accf7e7e617893eee6b9675c0',
  'fixtures/project-failures.json': '8a9dc6db0650a1ecb42b4bc6759aaff924b23dd8ccb18ce61d76a171df30859b',
  'fixtures/project-workflow-success.json': 'd1ada864cec7233f40e7adfbc1308359e39a015bd10ac9944fe677591cf962d4',
  'fixtures/resource-operations.json': 'f4c0d297513a421bdf90ca6e72547add369879ef8ca2f6e3a8feea01b0027627',
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
