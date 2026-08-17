import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const renameProjectResourceCommandModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'cli', 'RenameProjectResourceCommand.js'),
).href;

describe('RenameProjectResourceCommand', () => {
  describe('run', () => {
    it('should rename a bound resource from a nested checkout directory and render JSON', async () => {
      // Arrange
      const {
        PROJECT_RENAME_APPLY_GUIDANCE,
        RenameProjectResourceCommand,
      } = await import(renameProjectResourceCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const renameProjectResourceCommand = buildRenameProjectResourceCommand({
        RenameProjectResourceCommand,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await renameProjectResourceCommand.run([
        'rename',
        'request',
        'inventory-sync',
        'stock-sync',
        '--json',
      ], { currentWorkingDirectoryPath: '/checkout/resources/requests' });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(calls, [[
        'renameResource',
        {
          projectDirectoryPath: '/checkout/resources/requests',
          resourceType: 'request',
          currentHandle: 'inventory-sync',
          renamedHandle: 'stock-sync',
        },
      ]]);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), {
        cliResultVersion: 1,
        command: 'rename',
        state: 'success',
        result: {
          resourceType: 'request',
          currentHandle: 'inventory-sync',
          renamedHandle: 'stock-sync',
          currentPath: 'resources/requests/inventory-sync.json',
          renamedPath: 'resources/requests/stock-sync.json',
        },
        diagnostics: [],
        requiredSecureValues: [],
      });
      assert.equal(stderrChunks.join(''), `${PROJECT_RENAME_APPLY_GUIDANCE}\n`);
    });

    it('should render a normalized human-readable local result', async () => {
      // Arrange
      const {
        PROJECT_RENAME_APPLY_GUIDANCE,
        RenameProjectResourceCommand,
      } = await import(renameProjectResourceCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const renameProjectResourceCommand = buildRenameProjectResourceCommand({
        RenameProjectResourceCommand,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await renameProjectResourceCommand.run([
        'rename',
        'request',
        'inventory-sync',
        'stock-sync',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(stdoutChunks.join(''), 'rename: success\n');
      assert.equal(stderrChunks.join(''), `${PROJECT_RENAME_APPLY_GUIDANCE}\n`);
    });

    it('should reject an unsupported resource family as a usage failure', async () => {
      // Arrange
      const { RenameProjectResourceCommand } = await import(renameProjectResourceCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const renameProjectResourceCommand = buildRenameProjectResourceCommand({
        RenameProjectResourceCommand,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await renameProjectResourceCommand.run([
        'rename',
        'workflow',
        'inventory-sync',
        'stock-sync',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 2);
      assert.deepEqual(calls, []);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), buildUsageFailureEnvelope());
      assert.equal(stderrChunks.join(''), '');
    });

    it('should reject malformed handles as a usage failure', async () => {
      // Arrange
      const { RenameProjectResourceCommand } = await import(renameProjectResourceCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const renameProjectResourceCommand = buildRenameProjectResourceCommand({
        RenameProjectResourceCommand,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await renameProjectResourceCommand.run([
        'rename',
        'request',
        '../inventory-sync',
        'stock-sync',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 2);
      assert.deepEqual(calls, []);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), buildUsageFailureEnvelope());
    });

    it('should reject extra arguments and duplicate JSON mode as usage failures', async () => {
      // Arrange
      const { RenameProjectResourceCommand } = await import(renameProjectResourceCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const renameProjectResourceCommand = buildRenameProjectResourceCommand({
        RenameProjectResourceCommand,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await renameProjectResourceCommand.run([
        'rename',
        'request',
        'inventory-sync',
        'stock-sync',
        '--json',
        '--json',
        'rv1_forbidden',
      ]);

      // Assert
      assert.equal(exitCode, 2);
      assert.deepEqual(calls, []);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), buildUsageFailureEnvelope());
    });

    it('should normalize rename service failures without exposing error messages', async () => {
      // Arrange
      const { RenameProjectResourceCommand } = await import(renameProjectResourceCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const renameError = Object.assign(new Error('private checkout details'), {
        code: 'PROJECT_RENAME_BINDING_NOT_FOUND',
        diagnostics: [{ code: 'PROJECT_RENAME_BINDING_NOT_FOUND' }],
      });
      const renameProjectResourceCommand = buildRenameProjectResourceCommand({
        RenameProjectResourceCommand,
        calls,
        stdoutChunks,
        stderrChunks,
        renameError,
      });

      // Act
      const exitCode = await renameProjectResourceCommand.run([
        'rename',
        'request',
        'inventory-sync',
        'stock-sync',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 6);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')).error, {
        code: 'PROJECT_RENAME_BINDING_NOT_FOUND',
        category: 'local-integrity',
      });
      assert.equal(stdoutChunks.join('').includes('private checkout details'), false);
      assert.equal(stderrChunks.join(''), '');
    });
  });
});

function buildRenameProjectResourceCommand({
  RenameProjectResourceCommand,
  calls,
  stdoutChunks,
  stderrChunks,
  renameError,
}) {
  return new RenameProjectResourceCommand({
    projectRenameService: {
      async renameResource(invocation) {
        calls.push(['renameResource', invocation]);
        if (renameError) throw renameError;
        return {
          repositoryTopLevelPath: '/checkout',
          currentPath: 'resources/requests/inventory-sync.json',
          renamedPath: 'resources/requests/stock-sync.json',
          localState: { resources: [{ id: 'operational-id', resourceVersion: 'rv1_private' }] },
        };
      },
    },
    stdout: { write: chunk => stdoutChunks.push(chunk) },
    stderr: { write: chunk => stderrChunks.push(chunk) },
  });
}

function buildUsageFailureEnvelope() {
  return {
    cliResultVersion: 1,
    command: 'rename',
    state: 'failure',
    error: { code: 'PROJECT_RENAME_USAGE_INVALID', category: 'usage' },
    diagnostics: [{ code: 'PROJECT_RENAME_ARGUMENT_INVALID' }],
    requiredSecureValues: [],
  };
}
