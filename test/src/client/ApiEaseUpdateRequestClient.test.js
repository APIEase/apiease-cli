import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');

const clientModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'client', 'ApiEaseUpdateRequestClient.js'),
).href;

describe('ApiEaseUpdateRequestClient', () => {
  describe('constructor', () => {
    it('should be constructible for package bootstrap usage', async () => {
      // Arrange
      const { ApiEaseUpdateRequestClient } = await import(clientModuleUrl);

      // Act
      const apiEaseUpdateRequestClient = new ApiEaseUpdateRequestClient();

      // Assert
      assert.ok(apiEaseUpdateRequestClient instanceof ApiEaseUpdateRequestClient);
    });
  });

  describe('updateRequest', () => {
    it('should put the validated request payload to the versioned requests resource item endpoint', async () => {
      // Arrange
      const { ApiEaseUpdateRequestClient } = await import(clientModuleUrl);
      const validationResult = {
        isValid: true,
        errorCode: null,
        message: '',
        fieldErrors: [],
      };
      const request = {
        name: 'Update product',
        type: 'http',
        method: 'PUT',
        address: 'https://api.example.com/products/1',
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
        if (options.method === 'GET') {
          return {
            status: 200,
            async json() {
              return { ok: true, result: { resource: { resourceVersion: 'rv1_current' } } };
            },
          };
        }
        return {
          status: 200,
          async json() {
            return {
              ok: true,
              shopDomain: 'cool-shop.myshopify.com',
              request: {
                id: 'request/1 & 2',
                ...request,
              },
            };
          },
        };
      };
      const apiEaseUpdateRequestClient = new ApiEaseUpdateRequestClient({
        fetchImplementation,
        apiEaseCreateRequestContractValidator,
      });

      // Act
      const result = await apiEaseUpdateRequestClient.updateRequest({
        apiBaseUrl: 'https://apiease.example.com/root/',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'request/1 & 2',
        request,
      });

      // Assert
      assert.deepEqual(validationCalls, [request]);
      assert.equal(fetchCalls.length, 2);
      assert.equal(fetchCalls[1].url, 'https://apiease.example.com/root/api/v1/resources/requests/request%2F1%20%26%202');
      assert.equal(fetchCalls[1].options.method, 'PUT');
      assert.equal(fetchCalls[1].options.headers['content-type'], 'application/json');
      assert.equal(fetchCalls[1].options.headers['x-apiease-api-key'], 'api-key-1');
      assert.equal(fetchCalls[1].options.headers['x-shop-myshopify-domain'], 'cool-shop.myshopify.com');
      assert.equal(fetchCalls[1].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
        resource: request,
      }));
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        shopDomain: 'cool-shop.myshopify.com',
        request: {
          id: 'request/1 & 2',
          ...request,
        },
      });
    });

    it('should not put to the legacy programmatic requests endpoint', async () => {
      // Arrange
      const { ApiEaseUpdateRequestClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const request = {
        name: 'Update order',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/orders/2',
      };
      const apiEaseUpdateRequestClient = new ApiEaseUpdateRequestClient({
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
            status: 200,
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
      await apiEaseUpdateRequestClient.updateRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'request-2',
        request,
      });

      // Assert
      assert.deepEqual(fetchCalls, ['https://apiease.example.com/root/api/v1/resources/requests/request-2']);
      assert.notEqual(fetchCalls[0], 'https://apiease.example.com/root/api/programmatic/requests/request-2');
    });

    it('should normalize supported slash-form webhook events before validation and persistence', async () => {
      // Arrange
      const { ApiEaseUpdateRequestClient } = await import(clientModuleUrl);
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
      const apiEaseUpdateRequestClient = new ApiEaseUpdateRequestClient({
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
          if (options.method === 'GET') {
            return {
              status: 200,
              async json() {
                return { ok: true, result: { resource: { resourceVersion: 'rv1_current' } } };
              },
            };
          }
          return {
            status: 200,
            async json() {
              return {
                ok: true,
              };
            },
          };
        },
      });

      // Act
      await apiEaseUpdateRequestClient.updateRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'request-1',
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
      assert.equal(fetchCalls[1].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
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

    it('should short-circuit local contract validation failures without making a network request', async () => {
      // Arrange
      const { ApiEaseUpdateRequestClient } = await import(clientModuleUrl);
      const request = {
        type: 'http',
      };
      const fetchCalls = [];
      const apiEaseUpdateRequestClient = new ApiEaseUpdateRequestClient({
        apiEaseCreateRequestContractValidator: {
          validate() {
            return {
              isValid: false,
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
        },
        fetchImplementation: async (...args) => {
          fetchCalls.push(args);
          throw new Error('fetch should not be called');
        },
      });

      // Act
      const result = await apiEaseUpdateRequestClient.updateRequest({
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'request-1',
        request,
      });

      // Assert
      assert.deepEqual(fetchCalls, []);
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

    it('should return backend failure payloads with the response status', async () => {
      // Arrange
      const { ApiEaseUpdateRequestClient } = await import(clientModuleUrl);
      const request = {
        type: 'http',
      };
      const apiEaseUpdateRequestClient = new ApiEaseUpdateRequestClient({
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
          status: 404,
          async json() {
            return {
              ok: false,
              errorCode: 'REQUEST_NOT_FOUND',
              message: 'Request not found',
              fieldErrors: [],
            };
          },
        }),
      });

      // Act
      const result = await apiEaseUpdateRequestClient.updateRequest({
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'missing-request',
        request,
      });

      // Assert
      assert.deepEqual(result, {
        status: 404,
        ok: false,
        errorCode: 'REQUEST_NOT_FOUND',
        message: 'Request not found',
        fieldErrors: [],
      });
    });

    it('should return a structured failure when the API responds with html instead of json', async () => {
      // Arrange
      const { ApiEaseUpdateRequestClient } = await import(clientModuleUrl);
      const request = {
        name: 'Update order',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/orders/2',
      };
      const apiEaseUpdateRequestClient = new ApiEaseUpdateRequestClient({
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
      const result = await apiEaseUpdateRequestClient.updateRequest({
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'request-1',
        request,
      });

      // Assert
      assert.deepEqual(result, {
        status: 502,
        ok: false,
        errorCode: 'REQUEST_UPDATE_FAILED',
        message: 'API returned a non-JSON response with status 502 and content-type text/html; response starts with <!DOCTYPE html><html><body>Bad gateway</body></html>',
        fieldErrors: [],
      });
    });

    it('should return a structured failure when the transport request throws', async () => {
      // Arrange
      const { ApiEaseUpdateRequestClient } = await import(clientModuleUrl);
      const request = {
        name: 'Update order',
        type: 'http',
        method: 'POST',
        address: 'https://api.example.com/orders/2',
      };
      const apiEaseUpdateRequestClient = new ApiEaseUpdateRequestClient({
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
        fetchImplementation: async () => {
          throw new Error('socket hang up');
        },
      });

      // Act
      const result = await apiEaseUpdateRequestClient.updateRequest({
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'request-1',
        request,
      });

      // Assert
      assert.deepEqual(result, {
        status: 500,
        ok: false,
        errorCode: 'REQUEST_UPDATE_FAILED',
        message: 'socket hang up',
        fieldErrors: [],
      });
    });
  });
});
