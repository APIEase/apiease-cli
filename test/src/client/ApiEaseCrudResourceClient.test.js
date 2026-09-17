import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');

const clientModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'client', 'ApiEaseCrudResourceClient.js'),
).href;

describe('ApiEaseCrudResourceClient', () => {
  describe('constructor', () => {
    it('should be constructible for reusable resource-aware CRUD calls', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);

      // Act
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient();

      // Assert
      assert.ok(apiEaseCrudResourceClient instanceof ApiEaseCrudResourceClient);
    });
  });

  describe('createResource', () => {
    it('should post the payload to the versioned widget collection endpoint', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const widget = {
        handle: 'featured-products',
        name: 'Featured products',
        liquid: '<section>featured</section>',
      };
      const fetchCalls = [];
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 201,
            async json() {
              return {
                ok: true,
                widget: {
                  id: 'widget-1',
                  ...widget,
                },
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.createResource({
        resourceName: 'widget',
        apiBaseUrl: 'https://apiease.example.com/root/',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resource: widget,
        failureErrorCode: 'WIDGET_CREATE_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/widgets');
      assert.equal(fetchCalls[0].options.method, 'POST');
      assert.equal(fetchCalls[0].options.headers['content-type'], 'application/json');
      assert.equal(fetchCalls[0].options.headers['x-apiease-api-key'], 'api-key-1');
      assert.equal(fetchCalls[0].options.headers['x-shop-myshopify-domain'], 'cool-shop.myshopify.com');
      assert.equal(fetchCalls[0].options.body, JSON.stringify({
        contractVersion: 1,
        operation: 'create-if-absent',
        resource: widget,
      }));
      assert.deepEqual(result, {
        status: 201,
        ok: true,
        widget: {
          id: 'widget-1',
          ...widget,
        },
      });
    });

    it('should post the payload to the versioned function collection endpoint', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const functionDefinition = {
        functionId: 'function-1',
        functionName: 'Order total',
        sourceCode: 'export default function run() {}',
      };
      const fetchCalls = [];
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 201,
            async json() {
              return {
                ok: true,
                function: functionDefinition,
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.createResource({
        resourceName: 'function',
        apiBaseUrl: 'https://apiease.example.com/root/',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resource: functionDefinition,
        failureErrorCode: 'FUNCTION_CREATE_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/functions');
      assert.equal(fetchCalls[0].options.method, 'POST');
      assert.equal(fetchCalls[0].options.body, JSON.stringify({
        contractVersion: 1,
        operation: 'create-if-absent',
        resource: functionDefinition,
      }));
      assert.deepEqual(result, {
        status: 201,
        ok: true,
        function: functionDefinition,
      });
    });
  });

  describe('readResource', () => {
    it('should get the resource from the versioned variable item endpoint', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const variable = {
        name: 'sale-banner',
        value: 'enabled',
      };
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                variable,
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.readResource({
        resourceName: 'variable',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceIdentifier: 'sale banner',
        failureErrorCode: 'VARIABLE_READ_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/variables/sale%20banner');
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.equal(fetchCalls[0].options.headers['x-apiease-api-key'], 'api-key-1');
      assert.equal(fetchCalls[0].options.headers['x-shop-myshopify-domain'], 'cool-shop.myshopify.com');
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        variable,
      });
    });

    it('should get the resource from the versioned function item endpoint', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const functionDefinition = {
        functionId: 'function/1 & 2',
        functionName: 'Order total',
      };
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                function: functionDefinition,
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.readResource({
        resourceName: 'function',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceIdentifier: 'function/1 & 2',
        failureErrorCode: 'FUNCTION_READ_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/functions/function%2F1%20%26%202');
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        function: functionDefinition,
      });
    });
  });

  describe('readResourceByHandle', () => {
    it('should get the widget from the versioned widget item endpoint by handle', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const widget = {
        id: 'widget-1',
        handle: 'featured-products',
        name: 'Featured products',
      };
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                widget,
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.readResourceByHandle({
        resourceName: 'widget',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'featured-products',
        failureErrorCode: 'WIDGET_READ_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/widgets/featured-products');
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        widget,
      });
    });

    it('should get the variable from the versioned variable item endpoint by handle', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const variable = {
        id: 'variable-1',
        handle: 'sale-banner',
        name: 'Sale banner',
        value: 'enabled',
      };
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                variable,
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.readResourceByHandle({
        resourceName: 'variable',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'sale-banner',
        failureErrorCode: 'VARIABLE_READ_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/variables/sale-banner');
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        variable,
      });
    });

    it('should get the function from the versioned function item endpoint by handle', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const functionDefinition = {
        id: 'function-1',
        handle: 'order-total',
        name: 'Order total',
      };
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                function: functionDefinition,
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.readResourceByHandle({
        resourceName: 'function',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'order-total',
        failureErrorCode: 'FUNCTION_READ_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/functions/order-total');
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        function: functionDefinition,
      });
    });

    it('should return a structured widget lookup failure without rewriting the status', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async () => ({
          status: 503,
          async json() {
            return {
              ok: false,
              errorCode: 'WIDGET_READ_FAILED',
              message: 'Service unavailable',
              fieldErrors: [],
            };
          },
        }),
      });

      // Act
      const result = await apiEaseCrudResourceClient.readResourceByHandle({
        resourceName: 'widget',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'featured-products',
        failureErrorCode: 'WIDGET_READ_FAILED',
      });

      // Assert
      assert.deepEqual(result, {
        status: 503,
        ok: false,
        errorCode: 'WIDGET_READ_FAILED',
        message: 'Service unavailable',
        fieldErrors: [],
      });
    });

    it('should return a structured variable lookup failure without rewriting the status', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async () => ({
          status: 503,
          async json() {
            return {
              ok: false,
              errorCode: 'VARIABLE_READ_FAILED',
              message: 'Service unavailable',
              fieldErrors: [],
            };
          },
        }),
      });

      // Act
      const result = await apiEaseCrudResourceClient.readResourceByHandle({
        resourceName: 'variable',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'sale-banner',
        failureErrorCode: 'VARIABLE_READ_FAILED',
      });

      // Assert
      assert.deepEqual(result, {
        status: 503,
        ok: false,
        errorCode: 'VARIABLE_READ_FAILED',
        message: 'Service unavailable',
        fieldErrors: [],
      });
    });

    it('should return a structured function lookup failure without rewriting the status', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async () => ({
          status: 503,
          async json() {
            return {
              ok: false,
              errorCode: 'FUNCTION_READ_FAILED',
              message: 'Service unavailable',
              fieldErrors: [],
            };
          },
        }),
      });

      // Act
      const result = await apiEaseCrudResourceClient.readResourceByHandle({
        resourceName: 'function',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'order-total',
        failureErrorCode: 'FUNCTION_READ_FAILED',
      });

      // Assert
      assert.deepEqual(result, {
        status: 503,
        ok: false,
        errorCode: 'FUNCTION_READ_FAILED',
        message: 'Service unavailable',
        fieldErrors: [],
      });
    });
  });

  describe('updateResource', () => {
    it('should read the current version and put a version-bound update envelope', async () => {
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const resource = { handle: 'featured-products', description: 'Updated purpose.' };
      const fetchCalls = [];
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return fetchCalls.length === 1
            ? { status: 200, async json() { return { ok: true, result: { resource: { resourceVersion: 'rv1_current' } } }; } }
            : { status: 200, async json() { return { ok: true }; } };
        },
      });

      const result = await apiEaseCrudResourceClient.updateResource({
        resourceName: 'widget',
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceIdentifier: 'featured-products',
        resource,
        failureErrorCode: 'WIDGET_UPDATE_FAILED',
      });

      assert.equal(result.ok, true);
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.equal(fetchCalls[1].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
        resource,
      }));
    });

    it('should not update when the current read omits the resource version', async () => {
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return { status: 200, async json() { return { ok: true, result: { resource: {} } }; } };
        },
      });

      const result = await apiEaseCrudResourceClient.updateResource({
        resourceName: 'widget',
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceIdentifier: 'featured-products',
        resource: { description: 'Updated purpose.' },
        failureErrorCode: 'WIDGET_UPDATE_FAILED',
      });

      assert.equal(fetchCalls.length, 1);
      assert.deepEqual(result, {
        status: 500,
        ok: false,
        errorCode: 'WIDGET_UPDATE_FAILED',
        message: 'API response did not include a resource version',
        fieldErrors: [],
      });
    });

    it('should put the payload to the versioned widget item endpoint', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const widget = {
        handle: 'featured-products',
        name: 'Featured products updated',
        liquid: '<section>updated</section>',
      };
      const fetchCalls = [];
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                widget: {
                  id: 'widget/1 & 2',
                  ...widget,
                },
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.updateResource({
        resourceName: 'widget',
        apiBaseUrl: 'https://apiease.example.com/root/',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceIdentifier: 'widget/1 & 2',
        resource: widget,
        expectedResourceVersion: 'rv1_current',
        failureErrorCode: 'WIDGET_UPDATE_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/widgets/widget%2F1%20%26%202');
      assert.equal(fetchCalls[0].options.method, 'PUT');
      assert.equal(fetchCalls[0].options.headers['content-type'], 'application/json');
      assert.equal(fetchCalls[0].options.headers['x-apiease-api-key'], 'api-key-1');
      assert.equal(fetchCalls[0].options.headers['x-shop-myshopify-domain'], 'cool-shop.myshopify.com');
      assert.equal(fetchCalls[0].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
        resource: widget,
      }));
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        widget: {
          id: 'widget/1 & 2',
          ...widget,
        },
      });
    });

    it('should put the payload to the versioned function item endpoint', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const functionDefinition = {
        functionId: 'function/1 & 2',
        functionName: 'Order total updated',
      };
      const fetchCalls = [];
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                function: functionDefinition,
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.updateResource({
        resourceName: 'function',
        apiBaseUrl: 'https://apiease.example.com/root/',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceIdentifier: 'function/1 & 2',
        resource: functionDefinition,
        expectedResourceVersion: 'rv1_current',
        failureErrorCode: 'FUNCTION_UPDATE_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/functions/function%2F1%20%26%202');
      assert.equal(fetchCalls[0].options.method, 'PUT');
      assert.equal(fetchCalls[0].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
        resource: functionDefinition,
      }));
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        function: functionDefinition,
      });
    });
  });

  describe('updateResourceByHandle', () => {
    it('should put the widget payload to the versioned widget item endpoint by handle', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const widget = {
        handle: 'featured-products',
        name: 'Featured products updated',
        liquid: '<section>updated</section>',
      };
      const fetchCalls = [];
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                widget: {
                  id: 'widget-1',
                  ...widget,
                },
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.updateResourceByHandle({
        resourceName: 'widget',
        apiBaseUrl: 'https://apiease.example.com/root/',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'featured-products',
        resource: widget,
        expectedResourceVersion: 'rv1_current',
        failureErrorCode: 'WIDGET_UPDATE_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/widgets/featured-products');
      assert.equal(fetchCalls[0].options.method, 'PUT');
      assert.equal(fetchCalls[0].options.headers['content-type'], 'application/json');
      assert.equal(fetchCalls[0].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
        resource: widget,
      }));
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        widget: {
          id: 'widget-1',
          ...widget,
        },
      });
    });

    it('should put the variable payload to the versioned variable item endpoint by handle', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const variable = {
        handle: 'sale-banner',
        name: 'Sale banner',
        value: 'disabled',
      };
      const fetchCalls = [];
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                variable: {
                  id: 'variable-1',
                  ...variable,
                },
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.updateResourceByHandle({
        resourceName: 'variable',
        apiBaseUrl: 'https://apiease.example.com/root/',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'sale-banner',
        resource: variable,
        expectedResourceVersion: 'rv1_current',
        failureErrorCode: 'VARIABLE_UPDATE_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/variables/sale-banner');
      assert.equal(fetchCalls[0].options.method, 'PUT');
      assert.equal(fetchCalls[0].options.headers['content-type'], 'application/json');
      assert.equal(fetchCalls[0].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
        resource: variable,
      }));
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        variable: {
          id: 'variable-1',
          ...variable,
        },
      });
    });

    it('should put the function payload to the versioned function item endpoint by handle', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const functionDefinition = {
        handle: 'order-total',
        name: 'Order total updated',
        code: '{{ line_items | sum: "price" }}',
      };
      const fetchCalls = [];
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                function: {
                  id: 'function-1',
                  ...functionDefinition,
                },
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.updateResourceByHandle({
        resourceName: 'function',
        apiBaseUrl: 'https://apiease.example.com/root/',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'order-total',
        resource: functionDefinition,
        expectedResourceVersion: 'rv1_current',
        failureErrorCode: 'FUNCTION_UPDATE_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/functions/order-total');
      assert.equal(fetchCalls[0].options.method, 'PUT');
      assert.equal(fetchCalls[0].options.headers['content-type'], 'application/json');
      assert.equal(fetchCalls[0].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
        resource: functionDefinition,
      }));
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        function: {
          id: 'function-1',
          ...functionDefinition,
        },
      });
    });
  });

  describe('deleteResource', () => {
    it('should read the current version and send a version-bound delete envelope', async () => {
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return fetchCalls.length === 1
            ? { status: 200, async json() { return { ok: true, result: { resource: { resourceVersion: 'rv1_current' } } }; } }
            : { status: 200, async json() { return { ok: true }; } };
        },
      });

      const result = await apiEaseCrudResourceClient.deleteResource({
        resourceName: 'variable',
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceIdentifier: 'sale-banner',
        failureErrorCode: 'VARIABLE_DELETE_FAILED',
      });

      assert.equal(result.ok, true);
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.equal(fetchCalls[1].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
      }));
    });

    it('should delete the resource from the versioned variable item endpoint with a versioned body', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const variable = {
        name: 'sale-banner',
        value: 'enabled',
      };
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                variable,
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.deleteResource({
        resourceName: 'variable',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceIdentifier: 'sale banner',
        expectedResourceVersion: 'rv1_current',
        failureErrorCode: 'VARIABLE_DELETE_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/variables/sale%20banner');
      assert.equal(fetchCalls[0].options.method, 'DELETE');
      assert.equal(fetchCalls[0].options.headers['x-apiease-api-key'], 'api-key-1');
      assert.equal(fetchCalls[0].options.headers['x-shop-myshopify-domain'], 'cool-shop.myshopify.com');
      assert.equal(fetchCalls[0].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
      }));
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        variable,
      });
    });

    it('should delete the resource from the versioned function item endpoint with a versioned body', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const functionDefinition = {
        functionId: 'function/1 & 2',
        functionName: 'Order total',
      };
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                function: functionDefinition,
              };
            },
          };
        },
      });

      // Act
      const result = await apiEaseCrudResourceClient.deleteResource({
        resourceName: 'function',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceIdentifier: 'function/1 & 2',
        expectedResourceVersion: 'rv1_current',
        failureErrorCode: 'FUNCTION_DELETE_FAILED',
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/functions/function%2F1%20%26%202');
      assert.equal(fetchCalls[0].options.method, 'DELETE');
      assert.equal(fetchCalls[0].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
      }));
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        function: functionDefinition,
      });
    });

    it('should return a structured failure when the API responds with html instead of json', async () => {
      // Arrange
      const { ApiEaseCrudResourceClient } = await import(clientModuleUrl);
      const apiEaseCrudResourceClient = new ApiEaseCrudResourceClient({
        fetchImplementation: async () => ({
          status: 502,
          headers: {
            get(name) {
              return name === 'content-type' ? 'text/html; charset=utf-8' : null;
            },
          },
          async text() {
            return '<!DOCTYPE html><html><body>Bad gateway</body></html>';
          },
          async json() {
            throw new Error('response.json should not be called for html responses');
          },
        }),
      });

      // Act
      const result = await apiEaseCrudResourceClient.deleteResource({
        resourceName: 'widget',
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceIdentifier: 'widget-1',
        failureErrorCode: 'WIDGET_DELETE_FAILED',
      });

      // Assert
      assert.deepEqual(result, {
        status: 502,
        ok: false,
        errorCode: 'WIDGET_DELETE_FAILED',
        message: 'API returned a non-JSON response with status 502 and content-type text/html; response starts with <!DOCTYPE html><html><body>Bad gateway</body></html>',
        fieldErrors: [],
      });
    });
  });
});
