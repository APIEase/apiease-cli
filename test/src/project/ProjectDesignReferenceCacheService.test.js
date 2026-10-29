import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {ProjectDesignReferenceCacheService} from '../../../src/project/ProjectDesignReferenceCacheService.js';

const identity = {projectId: 'project-1', normalizedShopDomain: 'shop.myshopify.com'};
const hash = content => `sha256:${createHash('sha256').update(content).digest('hex')}`;
const module = (id, content) => ({id, content, digest: hash(content), bytes: Buffer.byteLength(content), required: true, when: 'Always.'});
const protocol = () => ({protocolVersion: '1.0.0', manifestIdentity: hash('manifest'), moduleSetIdentity: hash('one\n\ntwo\n'),
  modules: [module('core', 'one\n'), module('family', 'two\n')], envelope: module('envelope', 'envelope\n')});

async function fixture(context) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-reference-cache-'));
  context.after(() => fs.rm(directory, {recursive: true, force: true}));
  const service = new ProjectDesignReferenceCacheService({projectLocalStateService: {
    resolveLocalStateLocation: async () => ({localStateFilePath: path.join(directory, 'project-state-v1.json')}),
  }});
  const input = {projectDirectoryPath: directory, projectIdentity: identity, apiBaseUrl: 'https://api.example.com'};
  return {directory, service, input};
}

describe('ProjectDesignReferenceCacheService', () => {
  describe('prepare and publishProtocol', () => {
    it('reuses only digest-verified exact bytes after a fresh index', async context => {
      const {service, input} = await fixture(context);
      const cold = await service.prepare(input);
      assert.deepEqual(cold.knownModuleDigests, []);
      const saved = await service.publishProtocol({cache: cold, protocol: protocol()});
      const warm = await service.prepare(input);
      assert.equal(warm.knownModuleDigests.length, 3);
      const indexed = protocol();
      for (const entry of [...indexed.modules, indexed.envelope]) delete entry.content;
      const reused = await service.publishProtocol({cache: warm, protocol: indexed});
      assert.equal(reused.downloadedBytes, 0);
      assert.deepEqual(reused.modules, saved.modules);
      assert.equal((await fs.stat(saved.modules[0].path)).mode & 0o777, 0o600);
    });

    it('does not advertise corrupted bytes and replaces them from the current response', async context => {
      const {service, input} = await fixture(context);
      const saved = await service.publishProtocol({cache: await service.prepare(input), protocol: protocol()});
      await fs.writeFile(saved.modules[0].path, 'corrupt');
      const cache = await service.prepare(input);
      assert.equal(cache.knownModuleDigests.includes(saved.modules[0].digest), false);
      await service.publishProtocol({cache, protocol: protocol()});
      assert.equal(await fs.readFile(saved.modules[0].path, 'utf8'), 'one\n');
    });

    it('prioritizes the current module set when historical modules exceed the request limit', async context => {
      const {service, input} = await fixture(context);
      const current = protocol();
      const cache = await service.prepare(input);
      await service.publishProtocol({cache, protocol: current});
      const currentDigests = [...current.modules, current.envelope].map(entry => entry.digest);
      const firstCurrent = [...currentDigests].sort()[0];
      let added = 0;
      for (let candidate = 0; added < 128; candidate += 1) {
        const content = `historical module ${candidate}\n`, digest = hash(content);
        if (digest >= firstCurrent) continue;
        await fs.writeFile(path.join(cache.directory, `${digest.slice(7)}.md`), content);
        added += 1;
      }
      const refreshed = await service.prepare(input);
      assert.equal(refreshed.knownModuleDigests.length, 128);
      assert.equal(currentDigests.every(digest => refreshed.knownModuleDigests.includes(digest)), true);
    });

    it('does not advertise a current module whose cached bytes became corrupted', async context => {
      const {service, input} = await fixture(context);
      const cache = await service.prepare(input);
      const saved = await service.publishProtocol({cache, protocol: protocol()});
      await fs.writeFile(saved.modules[0].path, 'corrupt');
      const refreshed = await service.prepare(input);
      assert.equal(refreshed.knownModuleDigests.includes(saved.modules[0].digest), false);
    });

    it('isolates server and project identities', async context => {
      const {service, input} = await fixture(context);
      await service.publishProtocol({cache: await service.prepare(input), protocol: protocol()});
      for (const other of [{...input, apiBaseUrl: 'https://other.example.com'}, {...input, projectIdentity: {...identity, projectId: 'other'}}]) {
        assert.deepEqual((await service.prepare(other)).knownModuleDigests, []);
      }
    });

    for (const change of ['content', 'set', 'missing', 'duplicate']) {
      it(`rejects ${change} integrity failure before publishing files`, async context => {
        const {service, input} = await fixture(context);
        const cache = await service.prepare(input), value = protocol();
        if (change === 'content') value.modules[0].content += 'tampered';
        if (change === 'set') value.moduleSetIdentity = hash('wrong');
        if (change === 'missing') delete value.modules[0].content;
        if (change === 'duplicate') value.modules[1].id = value.modules[0].id;
        await assert.rejects(service.publishProtocol({cache, protocol: value}), {code: 'PROJECT_DESIGN_REFERENCE_INTEGRITY_INVALID'});
        await assert.rejects(fs.stat(cache.directory), {code: 'ENOENT'});
      });
    }

    it('rejects a symlink cache entry without reading or replacing its target', async context => {
      const {service, input, directory} = await fixture(context);
      const saved = await service.publishProtocol({cache: await service.prepare(input), protocol: protocol()});
      const target = path.join(directory, 'customer.txt'); await fs.writeFile(target, 'customer');
      await fs.unlink(saved.modules[0].path); await fs.symlink(target, saved.modules[0].path);
      await assert.rejects(service.prepare(input), {code: 'PROJECT_DESIGN_REFERENCE_PATH_INVALID'});
      assert.equal(await fs.readFile(target, 'utf8'), 'customer');
    });
  });
});
