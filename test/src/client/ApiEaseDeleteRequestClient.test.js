import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');

const clientModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'client', 'ApiEaseDeleteRequestClient.js'),
).href;

describe('ApiEaseDeleteRequestClient', () => {
  describe('constructor', () => {
    it('should be constructible for package bootstrap usage', async () => {
      // Arrange
      const { ApiEaseDeleteRequestClient } = await import(clientModuleUrl);

      // Act
      const apiEaseDeleteRequestClient = new ApiEaseDeleteRequestClient();

      // Assert
      assert.ok(apiEaseDeleteRequestClient instanceof ApiEaseDeleteRequestClient);
    });
  });

  describe('deleteRequest', () => {
    it('should delete the request from the versioned requests resource item endpoint with a versioned body', async () => {
      // Arrange
      const { ApiEaseDeleteRequestClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const request = {
        id: 'request/1 & 2',
        name: 'Delete product',
        type: 'http',
        method: 'DELETE',
        address: 'https://api.example.com/products/1',
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
              request,
            };
          },
        };
      };
      const apiEaseDeleteRequestClient = new ApiEaseDeleteRequestClient({
        fetchImplementation,
      });

      // Act
      const result = await apiEaseDeleteRequestClient.deleteRequest({
        apiBaseUrl: 'https://apiease.example.com/root/',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'request/1 & 2',
      });

      // Assert
      assert.equal(fetchCalls.length, 2);
      assert.equal(fetchCalls[1].url, 'https://apiease.example.com/root/api/v1/resources/requests/request%2F1%20%26%202');
      assert.equal(fetchCalls[1].options.method, 'DELETE');
      assert.equal(fetchCalls[1].options.headers['x-apiease-api-key'], 'api-key-1');
      assert.equal(fetchCalls[1].options.headers['x-shop-myshopify-domain'], 'cool-shop.myshopify.com');
      assert.equal(fetchCalls[1].options.body, JSON.stringify({
        contractVersion: 1,
        expectedResourceVersion: 'rv1_current',
      }));
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        shopDomain: 'cool-shop.myshopify.com',
        request,
      });
    });

    it('should not delete the request from the legacy programmatic requests endpoint', async () => {
      // Arrange
      const { ApiEaseDeleteRequestClient } = await import(clientModuleUrl);
      const fetchCalls = [];
      const apiEaseDeleteRequestClient = new ApiEaseDeleteRequestClient({
        fetchImplementation: async (url) => {
          fetchCalls.push(url);
          return {
            status: 200,
            async json() {
              return {
                ok: true,
                shopDomain: 'cool-shop.myshopify.com',
                request: {
                  id: 'request-2',
                },
              };
            },
          };
        },
      });

      // Act
      await apiEaseDeleteRequestClient.deleteRequest({
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'request-2',
      });

      // Assert
      assert.deepEqual(fetchCalls, ['https://apiease.example.com/root/api/v1/resources/requests/request-2']);
      assert.notEqual(fetchCalls[0], 'https://apiease.example.com/root/api/programmatic/requests/request-2');
    });

    it('should return backend failure payloads with the response status', async () => {
      // Arrange
      const { ApiEaseDeleteRequestClient } = await import(clientModuleUrl);
      const apiEaseDeleteRequestClient = new ApiEaseDeleteRequestClient({
        fetchImplementation: async () => ({
          status: 404,
          async json() {
            return {
              ok: false,
              errorCode: 'REQUEST_NOT_FOUND',
              message: 'Unable to delete request',
              fieldErrors: [],
            };
          },
        }),
      });

      // Act
      const result = await apiEaseDeleteRequestClient.deleteRequest({
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'missing-request',
      });

      // Assert
      assert.deepEqual(result, {
        status: 404,
        ok: false,
        errorCode: 'REQUEST_NOT_FOUND',
        message: 'Unable to delete request',
        fieldErrors: [],
      });
    });

    it('should return a structured failure when the API responds with html instead of json', async () => {
      // Arrange
      const { ApiEaseDeleteRequestClient } = await import(clientModuleUrl);
      const apiEaseDeleteRequestClient = new ApiEaseDeleteRequestClient({
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
      const result = await apiEaseDeleteRequestClient.deleteRequest({
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'request-1',
      });

      // Assert
      assert.deepEqual(result, {
        status: 502,
        ok: false,
        errorCode: 'REQUEST_DELETE_FAILED',
        message: 'API returned a non-JSON response with status 502 and content-type text/html; response starts with <!DOCTYPE html><html><body>Bad gateway</body></html>',
        fieldErrors: [],
      });
    });

    it('should return a structured failure when the transport request throws', async () => {
      // Arrange
      const { ApiEaseDeleteRequestClient } = await import(clientModuleUrl);
      const apiEaseDeleteRequestClient = new ApiEaseDeleteRequestClient({
        fetchImplementation: async () => {
          throw new Error('socket hang up');
        },
      });

      // Act
      const result = await apiEaseDeleteRequestClient.deleteRequest({
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        requestId: 'request-1',
      });

      // Assert
      assert.deepEqual(result, {
        status: 500,
        ok: false,
        errorCode: 'REQUEST_DELETE_FAILED',
        message: 'socket hang up',
        fieldErrors: [],
      });
    });
  });
});
