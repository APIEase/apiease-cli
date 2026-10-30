import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const updateRequestCommandModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'cli', 'UpdateRequestCommand.js'),
).href;

describe('UpdateRequestCommand', () => {
  describe('environment selection', () => {
    it('should forward the selected environment to command configuration', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const configuration = { ok: true, apiKey: 'selected-key', apiBaseUrl: 'https://selected.example.com', shopDomain: 'selected.myshopify.com' };
      const calls = [];
      const command = new UpdateRequestCommand({
        apiEaseCommandConfigurationResolver: {
          async resolveConfiguration(options) { calls.push(options); return configuration; },
        },
      });
      const parsed = command.parseCommandArguments([...['update', 'request', '--request-handle', 'example', '--file', 'definition.json'], '--environment', 'staging']);

      // Act
      const result = await command.resolveCommandConfiguration(parsed);

      // Assert
      assert.equal(result, configuration);
      assert.equal(calls[0].explicitEnvironment, 'staging');
    });

    it('should preserve a missing environment value for validation instead of using the default', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const command = new UpdateRequestCommand();

      // Act
      const parsed = command.parseCommandArguments([...['update', 'request', '--request-handle', 'example', '--file', 'definition.json'], '--environment']);

      // Assert
      assert.equal(parsed.environment, '');
    });

    it('should report the selected environment failure without running the resource operation', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const stdoutChunks = [], stderrChunks = [], calls = [];
      const failure = { ok: false, errorCode: 'APIEASE_HOME_ENV_FILE_NOT_FOUND', message: 'Selected environment file was not found.', fieldErrors: [] };
      const command = new UpdateRequestCommand({
        apiEaseCommandConfigurationResolver: {
          async resolveConfiguration(options) { calls.push(options); return failure; },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await command.run([...['update', 'request', '--request-handle', 'example', '--file', 'definition.json'], '--environment', 'missing', '--json']);

      // Assert
      assert.equal(calls[0].explicitEnvironment, 'missing');
      assert.equal(exitCode, 1);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), failure);
      assert.equal(stderrChunks.join(''), '');
    });
  });

  describe('run', () => {
    it('should load the request file, call the update client, and return zero for human-readable success output', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const requestDefinition = {
        name: 'Update product',
        type: 'http',
        method: 'PUT',
        address: 'https://api.example.com/products/1',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const loadRequestDefinitionCalls = [];
      const updateRequestCalls = [];
      let resolveConfigurationCallCount = 0;
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition(filePath) {
            loadRequestDefinitionCalls.push(filePath);
            return {
              ok: true,
              requestDefinition,
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest(options) {
            updateRequestCalls.push(options);
            return {
              status: 200,
              ok: true,
              shopDomain: 'cool-shop.myshopify.com',
              request: {
                id: 'request-1',
                ...requestDefinition,
              },
            };
          },
        },
        apiEaseHomeConfigurationResolver: {
          async resolveConfiguration() {
            resolveConfigurationCallCount += 1;
            return {
              ok: true,
              apiKey: 'home-api-key',
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await updateRequestCommand.run([
        'update',
        'request',
        '--request-handle',
        'update-product',
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
      assert.deepEqual(updateRequestCalls, [
        {
          apiBaseUrl: 'https://apiease.example.com',
          apiKey: 'api-key-1',
          shopDomain: 'cool-shop.myshopify.com',
          requestId: 'update-product',
          request: requestDefinition,
        },
      ]);
      assert.equal(resolveConfigurationCallCount, 0);
      assert.match(stdoutChunks.join(''), /Request updated successfully\./);
      assert.match(stdoutChunks.join(''), /Request ID: request-1/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should accept the existing request id option with a server-owned id value', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const requestId = '123e4567-e89b-12d3-a456-426614174000';
      const requestDefinition = {
        name: 'Update product',
        type: 'http',
        method: 'PUT',
        address: 'https://api.example.com/products/1',
      };
      const updateRequestCalls = [];
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition,
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest(options) {
            updateRequestCalls.push(options);
            return {
              status: 200,
              ok: true,
              request: {
                id: requestId,
                ...requestDefinition,
              },
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await updateRequestCommand.run(buildUpdateRequestArguments(requestId));

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(updateRequestCalls[0].requestId, requestId);
    });

    it('should accept the existing request id option with a handle value', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const requestHandle = 'lookup-shopify-discount-code-admin-graphql';
      const requestDefinition = {
        name: 'Update product',
        type: 'http',
        method: 'PUT',
        address: 'https://api.example.com/products/1',
      };
      const updateRequestCalls = [];
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition,
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest(options) {
            updateRequestCalls.push(options);
            return {
              status: 200,
              ok: true,
              request: {
                handle: requestHandle,
                ...requestDefinition,
              },
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await updateRequestCommand.run(buildUpdateRequestArguments(requestHandle));

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(updateRequestCalls[0].requestId, requestHandle);
    });

    it('should load the variable file, call the shared resource update client, and return zero for human-readable success output', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const variableDefinition = {
        handle: 'sale-banner',
        name: 'Sale banner',
        value: 'Spring sale',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const loadRequestDefinitionCalls = [];
      const updateResourceCalls = [];
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition(filePath) {
            loadRequestDefinitionCalls.push(filePath);
            return {
              ok: true,
              requestDefinition: variableDefinition,
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest() {
            throw new Error('request update client should not be used for variable resources');
          },
        },
        apiEaseCrudResourceClient: {
          async updateResource(options) {
            updateResourceCalls.push(options);
            return {
              status: 200,
              ok: true,
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
      const exitCode = await updateRequestCommand.run([
        'update',
        'variable',
        '--variable-handle',
        'sale-banner',
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
      assert.deepEqual(updateResourceCalls, [
        {
          resourceName: 'variable',
          apiBaseUrl: 'https://apiease.example.com',
          apiKey: 'api-key-1',
          shopDomain: 'cool-shop.myshopify.com',
          resourceIdentifier: 'sale-banner',
          resource: variableDefinition,
          failureErrorCode: 'VARIABLE_UPDATE_FAILED',
        },
      ]);
      assert.match(stdoutChunks.join(''), /Variable updated successfully\./);
      assert.match(stdoutChunks.join(''), /Variable Handle: sale-banner/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should load the widget file, call the shared resource update client, and return zero for human-readable success output', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const widgetDefinition = {
        handle: 'promo-banner',
        name: 'Promo banner',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const loadRequestDefinitionCalls = [];
      const updateResourceCalls = [];
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition(filePath) {
            loadRequestDefinitionCalls.push(filePath);
            return {
              ok: true,
              requestDefinition: widgetDefinition,
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest() {
            throw new Error('request update client should not be used for widget resources');
          },
        },
        apiEaseCrudResourceClient: {
          async updateResource(options) {
            updateResourceCalls.push(options);
            return {
              status: 200,
              ok: true,
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
      const exitCode = await updateRequestCommand.run([
        'update',
        'widget',
        '--widget-handle',
        'promo-banner',
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
      assert.deepEqual(updateResourceCalls, [
        {
          resourceName: 'widget',
          apiBaseUrl: 'https://apiease.example.com',
          apiKey: 'api-key-1',
          shopDomain: 'cool-shop.myshopify.com',
          resourceIdentifier: 'promo-banner',
          resource: widgetDefinition,
          failureErrorCode: 'WIDGET_UPDATE_FAILED',
        },
      ]);
      assert.match(stdoutChunks.join(''), /Widget updated successfully\./);
      assert.match(stdoutChunks.join(''), /Widget Handle: promo-banner/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should accept the legacy widget id option with a handle value', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const updateResourceCalls = [];
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: {
                handle: 'promo-banner',
              },
            };
          },
        },
        apiEaseCrudResourceClient: {
          async updateResource(options) {
            updateResourceCalls.push(options);
            return {
              status: 200,
              ok: true,
              widget: {
                handle: 'promo-banner',
              },
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await updateRequestCommand.run([
        'update',
        'widget',
        '--widget-id',
        'promo-banner',
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
      assert.equal(updateResourceCalls[0].resourceIdentifier, 'promo-banner');
    });

    it('should load the function file, call the shared resource update client, and return zero for human-readable success output', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const functionDefinition = {
        handle: 'apply-discount',
        name: 'Apply discount',
      };
      const stdoutChunks = [];
      const stderrChunks = [];
      const loadRequestDefinitionCalls = [];
      const updateResourceCalls = [];
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition(filePath) {
            loadRequestDefinitionCalls.push(filePath);
            return {
              ok: true,
              requestDefinition: functionDefinition,
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest() {
            throw new Error('request update client should not be used for function resources');
          },
        },
        apiEaseCrudResourceClient: {
          async updateResource(options) {
            updateResourceCalls.push(options);
            return {
              status: 200,
              ok: true,
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
      const exitCode = await updateRequestCommand.run([
        'update',
        'function',
        '--function-handle',
        'apply-discount',
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
      assert.deepEqual(updateResourceCalls, [
        {
          resourceName: 'function',
          apiBaseUrl: 'https://apiease.example.com',
          apiKey: 'api-key-1',
          shopDomain: 'cool-shop.myshopify.com',
          resourceIdentifier: 'apply-discount',
          resource: functionDefinition,
          failureErrorCode: 'FUNCTION_UPDATE_FAILED',
        },
      ]);
      assert.match(stdoutChunks.join(''), /Function updated successfully\./);
      assert.match(stdoutChunks.join(''), /Function Handle: apply-discount/);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should resolve the api key from home configuration when the api key argument is omitted', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const requestDefinition = {
        name: 'Update product',
        type: 'http',
        method: 'PUT',
        address: 'https://api.example.com/products/1',
      };
      const updateRequestCalls = [];
      let resolveConfigurationCallCount = 0;
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition,
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest(options) {
            updateRequestCalls.push(options);
            return {
              status: 200,
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
      const exitCode = await updateRequestCommand.run([
        'update',
        'request',
        '--request-id',
        'request-1',
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
      assert.deepEqual(updateRequestCalls, [
        {
          apiBaseUrl: 'https://apiease.example.com',
          apiKey: 'resolved-home-api-key',
          shopDomain: 'cool-shop.myshopify.com',
          requestId: 'request-1',
          request: requestDefinition,
        },
      ]);
    });

    it('should resolve the base url and shop domain from home env variables when those arguments are omitted', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const requestDefinition = {
        name: 'Update product',
        type: 'http',
        method: 'PUT',
        address: 'https://api.example.com/products/1',
      };
      const updateRequestCalls = [];
      let resolveEnvironmentVariablesCallCount = 0;
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition,
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest(options) {
            updateRequestCalls.push(options);
            return {
              status: 200,
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
      const exitCode = await updateRequestCommand.run([
        'update',
        'request',
        '--request-id',
        'request-1',
        '--file',
        '/tmp/request.json',
        '--api-key',
        'explicit-api-key',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(resolveEnvironmentVariablesCallCount, 1);
      assert.deepEqual(updateRequestCalls, [
        {
          apiBaseUrl: 'https://apiease.example.com/from-home',
          apiKey: 'explicit-api-key',
          shopDomain: 'home-shop.myshopify.com',
          requestId: 'request-1',
          request: requestDefinition,
        },
      ]);
    });

    it('should fail fast with usage output when the resource argument is missing', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      let loadRequestDefinitionCallCount = 0;
      let updateRequestCallCount = 0;
      let updateResourceCallCount = 0;
      const stderrChunks = [];
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            loadRequestDefinitionCallCount += 1;
            return {
              ok: true,
              requestDefinition: {},
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest() {
            updateRequestCallCount += 1;
            return {
              status: 200,
              ok: true,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async updateResource() {
            updateResourceCallCount += 1;
            return {
              status: 200,
              ok: true,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await updateRequestCommand.run([
        'update',
        '--request-id',
        'request-1',
        '--file',
        '/tmp/request.json',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(loadRequestDefinitionCallCount, 0);
      assert.equal(updateRequestCallCount, 0);
      assert.equal(updateResourceCallCount, 0);
      assert.match(stderrChunks.join(''), /Missing required resource argument\./);
      assert.match(stderrChunks.join(''), /Usage: apiease update <request\|widget\|variable\|function>/);
    });

    it('should fail fast with usage output when the resource argument is unsupported', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      let loadRequestDefinitionCallCount = 0;
      let updateRequestCallCount = 0;
      let updateResourceCallCount = 0;
      const stderrChunks = [];
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            loadRequestDefinitionCallCount += 1;
            return {
              ok: true,
              requestDefinition: {},
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest() {
            updateRequestCallCount += 1;
            return {
              status: 200,
              ok: true,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async updateResource() {
            updateResourceCallCount += 1;
            return {
              status: 200,
              ok: true,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await updateRequestCommand.run([
        'update',
        'product',
        '--file',
        '/tmp/product.json',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(loadRequestDefinitionCallCount, 0);
      assert.equal(updateRequestCallCount, 0);
      assert.equal(updateResourceCallCount, 0);
      assert.match(stderrChunks.join(''), /Unsupported resource: product\./);
      assert.match(stderrChunks.join(''), /Usage: apiease update <request\|widget\|variable\|function>/);
    });

    it('should fail fast with usage output when the selected resource identifier flag is missing', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      let loadRequestDefinitionCallCount = 0;
      let updateRequestCallCount = 0;
      let updateResourceCallCount = 0;
      const stderrChunks = [];
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            loadRequestDefinitionCallCount += 1;
            return {
              ok: true,
              requestDefinition: {},
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest() {
            updateRequestCallCount += 1;
            return {
              status: 200,
              ok: true,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async updateResource() {
            updateResourceCallCount += 1;
            return {
              status: 200,
              ok: true,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await updateRequestCommand.run([
        'update',
        'widget',
        '--request-id',
        'request-1',
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
      assert.equal(loadRequestDefinitionCallCount, 0);
      assert.equal(updateRequestCallCount, 0);
      assert.equal(updateResourceCallCount, 0);
      assert.match(stderrChunks.join(''), /Missing required arguments: --widget-handle/);
      assert.match(stderrChunks.join(''), /Usage: apiease update widget --widget-handle <handle> --file <path>/);
    });

    it('should fail fast with usage output when the function identifier flag is missing', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      let loadRequestDefinitionCallCount = 0;
      let updateRequestCallCount = 0;
      let updateResourceCallCount = 0;
      const stderrChunks = [];
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            loadRequestDefinitionCallCount += 1;
            return {
              ok: true,
              requestDefinition: {},
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest() {
            updateRequestCallCount += 1;
            return {
              status: 200,
              ok: true,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async updateResource() {
            updateResourceCallCount += 1;
            return {
              status: 200,
              ok: true,
            };
          },
        },
        stdout: createWritableStream([]),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await updateRequestCommand.run([
        'update',
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
      assert.equal(loadRequestDefinitionCallCount, 0);
      assert.equal(updateRequestCallCount, 0);
      assert.equal(updateResourceCallCount, 0);
      assert.match(stderrChunks.join(''), /Missing required arguments: --function-handle/);
      assert.match(stderrChunks.join(''), /Usage: apiease update function --function-handle <handle> --file <path>/);
    });

    it('should fail fast with usage output and no delegated calls when required arguments are missing', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      let updateRequestCallCount = 0;
      const stderrChunks = [];
      const updateRequestCommand = new UpdateRequestCommand({
        apiEaseUpdateRequestClient: {
          async updateRequest() {
            updateRequestCallCount += 1;
            return {
              status: 200,
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
      const exitCode = await updateRequestCommand.run([
        'update',
        'request',
        '--request-id',
        'request-1',
        '--file',
        '/tmp/request.json',
        '--base-url',
        'https://apiease.example.com',
      ]);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(updateRequestCallCount, 0);
      assert.match(stderrChunks.join(''), /Usage:/);
      assert.match(stderrChunks.join(''), /--shop-domain/);
      assert.doesNotMatch(stderrChunks.join(''), /Missing required arguments: .*--api-key/);
    });

    it('should return non-zero and write raw json when the update client fails in json mode', async () => {
      // Arrange
      const { UpdateRequestCommand } = await import(updateRequestCommandModuleUrl);
      const result = {
        status: 404,
        ok: false,
        errorCode: 'REQUEST_NOT_FOUND',
        message: 'Unable to update request',
        fieldErrors: [],
      };
      const stdoutChunks = [];
      const updateRequestCommand = new UpdateRequestCommand({
        requestDefinitionFileLoader: {
          async loadRequestDefinition() {
            return {
              ok: true,
              requestDefinition: {
                type: 'http',
              },
            };
          },
        },
        apiEaseUpdateRequestClient: {
          async updateRequest() {
            return result;
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream([]),
      });

      // Act
      const exitCode = await updateRequestCommand.run([
        'update',
        'request',
        '--request-id',
        'missing-request',
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

function buildUpdateRequestArguments(requestIdentifier) {
  return [
    'update',
    'request',
    '--request-id',
    requestIdentifier,
    '--file',
    '/tmp/request.json',
    '--base-url',
    'https://apiease.example.com',
    '--shop-domain',
    'cool-shop.myshopify.com',
    '--api-key',
    'api-key-1',
  ];
}
