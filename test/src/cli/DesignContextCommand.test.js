import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const designContextCommandModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'cli', 'DesignContextCommand.js'),
).href;

describe('DesignContextCommand', () => {
  describe('run', () => {
    it('retrieves project status and selected server resources without a delivery mode', async () => {
      const {DesignContextCommand} = await import(designContextCommandModuleUrl);
      const calls = [], stdoutChunks = [];
      const command = buildDesignContextCommand({DesignContextCommand, calls, stdoutChunks});
      assert.equal(await command.run(['design-context', '--resource-path', 'resources/requests/page.json']), 0);
      assert.deepEqual(calls[1][1].resourcePaths, ['resources/requests/page.json']);
      assert.equal(Object.hasOwn(calls[1][1], 'referenceMode'), false);
    });

    it('should retrieve context without inventing requirements for the bare command', async () => {
      const { DesignContextCommand } = await import(designContextCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const designContextResult = buildDesignContextSuccess();
      delete designContextResult.projectRequirements;
      const command = buildDesignContextCommand({
        DesignContextCommand, calls, stdoutChunks, designContextResult,
      });

      assert.equal(await command.run(['design-context']), 0);
      assert.equal(Object.hasOwn(calls[1][1], 'projectRequirements'), false);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')).result, designContextResult);
    });

    for (const argumentsTail of [['--inline'], ['--output-dir', 'briefing'], ['--project-requirements', '{}'], ['--unknown']]) {
      it(`rejects retired or unknown options: ${argumentsTail.join(' ')}`, async () => {
        const {DesignContextCommand} = await import(designContextCommandModuleUrl);
        const calls = [], stdoutChunks = [], stderrChunks = [];
        const command = buildDesignContextCommand({DesignContextCommand, calls, stdoutChunks, stderrChunks});
        assert.equal(await command.run(['design-context', ...argumentsTail]), 2);
        assert.match(stderrChunks.join(''), /apiease upgrade/);
        assert.deepEqual(calls, []);
      });
    }

    it('should emit project status as one JSON envelope', async () => {
      // Arrange
      const { DesignContextCommand } = await import(designContextCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const authenticationContext = Object.freeze(Object.create(null));
      const designContextResult = buildDesignContextSuccess();
      const designContextCommand = buildDesignContextCommand({
        DesignContextCommand,
        authenticationContext,
        calls,
        designContextResult,
        stdoutChunks,
      });

      // Act
      const exitCode = await designContextCommand.run([
        'design-context',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'example.myshopify.com',
        '--api-key',
        'private-api-key',
      ], { currentWorkingDirectoryPath: '/checkout/resources/requests' });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(calls, [
        ['resolveRequestConfiguration', {
          explicitApiBaseUrl: 'https://apiease.example.com',
          explicitApiKey: 'private-api-key',
          explicitShopDomain: 'example.myshopify.com',
        }],
        ['buildDesignContext', {
          projectDirectoryPath: '/checkout/resources/requests',
          projectApiInvocation: {
            apiBaseUrl: 'https://apiease.example.com',
            authenticationContext,
          },
          resourcePaths: [],
        }],
      ]);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), {
        cliResultVersion: 1,
        command: 'design-context',
        state: 'success',
        outcome: 'PROJECT_DESIGN_CONTEXT_READY',
        result: designContextResult,
        diagnostics: [],
        requiredSecureValues: [],
      });
      assert.equal(Object.hasOwn(JSON.parse(stdoutChunks.join('')).result, 'protocol'), false);
      assert.equal(stdoutChunks.join('').includes('private-api-key'), false);
    });

    it('should return an actionable authentication failure without exposing server messages', async () => {
      // Arrange
      const { DesignContextCommand } = await import(designContextCommandModuleUrl);
      const stdoutChunks = [];
      const designContextCommand = buildDesignContextCommand({
        DesignContextCommand,
        calls: [],
        stdoutChunks,
        designContextResult: {
          ok: false,
          status: 401,
          outcome: 'UNAUTHENTICATED',
          error: {
            code: 'UNAUTHENTICATED',
            message: 'private authentication details',
            diagnostics: [],
          },
        },
      });

      // Act
      const exitCode = await designContextCommand.run(['design-context']);

      // Assert
      assert.equal(exitCode, 3);
      const output = stdoutChunks.join('');
      assert.deepEqual(JSON.parse(output).error, {
        code: 'UNAUTHENTICATED',
        category: 'authentication',
      });
      assert.equal(output.includes('private authentication details'), false);
    });

    it('should return a safe configuration outcome when personal authentication is missing', async () => {
      // Arrange
      const { DesignContextCommand } = await import(designContextCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const designContextCommand = buildDesignContextCommand({
        DesignContextCommand,
        calls,
        stdoutChunks,
        requestConfiguration: {
          ok: false,
          errorCode: 'APIEASE_COMMAND_CONFIGURATION_MISSING',
          fieldErrors: [{ path: 'apiKey', code: 'REQUIRED', message: 'API key is required.' }],
        },
      });

      // Act
      const exitCode = await designContextCommand.run(['design-context']);

      // Assert
      assert.equal(exitCode, 2);
      assert.equal(calls.some(([methodName]) => methodName === 'buildDesignContext'), false);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')).diagnostics, [{
        code: 'REQUIRED',
        path: 'apiKey',
      }]);
      assert.equal(stdoutChunks.join('').includes('API key is required.'), false);
    });

    it('should return a local-integrity failure when the ignored baseline is missing', async () => {
      // Arrange
      const { DesignContextCommand } = await import(designContextCommandModuleUrl);
      const stdoutChunks = [];
      const designContextError = Object.assign(new Error('private checkout path'), {
        code: 'PROJECT_LOCAL_STATE_NOT_FOUND',
        diagnostics: [{ code: 'PROJECT_LOCAL_STATE_NOT_FOUND' }],
        failureType: 'local-integrity',
      });
      const designContextCommand = buildDesignContextCommand({
        DesignContextCommand,
        calls: [],
        designContextError,
        stdoutChunks,
      });

      // Act
      const exitCode = await designContextCommand.run(['design-context']);

      // Assert
      assert.equal(exitCode, 6);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')).error, {
        code: 'PROJECT_LOCAL_STATE_NOT_FOUND',
        category: 'local-integrity',
      });
      assert.equal(stdoutChunks.join('').includes('private checkout path'), false);
    });

    it('should report changed server state without blocking the read-only status command', async () => {
      // Arrange
      const { DesignContextCommand } = await import(designContextCommandModuleUrl);
      const stdoutChunks = [];
      const designContextCommand = buildDesignContextCommand({
        DesignContextCommand,
        calls: [],
        stdoutChunks,
        designContextResult: buildDesignContextSuccess({
          conflicts: [{
            code: 'PROJECT_DESIGN_BASELINE_DIGEST_CONFLICT',
            localSnapshotDigest: `sha256:${'a'.repeat(64)}`,
            serverSnapshotDigest: `sha256:${'b'.repeat(64)}`,
          }],
        }),
      });

      // Act
      const exitCode = await designContextCommand.run(['design-context']);

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(JSON.parse(stdoutChunks.join('')).result.conflicts[0].code, 'PROJECT_DESIGN_BASELINE_DIGEST_CONFLICT');
    });

    it('should report an incompatible server as a safe contract outcome', async () => {
      // Arrange
      const { DesignContextCommand } = await import(designContextCommandModuleUrl);
      const stdoutChunks = [];
      const designContextCommand = buildDesignContextCommand({
        DesignContextCommand,
        calls: [],
        stdoutChunks,
        designContextResult: {
          ok: false,
          status: 400,
          outcome: 'CONTRACT_INVALID',
          error: {
            code: 'CONTRACT_INVALID',
            diagnostics: [{ code: 'PROJECT_STATUS_VERSION_MISMATCH' }],
          },
        },
      });

      // Act
      const exitCode = await designContextCommand.run(['design-context']);

      // Assert
      assert.equal(exitCode, 4);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')).diagnostics, [{
        code: 'PROJECT_STATUS_VERSION_MISMATCH',
      }]);
    });
  });
});

function buildDesignContextCommand({
  DesignContextCommand,
  calls,
  stdoutChunks,
  stderrChunks = [],
  authenticationContext = Object.freeze(Object.create(null)),
  requestConfiguration = {
    ok: true,
    apiBaseUrl: 'https://apiease.example.com',
    authenticationContext,
  },
  designContextError,
  designContextResult = buildDesignContextSuccess(),
}) {
  return new DesignContextCommand({
    personalProjectAuthenticationAdapter: {
      async resolveRequestConfiguration(invocation) {
        calls.push(['resolveRequestConfiguration', invocation]);
        return requestConfiguration;
      },
    },
    projectDesignContextService: {
      async buildDesignContext(invocation) {
        calls.push(['buildDesignContext', invocation]);
        if (designContextError) throw designContextError;
        return designContextResult;
      },
    },
    stdout: { write: chunk => stdoutChunks.push(chunk) },
    stderr: { write: chunk => stderrChunks.push(chunk) },
  });
}

function buildDesignContextSuccess(overrides = {}) {
  return {
    ok: true,
    outcome: 'PROJECT_DESIGN_CONTEXT_READY',
    serverBaseline: {
      projectIdentity: {
        normalizedShopDomain: 'example.myshopify.com',
        projectId: 'project-1',
      },
      liveRevision: 7,
      snapshotDigest: `sha256:${'d'.repeat(64)}`,
    },
    localBaseline: {
      projectIdentity: {
        normalizedShopDomain: 'example.myshopify.com',
        projectId: 'project-1',
      },
      liveRevision: 7,
      snapshotDigest: `sha256:${'d'.repeat(64)}`,
    },
    inventory: [],
    canonicalBodies: [],
    bindings: [],
    localEdits: {
      snapshotDigest: `sha256:${'d'.repeat(64)}`,
      hasManagedEdits: false,
      creates: [],
      updates: [],
    },
    deletions: [],
    secureSelectors: [],
    conflicts: [],
    limits: { maximumFileCount: 1_000, maximumAggregateBytes: 25_000_000 },
    diagnostics: [],
    baselineCheck: {status: 'current'},
    ...overrides,
  };
}
