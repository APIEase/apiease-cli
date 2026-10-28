import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { DesignContextCommand } from '../../../src/cli/DesignContextCommand.js';
import { ProjectDesignContextService } from '../../../src/project/ProjectDesignContextService.js';
import { ApiEaseProjectApiClient } from '../../../src/client/ApiEaseProjectApiClient.js';
import { PullProjectCommand } from '../../../src/cli/PullProjectCommand.js';
import { ValidateProjectCommand } from '../../../src/cli/ValidateProjectCommand.js';
import { UpgradeProjectCommand } from '../../../src/cli/UpgradeProjectCommand.js';
import { ProjectSynchronizationService } from '../../../src/project/ProjectSynchronizationService.js';
import { ProjectValidationService } from '../../../src/project/ProjectValidationService.js';
import { ProjectLocalStateService } from '../../../src/project/ProjectLocalStateService.js';
import { ProjectChangeSetBuilder } from '../../../src/project/ProjectChangeSetBuilder.js';

const executeFile = promisify(execFile);
const hash = value => createHash('sha256').update(value).digest('hex');
const legacyMetadata = {
  cliVersion: '0.2.1', template: {
    displayTemplateSource: '../apiease-template', sourceType: 'localDevelopment',
    publicRepositoryUrl: 'https://github.com/kevinstl-org/apiease-template',
    version: { type: 'gitCommit', value: 'a'.repeat(40) }, manifest: { 'README.md': hash('original\n') },
  },
};

describe('Legacy project public command workflow', () => {
  describe('design-context API boundary', () => {
    for (const requirements of [undefined, {
      projectName: 'Order status', customerRequirements: [{ id: 'status', text: 'Show order status.' }],
      confirmedDecisions: [],
    }]) {
      it(`should retrieve context with ${requirements ? 'supplied' : 'omitted'} requirements without writes`, async context => {
        const fixture = await buildFixture(context);
        assert.equal(await fixture.pull.run(['pull'], fixture.options), 0);
        const source = JSON.parse(fixture.response.result.files[1].content);
        source.name = 'Locally edited';
        await writeResource(fixture, `${JSON.stringify(source, null, 2)}\n`);
        const before = await snapshot(fixture.directory);
        const stateBefore = await fs.readFile(path.join(fixture.directory, '.git/apiease/project-state-v1.json'), 'utf8');
        const { command, requests, stdout } = buildDesignContextBoundary(fixture);
        const args = requirements === undefined ? ['design-context']
          : ['design-context', '--project-requirements', JSON.stringify(requirements)];

        assert.equal(await command.run(args, fixture.options), 0);
        const result = JSON.parse(stdout.join('')).result;
        assert.equal(Object.hasOwn(requests[0], 'projectRequirements'), requirements !== undefined);
        assert.equal(Object.hasOwn(result, 'projectRequirements'), requirements !== undefined);
        assert.deepEqual(result.projectRequirements, requirements);
        assert.equal(result.canonicalBodies[0].source.name, 'API Origin');
        assert.equal(result.localEdits.updates[0].source.name, 'Locally edited');
        assert.deepEqual(await snapshot(fixture.directory), before);
        assert.equal(await fs.readFile(path.join(fixture.directory, '.git/apiease/project-state-v1.json'), 'utf8'), stateBefore);
        assert.equal(requests.length, 1);
      });
    }

    it('should explain invalid requirements through stderr while preserving contract exit code and JSON', async context => {
      const fixture = await buildFixture(context);
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 0);
      const { command, requests, stdout, stderr } = buildDesignContextBoundary(fixture);
      const before = await snapshot(fixture.directory);

      assert.equal(await command.run(['design-context', '--project-requirements', '{"objective":"private-input"}', '--json'], fixture.options), 4);
      assert.equal(JSON.parse(stdout.join('')).error.category, 'contract');
      assert.match(stderr.join(''), /projectName.*customerRequirements.*confirmedDecisions/);
      assert.match(stderr.join(''), /apiease design-context/);
      assert.equal((stdout.join('') + stderr.join('')).includes('private-input'), false);
      assert.deepEqual(requests, []);
      assert.deepEqual(await snapshot(fixture.directory), before);
    });

    it('should retain a baseline conflict with omitted requirements without writes', async context => {
      const fixture = await buildFixture(context);
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 0);
      fixture.response.result.liveRevision += 1;
      const { command, stdout } = buildDesignContextBoundary(fixture);
      const before = await snapshot(fixture.directory);

      assert.equal(await command.run(['design-context'], fixture.options), 5);
      assert.equal(JSON.parse(stdout.join('')).error.code, 'PROJECT_DESIGN_LOCAL_BASELINE_CONFLICT');
      assert.deepEqual(await snapshot(fixture.directory), before);
    });

    it('should retain missing initialization with omitted requirements before network access', async context => {
      const fixture = await buildFixture(context);
      const { command, requests, stdout } = buildDesignContextBoundary(fixture);
      const before = await snapshot(fixture.directory);

      assert.equal(await command.run(['design-context'], fixture.options), 6);
      assert.equal(JSON.parse(stdout.join('')).error.category, 'local-integrity');
      assert.deepEqual(requests, []);
      assert.deepEqual(await snapshot(fixture.directory), before);
    });
  });

  describe('pull and validate', () => {
    it('should explain recovery before initialization without writing files or calling validation', async context => {
      // Arrange
      const fixture = await buildFixture(context);
      const before = await snapshot(fixture.directory);
      // Act
      const code = await fixture.validate.run(['validate'], fixture.options);
      // Assert
      assert.equal(code, 6);
      assert.equal(fixture.stderr.join(''), 'validate: failure (PROJECT_CHECKOUT_INITIALIZATION_REQUIRED)\nRun "apiease pull" to initialize this legacy template checkout before validation.\n');
      assert.deepEqual(fixture.calls, []);
      assert.deepEqual(await snapshot(fixture.directory), before);
    });

    it('should recover in place, validate without writes, and pull again without content changes', async context => {
      // Arrange
      const fixture = await buildFixture(context);
      const head = (await executeFile('git', ['rev-parse', 'HEAD'], { cwd: fixture.directory })).stdout;
      // Act
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 0, fixture.stderr.join(''));
      const resourceFile = fixture.response.result.files[1];
      assert.equal(await fs.readFile(path.join(fixture.directory, resourceFile.path), 'utf8'),
        `${JSON.stringify(JSON.parse(resourceFile.content), null, 2)}\n`);
      const afterPull = await snapshot(fixture.directory);
      assert.equal(await fixture.validate.run(['validate'], fixture.options), 0, fixture.stderr.join(''));
      assert.deepEqual(await snapshot(fixture.directory), afterPull);
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 0, fixture.stderr.join(''));
      // Assert
      assert.deepEqual(await snapshot(fixture.directory), afterPull);
      assert.equal((await executeFile('git', ['rev-parse', 'HEAD'], { cwd: fixture.directory })).stdout, head);
      assert.equal((await executeFile('git', ['remote', 'get-url', 'origin'], { cwd: fixture.directory })).stdout.trim(), 'https://example.invalid/customer.git');
      for (const file of ['CUSTOM_README.md', 'apiease.config.js', 'resources/widgets/.gitkeep']) {
        assert.equal(await fs.readFile(path.join(fixture.directory, file), 'utf8'), 'preserve\n');
      }
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(fixture.directory, '.apiease/template.json'), 'utf8')), legacyMetadata);
      assert.deepEqual(fixture.calls, ['bootstrap', 'validate', 'bootstrap']);
    });

    it('should adopt an existing resource only when its canonical bytes match the verified snapshot', async context => {
      // Arrange
      const fixture = await buildFixture(context);
      await writeResource(fixture, fixture.response.result.files[1].content);
      // Act and Assert
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 0, fixture.stderr.join(''));
      assert.equal(await fixture.validate.run(['validate'], fixture.options), 0, fixture.stderr.join(''));
    });

    it('should upgrade a compact checkout on pull without changing its baseline', async context => {
      // Arrange
      const fixture = await buildFixture(context);
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 0);
      const resourceFile = fixture.response.result.files[1];
      const builder = new ProjectChangeSetBuilder();
      const formattedCandidate = await builder.buildChangeSet({ projectDirectoryPath: fixture.directory });
      await writeResource(fixture, resourceFile.content);
      const before = await new ProjectLocalStateService().readLocalState(fixture.directory);
      const compactCandidate = await builder.buildChangeSet({ projectDirectoryPath: fixture.directory });

      // Act
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 0, fixture.stderr.join(''));

      // Assert
      assert.equal(await fs.readFile(path.join(fixture.directory, resourceFile.path), 'utf8'),
        `${JSON.stringify(JSON.parse(resourceFile.content), null, 2)}\n`);
      const after = await new ProjectLocalStateService().readLocalState(fixture.directory);
      assert.deepEqual(after.localState, before.localState);
      assert.deepEqual(formattedCandidate.changeSet, compactCandidate.changeSet);
      assert.equal(formattedCandidate.changeSetSnapshotDigest, compactCandidate.changeSetSnapshotDigest);
    });

    it('should protect edits in formatted files and restore formatted server source only with force', async context => {
      // Arrange
      const fixture = await buildFixture(context);
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 0);
      const resourceFile = fixture.response.result.files[1];
      const source = JSON.parse(resourceFile.content);
      source.name = 'Local edit';
      const edited = `${JSON.stringify(source, null, 2)}\n`;
      await writeResource(fixture, edited);
      const before = await snapshot(fixture.directory);

      // Act and Assert
      assert.equal(await fixture.validate.run(['validate'], fixture.options), 0, fixture.stderr.join(''));
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 6);
      assert.match(fixture.stderr.join(''), /PROJECT_LOCAL_MANAGED_EDITS/);
      assert.deepEqual(await snapshot(fixture.directory), before);
      assert.equal(await fixture.pull.run(['pull', '--force'], fixture.options), 0, fixture.stderr.join(''));
      assert.equal(await fs.readFile(path.join(fixture.directory, resourceFile.path), 'utf8'),
        `${JSON.stringify(JSON.parse(resourceFile.content), null, 2)}\n`);
    });

    for (const [label, content] of [['edited', 'different'], ['noncanonical', '{"value":"local"}\n']]) {
      for (const force of [false, true]) {
        it(`should preserve ${label} resource files during recovery${force ? ' even with --force' : ''}`, async context => {
          // Arrange
          const fixture = await buildFixture(context);
          await writeResource(fixture, content === 'different'
            ? fixture.response.result.files[1].content.replace('API Origin', 'Local Name') : content);
          const before = await snapshot(fixture.directory);
          // Act
          const code = await fixture.pull.run(force ? ['pull', '--force'] : ['pull'], fixture.options);
          // Assert
          assert.equal(code, 6);
          assert.match(fixture.stderr.join(''), /PROJECT_LEGACY_RESOURCE_CONFLICT/);
          assert.match(fixture.stderr.join(''), /Back up.*resource.*apiease pull/);
          assert.deepEqual(await snapshot(fixture.directory), before);
        });
      }
    }

    for (const [label, mutate] of [
      ['missing manifest', metadata => { delete metadata.template.manifest; }],
      ['invalid hash', metadata => { metadata.template.manifest['README.md'] = 'bad'; }],
      ['unsafe path', metadata => { metadata.template.manifest['../outside'] = 'a'.repeat(64); }],
      ['unknown identity', metadata => { metadata.projectId = 'another-project'; }],
      ['wrong template', metadata => { metadata.template.publicRepositoryUrl = 'https://example.invalid/template'; }],
    ]) {
      it(`should reject malformed legacy metadata: ${label}`, async context => {
        // Arrange
        const fixture = await buildFixture(context);
        const metadata = structuredClone(legacyMetadata);
        mutate(metadata);
        await fs.writeFile(path.join(fixture.directory, '.apiease/project.json'), JSON.stringify(metadata));
        const before = await snapshot(fixture.directory);
        // Act and Assert
        assert.equal(await fixture.pull.run(['pull'], fixture.options), 6);
        assert.match(fixture.stderr.join(''), /PROJECT_CHECKOUT_METADATA_INVALID/);
        assert.deepEqual(fixture.calls, []);
        assert.deepEqual(await snapshot(fixture.directory), before);
      });
    }

    it('should refuse legacy metadata with existing operational state', async context => {
      // Arrange
      const fixture = await buildFixture(context);
      await fs.mkdir(path.join(fixture.directory, '.git/apiease'), { recursive: true });
      await fs.writeFile(path.join(fixture.directory, '.git/apiease/project-state-v1.json'), '{}\n');
      const before = await snapshot(fixture.directory);
      // Act and Assert
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 6);
      assert.match(fixture.stderr.join(''), /PROJECT_CHECKOUT_STATE_MISMATCH/);
      assert.deepEqual(fixture.calls, []);
      assert.deepEqual(await snapshot(fixture.directory), before);
    });

    for (const field of ['projectId', 'normalizedShopDomain']) {
      it(`should reject a different bootstrap ${field} after initialization, including with force`, async context => {
        // Arrange
        const fixture = await buildFixture(context);
        assert.equal(await fixture.pull.run(['pull'], fixture.options), 0, fixture.stderr.join(''));
        const before = await snapshot(fixture.directory);
        changeBootstrapIdentity(fixture.response, field, field === 'projectId' ? 'other-project' : 'other.myshopify.com');
        // Act and Assert
        assert.equal(await fixture.pull.run(['pull', '--force'], fixture.options), 6);
        assert.match(fixture.stderr.join(''), /PROJECT_CHECKOUT_IDENTITY_MISMATCH/);
        assert.deepEqual(await snapshot(fixture.directory), before);
      });
    }

    it('should reject metadata whose shop differs from the persisted project identity', async context => {
      // Arrange
      const fixture = await buildFixture(context);
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 0, fixture.stderr.join(''));
      const metadataPath = path.join(fixture.directory, '.apiease/project.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      metadata.normalizedShopDomain = 'other.myshopify.com';
      await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
      const before = await snapshot(fixture.directory);
      // Act and Assert
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 6);
      assert.match(fixture.stderr.join(''), /PROJECT_CHECKOUT_STATE_MISMATCH/);
      assert.deepEqual(await snapshot(fixture.directory), before);
    });

    it('should reject a directory occupying an incoming resource path before changing metadata', async context => {
      // Arrange
      const fixture = await buildFixture(context);
      await fs.mkdir(path.join(fixture.directory, fixture.response.result.files[1].path), { recursive: true });
      const before = await snapshot(fixture.directory);
      // Act and Assert
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 6);
      assert.match(fixture.stderr.join(''), /PROJECT_LEGACY_RESOURCE_CONFLICT/);
      assert.deepEqual(await snapshot(fixture.directory), before);
    });

    it('should reject a symlinked resources parent before publishing recovery files', async context => {
      // Arrange
      const fixture = await buildFixture(context);
      const externalDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-external-resources-'));
      context.after(() => fs.rm(externalDirectory, { recursive: true, force: true }));
      await fs.rename(path.join(fixture.directory, 'resources'), path.join(fixture.directory, 'saved-resources'));
      await fs.symlink(externalDirectory, path.join(fixture.directory, 'resources'));
      const metadataBefore = await fs.readFile(path.join(fixture.directory, '.apiease/project.json'), 'utf8');
      // Act and Assert
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 6);
      assert.equal(await fs.readFile(path.join(fixture.directory, '.apiease/project.json'), 'utf8'), metadataBefore);
      assert.deepEqual(await fs.readdir(externalDirectory), []);
      await assert.rejects(fs.access(path.join(fixture.directory, '.apiease/template.json')));
    });

    it('should preserve template upgrades without replacing operational metadata or state', async context => {
      // Arrange
      const fixture = await buildFixture(context);
      assert.equal(await fixture.pull.run(['pull'], fixture.options), 0, fixture.stderr.join(''));
      const before = await snapshot(fixture.directory);
      const templateDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-upgrade-template-'));
      context.after(() => fs.rm(templateDirectory, { recursive: true, force: true }));
      await fs.writeFile(path.join(templateDirectory, 'README.md'), 'updated\n');
      const upgrade = new UpgradeProjectCommand({
        templateProjectSourceResolver: { resolveTemplateSource: () => ({ sourceType: 'localDevelopment',
          displayTemplateSource: '../apiease-template', publicRepositoryUrl: legacyMetadata.template.publicRepositoryUrl }) },
        templateProjectSourceMaterializer: { materializeTemplateSource: async () => ({ templateDirectoryPath: templateDirectory,
          templateVersion: { type: 'gitCommit', value: 'b'.repeat(40) }, cleanup: async () => {} }) },
        stdout: { write() {} }, stderr: { write: text => fixture.stderr.push(text) },
      });
      // Act
      assert.equal(await upgrade.run(['upgrade'], fixture.options), 0, fixture.stderr.join(''));
      // Assert
      assert.equal(await fs.readFile(path.join(fixture.directory, 'README.md'), 'utf8'), 'updated\n');
      const after = await snapshot(fixture.directory);
      assert.equal(after['.apiease/project.json'], before['.apiease/project.json']);
      assert.equal(after['.git/apiease/project-state-v1.json'], before['.git/apiease/project-state-v1.json']);
      assert.equal(await fixture.validate.run(['validate'], fixture.options), 0, fixture.stderr.join(''));
    });
  });
});

async function buildFixture(context) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-legacy-workflow-'));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await executeFile('git', ['init', '--quiet'], { cwd: directory });
  await executeFile('git', ['remote', 'add', 'origin', 'https://example.invalid/customer.git'], { cwd: directory });
  await fs.mkdir(path.join(directory, '.apiease'));
  await fs.mkdir(path.join(directory, 'resources/widgets'), { recursive: true });
  await fs.writeFile(path.join(directory, '.apiease/project.json'), `${JSON.stringify(legacyMetadata, null, 2)}\n`);
  for (const file of ['CUSTOM_README.md', 'apiease.config.js', 'resources/widgets/.gitkeep']) {
    await fs.writeFile(path.join(directory, file), 'preserve\n');
  }
  await fs.writeFile(path.join(directory, 'README.md'), 'original\n');
  await executeFile('git', ['add', '.'], { cwd: directory });
  await executeFile('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'Initial'], { cwd: directory });
  const document = JSON.parse(await fs.readFile(new URL('../../../contracts/apex-projects/v1/fixtures/bootstrap-synchronized.json', import.meta.url), 'utf8'));
  const response = structuredClone(document.fixtures[0].document);
  const calls = [], stdout = [], stderr = [];
  const apiEaseProjectApiClient = {
    bootstrapProject: async () => { calls.push('bootstrap'); return response; },
    validateProject: async ({ request }) => {
      calls.push('validate');
      assert.equal(request.changeSet.updates[0].source.handle, 'api-origin');
      return { ok: true, outcome: 'PROJECT_VALID', result: { diagnostics: [] } };
    },
  };
  const common = { personalProjectAuthenticationAdapter: {
    resolveRequestConfiguration: async () => ({ ok: true, apiBaseUrl: 'https://example.invalid', authenticationContext: {} }),
  }, stdout: { write: text => stdout.push(text) }, stderr: { write: text => stderr.push(text) } };
  return { directory, options: { currentWorkingDirectoryPath: directory }, response, calls, stdout, stderr,
    pull: new PullProjectCommand({ ...common, projectSynchronizationService: new ProjectSynchronizationService({ apiEaseProjectApiClient }) }),
    validate: new ValidateProjectCommand({ ...common, projectValidationService: new ProjectValidationService({ apiEaseProjectApiClient }) }),
  };
}

async function writeResource(fixture, content) {
  const filePath = path.join(fixture.directory, fixture.response.result.files[1].path);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

async function snapshot(directory) {
  const files = {};
  async function visit(relative = '') {
    for (const entry of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
      const filePath = path.posix.join(relative, entry.name);
      if (filePath === '.git') continue;
      if (entry.isDirectory()) await visit(filePath);
      else files[filePath] = hash(await fs.readFile(path.join(directory, filePath)));
    }
  }
  await visit();
  const statePath = (await new ProjectLocalStateService().resolveLocalStateLocation(directory)).localStateFilePath;
  try { files['.git/apiease/project-state-v1.json'] = hash(await fs.readFile(statePath)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return files;
}

function changeBootstrapIdentity(response, field, value) {
  const result = response.result;
  const metadata = JSON.parse(result.files[0].content);
  metadata[field] = value;
  result.projectIdentity[field] = value;
  if (field === 'projectId') {
    result.manifest.projectId = value;
    result.localState.projectId = value;
  }
  result.files[0].content = `${JSON.stringify(metadata, null, 2)}\n`;
  result.files[0].digest = `sha256:${hash(result.files[0].content)}`;
  result.manifest.totalBytes = result.files.reduce((sum, file) => sum + Buffer.byteLength(file.content), 0);
}

function buildDesignContextBoundary(fixture) {
  const requests = [], stdout = [], stderr = [];
  const personalProjectAuthenticationAdapter = {
    resolveRequestConfiguration: async () => ({ ok: true, apiBaseUrl: 'https://example.invalid', authenticationContext: {} }),
    buildRequestHeaders: () => ({ 'x-apiease-api-key': 'test-key', 'x-shop-myshopify-domain': 'example.myshopify.com' }),
    readAuthorityMode: () => 'personal',
  };
  const apiEaseProjectApiClient = new ApiEaseProjectApiClient({
    projectAuthenticationAdapter: personalProjectAuthenticationAdapter,
    fetchImplementation: async (url, options) => {
      assert.equal(url, 'https://example.invalid/api/v1/projects/design-context');
      assert.equal(options.method, 'POST');
      const request = JSON.parse(options.body);
      requests.push(request);
      return new Response(JSON.stringify(buildDesignContextResponse(fixture.response.result, request)), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    },
  });
  return { requests, stdout, stderr, command: new DesignContextCommand({
    personalProjectAuthenticationAdapter,
    projectDesignContextService: new ProjectDesignContextService({ apiEaseProjectApiClient }),
    stdout: { write: text => stdout.push(text) }, stderr: { write: text => stderr.push(text) },
  }) };
}

function buildDesignContextResponse(snapshot, request) {
  const commonInstructions = 'Follow the Project Design Protocol.\n';
  const canonicalBodies = snapshot.files.filter(file => file.path.startsWith('resources/'))
    .map(file => ({ path: file.path, sourceDigest: file.digest, source: JSON.parse(file.content) }));
  return {
    contractVersion: 1, designContextContractVersion: 1, ok: true, outcome: 'PROJECT_DESIGN_CONTEXT_READY',
    result: {
      protocol: { protocolVersion: '1.0.0', commonInstructions, commonInstructionDigest: `sha256:${hash(commonInstructions)}`, codexEnvelope: 'Edit local canonical files.' },
      ...(Object.hasOwn(request, 'projectRequirements') ? { projectRequirements: request.projectRequirements } : {}),
      snapshot: { projectIdentity: { normalizedShopDomain: snapshot.projectIdentity.normalizedShopDomain, projectId: snapshot.projectIdentity.projectId }, liveRevision: snapshot.liveRevision, snapshotDigest: snapshot.snapshotDigest },
      inventory: canonicalBodies.map(({ path: resourcePath, sourceDigest, source }) => ({ path: resourcePath, sourceDigest, handle: source.handle, resourceType: source.resourceType })),
      canonicalBodies, bindings: snapshot.bindings,
      limits: { maximumFileCount: snapshot.limits.maximumFileCount, maximumAggregateBytes: snapshot.limits.maximumAggregateBytes },
      diagnostics: [],
    },
  };
}
