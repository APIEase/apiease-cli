import fs from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const PROJECT_METADATA_NOT_FOUND_ERROR_CODE = 'APIEASE_PROJECT_METADATA_NOT_FOUND';
const PROJECT_METADATA_INVALID_ERROR_CODE = 'APIEASE_PROJECT_METADATA_INVALID';

class ProjectMetadataFileService {
  async writeProjectMetadata({ projectDirectoryPath, projectMetadata }) {
    const projectMetadataFilePath = await this.resolveTemplateMetadataFilePath(projectDirectoryPath);
    await fs.mkdir(path.dirname(projectMetadataFilePath), { recursive: true });
    await fs.writeFile(projectMetadataFilePath, `${JSON.stringify(projectMetadata, null, 2)}\n`);
  }

  async readProjectMetadata(projectDirectoryPath) {
    const projectMetadataFilePath = await this.resolveTemplateMetadataFilePath(projectDirectoryPath);

    try {
      const fileContent = await fs.readFile(projectMetadataFilePath, 'utf8');
      return {
        ok: true,
        projectMetadata: JSON.parse(fileContent),
      };
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return {
          ok: false,
          errorCode: PROJECT_METADATA_NOT_FOUND_ERROR_CODE,
          message: `APIEASE project metadata not found at ${projectMetadataFilePath}. Run "apiease init" first.`,
        };
      }

      if (error instanceof SyntaxError) {
        return {
          ok: false,
          errorCode: PROJECT_METADATA_INVALID_ERROR_CODE,
          message: `APIEASE project metadata is invalid at ${projectMetadataFilePath}.`,
        };
      }

      throw error;
    }
  }

  async resolveTemplateMetadataFilePath(projectDirectoryPath) {
    const projectPath = this.buildProjectMetadataFilePath(projectDirectoryPath);
    try {
      const metadata = JSON.parse(await fs.readFile(projectPath, 'utf8'));
      return metadata?.formatVersion === 1
        ? path.join(projectDirectoryPath, '.apiease', 'template.json') : projectPath;
    } catch (error) {
      if (error.code === 'ENOENT' || error instanceof SyntaxError) return projectPath;
      throw error;
    }
  }

  isLegacyTemplateMetadata(metadata) {
    if (!hasExactFields(metadata, ['cliVersion', 'template'])
      || typeof metadata.cliVersion !== 'string'
      || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(metadata.cliVersion)) return false;
    const template = metadata.template;
    return hasExactFields(template, ['displayTemplateSource', 'manifest', 'publicRepositoryUrl', 'sourceType', 'version'])
      && typeof template.displayTemplateSource === 'string' && template.displayTemplateSource.length > 0
      && ['localDevelopment', 'publicRepository'].includes(template.sourceType)
      && /^https:\/\/github\.com\/(?:kevinstl-org|APIEase)\/apiease-template(?:\.git)?$/u.test(template.publicRepositoryUrl)
      && hasExactFields(template.version, ['type', 'value']) && template.version.type === 'gitCommit'
      && /^[a-f0-9]{40,64}$/u.test(template.version.value)
      && isValidManifest(template.manifest);
  }

  async preserveTemplateMetadata({ projectDirectoryPath, projectMetadata }) {
    const filePath = path.join(projectDirectoryPath, '.apiease', 'template.json');
    if (!this.isLegacyTemplateMetadata(projectMetadata)) throwTemplateConflict();
    try {
      await fs.writeFile(filePath, `${JSON.stringify(projectMetadata, null, 2)}\n`, { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const status = await fs.lstat(filePath);
      if (!status.isFile() || status.isSymbolicLink()) throwTemplateConflict();
      let existing;
      try { existing = JSON.parse(await fs.readFile(filePath, 'utf8')); } catch { throwTemplateConflict(); }
      if (!isDeepStrictEqual(existing, projectMetadata)) throwTemplateConflict();
    }
  }

  buildProjectMetadataFilePath(projectDirectoryPath) {
    return path.join(projectDirectoryPath, '.apiease', 'project.json');
  }
}

function hasExactFields(value, fields) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
}

function isValidManifest(manifest) {
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) return false;
  return Object.entries(manifest).every(([filePath, digest]) => (
    typeof digest === 'string' && /^[a-f0-9]{64}$/u.test(digest)
      && !filePath.includes('\\') && !filePath.includes('\0') && !path.posix.isAbsolute(filePath)
      && filePath.split('/').every(segment => segment && !['.', '..', '.git', '.apiease'].includes(segment))
  ));
}

function throwTemplateConflict() {
  throw Object.assign(new Error('Existing template metadata cannot be replaced'), {
    code: 'PROJECT_LEGACY_TEMPLATE_METADATA_CONFLICT', failureType: 'local-integrity',
  });
}

export { ProjectMetadataFileService };
