import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const projectMetadataFileServiceModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'project', 'ProjectMetadataFileService.js'),
).href;

describe('ProjectMetadataFileService', () => {
  describe('writeProjectMetadata', () => {
    it('should write the project metadata file under the .apiease directory', async () => {
      // Arrange
      const { ProjectMetadataFileService } = await import(projectMetadataFileServiceModuleUrl);
      const projectMetadataFileService = new ProjectMetadataFileService();
      const temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-project-metadata-write-'));
      const projectMetadata = {
        cliVersion: '0.1.0-test',
        template: {
          sourceType: 'localDevelopment',
          displayTemplateSource: '../apiease-template',
          version: {
            type: 'gitCommit',
            value: 'abc123',
          },
        },
      };

      // Act
      await projectMetadataFileService.writeProjectMetadata({
        projectDirectoryPath: temporaryDirectoryPath,
        projectMetadata,
      });

      // Assert
      assert.deepEqual(
        JSON.parse(await fs.readFile(path.join(temporaryDirectoryPath, '.apiease', 'project.json'), 'utf8')),
        projectMetadata,
      );
    });
  });

  describe('readProjectMetadata', () => {
    it('should load the stored project metadata file', async () => {
      // Arrange
      const { ProjectMetadataFileService } = await import(projectMetadataFileServiceModuleUrl);
      const projectMetadataFileService = new ProjectMetadataFileService();
      const temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-project-metadata-read-'));
      const projectMetadata = {
        cliVersion: '0.1.0-test',
      };

      await fs.mkdir(path.join(temporaryDirectoryPath, '.apiease'), { recursive: true });
      await fs.writeFile(
        path.join(temporaryDirectoryPath, '.apiease', 'project.json'),
        `${JSON.stringify(projectMetadata, null, 2)}\n`,
      );

      // Act
      const result = await projectMetadataFileService.readProjectMetadata(temporaryDirectoryPath);

      // Assert
      assert.deepEqual(result, {
        ok: true,
        projectMetadata,
      });
    });

    it('should return a structured failure when the metadata file does not exist', async () => {
      // Arrange
      const { ProjectMetadataFileService } = await import(projectMetadataFileServiceModuleUrl);
      const projectMetadataFileService = new ProjectMetadataFileService();
      const temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-project-metadata-missing-'));

      // Act
      const result = await projectMetadataFileService.readProjectMetadata(temporaryDirectoryPath);

      // Assert
      assert.deepEqual(result, {
        ok: false,
        errorCode: 'APIEASE_PROJECT_METADATA_NOT_FOUND',
        message: `APIEASE project metadata not found at ${path.join(temporaryDirectoryPath, '.apiease', 'project.json')}. Run "apiease init" first.`,
      });
    });
  });
});

describe('ProjectMetadataFileService legacy preservation', () => {
  const metadata = { cliVersion: '0.2.1', template: { displayTemplateSource: '../apiease-template',
    publicRepositoryUrl: 'https://github.com/kevinstl-org/apiease-template', sourceType: 'localDevelopment',
    version: { type: 'gitCommit', value: 'a'.repeat(40) }, manifest: { 'README.md': 'a'.repeat(64) } } };
  describe('isLegacyTemplateMetadata', () => {
    it('should recognize the metadata produced by plain init', async () => {
      const { ProjectMetadataFileService } = await import(projectMetadataFileServiceModuleUrl);
      assert.equal(new ProjectMetadataFileService().isLegacyTemplateMetadata(metadata), true);
    });
    it('should reject partial operational identities and malformed manifests', async () => {
      const { ProjectMetadataFileService } = await import(projectMetadataFileServiceModuleUrl);
      assert.equal(new ProjectMetadataFileService().isLegacyTemplateMetadata({ ...metadata, projectId: 'other' }), false);
    });
  });
  describe('preserveTemplateMetadata', () => {
    it('should preserve a legacy manifest once and refuse to replace a conflicting sidecar', async context => {
      const { ProjectMetadataFileService } = await import(projectMetadataFileServiceModuleUrl);
      const service = new ProjectMetadataFileService();
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-template-metadata-'));
      context.after(() => fs.rm(directory, { recursive: true, force: true }));
      await fs.mkdir(path.join(directory, '.apiease'));
      await service.preserveTemplateMetadata({ projectDirectoryPath: directory, projectMetadata: metadata });
      await service.preserveTemplateMetadata({ projectDirectoryPath: directory, projectMetadata: metadata });
      await assert.rejects(service.preserveTemplateMetadata({ projectDirectoryPath: directory,
        projectMetadata: { ...metadata, cliVersion: '0.2.2' } }), { code: 'PROJECT_LEGACY_TEMPLATE_METADATA_CONFLICT' });
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, '.apiease/template.json'), 'utf8')), metadata);
    });
  });
  describe('operational checkout upgrades', () => {
    it('should read and update template metadata without replacing operational metadata', async context => {
      const { ProjectMetadataFileService } = await import(projectMetadataFileServiceModuleUrl);
      const service = new ProjectMetadataFileService();
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-template-upgrade-'));
      context.after(() => fs.rm(directory, { recursive: true, force: true }));
      await fs.mkdir(path.join(directory, '.apiease'));
      const operational = '{"formatVersion":1,"projectId":"project_01"}\n';
      await fs.writeFile(path.join(directory, '.apiease/project.json'), operational);
      await service.writeProjectMetadata({ projectDirectoryPath: directory, projectMetadata: metadata });
      assert.deepEqual((await service.readProjectMetadata(directory)).projectMetadata, metadata);
      assert.equal(await fs.readFile(path.join(directory, '.apiease/project.json'), 'utf8'), operational);
    });
  });
});
