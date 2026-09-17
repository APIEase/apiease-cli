import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');

const clientModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'client', 'ApiEaseCreateRequestClient.js'),
).href;

describe('ApiEaseCreateRequestClient', () => {
  describe('constructor', () => {
    it('should be constructible for package bootstrap usage', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);

      // Act
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient();

      // Assert
      assert.ok(apiEaseCreateRequestClient instanceof ApiEaseCreateRequestClient);
    });
  });

  describe('createRequest', () => {
    it('should post the validated request payload to the versioned requests resource endpoint', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const validationResult = {
        isValid: true,
        errorCode: null,
        message: '',
        fieldErrors: [],
      };
      const request = {
        name: 'Create product',
        description: 'Creates a product in the connected catalog.',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/products',
      };
      const validationCalls = [];
      const fetchCalls = [];
      const apiEaseCreateRequestContractValidator = {
        validate(payload) {
          validationCalls.push(payload);
          return validationResult;
        },
      };
      const fetchImplementation = async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          status: 201,
          async json() {
            return {
              ok: true,
              shopDomain: 'cool-shop.myshopify.com',
              request: {
                id: 'request-1',
                ...request,
              },
            };
          },
        };
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        fetchImplementation,
        apiEaseCreateRequestContractValidator,
      });

      // Act
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com/root/',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.deepEqual(validationCalls, [request]);
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/requests');
      assert.equal(fetchCalls[0].options.method, 'POST');
      assert.equal(fetchCalls[0].options.headers['content-type'], 'application/json');
      assert.equal(fetchCalls[0].options.headers['x-apiease-api-key'], 'api-key-1');
      assert.equal(fetchCalls[0].options.headers['x-shop-myshopify-domain'], 'cool-shop.myshopify.com');
      assert.equal(fetchCalls[0].options.body, JSON.stringify({
        contractVersion: 1,
        operation: 'create-if-absent',
        resource: request,
      }));
      assert.deepEqual(result, {
        status: 201,
        ok: true,
        operation: 'created',
        shopDomain: 'cool-shop.myshopify.com',
        request: {
          id: 'request-1',
          ...request,
        },
      });
    });

    it('should not post to the legacy programmatic requests endpoint', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const request = {
        name: 'Create order',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/orders',
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: {
          validate() {
            return {
              isValid: true,
              errorCode: null,
              message: '',
              fieldErrors: [],
            };
          },
        },
        fetchImplementation: async (url) => {
          fetchCalls.push(url);
          return {
            status: 201,
            async json() {
              return {
                ok: true,
                request: {
                  id: 'request-2',
                  ...request,
                },
              };
            },
          };
        },
      });

      // Act
      await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.deepEqual(fetchCalls, ['https://apiease.example.com/root/api/v1/resources/requests']);
      assert.notEqual(fetchCalls[0], 'https://apiease.example.com/root/api/programmatic/requests');
    });

    it('should normalize supported slash-form webhook events before validation and persistence', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const validationCalls = [];
      const fetchCalls = [];
      const request = {
        name: 'Cart flow',
        type: 'flow',
        triggers: [
          {
            type: 'webhook',
            webhook: {
              event: 'carts/update',
            },
          },
        ],
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: {
          validate(payload) {
            validationCalls.push(payload);
            return {
              isValid: true,
              errorCode: null,
              message: '',
              fieldErrors: [],
            };
          },
        },
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return {
            status: 201,
            async json() {
              return {
                ok: true,
              };
            },
          };
        },
      });

      // Act
      await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.deepEqual(validationCalls, [
        {
          name: 'Cart flow',
          type: 'flow',
          triggers: [
            {
              type: 'webhook',
              webhook: {
                event: 'CARTS_UPDATE',
              },
            },
          ],
        },
      ]);
      assert.equal(fetchCalls[0].options.body, JSON.stringify({
        contractVersion: 1,
        operation: 'create-if-absent',
        resource: validationCalls[0],
      }));
      assert.deepEqual(request, {
        name: 'Cart flow',
        type: 'flow',
        triggers: [
          {
            type: 'webhook',
            webhook: {
              event: 'carts/update',
            },
          },
        ],
      });
    });

    it('should route handled request create-or-update behavior through the shared service', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const createOrUpdateCalls = [];
      const request = {
        handle: 'sync-orders',
        name: 'Sync orders',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/orders',
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: createValidContractValidator(),
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle(options) {
            createOrUpdateCalls.push(options);
            return {
              status: 200,
              ok: true,
              operation: 'updated',
              request: {
                id: 'server-request-1',
                ...options.resource,
              },
            };
          },
        },
        apiEaseCrudResourceClient: createFailingCrudResourceClient(),
      });

      // Act
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.deepEqual(createOrUpdateCalls, [
        {
          resourceName: 'request',
          apiBaseUrl: 'https://apiease.example.com/root',
          apiKey: 'api-key-1',
          shopDomain: 'cool-shop.myshopify.com',
          resourceHandle: 'sync-orders',
          resource: request,
          readFailureErrorCode: 'REQUEST_READ_FAILED',
          createFailureErrorCode: 'REQUEST_CREATE_FAILED',
          updateFailureErrorCode: 'REQUEST_UPDATE_FAILED',
        },
      ]);
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        operation: 'updated',
        request: {
          id: 'server-request-1',
          ...request,
        },
      });
    });

    it('should not use the shared create-or-update service for requests without handles', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const createResourceCalls = [];
      let createOrUpdateCallCount = 0;
      const request = {
        name: 'Create order',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/orders',
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: createValidContractValidator(),
        apiEaseHandleBasedCreateOrUpdateService: {
          async createOrUpdateResourceByHandle() {
            createOrUpdateCallCount += 1;
            return {
              status: 500,
              ok: false,
            };
          },
        },
        apiEaseCrudResourceClient: {
          async createResource(options) {
            createResourceCalls.push(options);
            return {
              status: 201,
              ok: true,
              request: {
                id: 'server-request-2',
                ...request,
              },
            };
          },
        },
      });

      // Act
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.equal(createOrUpdateCallCount, 0);
      assert.deepEqual(createResourceCalls, [
        {
          resourceName: 'request',
          apiBaseUrl: 'https://apiease.example.com/root',
          apiKey: 'api-key-1',
          shopDomain: 'cool-shop.myshopify.com',
          resource: request,
          failureErrorCode: 'REQUEST_CREATE_FAILED',
        },
      ]);
      assert.deepEqual(result, {
        status: 201,
        ok: true,
        operation: 'created',
        request: {
          id: 'server-request-2',
          ...request,
        },
      });
    });

    it('should read an existing request by handle and update it', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const request = {
        handle: 'create-product',
        name: 'Create product',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/products',
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: createValidContractValidator(),
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          if (options.method === 'GET') {
            return createJsonResponse(200, {
              ok: true,
              result: {
                resource: {
                  id: 'server-request-1',
                  handle: 'create-product',
                  resourceVersion: 'rv1_current',
                },
              },
            });
          }

          return createJsonResponse(200, {
            ok: true,
            request: {
              id: 'server-request-1',
              ...request,
            },
          });
        },
      });

      // Act
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.equal(fetchCalls.length, 2);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/requests/create-product');
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.equal(fetchCalls[1].url, 'https://apiease.example.com/root/api/v1/resources/requests/create-product');
      assert.equal(fetchCalls[1].options.method, 'PUT');
      assert.equal(fetchCalls[1].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
        resource: request,
      }));
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        operation: 'updated',
        request: {
          id: 'server-request-1',
          ...request,
        },
      });
    });

    it('should create a new request when handle lookup returns not found', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const request = {
        handle: 'create-order',
        name: 'Create order',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/orders',
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: createValidContractValidator(),
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          if (options.method === 'GET') {
            return createJsonResponse(404, {
              ok: false,
              errorCode: 'REQUEST_NOT_FOUND',
              message: 'Request not found',
              fieldErrors: [],
            });
          }

          return createJsonResponse(201, {
            ok: true,
            request: {
              id: 'server-request-2',
              ...request,
            },
          });
        },
      });

      // Act
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.equal(fetchCalls.length, 2);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/requests/create-order');
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.equal(fetchCalls[1].url, 'https://apiease.example.com/root/api/v1/resources/requests');
      assert.equal(fetchCalls[1].options.method, 'POST');
      assert.equal(fetchCalls[1].options.body, JSON.stringify({
        contractVersion: 1,
        operation: 'create-if-absent',
        resource: request,
      }));
      assert.deepEqual(result, {
        status: 201,
        ok: true,
        operation: 'created',
        request: {
          id: 'server-request-2',
          ...request,
        },
      });
    });

    it('should not create a request when handle lookup fails for a non-not-found error', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const request = {
        handle: 'sync-customer',
        name: 'Sync customer',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/customers',
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: createValidContractValidator(),
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return createJsonResponse(503, {
            ok: false,
            errorCode: 'REQUEST_READ_FAILED',
            message: 'Service unavailable',
            fieldErrors: [],
          });
        },
      });

      // Act
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].url, 'https://apiease.example.com/root/api/v1/resources/requests/sync-customer');
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.deepEqual(result, {
        status: 503,
        ok: false,
        errorCode: 'REQUEST_READ_FAILED',
        message: 'Service unavailable',
        fieldErrors: [],
      });
    });

    it('should not create a request when handle lookup fails for an auth error', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const request = {
        handle: 'sync-inventory',
        name: 'Sync inventory',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/inventory',
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: createValidContractValidator(),
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return createJsonResponse(401, {
            ok: false,
            errorCode: 'UNAUTHORIZED',
            message: 'API key is invalid',
            fieldErrors: [],
          });
        },
      });

      // Act
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.deepEqual(result, {
        status: 401,
        ok: false,
        errorCode: 'UNAUTHORIZED',
        message: 'API key is invalid',
        fieldErrors: [],
      });
    });

    it('should not create a request when handle lookup fails for a server error', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const request = {
        handle: 'sync-orders',
        name: 'Sync orders',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/orders',
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: createValidContractValidator(),
        fetchImplementation: async (url, options) => {
          fetchCalls.push({ url, options });
          return createJsonResponse(500, {
            ok: false,
            errorCode: 'REQUEST_READ_FAILED',
            message: 'Internal server error',
            fieldErrors: [],
          });
        },
      });

      // Act
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].options.method, 'GET');
      assert.deepEqual(result, {
        status: 500,
        ok: false,
        errorCode: 'REQUEST_READ_FAILED',
        message: 'Internal server error',
        fieldErrors: [],
      });
    });

    it('should not create a request when handle lookup fails for a transport error', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      let fetchCallCount = 0;
      const request = {
        handle: 'send-review-email',
        name: 'Send review email',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/reviews',
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: createValidContractValidator(),
        fetchImplementation: async () => {
          fetchCallCount += 1;
          throw new Error('network unavailable');
        },
      });

      // Act
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.equal(fetchCallCount, 1);
      assert.deepEqual(result, {
        status: 500,
        ok: false,
        errorCode: 'REQUEST_READ_FAILED',
        message: 'network unavailable',
        fieldErrors: [],
      });
    });

    it('should return backend failure payloads with the response status', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const request = {
        type: 'http',
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: {
          validate() {
            return {
              isValid: true,
              errorCode: null,
              message: '',
              fieldErrors: [],
            };
          },
        },
        fetchImplementation: async () => ({
          status: 422,
          async json() {
            return {
              ok: false,
              errorCode: 'INVALID_REQUEST_CREATE_CONTRACT',
              message: 'Request create payload is invalid',
              fieldErrors: [
                {
                  path: 'address',
                  code: 'REQUIRED',
                  message: 'Field is required',
                },
              ],
            };
          },
        }),
      });

      // Act
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.deepEqual(result, {
        status: 422,
        ok: false,
        errorCode: 'INVALID_REQUEST_CREATE_CONTRACT',
        message: 'Request create payload is invalid',
        fieldErrors: [
          {
            path: 'address',
            code: 'REQUIRED',
            message: 'Field is required',
          },
        ],
      });
    });

    it('should return a structured failure when the API responds with html instead of json', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      const request = {
        name: 'Create order',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/orders',
      };
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: {
          validate() {
            return {
              isValid: true,
              errorCode: null,
              message: '',
              fieldErrors: [],
            };
          },
        },
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
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });

      // Assert
      assert.deepEqual(result, {
        status: 502,
        ok: false,
        errorCode: 'REQUEST_CREATE_FAILED',
        message: 'API returned a non-JSON response with status 502 and content-type text/html; response starts with <!DOCTYPE html><html><body>Bad gateway</body></html>',
        fieldErrors: [],
      });
    });

    it('should short-circuit local contract validation failures without making a network request', async () => {
      // Arrange
      const { ApiEaseCreateRequestClient } = await import(clientModuleUrl);
      let fetchCallCount = 0;
      const validationResult = {
        isValid: false,
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
      const apiEaseCreateRequestClient = new ApiEaseCreateRequestClient({
        apiEaseCreateRequestContractValidator: {
          validate() {
            return validationResult;
          },
        },
        fetchImplementation: async () => {
          fetchCallCount += 1;
          return {
            status: 500,
            async json() {
              return {};
            },
          };
        },
      });

      // Act
      const result = await apiEaseCreateRequestClient.createRequest({
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        request: {},
      });

      // Assert
      assert.equal(fetchCallCount, 0);
      assert.deepEqual(result, {
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
      });
    });
  });
});

function createValidContractValidator() {
  return {
    validate() {
      return {
        isValid: true,
        errorCode: null,
        message: '',
        fieldErrors: [],
      };
    },
  };
}

function createJsonResponse(status, payload) {
  return {
    status,
    async json() {
      return payload;
    },
  };
}

function createFailingCrudResourceClient() {
  return {
    async createResource() {
      throw new Error('Expected create-or-update flow to use the shared service.');
    },
    async readResource() {
      throw new Error('Expected create-or-update flow to use the shared service.');
    },
    async updateResource() {
      throw new Error('Expected create-or-update flow to use the shared service.');
    },
  };
}
