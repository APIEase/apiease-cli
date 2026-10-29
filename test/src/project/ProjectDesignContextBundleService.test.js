import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

async function fixture(context) {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-context-bundle-test-'));
  context.after(() => fs.rm(parent, { recursive: true, force: true }));
  const { ProjectDesignContextBundleService } = await import('../../../src/project/ProjectDesignContextBundleService.js');
  const designContext = {
    ok: true, outcome: 'PROJECT_DESIGN_CONTEXT_READY',
    protocol: {
      protocolVersion: '1.0.0', commonInstructions: 'Exact protocol.\n'.repeat(10_000),
      commonInstructionDigest: 'sha256:verified-by-client', codexEnvelope: 'Edit canonical files.\n',
    },
    serverBaseline: { liveRevision: 7, snapshotDigest: 'server-digest' },
    localBaseline: { liveRevision: 7, snapshotDigest: 'server-digest' },
    inventory: [{ path: 'resources/requests/example.json', handle: 'example', resourceType: 'request' }],
    canonicalBodies: [{ source: { handle: 'example', description: 'Exact server source.' } }],
    bindings: [], localEdits: { hasManagedEdits: true, creates: [{ handle: 'new-request' }], updates: [] },
    deletions: [], secureSelectors: [], conflicts: [], diagnostics: [], limits: {},
    workflowGuidance: ['Validate before apply.'],
  };
  return { parent, designContext, service: new ProjectDesignContextBundleService() };
}

describe('ProjectDesignContextBundleService', () => {
  describe('writeBundle', () => {
    it('should publish exact context and instruction bytes with a compact verifiable file index', async context => {
      const { parent, service, designContext } = await fixture(context);
      const summary = await service.writeBundle({ designContext, outputDirectoryPath: path.join(parent, 'run-1') });

      assert.deepEqual(JSON.parse(await fs.readFile(summary.files.context.path, 'utf8')), designContext);
      assert.equal(await fs.readFile(summary.files.instructions.path, 'utf8'), designContext.protocol.commonInstructions);
      assert.equal(await fs.readFile(summary.files.codexEnvelope.path, 'utf8'), designContext.protocol.codexEnvelope);
      assert.deepEqual(JSON.parse(await fs.readFile(summary.files.inventory.path)), designContext.inventory);
      assert.deepEqual(JSON.parse(await fs.readFile(summary.files.serverResources.path)), designContext.canonicalBodies);
      assert.deepEqual(JSON.parse(await fs.readFile(summary.files.localChanges.path)), {
        localEdits: designContext.localEdits, deletions: [], secureSelectors: [],
      });
      for (const file of Object.values(summary.files)) {
        const bytes = await fs.readFile(file.path);
        assert.equal(file.bytes, bytes.length);
        assert.equal(file.digest, `sha256:${createHash('sha256').update(bytes).digest('hex')}`);
        assert.equal((await fs.stat(file.path)).mode & 0o777, 0o600);
      }
      assert.equal(summary.delivery, 'files');
      assert.equal(summary.counts.resources, 1);
      assert.equal(summary.counts.creates, 1);
      assert.equal(summary.localBaseline.liveRevision, 7);
      assert.equal(Object.hasOwn(summary, 'projectRequirements'), false);
      assert.ok(JSON.stringify(summary).length < 5_000);
      assert.equal((await fs.stat(summary.directory)).mode & 0o777, 0o700);
    });

    it('should refuse an existing directory without overwriting customer files', async context => {
      const { parent, service, designContext } = await fixture(context);
      const destination = path.join(parent, 'existing');
      await fs.mkdir(destination);
      await fs.writeFile(path.join(destination, 'instructions.md'), 'Customer instructions');

      await assert.rejects(service.writeBundle({ designContext, outputDirectoryPath: destination }),
        { code: 'PROJECT_DESIGN_BUNDLE_DESTINATION_EXISTS', failureType: 'local-integrity' });
      assert.equal(await fs.readFile(path.join(destination, 'instructions.md'), 'utf8'), 'Customer instructions');
    });

    it('should refuse a symlink destination without touching its target', async context => {
      const { parent, service, designContext } = await fixture(context);
      const destination = path.join(parent, 'link');
      await fs.symlink(parent, destination);
      await assert.rejects(service.writeBundle({ designContext, outputDirectoryPath: destination }),
        { code: 'PROJECT_DESIGN_BUNDLE_DESTINATION_EXISTS' });
      assert.deepEqual(await fs.readdir(parent), ['link']);
    });

    for (const invalidContext of [{ ok: false }, { ok: true, conflicts: [{ code: 'BASELINE_CONFLICT' }] }]) {
      it(`should not write unsuccessful or conflicting context: ${JSON.stringify(invalidContext)}`, async context => {
        const { parent, service } = await fixture(context);
        await assert.rejects(service.writeBundle({ designContext: invalidContext, outputDirectoryPath: path.join(parent, 'run') }),
          { code: 'PROJECT_DESIGN_BUNDLE_CONTEXT_INVALID' });
        assert.deepEqual(await fs.readdir(parent), []);
      });
    }

    it('should report a safe write failure without leaking filesystem paths', async context => {
      const { parent, service, designContext } = await fixture(context);
      await assert.rejects(service.writeBundle({ designContext, outputDirectoryPath: path.join(parent, 'missing', 'run') }),
        error => error.code === 'PROJECT_DESIGN_BUNDLE_WRITE_FAILED' && !error.message.includes(parent));
    });

    it('should remove only its new incomplete bundle when a file write fails', async context => {
      const { parent, designContext } = await fixture(context);
      const { ProjectDesignContextBundleService } = await import('../../../src/project/ProjectDesignContextBundleService.js');
      const directory = path.join(parent, 'partial');
      let writes = 0;
      const service = new ProjectDesignContextBundleService({ fileSystem: {
        ...fs,
        writeFile: async (...argumentsList) => {
          writes += 1;
          if (writes === 2) throw new Error('private disk detail');
          return await fs.writeFile(...argumentsList);
        },
      } });
      await fs.writeFile(path.join(parent, 'keep.txt'), 'Keep');
      await assert.rejects(service.writeBundle({ designContext, outputDirectoryPath: directory }),
        { code: 'PROJECT_DESIGN_BUNDLE_WRITE_FAILED' });
      assert.deepEqual(await fs.readdir(parent), ['keep.txt']);
    });
  });
});
