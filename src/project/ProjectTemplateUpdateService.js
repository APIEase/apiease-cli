import fs from 'node:fs/promises';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {ProjectMetadataFileService} from './ProjectMetadataFileService.js';
import {TemplateProjectSourceResolver} from '../template/TemplateProjectSourceResolver.js';
import {TemplateProjectSourceMaterializer} from '../template/TemplateProjectSourceMaterializer.js';
import {TemplateProjectVersionResolver} from '../template/TemplateProjectVersionResolver.js';
import {TemplateProjectManifestBuilder} from '../template/TemplateProjectManifestBuilder.js';

export const TEMPLATE_UPDATE_CHECK_TIMEOUT_MS = 1500;

class ProjectTemplateUpdateService {
  constructor({
    projectMetadataFileService = new ProjectMetadataFileService(),
    templateProjectSourceResolver = new TemplateProjectSourceResolver(),
    templateProjectSourceMaterializer = new TemplateProjectSourceMaterializer({
      fetch: (url, options) => globalThis.fetch(url, {...options, signal: AbortSignal.timeout(TEMPLATE_UPDATE_CHECK_TIMEOUT_MS)}),
    }),
    templateProjectVersionResolver = new TemplateProjectVersionResolver(),
    templateProjectManifestBuilder = new TemplateProjectManifestBuilder(),
  } = {}) {
    this.projectMetadataFileService = projectMetadataFileService;
    this.templateProjectSourceResolver = templateProjectSourceResolver;
    this.templateProjectSourceMaterializer = templateProjectSourceMaterializer;
    this.templateProjectVersionResolver = templateProjectVersionResolver;
    this.templateProjectManifestBuilder = templateProjectManifestBuilder;
  }

  async checkForUpdate(projectDirectoryPath) {
    try {
      const root = await this.findInitializedProject(projectDirectoryPath);
      if (!root) return {status: 'not-initialized'};
      const metadata = await this.projectMetadataFileService.readProjectMetadata(root);
      if (!metadata.ok || !metadata.projectMetadata.template?.version) return {status: 'unavailable'};
      const installed = metadata.projectMetadata.template;
      const source = this.templateProjectSourceResolver.resolveTemplateSource();
      return await this.compareTemplate(source, installed);
    } catch { return {status: 'unavailable'}; }
  }

  async compareTemplate(source, installed) {
    if (installed.pendingPaths?.length) return {status: 'available'};
    if (!source.templateDirectoryPath) {
      const latest = await this.templateProjectSourceMaterializer.fetchCommitHashFromPublicFeed(source);
      return {status: latest === installed.version.value ? 'current' : 'available'};
    }
    const [latest, manifest] = await Promise.all([
      this.templateProjectVersionResolver.resolveTemplateVersion(source.templateDirectoryPath),
      this.templateProjectManifestBuilder.buildTemplateManifest(source.templateDirectoryPath),
    ]);
    return {status: latest.value === installed.version.value && isDeepStrictEqual(manifest, installed.manifest)
      ? 'current' : 'available'};
  }

  async findInitializedProject(directoryPath) {
    let directory = path.resolve(directoryPath);
    while (true) {
      try { await fs.access(path.join(directory, '.apiease/project.json')); return directory; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const parent = path.dirname(directory);
      if (parent === directory) return null;
      directory = parent;
    }
  }
}

export {ProjectTemplateUpdateService};
