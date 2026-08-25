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
    it('should emit the exact verified protocol and combined local project context as JSON', async () => {
      // Arrange
      const { DesignContextCommand } = await import(designContextCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const authenticationContext = Object.freeze(Object.create(null));
      const projectRequirements = buildProjectRequirements();
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
        '--project-requirements',
        JSON.stringify(projectRequirements),
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
          projectRequirements,
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
      assert.equal(JSON.parse(stdoutChunks.join('')).result.protocol.commonInstructions.length, 2_000);
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
      const exitCode = await designContextCommand.run(buildArguments());

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
      const exitCode = await designContextCommand.run(buildArguments());

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
      const exitCode = await designContextCommand.run(buildArguments());

      // Assert
      assert.equal(exitCode, 6);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')).error, {
        code: 'PROJECT_LOCAL_STATE_NOT_FOUND',
        category: 'local-integrity',
      });
      assert.equal(stdoutChunks.join('').includes('private checkout path'), false);
    });

    it('should fail closed with deterministic diagnostics when local and server baselines conflict', async () => {
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
      const exitCode = await designContextCommand.run(buildArguments());

      // Assert
      assert.equal(exitCode, 5);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), {
        cliResultVersion: 1,
        command: 'design-context',
        state: 'failure',
        error: {
          code: 'PROJECT_DESIGN_LOCAL_BASELINE_CONFLICT',
          category: 'conflict',
        },
        diagnostics: [{ code: 'PROJECT_DESIGN_BASELINE_DIGEST_CONFLICT' }],
        requiredSecureValues: [],
      });
    });

    it('should report protocol digest verification failure as a safe contract outcome', async () => {
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
            diagnostics: [{ code: 'PROJECT_DESIGN_PROTOCOL_DIGEST_MISMATCH' }],
          },
        },
      });

      // Act
      const exitCode = await designContextCommand.run(buildArguments());

      // Assert
      assert.equal(exitCode, 4);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')).diagnostics, [{
        code: 'PROJECT_DESIGN_PROTOCOL_DIGEST_MISMATCH',
      }]);
    });
  });
});

function buildDesignContextCommand({
  DesignContextCommand,
  calls,
  stdoutChunks,
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
  });
}

function buildArguments() {
  return ['design-context', '--project-requirements', JSON.stringify(buildProjectRequirements())];
}

function buildProjectRequirements() {
  return {
    projectName: 'Inventory tools',
    customerRequirements: [{ id: 'requirement-1', text: 'Keep inventory current.' }],
    confirmedDecisions: ['Use the existing inventory request.'],
  };
}

function buildDesignContextSuccess(overrides = {}) {
  return {
    ok: true,
    outcome: 'PROJECT_DESIGN_CONTEXT_READY',
    protocol: {
      protocolVersion: '1.0.0',
      commonInstructions: 'i'.repeat(2_000),
      commonInstructionDigest: `sha256:${'c'.repeat(64)}`,
      codexEnvelope: 'Codex edits canonical local files.',
    },
    projectRequirements: buildProjectRequirements(),
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
    workflowGuidance: ['Validate before apply.'],
    ...overrides,
  };
}
