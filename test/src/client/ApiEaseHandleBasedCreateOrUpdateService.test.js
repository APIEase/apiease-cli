import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');

const serviceModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'client', 'ApiEaseHandleBasedCreateOrUpdateService.js'),
).href;

describe('ApiEaseHandleBasedCreateOrUpdateService', () => {
  describe('constructor', () => {
    it('should be constructible for client create-or-update usage', async () => {
      // Arrange
      const { ApiEaseHandleBasedCreateOrUpdateService } = await import(serviceModuleUrl);

      // Act
      const apiEaseHandleBasedCreateOrUpdateService = new ApiEaseHandleBasedCreateOrUpdateService();

      // Assert
      assert.ok(apiEaseHandleBasedCreateOrUpdateService instanceof ApiEaseHandleBasedCreateOrUpdateService);
    });
  });

  describe('createOrUpdateResourceByHandle', () => {
    it('should update the resource by handle when lookup succeeds', async () => {
      // Arrange
      const { ApiEaseHandleBasedCreateOrUpdateService } = await import(serviceModuleUrl);
      const resource = {
        handle: 'featured-products',
        name: 'Featured products',
      };
      const crudResourceCalls = [];
      const apiEaseHandleBasedCreateOrUpdateService = new ApiEaseHandleBasedCreateOrUpdateService({
        apiEaseCrudResourceClient: {
          async readResourceByHandle(options) {
            crudResourceCalls.push({ methodName: 'readResourceByHandle', options });
            return {
              status: 200,
              ok: true,
              result: {
                resource: {
                  id: 'widget-1',
                  handle: 'featured-products',
                  resourceVersion: 'rv1_current',
                },
              },
            };
          },
          async updateResourceByHandle(options) {
            crudResourceCalls.push({ methodName: 'updateResourceByHandle', options });
            return {
              status: 200,
              ok: true,
              widget: {
                id: 'widget-1',
                ...resource,
              },
            };
          },
          async createResource(options) {
            crudResourceCalls.push({ methodName: 'createResource', options });
            return {
              status: 201,
              ok: true,
            };
          },
        },
      });

      // Act
      const result = await apiEaseHandleBasedCreateOrUpdateService.createOrUpdateResourceByHandle({
        resourceName: 'widget',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'featured-products',
        resource,
        readFailureErrorCode: 'WIDGET_READ_FAILED',
        createFailureErrorCode: 'WIDGET_CREATE_FAILED',
        updateFailureErrorCode: 'WIDGET_UPDATE_FAILED',
      });

      // Assert
      assert.deepEqual(crudResourceCalls, [
        {
          methodName: 'readResourceByHandle',
          options: {
            resourceName: 'widget',
            apiBaseUrl: 'https://apiease.example.com/root',
            apiKey: 'api-key-1',
            shopDomain: 'cool-shop.myshopify.com',
            resourceHandle: 'featured-products',
            failureErrorCode: 'WIDGET_READ_FAILED',
          },
        },
        {
          methodName: 'updateResourceByHandle',
          options: {
            resourceName: 'widget',
            apiBaseUrl: 'https://apiease.example.com/root',
            apiKey: 'api-key-1',
            shopDomain: 'cool-shop.myshopify.com',
            resourceHandle: 'featured-products',
            resource,
            expectedResourceVersion: 'rv1_current',
            failureErrorCode: 'WIDGET_UPDATE_FAILED',
          },
        },
      ]);
      assert.deepEqual(result, {
        status: 200,
        ok: true,
        operation: 'updated',
        widget: {
          id: 'widget-1',
          ...resource,
        },
      });
    });

    it('should create the resource when lookup returns not found', async () => {
      // Arrange
      const { ApiEaseHandleBasedCreateOrUpdateService } = await import(serviceModuleUrl);
      const resource = {
        handle: 'sale-banner',
        value: 'enabled',
      };
      const crudResourceCalls = [];
      const apiEaseHandleBasedCreateOrUpdateService = new ApiEaseHandleBasedCreateOrUpdateService({
        apiEaseCrudResourceClient: {
          async readResourceByHandle(options) {
            crudResourceCalls.push({ methodName: 'readResourceByHandle', options });
            return {
              status: 404,
              ok: false,
              errorCode: 'VARIABLE_NOT_FOUND',
              message: 'Variable not found',
              fieldErrors: [],
            };
          },
          async updateResourceByHandle(options) {
            crudResourceCalls.push({ methodName: 'updateResourceByHandle', options });
            return {
              status: 200,
              ok: true,
            };
          },
          async createResource(options) {
            crudResourceCalls.push({ methodName: 'createResource', options });
            return {
              status: 201,
              ok: true,
              variable: {
                id: 'variable-1',
                ...resource,
              },
            };
          },
        },
      });

      // Act
      const result = await apiEaseHandleBasedCreateOrUpdateService.createOrUpdateResourceByHandle({
        resourceName: 'variable',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'sale-banner',
        resource,
        readFailureErrorCode: 'VARIABLE_READ_FAILED',
        createFailureErrorCode: 'VARIABLE_CREATE_FAILED',
        updateFailureErrorCode: 'VARIABLE_UPDATE_FAILED',
      });

      // Assert
      assert.deepEqual(crudResourceCalls, [
        {
          methodName: 'readResourceByHandle',
          options: {
            resourceName: 'variable',
            apiBaseUrl: 'https://apiease.example.com/root',
            apiKey: 'api-key-1',
            shopDomain: 'cool-shop.myshopify.com',
            resourceHandle: 'sale-banner',
            failureErrorCode: 'VARIABLE_READ_FAILED',
          },
        },
        {
          methodName: 'createResource',
          options: {
            resourceName: 'variable',
            apiBaseUrl: 'https://apiease.example.com/root',
            apiKey: 'api-key-1',
            shopDomain: 'cool-shop.myshopify.com',
            resource,
            failureErrorCode: 'VARIABLE_CREATE_FAILED',
          },
        },
      ]);
      assert.deepEqual(result, {
        status: 201,
        ok: true,
        operation: 'created',
        variable: {
          id: 'variable-1',
          ...resource,
        },
      });
    });

    it('should create a widget when lookup by handle returns not found', async () => {
      // Arrange
      const { ApiEaseHandleBasedCreateOrUpdateService } = await import(serviceModuleUrl);
      const resource = {
        handle: 'promo-banner',
        name: 'Promo banner',
      };
      const crudResourceCalls = [];
      const apiEaseHandleBasedCreateOrUpdateService = new ApiEaseHandleBasedCreateOrUpdateService({
        apiEaseCrudResourceClient: {
          async readResourceByHandle(options) {
            crudResourceCalls.push({ methodName: 'readResourceByHandle', options });
            return {
              status: 404,
              ok: false,
              errorCode: 'WIDGET_NOT_FOUND',
              message: 'Widget not found',
              fieldErrors: [],
            };
          },
          async updateResourceByHandle(options) {
            crudResourceCalls.push({ methodName: 'updateResourceByHandle', options });
            return {
              status: 200,
              ok: true,
            };
          },
          async createResource(options) {
            crudResourceCalls.push({ methodName: 'createResource', options });
            return {
              status: 201,
              ok: true,
              widget: {
                id: 'widget-1',
                ...resource,
              },
            };
          },
        },
      });

      // Act
      const result = await apiEaseHandleBasedCreateOrUpdateService.createOrUpdateResourceByHandle({
        resourceName: 'widget',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'promo-banner',
        resource,
        readFailureErrorCode: 'WIDGET_READ_FAILED',
        createFailureErrorCode: 'WIDGET_CREATE_FAILED',
        updateFailureErrorCode: 'WIDGET_UPDATE_FAILED',
      });

      // Assert
      assert.deepEqual(crudResourceCalls, [
        {
          methodName: 'readResourceByHandle',
          options: {
            resourceName: 'widget',
            apiBaseUrl: 'https://apiease.example.com/root',
            apiKey: 'api-key-1',
            shopDomain: 'cool-shop.myshopify.com',
            resourceHandle: 'promo-banner',
            failureErrorCode: 'WIDGET_READ_FAILED',
          },
        },
        {
          methodName: 'createResource',
          options: {
            resourceName: 'widget',
            apiBaseUrl: 'https://apiease.example.com/root',
            apiKey: 'api-key-1',
            shopDomain: 'cool-shop.myshopify.com',
            resource,
            failureErrorCode: 'WIDGET_CREATE_FAILED',
          },
        },
      ]);
      assert.deepEqual(result, {
        status: 201,
        ok: true,
        operation: 'created',
        widget: {
          id: 'widget-1',
          ...resource,
        },
      });
    });

    it('should surface widget lookup failures other than not found without creating', async () => {
      // Arrange
      const { ApiEaseHandleBasedCreateOrUpdateService } = await import(serviceModuleUrl);
      const lookupFailure = {
        status: 503,
        ok: false,
        errorCode: 'WIDGET_READ_FAILED',
        message: 'Service unavailable',
        fieldErrors: [],
      };
      const crudResourceCalls = [];
      const apiEaseHandleBasedCreateOrUpdateService = new ApiEaseHandleBasedCreateOrUpdateService({
        apiEaseCrudResourceClient: {
          async readResourceByHandle(options) {
            crudResourceCalls.push({ methodName: 'readResourceByHandle', options });
            return lookupFailure;
          },
          async updateResourceByHandle(options) {
            crudResourceCalls.push({ methodName: 'updateResourceByHandle', options });
            return {
              status: 200,
              ok: true,
            };
          },
          async createResource(options) {
            crudResourceCalls.push({ methodName: 'createResource', options });
            return {
              status: 201,
              ok: true,
            };
          },
        },
      });

      // Act
      const result = await apiEaseHandleBasedCreateOrUpdateService.createOrUpdateResourceByHandle({
        resourceName: 'widget',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'featured-products',
        resource: {
          handle: 'featured-products',
          name: 'Featured products',
        },
        readFailureErrorCode: 'WIDGET_READ_FAILED',
        createFailureErrorCode: 'WIDGET_CREATE_FAILED',
        updateFailureErrorCode: 'WIDGET_UPDATE_FAILED',
      });

      // Assert
      assert.deepEqual(crudResourceCalls, [
        {
          methodName: 'readResourceByHandle',
          options: {
            resourceName: 'widget',
            apiBaseUrl: 'https://apiease.example.com/root',
            apiKey: 'api-key-1',
            shopDomain: 'cool-shop.myshopify.com',
            resourceHandle: 'featured-products',
            failureErrorCode: 'WIDGET_READ_FAILED',
          },
        },
      ]);
      assert.deepEqual(result, lookupFailure);
    });

    it('should surface function lookup failures other than not found without creating', async () => {
      // Arrange
      const { ApiEaseHandleBasedCreateOrUpdateService } = await import(serviceModuleUrl);
      const lookupFailure = {
        status: 503,
        ok: false,
        errorCode: 'FUNCTION_READ_FAILED',
        message: 'Service unavailable',
        fieldErrors: [],
      };
      const crudResourceCalls = [];
      const apiEaseHandleBasedCreateOrUpdateService = new ApiEaseHandleBasedCreateOrUpdateService({
        apiEaseCrudResourceClient: {
          async readResourceByHandle(options) {
            crudResourceCalls.push({ methodName: 'readResourceByHandle', options });
            return lookupFailure;
          },
          async updateResourceByHandle(options) {
            crudResourceCalls.push({ methodName: 'updateResourceByHandle', options });
            return {
              status: 200,
              ok: true,
            };
          },
          async createResource(options) {
            crudResourceCalls.push({ methodName: 'createResource', options });
            return {
              status: 201,
              ok: true,
            };
          },
        },
      });

      // Act
      const result = await apiEaseHandleBasedCreateOrUpdateService.createOrUpdateResourceByHandle({
        resourceName: 'function',
        apiBaseUrl: 'https://apiease.example.com/root',
        apiKey: 'api-key-1',
        shopDomain: 'cool-shop.myshopify.com',
        resourceHandle: 'order-total',
        resource: {
          handle: 'order-total',
          name: 'Order total',
        },
        readFailureErrorCode: 'FUNCTION_READ_FAILED',
        createFailureErrorCode: 'FUNCTION_CREATE_FAILED',
        updateFailureErrorCode: 'FUNCTION_UPDATE_FAILED',
      });

      // Assert
      assert.deepEqual(crudResourceCalls, [
        {
          methodName: 'readResourceByHandle',
          options: {
            resourceName: 'function',
            apiBaseUrl: 'https://apiease.example.com/root',
            apiKey: 'api-key-1',
            shopDomain: 'cool-shop.myshopify.com',
            resourceHandle: 'order-total',
            failureErrorCode: 'FUNCTION_READ_FAILED',
          },
        },
      ]);
      assert.deepEqual(result, lookupFailure);
    });
  });
});
