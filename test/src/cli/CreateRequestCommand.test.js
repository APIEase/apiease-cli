import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const createRequestCommandModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'cli', 'CreateRequestCommand.js'),
).href;

describe('CreateRequestCommand', () => {
  describe('environment selection', () => {
    it('should forward the selected environment to command configuration', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const configuration = { ok: true, apiKey: 'selected-key', apiBaseUrl: 'https://selected.example.com', shopDomain: 'selected.myshopify.com' };
      const calls = [];
      const command = new CreateRequestCommand({
        apiEaseCommandConfigurationResolver: {
          async resolveConfiguration(options) { calls.push(options); return configuration; },
        },
      });
      const parsed = command.parseCommandArguments([...['create', 'request', '--file', 'definition.json'], '--environment', 'staging']);

      // Act
      const result = await command.resolveCommandConfiguration(parsed);

      // Assert
      assert.equal(result, configuration);
      assert.equal(calls[0].explicitEnvironment, 'staging');
    });

    it('should preserve a missing environment value for validation instead of using the default', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const command = new CreateRequestCommand();

      // Act
      const parsed = command.parseCommandArguments([...['create', 'request', '--file', 'definition.json'], '--environment']);

      // Assert
      assert.equal(parsed.environment, '');
    });

    it('should report the selected environment failure without running the resource operation', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const stdoutChunks = [], stderrChunks = [], calls = [];
      const failure = { ok: false, errorCode: 'APIEASE_HOME_ENV_FILE_NOT_FOUND', message: 'Selected environment file was not found.', fieldErrors: [] };
      const command = new CreateRequestCommand({
        apiEaseCommandConfigurationResolver: {
          async resolveConfiguration(options) { calls.push(options); return failure; },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await command.run([...['create', 'request', '--file', 'definition.json'], '--environment', 'missing', '--json']);

      // Assert
      assert.equal(calls[0].explicitEnvironment, 'missing');
      assert.equal(exitCode, 1);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), failure);
      assert.equal(stderrChunks.join(''), '');
    });
  });

  describe('run', () => {
    it('should load the request file, call the create client, and return zero for human-readable success output', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const requestDefinition = {
        handle: 'create-product',
        name: 'Create product',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/products',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const loadRequestDefinitionCalls = [];
      const createRequestCalls = [];
      let resolveConfigurationCallCount = 0;
      const requestDefinitionFileLoader = {
        async loadRequestDefinition(filePath) {
          loadRequestDefinitionCalls.push(filePath);
          return {
            ok: true,
            requestDefinition,
          };
        },
      };
      const apiEaseCreateRequestClient = {
        async createRequest(options) {
          createRequestCalls.push(options);
          return {
            status: 201,
            ok: true,
            operation: 'created',
            shopDomain: 'cool-shop.myshopify.com',
            request: {
              id: 'request-1',
              ...requestDefinition,
            },
          };
        },
      };
      const apiEaseHomeConfigurationResolver = {
        async resolveConfiguration() {
          resolveConfigurationCallCount += 1;
          return {
            ok: true,
            apiKey: 'home-api-key',
          };
        },
      };
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader,
        apiEaseCreateRequestClient,
        apiEaseHomeConfigurationResolver,
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(loadRequestDefinitionCalls, ['/tmp/request.json']);
      assert.deepEqual(createRequestCalls, [
        {
          apiBaseUrl: 'https://apiease.example.com',
          apiKey: 'api-key-1',
          shopDomain: 'cool-shop.myshopify.com',
          request: requestDefinition,
        },
      ]);
      assert.equal(resolveConfigurationCallCount, 0);
      assert.match(stdoutChunks.join(''), /Request created successfully\./);
      assert.match(stdoutChunks.join(''), /Request Handle: create-product/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should report an updated request when create request updates an existing remote request', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const requestDefinition = {
        handle: 'create-product',
        name: 'Create product',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/products',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition,
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            return {
              status: 200,
              ok: true,
              operation: 'updated',
              request: {
                id: 'request-1',
                ...requestDefinition,
              },
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.match(stdoutChunks.join(''), /Request updated successfully\./);
      assert.doesNotMatch(stdoutChunks.join(''), /Request created successfully\./);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should load the widget file, call the handle-based create-or-update service, and return zero for human-readable updated output', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const widgetDefinition = {
        handle: 'promo-banner',
        name: 'Promo banner',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const loadRequestDefinitionCalls = [];
      const createOrUpdateResourceByHandleCalls = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition(filePath) {
            loadRequestDefinitionCalls.push(filePath);
            return {
              ok: true,
              requestDefinition: widgetDefinition,
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            throw new Error('request create client should not be used for widget resources');
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for widget resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle(options) {
            createOrUpdateResourceByHandleCalls.push(options);
            return {
              status: 200,
              ok: true,
              operation: 'updated',
              shopDomain: 'cool-shop.myshopify.com',
              widget: {
                ...widgetDefinition,
              },
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'widget',
        '--file',
        '/tmp/widget.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(loadRequestDefinitionCalls, ['/tmp/widget.json']);
      assert.deepEqual(createOrUpdateResourceByHandleCalls, [
        {
          resourceName: 'widget',
          apiBaseUrl: 'https://apiease.example.com',
          apiKey: 'api-key-1',
          shopDomain: 'cool-shop.myshopify.com',
          resourceHandle: 'promo-banner',
          resource: widgetDefinition,
          readFailureErrorCode: 'WIDGET_READ_FAILED',
          createFailureErrorCode: 'WIDGET_CREATE_FAILED',
          updateFailureErrorCode: 'WIDGET_UPDATE_FAILED',
        },
      ]);
      assert.match(stdoutChunks.join(''), /Widget updated successfully\./);
      assert.doesNotMatch(stdoutChunks.join(''), /Widget created successfully\./);
      assert.match(stdoutChunks.join(''), /Widget Handle: promo-banner/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should report a created widget when widget create-or-update creates a missing widget', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const widgetDefinition = {
        handle: 'promo-banner',
        name: 'Promo banner',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: widgetDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for widget resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle() {
            return {
              status: 201,
              ok: true,
              operation: 'created',
              shopDomain: 'cool-shop.myshopify.com',
              widget: {
                id: 'widget-1',
                ...widgetDefinition,
              },
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'widget',
        '--file',
        '/tmp/widget.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.match(stdoutChunks.join(''), /Widget created successfully\./);
      assert.doesNotMatch(stdoutChunks.join(''), /Widget updated successfully\./);
      assert.match(stdoutChunks.join(''), /Widget Handle: promo-banner/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should write raw json output when widget create-or-update creates a missing widget', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const widgetDefinition = {
        handle: 'promo-banner',
        name: 'Promo banner',
      };
      const result = {
        status: 201,
        ok: true,
        operation: 'created',
        widget: {
          id: 'widget-1',
          ...widgetDefinition,
        },
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: widgetDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for widget resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle() {
            return result;
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'widget',
        '--file',
        '/tmp/widget.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), result);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should write raw json output when widget create-or-update updates an existing widget', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const widgetDefinition = {
        handle: 'promo-banner',
        name: 'Promo banner',
      };
      const result = {
        status: 200,
        ok: true,
        operation: 'updated',
        widget: {
          id: 'widget-1',
          ...widgetDefinition,
        },
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: widgetDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for widget resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle() {
            return result;
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'widget',
        '--file',
        '/tmp/widget.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), result);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should surface widget handle lookup failures before creating a widget', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const widgetDefinition = {
        handle: 'promo-banner',
        name: 'Promo banner',
      };
      const stderrChunks = [];
      const createOrUpdateResourceByHandleCalls = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: widgetDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for widget resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle(options) {
            createOrUpdateResourceByHandleCalls.push(options);
            return {
              status: 503,
              ok: false,
              errorCode: 'WIDGET_READ_FAILED',
              message: 'Unable to read widget by handle.',
              fieldErrors: [],
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'widget',
        '--file',
        '/tmp/widget.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(createOrUpdateResourceByHandleCalls[0].readFailureErrorCode, 'WIDGET_READ_FAILED');
      assert.match(stderrChunks.join(''), /Widget creation failed\./);
      assert.match(stderrChunks.join(''), /Error Code: WIDGET_READ_FAILED/);
      assert.match(stderrChunks.join(''), /Status: 503/);
    });

    it('should load the variable file, call the handle-based create-or-update service, and return zero for human-readable updated output', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const variableDefinition = {
        handle: 'sale-banner',
        name: 'Sale banner',
        value: 'Spring sale',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const loadRequestDefinitionCalls = [];
      const createOrUpdateResourceByHandleCalls = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition(filePath) {
            loadRequestDefinitionCalls.push(filePath);
            return {
              ok: true,
              requestDefinition: variableDefinition,
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            throw new Error('request create client should not be used for variable resources');
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for variable resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle(options) {
            createOrUpdateResourceByHandleCalls.push(options);
            return {
              status: 200,
              ok: true,
              operation: 'updated',
              shopDomain: 'cool-shop.myshopify.com',
              variable: {
                ...variableDefinition,
              },
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'variable',
        '--file',
        '/tmp/variable.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(loadRequestDefinitionCalls, ['/tmp/variable.json']);
      assert.deepEqual(createOrUpdateResourceByHandleCalls, [
        {
          resourceName: 'variable',
          apiBaseUrl: 'https://apiease.example.com',
          apiKey: 'api-key-1',
          shopDomain: 'cool-shop.myshopify.com',
          resourceHandle: 'sale-banner',
          resource: variableDefinition,
          readFailureErrorCode: 'VARIABLE_READ_FAILED',
          createFailureErrorCode: 'VARIABLE_CREATE_FAILED',
          updateFailureErrorCode: 'VARIABLE_UPDATE_FAILED',
        },
      ]);
      assert.match(stdoutChunks.join(''), /Variable updated successfully\./);
      assert.doesNotMatch(stdoutChunks.join(''), /Variable created successfully\./);
      assert.match(stdoutChunks.join(''), /Variable Handle: sale-banner/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should report a created variable when variable create-or-update creates a missing variable', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const variableDefinition = {
        handle: 'sale-banner',
        name: 'Sale banner',
        value: 'Spring sale',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: variableDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for variable resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle() {
            return {
              status: 201,
              ok: true,
              operation: 'created',
              shopDomain: 'cool-shop.myshopify.com',
              variable: {
                id: 'variable-1',
                ...variableDefinition,
              },
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'variable',
        '--file',
        '/tmp/variable.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.match(stdoutChunks.join(''), /Variable created successfully\./);
      assert.doesNotMatch(stdoutChunks.join(''), /Variable updated successfully\./);
      assert.match(stdoutChunks.join(''), /Variable Handle: sale-banner/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should write raw json output when variable create-or-update creates a missing variable', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const variableDefinition = {
        handle: 'sale-banner',
        name: 'Sale banner',
        value: 'Spring sale',
      };
      const result = {
        status: 201,
        ok: true,
        operation: 'created',
        variable: {
          id: 'variable-1',
          ...variableDefinition,
        },
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: variableDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for variable resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle() {
            return result;
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'variable',
        '--file',
        '/tmp/variable.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), result);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should write raw json output when variable create-or-update updates an existing variable', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const variableDefinition = {
        handle: 'sale-banner',
        name: 'Sale banner',
        value: 'Spring sale',
      };
      const result = {
        status: 200,
        ok: true,
        operation: 'updated',
        variable: {
          id: 'variable-1',
          ...variableDefinition,
        },
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: variableDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for variable resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle() {
            return result;
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'variable',
        '--file',
        '/tmp/variable.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), result);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should surface variable handle lookup failures before creating a variable', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const variableDefinition = {
        handle: 'sale-banner',
        name: 'Sale banner',
        value: 'Spring sale',
      };
      const stderrChunks = [];
      const createOrUpdateResourceByHandleCalls = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: variableDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for variable resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle(options) {
            createOrUpdateResourceByHandleCalls.push(options);
            return {
              status: 503,
              ok: false,
              errorCode: 'VARIABLE_READ_FAILED',
              message: 'Unable to read variable by handle.',
              fieldErrors: [],
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'variable',
        '--file',
        '/tmp/variable.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(createOrUpdateResourceByHandleCalls[0].readFailureErrorCode, 'VARIABLE_READ_FAILED');
      assert.match(stderrChunks.join(''), /Variable creation failed\./);
      assert.match(stderrChunks.join(''), /Error Code: VARIABLE_READ_FAILED/);
      assert.match(stderrChunks.join(''), /Status: 503/);
    });

    it('should load the function file, call the handle-based create-or-update service, and return zero for human-readable updated output', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const functionDefinition = {
        handle: 'apply-discount',
        name: 'Apply discount',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const loadRequestDefinitionCalls = [];
      const createOrUpdateResourceByHandleCalls = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition(filePath) {
            loadRequestDefinitionCalls.push(filePath);
            return {
              ok: true,
              requestDefinition: functionDefinition,
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            throw new Error('request create client should not be used for function resources');
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for function resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle(options) {
            createOrUpdateResourceByHandleCalls.push(options);
            return {
              status: 200,
              ok: true,
              operation: 'updated',
              shopDomain: 'cool-shop.myshopify.com',
              function: {
                ...functionDefinition,
              },
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'function',
        '--file',
        '/tmp/function.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(loadRequestDefinitionCalls, ['/tmp/function.json']);
      assert.deepEqual(createOrUpdateResourceByHandleCalls, [
        {
          resourceName: 'function',
          apiBaseUrl: 'https://apiease.example.com',
          apiKey: 'api-key-1',
          shopDomain: 'cool-shop.myshopify.com',
          resourceHandle: 'apply-discount',
          resource: functionDefinition,
          readFailureErrorCode: 'FUNCTION_READ_FAILED',
          createFailureErrorCode: 'FUNCTION_CREATE_FAILED',
          updateFailureErrorCode: 'FUNCTION_UPDATE_FAILED',
        },
      ]);
      assert.match(stdoutChunks.join(''), /Function updated successfully\./);
      assert.doesNotMatch(stdoutChunks.join(''), /Function created successfully\./);
      assert.match(stdoutChunks.join(''), /Function Handle: apply-discount/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should report a created function when function create-or-update creates a missing function', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const functionDefinition = {
        handle: 'apply-discount',
        name: 'Apply discount',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: functionDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for function resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle() {
            return {
              status: 201,
              ok: true,
              operation: 'created',
              shopDomain: 'cool-shop.myshopify.com',
              function: {
                ...functionDefinition,
              },
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'function',
        '--file',
        '/tmp/function.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.match(stdoutChunks.join(''), /Function created successfully\./);
      assert.doesNotMatch(stdoutChunks.join(''), /Function updated successfully\./);
      assert.match(stdoutChunks.join(''), /Function Handle: apply-discount/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should write raw json output when function create-or-update creates a missing function', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const functionDefinition = {
        handle: 'apply-discount',
        name: 'Apply discount',
      };
      const result = {
        status: 201,
        ok: true,
        operation: 'created',
        function: {
          id: 'function-1',
          ...functionDefinition,
        },
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: functionDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for function resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle() {
            return result;
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'function',
        '--file',
        '/tmp/function.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), result);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should write raw json output when function create-or-update updates an existing function', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const functionDefinition = {
        handle: 'apply-discount',
        name: 'Apply discount',
      };
      const result = {
        status: 200,
        ok: true,
        operation: 'updated',
        function: {
          id: 'function-1',
          ...functionDefinition,
        },
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: functionDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for function resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle() {
            return result;
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'function',
        '--file',
        '/tmp/function.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), result);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should surface function handle lookup failures before creating a function', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const functionDefinition = {
        handle: 'apply-discount',
        name: 'Apply discount',
      };
      const stderrChunks = [];
      const createOrUpdateResourceByHandleCalls = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: functionDefinition,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            throw new Error(`direct resource create should not be used for function resources: ${JSON.stringify(options)}`);
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle(options) {
            createOrUpdateResourceByHandleCalls.push(options);
            return {
              status: 503,
              ok: false,
              errorCode: 'FUNCTION_READ_FAILED',
              message: 'Unable to read function by handle.',
              fieldErrors: [],
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'function',
        '--file',
        '/tmp/function.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(createOrUpdateResourceByHandleCalls[0].readFailureErrorCode, 'FUNCTION_READ_FAILED');
      assert.match(stderrChunks.join(''), /Function creation failed\./);
      assert.match(stderrChunks.join(''), /Error Code: FUNCTION_READ_FAILED/);
      assert.match(stderrChunks.join(''), /Status: 503/);
    });

    it('should resolve the api key from home configuration when the api key argument is omitted', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const requestDefinition = {
        handle: 'create-product',
        name: 'Create product',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/products',
      };
      const createRequestCalls = [];
      let resolveConfigurationCallCount = 0;
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition,
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest(options) {
            createRequestCalls.push(options);
            return {
              status: 201,
              ok: true,
              request: {
                id: 'request-1',
              },
            };
          },
        },
        apiEaseHomeConfigurationResolver: {
          async resolveEnvironmentVariables() {
            resolveConfigurationCallCount += 1;
            return {
              ok: true,
              environmentVariablesFilePath: '/tmp/home/.apiease/.env.staging',
              environmentVariables: {
                APIEASE_API_KEY: 'resolved-home-api-key',
              },
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(resolveConfigurationCallCount, 1);
      assert.deepEqual(createRequestCalls, [
        {
          apiBaseUrl: 'https://apiease.example.com',
          apiKey: 'resolved-home-api-key',
          shopDomain: 'cool-shop.myshopify.com',
          request: requestDefinition,
        },
      ]);
    });

    it('should prefer the explicit api key and skip home configuration resolution when both are available', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const requestDefinition = {
        handle: 'create-product',
        name: 'Create product',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/products',
      };
      const createRequestCalls = [];
      let resolveConfigurationCallCount = 0;
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition,
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest(options) {
            createRequestCalls.push(options);
            return {
              status: 201,
              ok: true,
              request: {
                id: 'request-1',
              },
            };
          },
        },
        apiEaseHomeConfigurationResolver: {
          async resolveConfiguration() {
            resolveConfigurationCallCount += 1;
            throw new Error('home configuration should not be resolved');
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'explicit-api-key',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(resolveConfigurationCallCount, 0);
      assert.deepEqual(createRequestCalls, [
        {
          apiBaseUrl: 'https://apiease.example.com',
          apiKey: 'explicit-api-key',
          shopDomain: 'cool-shop.myshopify.com',
          request: requestDefinition,
        },
      ]);
    });

    it('should resolve the base url and shop domain from home env variables when those arguments are omitted', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const requestDefinition = {
        handle: 'create-product',
        name: 'Create product',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/products',
      };
      const createRequestCalls = [];
      let resolveEnvironmentVariablesCallCount = 0;
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition,
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest(options) {
            createRequestCalls.push(options);
            return {
              status: 201,
              ok: true,
              request: {
                id: 'request-1',
              },
            };
          },
        },
        apiEaseHomeConfigurationResolver: {
          async resolveEnvironmentVariables() {
            resolveEnvironmentVariablesCallCount += 1;
            return {
              ok: true,
              environmentVariablesFilePath: '/tmp/home/.apiease/.env.staging',
              environmentVariables: {
                APIEASE_BASE_URL: 'https://apiease.example.com/from-home',
                APIEASE_SHOP_DOMAIN: 'home-shop.myshopify.com',
              },
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--api-key',
        'explicit-api-key',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(resolveEnvironmentVariablesCallCount, 1);
      assert.deepEqual(createRequestCalls, [
        {
          apiBaseUrl: 'https://apiease.example.com/from-home',
          apiKey: 'explicit-api-key',
          shopDomain: 'home-shop.myshopify.com',
          request: requestDefinition,
        },
      ]);
    });

    it('should write raw json output and return zero when the json flag is provided', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const result = {
        status: 201,
        ok: true,
        operation: 'created',
        shopDomain: 'cool-shop.myshopify.com',
        request: {
          id: 'request-1',
          type: 'http',
        },
      };
      const stdoutChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: {
                handle: 'create-product',
                type: 'http',
              },
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            return result;
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), result);
    });

    it('should write raw json output with updated operation when create request updates an existing remote request', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const result = {
        status: 200,
        ok: true,
        operation: 'updated',
        request: {
          id: 'request-1',
          handle: 'create-product',
          type: 'http',
        },
      };
      const stdoutChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: {
                handle: 'create-product',
                type: 'http',
              },
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            return result;
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(JSON.parse(stdoutChunks.join('')).operation, 'updated');
    });

    it('should fail fast with usage output when the resource argument is missing', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      let loadRequestDefinitionCallCount = 0;
      let createRequestCallCount = 0;
      let createResourceCallCount = 0;
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            loadRequestDefinitionCallCount += 1;
            return {
              ok: true,
              requestDefinition: {},
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            createRequestCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource() {
            createResourceCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        '--file',
        '/tmp/request.json',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(loadRequestDefinitionCallCount, 0);
      assert.equal(createRequestCallCount, 0);
      assert.equal(createResourceCallCount, 0);
      assert.match(stderrChunks.join(''), /Missing required resource argument\./);
      assert.match(stderrChunks.join(''), /Usage: apiease create <request\|widget\|variable\|function>/);
    });

    it('should fail before create when a request id exists without auto source identifier update', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      let createRequestCallCount = 0;
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: {
                id: 'lookup-discount',
                handle: 'lookup-discount',
                name: 'Lookup discount',
                type: 'http',
              },
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            createRequestCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(createRequestCallCount, 0);
      assert.match(stderrChunks.join(''), /Request ids are server-owned/);
      assert.match(stderrChunks.join(''), /--auto-update-source-identifier/);
    });

    it('should fail before create when a request handle is missing without auto source identifier update', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      let createRequestCallCount = 0;
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: {
                name: 'Lookup discount',
                type: 'http',
              },
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            createRequestCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(createRequestCallCount, 0);
      assert.match(stderrChunks.join(''), /Request handle is required/);
      assert.match(stderrChunks.join(''), /--auto-update-source-identifier/);
    });

    it('should allow a valid request handle before create', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const requestDefinition = {
        handle: 'lookup-discount',
        name: 'Lookup discount',
        type: 'http',
      };
      const validateRequestHandleCalls = [];
      const createRequestCalls = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition,
            };
          },
        },
        apiEaseRequestSourceIdentifierMigrationService: {
          validateRequestHandle(handle) {
            validateRequestHandleCalls.push(handle);
            return {
              ok: true,
              handle,
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest(options) {
            createRequestCalls.push(options);
            return {
              status: 201,
              ok: true,
              request: {
                id: 'request-1',
                ...requestDefinition,
              },
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(validateRequestHandleCalls, ['lookup-discount']);
      assert.equal(createRequestCalls[0].request, requestDefinition);
    });

    it('should fail before create when a request handle is invalid', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      let createRequestCallCount = 0;
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: {
                handle: 'Lookup Discount',
                name: 'Lookup discount',
                type: 'http',
              },
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            createRequestCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(createRequestCallCount, 0);
      assert.match(stderrChunks.join(''), /Request handle must use lowercase letters/);
    });

    it('should migrate the request source identifier before create when auto source identifier update is set', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const createRequestCalls = [];
      const sourceRequestDefinition = {
        id: 'lookup-discount',
        name: 'Lookup discount',
        type: 'http',
        method: 'GET',
        address: 'https://api.example.com/discounts',
      };
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: sourceRequestDefinition,
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest(options) {
            createRequestCalls.push(options);
            return {
              status: 201,
              ok: true,
              request: {
                id: 'request-1',
              },
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--auto-update-source-identifier',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(createRequestCalls[0].request, {
        handle: 'lookup-discount',
        name: 'Lookup discount',
        type: 'http',
        method: 'GET',
        address: 'https://api.example.com/discounts',
      });
    });

    it('should write the migrated request source file before create when auto source identifier update is set', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const createRequestCalls = [];
      const writeResourceDefinitionCalls = [];
      const sourceRequestDefinition = {
        id: 'lookup-discount',
        name: 'Lookup discount',
        type: 'http',
        method: 'GET',
        address: 'https://api.example.com/discounts',
      };
      const migratedRequestDefinition = {
        handle: 'lookup-discount',
        name: 'Lookup discount',
        type: 'http',
        method: 'GET',
        address: 'https://api.example.com/discounts',
      };
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: sourceRequestDefinition,
            };
          },
        },
        resourceDefinitionFileWriter: {
          async writeResourceDefinition(options) {
            writeResourceDefinitionCalls.push(options);
            return {
              ok: true,
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest(options) {
            createRequestCalls.push(options);
            return {
              status: 201,
              ok: true,
              request: {
                id: 'request-1',
              },
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--auto-update-source-identifier',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(writeResourceDefinitionCalls, [
        {
          filePath: '/tmp/request.json',
          resourceDefinition: migratedRequestDefinition,
        },
      ]);
      assert.deepEqual(createRequestCalls[0].request, migratedRequestDefinition);
    });

    it('should return the write failure and skip create when the migrated request source file cannot be written', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      let createRequestCallCount = 0;
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: {
                id: 'lookup-discount',
                name: 'Lookup discount',
                type: 'http',
              },
            };
          },
        },
        resourceDefinitionFileWriter: {
          async writeResourceDefinition() {
            return {
              ok: false,
              errorCode: 'RESOURCE_DEFINITION_FILE_WRITE_FAILED',
              message: 'Resource definition file could not be written: /tmp/request.json',
              fieldErrors: [],
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            createRequestCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--auto-update-source-identifier',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(createRequestCallCount, 0);
      assert.match(stderrChunks.join(''), /Resource definition file could not be written/);
    });

    it('should migrate legacy widget fields and write the source file before create when auto source identifier update is set', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const createOrUpdateResourceByHandleCalls = [];
      const writeResourceDefinitionCalls = [];
      const sourceWidgetDefinition = {
        widgetId: 'server-owned-widget-id',
        widgetHandle: 'promo-banner',
        widgetName: 'Promo Banner',
        liquid: '<section>Promo</section>',
      };
      const migratedWidgetDefinition = {
        handle: 'promo-banner',
        name: 'Promo Banner',
        liquid: '<section>Promo</section>',
      };
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: sourceWidgetDefinition,
            };
          },
        },
        resourceDefinitionFileWriter: {
          async writeResourceDefinition(options) {
            writeResourceDefinitionCalls.push(options);
            return {
              ok: true,
            };
          },
        },
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle(options) {
            createOrUpdateResourceByHandleCalls.push(options);
            return {
              status: 201,
              ok: true,
              operation: 'created',
              widget: migratedWidgetDefinition,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'widget',
        '--file',
        '/tmp/widget.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--auto-update-source-identifier',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(writeResourceDefinitionCalls, [
        {
          filePath: '/tmp/widget.json',
          resourceDefinition: migratedWidgetDefinition,
        },
      ]);
      assert.equal(createOrUpdateResourceByHandleCalls[0].resourceName, 'widget');
      assert.equal(createOrUpdateResourceByHandleCalls[0].resourceHandle, 'promo-banner');
      assert.deepEqual(createOrUpdateResourceByHandleCalls[0].resource, migratedWidgetDefinition);
    });

    it('should fail before widget create when auto source identifier update cannot infer a handle', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      let createResourceCallCount = 0;
      let writeResourceDefinitionCallCount = 0;
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: {
                widgetName: '!!!',
                liquid: '<section>Promo</section>',
              },
            };
          },
        },
        resourceDefinitionFileWriter: {
          async writeResourceDefinition() {
            writeResourceDefinitionCallCount += 1;
            return {
              ok: true,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource() {
            createResourceCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'widget',
        '--file',
        '/tmp/widget.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--auto-update-source-identifier',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(writeResourceDefinitionCallCount, 0);
      assert.equal(createResourceCallCount, 0);
      assert.match(stderrChunks.join(''), /Widget handle cannot be inferred/);
    });

    it('should fail fast with usage output when the resource argument is unsupported', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      let loadRequestDefinitionCallCount = 0;
      let createRequestCallCount = 0;
      let createResourceCallCount = 0;
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            loadRequestDefinitionCallCount += 1;
            return {
              ok: true,
              requestDefinition: {},
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            createRequestCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource() {
            createResourceCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'product',
        '--file',
        '/tmp/product.json',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(loadRequestDefinitionCallCount, 0);
      assert.equal(createRequestCallCount, 0);
      assert.equal(createResourceCallCount, 0);
      assert.match(stderrChunks.join(''), /Unsupported resource: product\./);
      assert.match(stderrChunks.join(''), /Usage: apiease create <request\|widget\|variable\|function>/);
    });

    it('should fail fast with usage output and no delegated calls when required arguments are missing', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      let loadRequestDefinitionCallCount = 0;
      let createRequestCallCount = 0;
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            loadRequestDefinitionCallCount += 1;
            return {
              ok: true,
              requestDefinition: {},
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            createRequestCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        apiEaseHomeConfigurationResolver: {
          async resolveEnvironmentVariables() {
            return {
              ok: true,
              environmentVariablesFilePath: '/tmp/home/.apiease/.env.staging',
              environmentVariables: {
                APIEASE_API_KEY: 'resolved-home-api-key',
              },
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(loadRequestDefinitionCallCount, 0);
      assert.equal(createRequestCallCount, 0);
      assert.match(stderrChunks.join(''), /Usage:/);
      assert.match(stderrChunks.join(''), /--shop-domain/);
      assert.doesNotMatch(stderrChunks.join(''), /Missing required arguments: .*--api-key/);
    });

    it('should fail fast with usage output when base url and shop domain are omitted and not present in home env variables', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      let loadRequestDefinitionCallCount = 0;
      let createRequestCallCount = 0;
      let resolveEnvironmentVariablesCallCount = 0;
      const stderrChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            loadRequestDefinitionCallCount += 1;
            return {
              ok: true,
              requestDefinition: {},
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            createRequestCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        apiEaseHomeConfigurationResolver: {
          async resolveEnvironmentVariables() {
            resolveEnvironmentVariablesCallCount += 1;
            return {
              ok: true,
              environmentVariablesFilePath: '/tmp/home/.apiease/.env.staging',
              environmentVariables: {},
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--api-key',
        'explicit-api-key',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(resolveEnvironmentVariablesCallCount, 1);
      assert.equal(loadRequestDefinitionCallCount, 0);
      assert.equal(createRequestCallCount, 0);
      assert.match(stderrChunks.join(''), /Missing required arguments: --base-url, --shop-domain/);
      assert.match(stderrChunks.join(''), /Usage:/);
    });

    it('should return non-zero and write raw json when the create client fails in json mode', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      const result = {
        status: 422,
        ok: false,
        errorCode: 'INVALID_REQUEST_CREATE_CONTRACT',
        message: 'Request create payload is invalid',
        fieldErrors: [
          {
            path: 'type',
            code: 'REQUIRED',
            message: 'Field is required',
          },
        ],
      };
      const stdoutChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: {
                handle: 'create-product',
              },
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            return result;
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--api-key',
        'api-key-1',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), result);
    });

    it('should return non-zero and write the home configuration failure result when api key resolution fails', async () => {
      // Arrange
      const { CreateRequestCommand } = await import(createRequestCommandModuleUrl);
      let loadRequestDefinitionCallCount = 0;
      let createRequestCallCount = 0;
      const stdoutChunks = [];
      const createRequestCommand = new CreateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            loadRequestDefinitionCallCount += 1;
            return {
              ok: true,
              requestDefinition: {},
            };
          },
        },
        apiEaseCreateRequestClient: {
          async createRequest() {
            createRequestCallCount += 1;
            return {
              status: 201,
              ok: true,
            };
          },
        },
        apiEaseHomeConfigurationResolver: {
          async resolveEnvironmentVariables() {
            return {
              ok: false,
              errorCode: 'APIEASE_HOME_ENVIRONMENT_FILE_NOT_FOUND',
              message: 'APIEASE home environment file was not found: /tmp/home/.apiease/environment',
              fieldErrors: [],
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await createRequestCommand.run([
        'create',
        'request',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'cool-shop.myshopify.com',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(loadRequestDefinitionCallCount, 0);
      assert.equal(createRequestCallCount, 0);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), {
        ok: false,
        errorCode: 'APIEASE_HOME_ENVIRONMENT_FILE_NOT_FOUND',
        message: 'APIEASE home environment file was not found: /tmp/home/.apiease/environment',
        fieldErrors: [],
      });
    });
  });
});

function createWritableStream(chunks) {
  return {
    write(value) {
      chunks.push(value);
      return true;
    },
  };
}
