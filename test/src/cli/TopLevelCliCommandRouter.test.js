import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TopLevelCliCommandRouter } from '../../../src/cli/TopLevelCliCommandRouter.js';

describe('TopLevelCliCommandRouter', () => {
  describe('resolveCommand', () => {
    it('should resolve a crud command for every supported resource argument', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();
      const createRequestCommand = { name: 'create' };
      const readRequestCommand = { name: 'read' };
      const updateRequestCommand = { name: 'update' };
      const deleteRequestCommand = { name: 'delete' };

      // Act
      const results = [
        topLevelCliCommandRouter.resolveCommand({
          commandArguments: ['create', 'request', '--file', '/tmp/request.json'],
          createRequestCommand,
          readRequestCommand,
          updateRequestCommand,
          deleteRequestCommand,
          initProjectCommand: { name: 'init' },
          upgradeProjectCommand: { name: 'upgrade' },
        }),
        topLevelCliCommandRouter.resolveCommand({
          commandArguments: ['read', 'widget', '--widget-id', 'widget-1'],
          createRequestCommand,
          readRequestCommand,
          updateRequestCommand,
          deleteRequestCommand,
          initProjectCommand: { name: 'init' },
          upgradeProjectCommand: { name: 'upgrade' },
        }),
        topLevelCliCommandRouter.resolveCommand({
          commandArguments: ['update', 'variable', '--variable-name', 'sale_banner', '--file', '/tmp/variable.json'],
          createRequestCommand,
          readRequestCommand,
          updateRequestCommand,
          deleteRequestCommand,
          initProjectCommand: { name: 'init' },
          upgradeProjectCommand: { name: 'upgrade' },
        }),
        topLevelCliCommandRouter.resolveCommand({
          commandArguments: ['delete', 'request', '--request-id', 'request-1'],
          createRequestCommand,
          readRequestCommand,
          updateRequestCommand,
          deleteRequestCommand,
          initProjectCommand: { name: 'init' },
          upgradeProjectCommand: { name: 'upgrade' },
        }),
      ];

      // Assert
      assert.deepEqual(results, [
        {
          ok: true,
          command: createRequestCommand,
        },
        {
          ok: true,
          command: readRequestCommand,
        },
        {
          ok: true,
          command: updateRequestCommand,
        },
        {
          ok: true,
          command: deleteRequestCommand,
        },
      ]);
    });

    it('should resolve create read update and delete for function resources', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();
      const createRequestCommand = { name: 'create' };
      const readRequestCommand = { name: 'read' };
      const updateRequestCommand = { name: 'update' };
      const deleteRequestCommand = { name: 'delete' };

      // Act
      const results = [
        topLevelCliCommandRouter.resolveCommand({
          commandArguments: ['create', 'function', '--file', '/tmp/function.json'],
          createRequestCommand,
          readRequestCommand,
          updateRequestCommand,
          deleteRequestCommand,
          initProjectCommand: { name: 'init' },
          upgradeProjectCommand: { name: 'upgrade' },
        }),
        topLevelCliCommandRouter.resolveCommand({
          commandArguments: ['read', 'function', '--function-id', 'function-1'],
          createRequestCommand,
          readRequestCommand,
          updateRequestCommand,
          deleteRequestCommand,
          initProjectCommand: { name: 'init' },
          upgradeProjectCommand: { name: 'upgrade' },
        }),
        topLevelCliCommandRouter.resolveCommand({
          commandArguments: ['update', 'function', '--function-id', 'function-1', '--file', '/tmp/function.json'],
          createRequestCommand,
          readRequestCommand,
          updateRequestCommand,
          deleteRequestCommand,
          initProjectCommand: { name: 'init' },
          upgradeProjectCommand: { name: 'upgrade' },
        }),
        topLevelCliCommandRouter.resolveCommand({
          commandArguments: ['delete', 'function', '--function-id', 'function-1'],
          createRequestCommand,
          readRequestCommand,
          updateRequestCommand,
          deleteRequestCommand,
          initProjectCommand: { name: 'init' },
          upgradeProjectCommand: { name: 'upgrade' },
        }),
      ];

      // Assert
      assert.deepEqual(results, [
        {
          ok: true,
          command: createRequestCommand,
        },
        {
          ok: true,
          command: readRequestCommand,
        },
        {
          ok: true,
          command: updateRequestCommand,
        },
        {
          ok: true,
          command: deleteRequestCommand,
        },
      ]);
    });

    it('should return a usage failure when a crud command is missing the resource argument', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();

      // Act
      const result = topLevelCliCommandRouter.resolveCommand({
        commandArguments: ['delete'],
        createRequestCommand: { name: 'create' },
        readRequestCommand: { name: 'read' },
        updateRequestCommand: { name: 'update' },
        deleteRequestCommand: { name: 'delete' },
        initProjectCommand: { name: 'init' },
        upgradeProjectCommand: { name: 'upgrade' },
      });

      // Assert
      assert.deepEqual(result, {
        ok: false,
        message: 'Missing required resource argument for delete.',
      });
    });

    it('should return a usage failure when a legacy bare crud shape provides an option flag instead of a resource argument', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();

      // Act
      const result = topLevelCliCommandRouter.resolveCommand({
        commandArguments: ['read', '--request-id', 'request-1'],
        createRequestCommand: { name: 'create' },
        readRequestCommand: { name: 'read' },
        updateRequestCommand: { name: 'update' },
        deleteRequestCommand: { name: 'delete' },
        initProjectCommand: { name: 'init' },
        upgradeProjectCommand: { name: 'upgrade' },
      });

      // Assert
      assert.deepEqual(result, {
        ok: false,
        message: 'Missing required resource argument for read.',
      });
    });

    it('should return a usage failure when a crud command resource is unsupported', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();

      // Act
      const result = topLevelCliCommandRouter.resolveCommand({
        commandArguments: ['update', 'gadget'],
        createRequestCommand: { name: 'create' },
        readRequestCommand: { name: 'read' },
        updateRequestCommand: { name: 'update' },
        deleteRequestCommand: { name: 'delete' },
        initProjectCommand: { name: 'init' },
        upgradeProjectCommand: { name: 'upgrade' },
      });

      // Assert
      assert.deepEqual(result, {
        ok: false,
        message: 'Unsupported resource for update: gadget.',
      });
    });

    it('should resolve init without requiring a resource argument', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();
      const initProjectCommand = { name: 'init' };

      // Act
      const result = topLevelCliCommandRouter.resolveCommand({
        commandArguments: ['init', 'my-project'],
        createRequestCommand: { name: 'create' },
        readRequestCommand: { name: 'read' },
        updateRequestCommand: { name: 'update' },
        deleteRequestCommand: { name: 'delete' },
        initProjectCommand,
        upgradeProjectCommand: { name: 'upgrade' },
      });

      // Assert
      assert.deepEqual(result, {
        ok: true,
        command: initProjectCommand,
      });
    });

    it('should resolve pull without requiring a resource argument', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();
      const pullProjectCommand = { name: 'pull' };

      // Act
      const result = topLevelCliCommandRouter.resolveCommand({
        commandArguments: ['pull', '--force'],
        createRequestCommand: { name: 'create' },
        readRequestCommand: { name: 'read' },
        updateRequestCommand: { name: 'update' },
        deleteRequestCommand: { name: 'delete' },
        initProjectCommand: { name: 'init' },
        pullProjectCommand,
        upgradeProjectCommand: { name: 'upgrade' },
      });

      // Assert
      assert.deepEqual(result, {
        ok: true,
        command: pullProjectCommand,
      });
    });

    it('should resolve design-context without CRUD resource validation', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();
      const designContextCommand = { name: 'design-context' };

      // Act
      const result = topLevelCliCommandRouter.resolveCommand({
        commandArguments: ['design-context', '--project-requirements', '{}'],
        designContextCommand,
      });

      // Assert
      assert.deepEqual(result, {
        ok: true,
        command: designContextCommand,
      });
    });

    it('should resolve validate apply and rename without CRUD resource validation', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();
      const validateProjectCommand = { name: 'validate' };
      const applyProjectCommand = { name: 'apply' };
      const renameProjectResourceCommand = { name: 'rename' };

      // Act
      const results = [
        topLevelCliCommandRouter.resolveCommand({
          commandArguments: ['validate', '--json'],
          validateProjectCommand,
        }),
        topLevelCliCommandRouter.resolveCommand({
          commandArguments: ['apply', '--json'],
          applyProjectCommand,
        }),
        topLevelCliCommandRouter.resolveCommand({
          commandArguments: ['rename', 'request', 'old-handle', 'new-handle'],
          renameProjectResourceCommand,
        }),
      ];

      // Assert
      assert.deepEqual(results, [
        { ok: true, command: validateProjectCommand },
        { ok: true, command: applyProjectCommand },
        { ok: true, command: renameProjectResourceCommand },
      ]);
    });

    it('should resolve the help flag as successful top-level help', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();

      // Act
      const result = topLevelCliCommandRouter.resolveCommand({
        commandArguments: ['--help'],
      });

      // Assert
      assert.deepEqual(result, {
        ok: true,
        help: true,
      });
    });

    it('should resolve the version flag without requiring a resource argument', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();
      const versionCommand = { name: 'version' };

      // Act
      const result = topLevelCliCommandRouter.resolveCommand({
        commandArguments: ['--version'],
        createRequestCommand: { name: 'create' },
        readRequestCommand: { name: 'read' },
        updateRequestCommand: { name: 'update' },
        deleteRequestCommand: { name: 'delete' },
        initProjectCommand: { name: 'init' },
        upgradeProjectCommand: { name: 'upgrade' },
        versionCommand,
      });

      // Assert
      assert.deepEqual(result, {
        ok: true,
        command: versionCommand,
      });
    });
  });

  describe('buildUsageText', () => {
    it('should describe every implemented public command without advertising a test command', () => {
      // Arrange
      const topLevelCliCommandRouter = new TopLevelCliCommandRouter();

      // Act
      const usageText = topLevelCliCommandRouter.buildUsageText();

      // Assert
      assert.equal(usageText, [
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
      ].join('\n'));
      assert.doesNotMatch(usageText, /apiease-cli/);
      assert.doesNotMatch(usageText, /\btest\b/);
      assert.match(usageText, /--require-approval/);
      assert.match(usageText, /init \[project-name\] \[--from-existing-resources\]/);
    });
  });
});
