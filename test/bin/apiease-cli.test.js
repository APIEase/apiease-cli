import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..');
const entrypointModuleUrl = pathToFileURL(path.join(projectDirectoryPath, 'bin', 'apiease-cli.js')).href;

describe('apiease-cli', () => {
  describe('runCli', () => {
    it('should delegate command arguments to CreateRequestCommand and return its exit code', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const commandArguments = ['create', 'variable', '--file', '/tmp/variable.json'];
      const receivedCommandArguments = [];
      const createRequestCommand = {
        async run(incomingCommandArguments) {
          receivedCommandArguments.push(incomingCommandArguments);
          return 0;
        },
      };

      // Act
      const exitCode = await runCli({
        commandArguments,
        createRequestCommand,
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(receivedCommandArguments, [commandArguments]);
    });

    it('should delegate function create command arguments to CreateRequestCommand and return its exit code', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const commandArguments = ['create', 'function', '--file', '/tmp/function.json'];
      const receivedCommandArguments = [];
      const createRequestCommand = {
        async run(incomingCommandArguments) {
          receivedCommandArguments.push(incomingCommandArguments);
          return 0;
        },
      };

      // Act
      const exitCode = await runCli({
        commandArguments,
        createRequestCommand,
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(receivedCommandArguments, [commandArguments]);
    });

    it('should delegate init command arguments to InitProjectCommand and return its exit code', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const commandArguments = ['init', 'my-project'];
      const receivedCommandArguments = [];
      const initProjectCommand = {
        async run(incomingCommandArguments) {
          receivedCommandArguments.push(incomingCommandArguments);
          return 0;
        },
      };
      const createRequestCommand = {
        async run() {
          throw new Error('create command should not run');
        },
      };

      // Act
      const exitCode = await runCli({
        commandArguments,
        createRequestCommand,
        initProjectCommand,
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(receivedCommandArguments, [commandArguments]);
    });

    it('should delegate pull command arguments to PullProjectCommand and return its exit code', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const commandArguments = ['pull', '--force'];
      const receivedCommandArguments = [];
      const pullProjectCommand = {
        async run(incomingCommandArguments) {
          receivedCommandArguments.push(incomingCommandArguments);
          return 0;
        },
      };

      // Act
      const exitCode = await runCli({
        commandArguments,
        createRequestCommand: createUnexpectedCommand('create'),
        pullProjectCommand,
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(receivedCommandArguments, [commandArguments]);
    });

    it('should delegate design-context command arguments to DesignContextCommand', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const commandArguments = ['design-context', '--project-requirements', '{}'];
      const receivedCommandArguments = [];
      const designContextCommand = {
        async run(incomingCommandArguments) {
          receivedCommandArguments.push(incomingCommandArguments);
          return 0;
        },
      };

      // Act
      const exitCode = await runCli({
        commandArguments,
        createRequestCommand: createUnexpectedCommand('create'),
        designContextCommand,
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(receivedCommandArguments, [commandArguments]);
    });

    it('should delegate validate apply and rename through the unified executable', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const invocations = [];
      const buildCommand = commandName => ({
        async run(incomingCommandArguments) {
          invocations.push({ commandName, commandArguments: incomingCommandArguments });
          return 0;
        },
      });
      const sharedArguments = {
        createRequestCommand: createUnexpectedCommand('create'),
        validateProjectCommand: buildCommand('validate'),
        applyProjectCommand: buildCommand('apply'),
        renameProjectResourceCommand: buildCommand('rename'),
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      };

      // Act
      const exitCodes = await Promise.all([
        runCli({ ...sharedArguments, commandArguments: ['validate', '--json'] }),
        runCli({ ...sharedArguments, commandArguments: ['apply', '--json'] }),
        runCli({
          ...sharedArguments,
          commandArguments: ['rename', 'request', 'old-handle', 'new-handle'],
        }),
      ]);

      // Assert
      assert.deepEqual(exitCodes, [0, 0, 0]);
      assert.deepEqual(invocations, [
        { commandName: 'validate', commandArguments: ['validate', '--json'] },
        { commandName: 'apply', commandArguments: ['apply', '--json'] },
        {
          commandName: 'rename',
          commandArguments: ['rename', 'request', 'old-handle', 'new-handle'],
        },
      ]);
    });

    it('should delegate read command arguments to ReadRequestCommand and return its exit code', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const commandArguments = ['read', 'widget', '--widget-handle', 'promo-banner'];
      const receivedCommandArguments = [];
      const readRequestCommand = {
        async run(incomingCommandArguments) {
          receivedCommandArguments.push(incomingCommandArguments);
          return 0;
        },
      };

      // Act
      const exitCode = await runCli({
        commandArguments,
        createRequestCommand: createUnexpectedCommand('create'),
        readRequestCommand,
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(receivedCommandArguments, [commandArguments]);
    });

    it('should delegate update command arguments to UpdateRequestCommand and return its exit code', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const commandArguments = ['update', 'variable', '--variable-handle', 'sale-banner', '--file', '/tmp/variable.json'];
      const receivedCommandArguments = [];
      const updateRequestCommand = {
        async run(incomingCommandArguments) {
          receivedCommandArguments.push(incomingCommandArguments);
          return 0;
        },
      };

      // Act
      const exitCode = await runCli({
        commandArguments,
        createRequestCommand: createUnexpectedCommand('create'),
        updateRequestCommand,
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(receivedCommandArguments, [commandArguments]);
    });

    it('should delegate delete command arguments to DeleteRequestCommand and return its exit code', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const commandArguments = ['delete', 'widget', '--widget-handle', 'promo-banner'];
      const receivedCommandArguments = [];
      const deleteRequestCommand = {
        async run(incomingCommandArguments) {
          receivedCommandArguments.push(incomingCommandArguments);
          return 0;
        },
      };

      // Act
      const exitCode = await runCli({
        commandArguments,
        createRequestCommand: createUnexpectedCommand('create'),
        deleteRequestCommand,
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(receivedCommandArguments, [commandArguments]);
    });

    it('should return one and write read usage output when function handle is missing', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const { ReadRequestCommand } = await import(createCliCommandModuleUrl('ReadRequestCommand.js'));
      const stderrChunks = [];
      const stderr = createWritableStream(stderrChunks);

      // Act
      const exitCode = await runCli({
        commandArguments: ['read', 'function'],
        createRequestCommand: createUnexpectedCommand('create'),
        readRequestCommand: new ReadRequestCommand({
          stdout: createWritableStream([]),
          stderr,
        }),
        updateRequestCommand: createUnexpectedCommand('update'),
        deleteRequestCommand: createUnexpectedCommand('delete'),
        stdout: createWritableStream([]),
        stderr,
      });

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stderrChunks.join(''), [
        'Missing required arguments: --function-handle',
        'Usage: apiease read function --function-handle <handle> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]',
        '',
        'Options:',
        '  --function-handle <handle>   APIEase function handle.',
        '  --function-id <id-or-handle> Compatibility alias; prefer --function-handle.',
        '  --base-url <url>            APIEase base URL. Defaults to ~/.apiease/.env.<environment>.',
        '  --shop-domain <shop-domain> Shopify shop domain. Defaults to ~/.apiease/.env.<environment>.',
        '  --api-key <api-key>         APIEase API key. Defaults to ~/.apiease home configuration.',
        '  --json                      Emit raw JSON output.',
        '',
      ].join('\n'));
    });

    it('should return one and write update usage output when function handle is missing', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const { UpdateRequestCommand } = await import(createCliCommandModuleUrl('UpdateRequestCommand.js'));
      const stderrChunks = [];
      const stderr = createWritableStream(stderrChunks);

      // Act
      const exitCode = await runCli({
        commandArguments: ['update', 'function', '--file', '/tmp/function.json'],
        createRequestCommand: createUnexpectedCommand('create'),
        readRequestCommand: createUnexpectedCommand('read'),
        updateRequestCommand: new UpdateRequestCommand({
          stdout: createWritableStream([]),
          stderr,
        }),
        deleteRequestCommand: createUnexpectedCommand('delete'),
        stdout: createWritableStream([]),
        stderr,
      });

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stderrChunks.join(''), [
        'Missing required arguments: --function-handle',
        'Usage: apiease update function --function-handle <handle> --file <path> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]',
        '',
        'Options:',
        '  --function-handle <handle>   APIEase function handle.',
        '  --function-id <id-or-handle> Compatibility alias; prefer --function-handle.',
        '  --file <path>               Path to the function definition JSON file.',
        '  --base-url <url>            APIEase base URL. Defaults to ~/.apiease/.env.<environment>.',
        '  --shop-domain <shop-domain> Shopify shop domain. Defaults to ~/.apiease/.env.<environment>.',
        '  --api-key <api-key>         APIEase API key. Defaults to ~/.apiease home configuration.',
        '  --json                      Emit raw JSON output.',
        '',
      ].join('\n'));
    });

    it('should return one and write delete usage output when function handle is missing', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const { DeleteRequestCommand } = await import(createCliCommandModuleUrl('DeleteRequestCommand.js'));
      const stderrChunks = [];
      const stderr = createWritableStream(stderrChunks);

      // Act
      const exitCode = await runCli({
        commandArguments: ['delete', 'function'],
        createRequestCommand: createUnexpectedCommand('create'),
        readRequestCommand: createUnexpectedCommand('read'),
        updateRequestCommand: createUnexpectedCommand('update'),
        deleteRequestCommand: new DeleteRequestCommand({
          stdout: createWritableStream([]),
          stderr,
        }),
        stdout: createWritableStream([]),
        stderr,
      });

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stderrChunks.join(''), [
        'Missing required arguments: --function-handle',
        'Usage: apiease delete function --function-handle <handle> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]',
        '',
        'Options:',
        '  --function-handle <handle>   APIEase function handle.',
        '  --function-id <id-or-handle> Compatibility alias; prefer --function-handle.',
        '  --base-url <url>            APIEase base URL. Defaults to ~/.apiease/.env.<environment>.',
        '  --shop-domain <shop-domain> Shopify shop domain. Defaults to ~/.apiease/.env.<environment>.',
        '  --api-key <api-key>         APIEase API key. Defaults to ~/.apiease home configuration.',
        '  --json                      Emit raw JSON output.',
        '',
      ].join('\n'));
    });

    it('should delegate upgrade command arguments to UpgradeProjectCommand and return its exit code', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const commandArguments = ['upgrade', '--check'];
      const receivedCommandArguments = [];
      const upgradeProjectCommand = {
        async run(incomingCommandArguments) {
          receivedCommandArguments.push(incomingCommandArguments);
          return 0;
        },
      };
      const createRequestCommand = {
        async run() {
          throw new Error('create command should not run');
        },
      };

      // Act
      const exitCode = await runCli({
        commandArguments,
        createRequestCommand,
        initProjectCommand: {
          async run() {
            throw new Error('init command should not run');
          },
        },
        upgradeProjectCommand,
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(receivedCommandArguments, [commandArguments]);
    });

    it('should return zero and write the cli version when the version flag is provided', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const packageJson = await readPackageJson();
      const stdoutChunks = [];

      // Act
      const exitCode = await runCli({
        commandArguments: ['--version'],
        createRequestCommand: createUnexpectedCommand('create'),
        readRequestCommand: createUnexpectedCommand('read'),
        updateRequestCommand: createUnexpectedCommand('update'),
        deleteRequestCommand: createUnexpectedCommand('delete'),
        initProjectCommand: createUnexpectedCommand('init'),
        upgradeProjectCommand: createUnexpectedCommand('upgrade'),
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream([]),
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(stdoutChunks.join(''), `${packageJson.version}\n`);
    });

    it('should return zero and write public help to stdout when the help flag is provided', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const stdoutChunks = [];
      const stderrChunks = [];

      // Act
      const exitCode = await runCli({
        commandArguments: ['--help'],
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.match(stdoutChunks.join(''), /pull\s+Pull verified Project API resources\./);
      assert.match(stdoutChunks.join(''), /design-context --project-requirements <json>/);
      assert.doesNotMatch(stdoutChunks.join(''), /\btest\b/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should build every project command with one shared Project API dependency graph', async () => {
      // Arrange
      const { buildProjectCommands } = await import(entrypointModuleUrl);

      // Act
      const projectCommands = buildProjectCommands({
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });
      const {
        initProjectCommand,
        pullProjectCommand,
        designContextCommand,
        validateProjectCommand,
        applyProjectCommand,
        renameProjectResourceCommand,
      } = projectCommands;

      // Assert
      assert.equal(
        initProjectCommand.personalProjectAuthenticationAdapter,
        pullProjectCommand.personalProjectAuthenticationAdapter,
      );
      assert.equal(
        initProjectCommand.projectSynchronizationService,
        pullProjectCommand.projectSynchronizationService,
      );
      assert.equal(
        initProjectCommand.projectGitCheckoutService,
        pullProjectCommand.projectGitCheckoutService,
      );
      assert.equal(
        initProjectCommand.projectCommandResultService,
        pullProjectCommand.projectCommandResultService,
      );
      assert.equal(
        validateProjectCommand.personalProjectAuthenticationAdapter,
        initProjectCommand.personalProjectAuthenticationAdapter,
      );
      assert.equal(
        designContextCommand.personalProjectAuthenticationAdapter,
        initProjectCommand.personalProjectAuthenticationAdapter,
      );
      assert.equal(
        designContextCommand.projectDesignContextService.apiEaseProjectApiClient,
        validateProjectCommand.projectValidationService.apiEaseProjectApiClient,
      );
      assert.equal(
        designContextCommand.projectDesignContextService.projectCandidateBuilder,
        validateProjectCommand.projectValidationService.projectCandidateBuilder,
      );
      assert.equal(
        applyProjectCommand.personalProjectAuthenticationAdapter,
        initProjectCommand.personalProjectAuthenticationAdapter,
      );
      assert.equal(
        validateProjectCommand.projectValidationService.apiEaseProjectApiClient,
        initProjectCommand.projectSynchronizationService.apiEaseProjectApiClient,
      );
      assert.equal(
        applyProjectCommand.projectApplyService.projectCandidateBuilder,
        validateProjectCommand.projectValidationService.projectCandidateBuilder,
      );
      assert.equal(
        renameProjectResourceCommand.projectRenameService.projectLocalStateService,
        applyProjectCommand.projectApplyService.projectLocalStateService,
      );
      assert.equal(
        renameProjectResourceCommand.projectCommandResultService,
        initProjectCommand.projectCommandResultService,
      );
    });

    it('should wire one resolved authentication adapter without worker proposal context', async () => {
      // Arrange
      const { buildProjectCommands } = await import(entrypointModuleUrl);
      const projectAuthenticationAdapter = {
        readAuthorityMode: () => 'bearer',
      };
      const projectCommandAuthenticationContextResolver = {
        resolveContext: () => ({
          projectAuthenticationAdapter,
        }),
      };

      // Act
      const projectCommands = buildProjectCommands({
        projectCommandAuthenticationContextResolver,
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Assert
      assert.equal(
        projectCommands.initProjectCommand.personalProjectAuthenticationAdapter,
        projectAuthenticationAdapter,
      );
      assert.equal(
        projectCommands.applyProjectCommand.projectApplyService
          .projectApplyRequestPolicy.personalProjectAuthenticationAdapter,
        projectAuthenticationAdapter,
      );
    });

    it('should return one and write top-level usage output when the command is missing', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const stderrChunks = [];

      // Act
      const exitCode = await runCli({
        commandArguments: [],
        createRequestCommand: createUnexpectedCommand('create'),
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stderrChunks.join(''), [
        'Missing command.',
        'Usage: apiease <command> [options]',
        '',
        'Commands:',
        '  create <request|widget|variable|function>   Create a resource from a definition file.',
        '  read <request|widget|variable|function>     Read a resource by identifier.',
        '  update <request|widget|variable|function>   Update a resource by identifier from a definition file.',
        '  delete <request|widget|variable|function>   Delete a resource by identifier.',
        '  init [project-name] [--from-existing-resources]   Initialize a new APIEase project.',
        '  pull                              Pull verified Project API resources.',
        '  design-context --project-requirements <json>   Retrieve verified Project Design Protocol context.',
        '  validate                          Validate the complete project without execution.',
        '  apply [--require-approval]        Apply immediately or submit for deferred approval.',
        '  rename <resource-type> <old-handle> <new-handle>   Rename a bound project resource.',
        '  upgrade                           Upgrade an existing APIEase project.',
        '',
        'Options:',
        '  --base-url <url>                  APIEase base URL.',
        '  --shop-domain <shop-domain>       Shopify shop domain.',
        '  --api-key <api-key>               APIEase API key.',
        '  --bearer-token <token>            Single-use Project API bearer token.',
        '  --require-approval                Submit an immutable proposal without live mutation.',
        '  --json                            Emit one JSON result document.',
        '  --help                            Show this help.',
        '  --version                         Print the installed apiease CLI version.',
        '',
      ].join('\n'));
    });

    it('should return one and write top-level usage output when a crud command is missing the resource argument', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const stderrChunks = [];

      // Act
      const exitCode = await runCli({
        commandArguments: ['create'],
        createRequestCommand: createUnexpectedCommand('create'),
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stderrChunks.join(''), [
        'Missing required resource argument for create.',
        'Usage: apiease <command> [options]',
        '',
        'Commands:',
        '  create <request|widget|variable|function>   Create a resource from a definition file.',
        '  read <request|widget|variable|function>     Read a resource by identifier.',
        '  update <request|widget|variable|function>   Update a resource by identifier from a definition file.',
        '  delete <request|widget|variable|function>   Delete a resource by identifier.',
        '  init [project-name] [--from-existing-resources]   Initialize a new APIEase project.',
        '  pull                              Pull verified Project API resources.',
        '  design-context --project-requirements <json>   Retrieve verified Project Design Protocol context.',
        '  validate                          Validate the complete project without execution.',
        '  apply [--require-approval]        Apply immediately or submit for deferred approval.',
        '  rename <resource-type> <old-handle> <new-handle>   Rename a bound project resource.',
        '  upgrade                           Upgrade an existing APIEase project.',
        '',
        'Options:',
        '  --base-url <url>                  APIEase base URL.',
        '  --shop-domain <shop-domain>       Shopify shop domain.',
        '  --api-key <api-key>               APIEase API key.',
        '  --bearer-token <token>            Single-use Project API bearer token.',
        '  --require-approval                Submit an immutable proposal without live mutation.',
        '  --json                            Emit one JSON result document.',
        '  --help                            Show this help.',
        '  --version                         Print the installed apiease CLI version.',
        '',
      ].join('\n'));
    });

    it('should return one and write top-level usage output when a legacy bare crud shape passes an identifier flag where the resource is required', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const stderrChunks = [];

      // Act
      const exitCode = await runCli({
        commandArguments: ['read', '--request-id', 'request-123'],
        readRequestCommand: createUnexpectedCommand('read'),
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stderrChunks.join(''), [
        'Missing required resource argument for read.',
        'Usage: apiease <command> [options]',
        '',
        'Commands:',
        '  create <request|widget|variable|function>   Create a resource from a definition file.',
        '  read <request|widget|variable|function>     Read a resource by identifier.',
        '  update <request|widget|variable|function>   Update a resource by identifier from a definition file.',
        '  delete <request|widget|variable|function>   Delete a resource by identifier.',
        '  init [project-name] [--from-existing-resources]   Initialize a new APIEase project.',
        '  pull                              Pull verified Project API resources.',
        '  design-context --project-requirements <json>   Retrieve verified Project Design Protocol context.',
        '  validate                          Validate the complete project without execution.',
        '  apply [--require-approval]        Apply immediately or submit for deferred approval.',
        '  rename <resource-type> <old-handle> <new-handle>   Rename a bound project resource.',
        '  upgrade                           Upgrade an existing APIEase project.',
        '',
        'Options:',
        '  --base-url <url>                  APIEase base URL.',
        '  --shop-domain <shop-domain>       Shopify shop domain.',
        '  --api-key <api-key>               APIEase API key.',
        '  --bearer-token <token>            Single-use Project API bearer token.',
        '  --require-approval                Submit an immutable proposal without live mutation.',
        '  --json                            Emit one JSON result document.',
        '  --help                            Show this help.',
        '  --version                         Print the installed apiease CLI version.',
        '',
      ].join('\n'));
    });

    it('should return one and write top-level usage output when a crud command resource is unsupported', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const stderrChunks = [];

      // Act
      const exitCode = await runCli({
        commandArguments: ['read', 'thing'],
        readRequestCommand: createUnexpectedCommand('read'),
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stderrChunks.join(''), [
        'Unsupported resource for read: thing.',
        'Usage: apiease <command> [options]',
        '',
        'Commands:',
        '  create <request|widget|variable|function>   Create a resource from a definition file.',
        '  read <request|widget|variable|function>     Read a resource by identifier.',
        '  update <request|widget|variable|function>   Update a resource by identifier from a definition file.',
        '  delete <request|widget|variable|function>   Delete a resource by identifier.',
        '  init [project-name] [--from-existing-resources]   Initialize a new APIEase project.',
        '  pull                              Pull verified Project API resources.',
        '  design-context --project-requirements <json>   Retrieve verified Project Design Protocol context.',
        '  validate                          Validate the complete project without execution.',
        '  apply [--require-approval]        Apply immediately or submit for deferred approval.',
        '  rename <resource-type> <old-handle> <new-handle>   Rename a bound project resource.',
        '  upgrade                           Upgrade an existing APIEase project.',
        '',
        'Options:',
        '  --base-url <url>                  APIEase base URL.',
        '  --shop-domain <shop-domain>       Shopify shop domain.',
        '  --api-key <api-key>               APIEase API key.',
        '  --bearer-token <token>            Single-use Project API bearer token.',
        '  --require-approval                Submit an immutable proposal without live mutation.',
        '  --json                            Emit one JSON result document.',
        '  --help                            Show this help.',
        '  --version                         Print the installed apiease CLI version.',
        '',
      ].join('\n'));
    });

    it('should return one and write top-level usage output when an unsupported top-level flag is provided', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const stderrChunks = [];

      // Act
      const exitCode = await runCli({
        commandArguments: ['-v'],
        createRequestCommand: createUnexpectedCommand('create'),
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stderrChunks.join(''), [
        'Unknown command: -v',
        'Usage: apiease <command> [options]',
        '',
        'Commands:',
        '  create <request|widget|variable|function>   Create a resource from a definition file.',
        '  read <request|widget|variable|function>     Read a resource by identifier.',
        '  update <request|widget|variable|function>   Update a resource by identifier from a definition file.',
        '  delete <request|widget|variable|function>   Delete a resource by identifier.',
        '  init [project-name] [--from-existing-resources]   Initialize a new APIEase project.',
        '  pull                              Pull verified Project API resources.',
        '  design-context --project-requirements <json>   Retrieve verified Project Design Protocol context.',
        '  validate                          Validate the complete project without execution.',
        '  apply [--require-approval]        Apply immediately or submit for deferred approval.',
        '  rename <resource-type> <old-handle> <new-handle>   Rename a bound project resource.',
        '  upgrade                           Upgrade an existing APIEase project.',
        '',
        'Options:',
        '  --base-url <url>                  APIEase base URL.',
        '  --shop-domain <shop-domain>       Shopify shop domain.',
        '  --api-key <api-key>               APIEase API key.',
        '  --bearer-token <token>            Single-use Project API bearer token.',
        '  --require-approval                Submit an immutable proposal without live mutation.',
        '  --json                            Emit one JSON result document.',
        '  --help                            Show this help.',
        '  --version                         Print the installed apiease CLI version.',
        '',
      ].join('\n'));
    });

    it('should return one and write a generic human-readable failure when an unexpected runtime error is thrown', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const stderrChunks = [];
      const readRequestCommand = {
        async run() {
          throw new Error('Unexpected boom');
        },
      };

      // Act
      const exitCode = await runCli({
        commandArguments: ['read', 'request'],
        readRequestCommand,
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stderrChunks.join(''), [
        'Command failed.',
        'Error Code: UNEXPECTED_CLI_ERROR',
        'Message: Unexpected boom',
        'Status: 500',
        '',
      ].join('\n'));
    });

    it('should return one and write a structured json failure when an unexpected runtime error is thrown', async () => {
      // Arrange
      const { runCli } = await import(entrypointModuleUrl);
      const stderrChunks = [];
      const createRequestCommand = {
        async run() {
          throw new Error('Unexpected boom');
        },
      };

      // Act
      const exitCode = await runCli({
        commandArguments: ['create', 'request', '--json'],
        createRequestCommand,
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Assert
      assert.equal(exitCode, 1);
      assert.deepEqual(JSON.parse(stderrChunks.join('')), {
        status: 500,
        ok: false,
        errorCode: 'UNEXPECTED_CLI_ERROR',
        message: 'Unexpected boom',
        fieldErrors: [],
      });
    });
  });

  describe('entrypoint file', () => {
    it('should declare the node shebang so the script is directly executable', async () => {
      // Arrange
      const entrypointFilePath = path.join(projectDirectoryPath, 'bin', 'apiease-cli.js');

      // Act
      const entrypointFileContent = await fs.readFile(entrypointFilePath, 'utf8');

      // Assert
      assert.equal(entrypointFileContent.startsWith('#!/usr/bin/env node\n'), true);
    });

    it('should preserve the executable file mode for direct invocation', async () => {
      // Arrange
      const entrypointFilePath = path.join(projectDirectoryPath, 'bin', 'apiease-cli.js');

      // Act
      const entrypointFileStats = await fs.stat(entrypointFilePath);

      // Assert
      assert.notEqual(entrypointFileStats.mode & 0o100, 0);
    });
  });

  describe('bash wrapper', () => {
    it('should resolve the project bin directory when invoked through a symlink and forward arguments unchanged', async () => {
      // Arrange
      const wrapperFilePath = path.join(projectDirectoryPath, 'bin', 'apiease-cli');
      const temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-cli-wrapper-'));
      const symlinkDirectoryPath = path.join(temporaryDirectoryPath, 'bin');
      const fakeNodeDirectoryPath = path.join(temporaryDirectoryPath, 'fake-node-bin');
      const captureFilePath = path.join(temporaryDirectoryPath, 'captured.json');
      const workingDirectoryPath = path.join(temporaryDirectoryPath, 'working-directory');

      await fs.mkdir(symlinkDirectoryPath, { recursive: true });
      await fs.mkdir(fakeNodeDirectoryPath, { recursive: true });
      await fs.mkdir(workingDirectoryPath, { recursive: true });
      await fs.symlink(wrapperFilePath, path.join(symlinkDirectoryPath, 'apiease-cli'));
      await fs.writeFile(
        path.join(fakeNodeDirectoryPath, 'node'),
        [
          '#!/usr/bin/env bash',
          'set -euo pipefail',
          'capture_file_path="$CAPTURE_FILE_PATH"',
          'printf \'{"entrypointPath":"%s","forwardedArguments":["%s","%s","%s","%s"],"workingDirectoryPath":"%s"}\' "$1" "$2" "$3" "$4" "$5" "$PWD" > "$capture_file_path"',
          'exit 0',
          '',
        ].join('\n'),
        { mode: 0o755 },
      );

      const resolvedWorkingDirectoryPath = await fs.realpath(workingDirectoryPath);

      // Act
      const wrapperExitCode = await runShellScript({
        command: path.join(symlinkDirectoryPath, 'apiease-cli'),
        commandArguments: ['create', 'request', '--file', '/tmp/request.json'],
        currentWorkingDirectoryPath: workingDirectoryPath,
        environmentVariables: {
          ...process.env,
          PATH: `${fakeNodeDirectoryPath}:${process.env.PATH}`,
          CAPTURE_FILE_PATH: captureFilePath,
        },
      });
      const capturedInvocation = JSON.parse(await fs.readFile(captureFilePath, 'utf8'));

      // Assert
      assert.equal(wrapperExitCode, 0);
      assert.deepEqual(capturedInvocation, {
        entrypointPath: path.join(projectDirectoryPath, 'bin', 'apiease-cli.js'),
        forwardedArguments: ['create', 'request', '--file', '/tmp/request.json'],
        workingDirectoryPath: resolvedWorkingDirectoryPath,
      });
    });

    it('should exit with the same status code returned by the node entrypoint process', async () => {
      // Arrange
      const wrapperFilePath = path.join(projectDirectoryPath, 'bin', 'apiease-cli');
      const temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-cli-wrapper-exit-code-'));
      const fakeNodeDirectoryPath = path.join(temporaryDirectoryPath, 'fake-node-bin');
      const workingDirectoryPath = path.join(temporaryDirectoryPath, 'working-directory');

      await fs.mkdir(fakeNodeDirectoryPath, { recursive: true });
      await fs.mkdir(workingDirectoryPath, { recursive: true });
      await fs.writeFile(
        path.join(fakeNodeDirectoryPath, 'node'),
        ['#!/usr/bin/env bash', 'exit 17', ''].join('\n'),
        { mode: 0o755 },
      );

      // Act
      const wrapperExitCode = await runShellScript({
        command: wrapperFilePath,
        commandArguments: ['create', 'request'],
        currentWorkingDirectoryPath: workingDirectoryPath,
        environmentVariables: {
          ...process.env,
          PATH: `${fakeNodeDirectoryPath}:${process.env.PATH}`,
        },
      });

      // Assert
      assert.equal(wrapperExitCode, 17);
    });
  });
});

function createWritableStream(chunks) {
  return {
    write(chunk) {
      chunks.push(chunk);
    },
  };
}

function createCliCommandModuleUrl(fileName) {
  return pathToFileURL(path.join(projectDirectoryPath, 'src', 'cli', fileName)).href;
}

function createUnexpectedCommand(commandName) {
  return {
    async run() {
      throw new Error(`${commandName} command should not run`);
    },
  };
}

async function readPackageJson() {
  const packageJsonPath = path.join(projectDirectoryPath, 'package.json');
  const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');

  return JSON.parse(packageJsonContent);
}

async function runShellScript({
  command,
  commandArguments,
  currentWorkingDirectoryPath,
  environmentVariables,
}) {
  return await new Promise((resolve, reject) => {
    const childProcess = spawn(command, commandArguments, {
      cwd: currentWorkingDirectoryPath,
      env: environmentVariables,
      stdio: 'ignore',
    });

    childProcess.on('error', reject);
    childProcess.on('close', (exitCode) => {
      resolve(exitCode);
    });
  });
}
