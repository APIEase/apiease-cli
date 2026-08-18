import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..');

describe('package manifest', () => {
  describe('metadata', () => {
    it('should use the approved unified Project CLI release version', async () => {
      // Arrange
      const packageJson = await readPackageJson();
      const packageLockJson = await readPackageLockJson();

      // Assert
      assert.equal(packageJson.version, '0.2.0');
      assert.equal(packageLockJson.version, '0.2.0');
      assert.equal(packageLockJson.packages[''].version, '0.2.0');
    });

    it('should configure the apiease package as an ES module', async () => {
      // Arrange
      const packageJson = await readPackageJson();

      // Assert
      assert.equal(packageJson.name, 'apiease');
      assert.notEqual(packageJson.name, 'apiease-cli');
      assert.equal(packageJson.type, 'module');
    });

    it('should link the published npm package back to the GitHub repository', async () => {
      // Arrange
      const packageJson = await readPackageJson();

      // Assert
      assert.deepEqual(packageJson.repository, {
        type: 'git',
        url: 'git+https://github.com/kevinstl-org/apiease-cli.git',
      });
      assert.equal(packageJson.homepage, 'https://apiease.com');
      assert.deepEqual(packageJson.bugs, {
        url: 'https://github.com/kevinstl-org/apiease-cli/issues',
      });
    });
  });

  describe('exports', () => {
    it('should expose the canonical create-request client from the package root', async () => {
      // Arrange
      const packageRootUrl = pathToFileURL(path.join(projectDirectoryPath, 'src', 'index.js')).href;

      // Act
      const packageRootModule = await import(packageRootUrl);

      // Assert
      assert.equal(typeof packageRootModule.ApiEaseCreateRequestClient, 'function');
    });

    it('should expose the canonical read-request client from the package root', async () => {
      // Arrange
      const packageRootUrl = pathToFileURL(path.join(projectDirectoryPath, 'src', 'index.js')).href;

      // Act
      const packageRootModule = await import(packageRootUrl);

      // Assert
      assert.equal(typeof packageRootModule.ApiEaseReadRequestClient, 'function');
    });

    it('should expose the canonical update-request client from the package root', async () => {
      // Arrange
      const packageRootUrl = pathToFileURL(path.join(projectDirectoryPath, 'src', 'index.js')).href;

      // Act
      const packageRootModule = await import(packageRootUrl);

      // Assert
      assert.equal(typeof packageRootModule.ApiEaseUpdateRequestClient, 'function');
    });

    it('should expose only the intentional Project API client and authentication abstractions', async () => {
      // Arrange
      const packageRootUrl = pathToFileURL(path.join(projectDirectoryPath, 'src', 'index.js')).href;

      // Act
      const packageRootModule = await import(packageRootUrl);

      // Assert
      assert.deepEqual(Object.keys(packageRootModule).sort(), [
        'ApiEaseCreateRequestClient',
        'ApiEaseProjectApiClient',
        'ApiEaseReadRequestClient',
        'ApiEaseUpdateRequestClient',
        'PersonalProjectAuthenticationAdapter',
        'ProjectAuthenticationAdapter',
        'WorkerProjectAuthenticationAdapter',
      ]);
    });
  });

  describe('bin', () => {
    it('should expose the bash wrapper as the apiease public command', async () => {
      // Arrange
      const packageJson = await readPackageJson();

      // Assert
      assert.equal(packageJson.bin.apiease, './bin/apiease-cli');
    });

    it('should not advertise the legacy apiease-cli bin command', async () => {
      // Arrange
      const packageJson = await readPackageJson();

      // Assert
      assert.equal('apiease-cli' in packageJson.bin, false);
    });
  });

  describe('package layout', () => {
    it('should not keep a separate reserved apiease placeholder package', async () => {
      // Arrange
      const reservePackageJsonPath = path.join(projectDirectoryPath, 'reserve', 'apiease', 'package.json');

      // Assert
      await assert.rejects(fs.access(reservePackageJsonPath));
    });

    it('should publish the vendored Apex Project contract assets', async () => {
      // Arrange
      const packageJson = await readPackageJson();

      // Assert
      assert.equal(packageJson.files.includes('contracts'), true);
    });
  });

  describe('dependencies', () => {
    it('should install the approved Ajv runtime schema engine version', async () => {
      // Arrange
      const packageJson = await readPackageJson();

      // Assert
      assert.equal(packageJson.dependencies.ajv, '8.17.1');
      assert.equal('ajv-formats' in packageJson.dependencies, false);
    });
  });

  describe('scripts', () => {
    it('should expose the installed-package smoke workflow', async () => {
      // Arrange
      const packageJson = await readPackageJson();

      // Assert
      assert.equal(packageJson.scripts['smoke:installed'], 'node scripts/smokeInstalledPackage.js');
    });

    it('should expose the local knowledge base pull command', async () => {
      // Arrange
      const packageJson = await readPackageJson();

      // Assert
      assert.equal(
        packageJson.scripts['knowledge:pull-local'],
        'node scripts/knowledgebase/pullApiEaseDocsKnowledgeBase.js',
      );
    });
  });
});

async function readPackageJson() {
  const packageJsonPath = path.join(projectDirectoryPath, 'package.json');
  const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');

  return JSON.parse(packageJsonContent);
}

async function readPackageLockJson() {
  const packageLockJsonPath = path.join(projectDirectoryPath, 'package-lock.json');
  const packageLockJsonContent = await fs.readFile(packageLockJsonPath, 'utf8');

  return JSON.parse(packageLockJsonContent);
}
