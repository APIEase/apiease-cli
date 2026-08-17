import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { PROJECT_FORCE_DISCARD_WARNING } from '../../../src/project/ProjectSynchronizationService.js';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const pullProjectCommandModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'cli', 'PullProjectCommand.js'),
).href;

describe('PullProjectCommand', () => {
  describe('run', () => {
    it('should resolve a nested checkout and deliberately force a verified pull', async () => {
      // Arrange
      const { PullProjectCommand } = await import(pullProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const authenticationContext = Object.freeze(Object.create(null));
      const pullProjectCommand = buildPullProjectCommand({
        PullProjectCommand,
        authenticationContext,
        calls,
        stdoutChunks,
        stderrChunks,
        synchronizationResult: buildSynchronizationResult({
          warnings: [PROJECT_FORCE_DISCARD_WARNING],
        }),
      });

      // Act
      const exitCode = await pullProjectCommand.run([
        'pull',
        '--force',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'example.myshopify.com',
        '--api-key',
        'private-api-key',
        '--json',
      ], { currentWorkingDirectoryPath: '/checkout/resources/requests' });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(calls, [
        ['resolveRequestConfiguration', {
          explicitApiBaseUrl: 'https://apiease.example.com',
          explicitApiKey: 'private-api-key',
          explicitShopDomain: 'example.myshopify.com',
        }],
        ['validateProjectCheckout', '/checkout/resources/requests'],
        ['pullProject', {
          force: true,
          projectDirectoryPath: '/checkout',
          projectApiInvocation: {
            apiBaseUrl: 'https://apiease.example.com',
            authenticationContext,
            request: { contractVersion: 1, wakeProjection: true },
          },
        }],
      ]);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), {
        cliResultVersion: 1,
        command: 'pull',
        state: 'success',
        outcome: 'PROJECT_BOOTSTRAP_SYNCHRONIZED',
        result: {
          projectDirectoryPath: '/checkout',
          publishedPaths: ['.apiease/project.json', 'resources/requests/live.json'],
          removedPaths: ['resources/requests/sample.json'],
          warnings: [PROJECT_FORCE_DISCARD_WARNING],
        },
        diagnostics: [],
        requiredSecureValues: [],
      });
      assert.equal(stdoutChunks.join('').includes('private-api-key'), false);
      assert.equal(stderrChunks.join(''), `${PROJECT_FORCE_DISCARD_WARNING}\n`);
    });

    it('should protect local managed edits when force is omitted', async () => {
      // Arrange
      const { PullProjectCommand } = await import(pullProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const synchronizationError = Object.assign(new Error('local contents must remain private'), {
        code: 'PROJECT_LOCAL_MANAGED_EDITS',
        diagnostics: [{ code: 'PROJECT_LOCAL_MANAGED_EDITS' }],
        failureType: 'local-integrity',
      });
      const pullProjectCommand = buildPullProjectCommand({
        PullProjectCommand,
        calls,
        stdoutChunks,
        stderrChunks,
        synchronizationError,
      });

      // Act
      const exitCode = await pullProjectCommand.run(['pull'], {
        currentWorkingDirectoryPath: '/checkout',
      });

      // Assert
      assert.equal(exitCode, 6);
      assert.equal(calls.at(-1)[0], 'pullProject');
      assert.equal(calls.at(-1)[1].force, false);
      assert.equal(stdoutChunks.join(''), '');
      assert.equal(stderrChunks.join(''), 'pull: failure (PROJECT_LOCAL_MANAGED_EDITS)\n');
      assert.equal(stderrChunks.join('').includes('local contents must remain private'), false);
    });

    it('should return normalized usage failure for duplicate or unsupported options', async () => {
      // Arrange
      const { PullProjectCommand } = await import(pullProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const pullProjectCommand = buildPullProjectCommand({
        PullProjectCommand,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await pullProjectCommand.run([
        'pull',
        '--force',
        '--force',
        '--unsupported',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 2);
      assert.deepEqual(calls, []);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), {
        cliResultVersion: 1,
        command: 'pull',
        state: 'failure',
        error: { code: 'PROJECT_PULL_USAGE_INVALID', category: 'usage' },
        diagnostics: [{ code: 'PROJECT_PULL_ARGUMENT_INVALID' }],
        requiredSecureValues: [],
      });
      assert.equal(stderrChunks.join(''), '');
    });

    it('should fail configuration before inspecting the checkout', async () => {
      // Arrange
      const { PullProjectCommand } = await import(pullProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const pullProjectCommand = buildPullProjectCommand({
        PullProjectCommand,
        calls,
        stdoutChunks,
        stderrChunks,
        requestConfiguration: {
          ok: false,
          errorCode: 'APIEASE_COMMAND_CONFIGURATION_MISSING',
          fieldErrors: [{ path: 'apiKey', code: 'REQUIRED', message: 'API key is required.' }],
        },
      });

      // Act
      const exitCode = await pullProjectCommand.run(['pull', '--json']);

      // Assert
      assert.equal(exitCode, 2);
      assert.deepEqual(calls, [['resolveRequestConfiguration', {
        explicitApiBaseUrl: undefined,
        explicitApiKey: undefined,
        explicitShopDomain: undefined,
      }]]);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')).diagnostics, [{ code: 'REQUIRED', path: 'apiKey' }]);
      assert.equal(stdoutChunks.join('').includes('API key is required.'), false);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should preserve an authoritative bootstrap failure without reporting a force warning', async () => {
      // Arrange
      const { PullProjectCommand } = await import(pullProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const pullProjectCommand = buildPullProjectCommand({
        PullProjectCommand,
        calls,
        stdoutChunks,
        stderrChunks,
        synchronizationResult: buildSynchronizationResult({
          bootstrapResponse: {
            status: 503,
            ok: false,
            outcome: 'SERVICE_UNAVAILABLE',
            error: {
              code: 'SERVICE_UNAVAILABLE',
              diagnostics: [{ code: 'PROJECT_TRANSPORT_RETRIES_EXHAUSTED' }],
            },
          },
          publication: null,
        }),
      });

      // Act
      const exitCode = await pullProjectCommand.run(['pull', '--force', '--json']);

      // Assert
      assert.equal(exitCode, 7);
      const envelope = JSON.parse(stdoutChunks.join(''));
      assert.equal(envelope.outcome, 'SERVICE_UNAVAILABLE');
      assert.deepEqual(envelope.error, { code: 'SERVICE_UNAVAILABLE', category: 'service' });
      assert.deepEqual(envelope.diagnostics, [{ code: 'PROJECT_TRANSPORT_RETRIES_EXHAUSTED' }]);
      assert.equal(stderrChunks.join(''), '');
    });
  });
});

function buildPullProjectCommand({
  PullProjectCommand,
  calls,
  stdoutChunks,
  stderrChunks,
  authenticationContext = Object.freeze(Object.create(null)),
  requestConfiguration = {
    ok: true,
    apiBaseUrl: 'https://apiease.example.com',
    authenticationContext,
  },
  synchronizationError,
  synchronizationResult = buildSynchronizationResult(),
}) {
  return new PullProjectCommand({
    personalProjectAuthenticationAdapter: {
      async resolveRequestConfiguration(invocation) {
        calls.push(['resolveRequestConfiguration', invocation]);
        return requestConfiguration;
      },
    },
    projectGitCheckoutService: {
      async validateProjectCheckout(projectDirectoryPath) {
        calls.push(['validateProjectCheckout', projectDirectoryPath]);
        return { repositoryTopLevelPath: '/checkout' };
      },
    },
    projectSynchronizationService: {
      async pullProject(invocation) {
        calls.push(['pullProject', invocation]);
        if (synchronizationError) throw synchronizationError;
        return synchronizationResult;
      },
    },
    stdout: createWritableStream(stdoutChunks),
    stderr: createWritableStream(stderrChunks),
  });
}

function buildSynchronizationResult({
  bootstrapResponse = {
    status: 200,
    ok: true,
    outcome: 'PROJECT_BOOTSTRAP_SYNCHRONIZED',
  },
  publication = {
    publishedPaths: ['.apiease/project.json', 'resources/requests/live.json'],
    removedPaths: ['resources/requests/sample.json'],
  },
  warnings = [],
} = {}) {
  return { bootstrapResponse, publication, warnings };
}

function createWritableStream(chunks) {
  return {
    write(chunk) {
      chunks.push(chunk);
    },
  };
}
