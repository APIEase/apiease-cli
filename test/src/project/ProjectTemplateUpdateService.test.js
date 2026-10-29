import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ProjectTemplateUpdateService} from '../../../src/project/ProjectTemplateUpdateService.js';

describe('ProjectTemplateUpdateService', () => {
  async function fixture(context) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-template-notice-'));
    context.after(() => fs.rm(directory, {recursive: true, force: true}));
    await fs.mkdir(path.join(directory, '.apiease'));
    await fs.mkdir(path.join(directory, 'resources/requests'), {recursive: true});
    await fs.writeFile(path.join(directory, '.apiease/project.json'), JSON.stringify({template: {
      version: {value: 'old'}, manifest: {'AGENTS.md': 'old-hash'},
    }}));
    return directory;
  }

  it('checks a public commit identity without materializing or modifying the template', async context => {
    const directory = await fixture(context);
    const before = await fs.readFile(path.join(directory, '.apiease/project.json'), 'utf8');
    const service = new ProjectTemplateUpdateService({
      templateProjectSourceResolver: {resolveTemplateSource: () => ({sourceType: 'publicRepository'})},
      templateProjectSourceMaterializer: {fetchCommitHashFromPublicFeed: async () => 'new'},
    });
    assert.equal((await service.checkForUpdate(path.join(directory, 'resources/requests'))).status, 'available');
    assert.equal(await fs.readFile(path.join(directory, '.apiease/project.json'), 'utf8'), before);
  });

  it('reports unavailable without claiming current when the feed fails', async context => {
    const directory = await fixture(context);
    const service = new ProjectTemplateUpdateService({
      templateProjectSourceResolver: {resolveTemplateSource: () => ({sourceType: 'publicRepository'})},
      templateProjectSourceMaterializer: {fetchCommitHashFromPublicFeed: async () => {throw Error('offline');}},
    });
    assert.deepEqual(await service.checkForUpdate(directory), {status: 'unavailable'});
  });

  it('retains an update notice for ignored files even when the available commit matches', async context => {
    const directory = await fixture(context);
    const metadataPath = path.join(directory, '.apiease/project.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath));
    metadata.template.pendingPaths = ['AGENTS.md'];
    await fs.writeFile(metadataPath, JSON.stringify(metadata));
    const service = new ProjectTemplateUpdateService({
      templateProjectSourceResolver: {resolveTemplateSource: () => ({sourceType: 'publicRepository'})},
      templateProjectSourceMaterializer: {fetchCommitHashFromPublicFeed: async () => 'old'},
    });
    assert.equal((await service.checkForUpdate(directory)).status, 'available');
  });

  it('checks local template content when git commit identities are unchanged', async context => {
    const directory = await fixture(context);
    const service = new ProjectTemplateUpdateService({
      templateProjectSourceResolver: {resolveTemplateSource: () => ({templateDirectoryPath: '/template'})},
      templateProjectVersionResolver: {resolveTemplateVersion: async () => ({value: 'old'})},
      templateProjectManifestBuilder: {buildTemplateManifest: async () => ({'AGENTS.md': 'new-hash'})},
    });
    assert.equal((await service.checkForUpdate(directory)).status, 'available');
  });

  it('does not check a template outside initialized projects', async context => {
    const directory = await fixture(context);
    await fs.unlink(path.join(directory, '.apiease/project.json'));
    const service = new ProjectTemplateUpdateService({
      templateProjectSourceResolver: {resolveTemplateSource: () => {throw Error('must not resolve');}},
    });
    assert.equal((await service.checkForUpdate(directory)).status, 'not-initialized');
  });
});
