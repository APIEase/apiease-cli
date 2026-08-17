import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const apiEaseCommandConfigurationResolverModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'cli', 'ApiEaseCommandConfigurationResolver.js'),
).href;

describe('ApiEaseCommandConfigurationResolver', () => {
  describe('resolveConfiguration', () => {
    it('should prefer explicit values and skip home configuration resolution when all values are provided', async () => {
      // Arrange
      const { ApiEaseCommandConfigurationResolver } = await import(apiEaseCommandConfigurationResolverModuleUrl);
      let resolveEnvironmentVariablesCallCount = 0;
      const apiEaseCommandConfigurationResolver = new ApiEaseCommandConfigurationResolver({
        apiEaseHomeConfigurationResolver: {
          async resolveEnvironmentVariables() {
            resolveEnvironmentVariablesCallCount += 1;
            throw new Error('home configuration should not be resolved');
          },
        },
        processEnvironment: {
          APIEASE_API_KEY: 'process-api-key',
          APIEASE_BASE_URL: 'https://apiease.example.com/from-process',
          APIEASE_SHOP_DOMAIN: 'process-shop.myshopify.com',
        },
      });

      // Act
      const result = await apiEaseCommandConfigurationResolver.resolveConfiguration({
        explicitApiBaseUrl: 'https://apiease.example.com',
        explicitApiKey: 'explicit-api-key',
        explicitShopDomain: 'cool-shop.myshopify.com',
      });

      // Assert
      assert.deepEqual(result, {
        ok: true,
        apiBaseUrl: 'https://apiease.example.com',
        apiKey: 'explicit-api-key',
        shopDomain: 'cool-shop.myshopify.com',
      });
      assert.equal(resolveEnvironmentVariablesCallCount, 0);
    });

    it('should resolve each value with flag then process environment then selected home file precedence', async () => {
      // Arrange
      const { ApiEaseCommandConfigurationResolver } = await import(apiEaseCommandConfigurationResolverModuleUrl);
      let resolveEnvironmentVariablesCallCount = 0;
      const apiEaseCommandConfigurationResolver = new ApiEaseCommandConfigurationResolver({
        apiEaseHomeConfigurationResolver: {
          async resolveEnvironmentVariables() {
            resolveEnvironmentVariablesCallCount += 1;
            return {
              ok: true,
              environmentVariablesFilePath: '/tmp/home/.apiease/.env.staging',
              environmentVariables: {
                APIEASE_API_KEY: 'home-api-key',
                APIEASE_BASE_URL: 'https://apiease.example.com/from-home',
                APIEASE_SHOP_DOMAIN: 'home-shop.myshopify.com',
              },
            };
          },
        },
        processEnvironment: {
          APIEASE_API_KEY: 'process-api-key',
          APIEASE_BASE_URL: 'https://apiease.example.com/from-process',
        },
      });

      // Act
      const result = await apiEaseCommandConfigurationResolver.resolveConfiguration({
        explicitApiKey: 'explicit-api-key',
      });

      // Assert
      assert.deepEqual(result, {
        ok: true,
        apiBaseUrl: 'https://apiease.example.com/from-process',
        apiKey: 'explicit-api-key',
        shopDomain: 'home-shop.myshopify.com',
      });
      assert.equal(resolveEnvironmentVariablesCallCount, 1);
    });

    it('should skip unreadable home configuration when the process environment supplies every value', async () => {
      // Arrange
      const { ApiEaseCommandConfigurationResolver } = await import(apiEaseCommandConfigurationResolverModuleUrl);
      let resolveEnvironmentVariablesCallCount = 0;
      const apiEaseCommandConfigurationResolver = new ApiEaseCommandConfigurationResolver({
        apiEaseHomeConfigurationResolver: {
          async resolveEnvironmentVariables() {
            resolveEnvironmentVariablesCallCount += 1;
            throw new Error('home configuration should not be resolved');
          },
        },
        processEnvironment: {
          APIEASE_API_KEY: 'process-api-key',
          APIEASE_BASE_URL: 'https://apiease.example.com/from-process',
          APIEASE_SHOP_DOMAIN: 'process-shop.myshopify.com',
        },
      });

      // Act
      const result = await apiEaseCommandConfigurationResolver.resolveConfiguration();

      // Assert
      assert.deepEqual(result, {
        ok: true,
        apiBaseUrl: 'https://apiease.example.com/from-process',
        apiKey: 'process-api-key',
        shopDomain: 'process-shop.myshopify.com',
      });
      assert.equal(resolveEnvironmentVariablesCallCount, 0);
    });

    it('should return a stable secret-safe configuration failure when the api key is missing', async () => {
      // Arrange
      const { ApiEaseCommandConfigurationResolver } = await import(apiEaseCommandConfigurationResolverModuleUrl);
      const apiEaseCommandConfigurationResolver = new ApiEaseCommandConfigurationResolver({
        apiEaseHomeConfigurationResolver: {
          async resolveEnvironmentVariables() {
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
        processEnvironment: {},
      });

      // Act
      const result = await apiEaseCommandConfigurationResolver.resolveConfiguration({});

      // Assert
      assert.deepEqual(result, {
        ok: false,
        errorCode: 'APIEASE_COMMAND_CONFIGURATION_MISSING',
        message: 'Required APIEase configuration is missing.',
        fieldErrors: [{
          path: 'apiKey',
          code: 'REQUIRED',
          message: 'API key is required.',
        }],
      });
    });

    for (const missingConfiguration of [
      {
        environmentVariableName: 'APIEASE_BASE_URL',
        path: 'apiBaseUrl',
        message: 'API base URL is required.',
      },
      {
        environmentVariableName: 'APIEASE_SHOP_DOMAIN',
        path: 'shopDomain',
        message: 'Shop domain is required.',
      },
    ]) {
      it(`should return a stable configuration failure when ${missingConfiguration.path} is missing`, async () => {
        // Arrange
        const { ApiEaseCommandConfigurationResolver } = await import(apiEaseCommandConfigurationResolverModuleUrl);
        const environmentVariables = {
          APIEASE_API_KEY: 'home-api-key',
          APIEASE_BASE_URL: 'https://apiease.example.com/from-home',
          APIEASE_SHOP_DOMAIN: 'home-shop.myshopify.com',
        };
        delete environmentVariables[missingConfiguration.environmentVariableName];
        const apiEaseCommandConfigurationResolver = new ApiEaseCommandConfigurationResolver({
          apiEaseHomeConfigurationResolver: {
            async resolveEnvironmentVariables() {
              return {
                ok: true,
                environmentVariablesFilePath: '/tmp/home/.apiease/.env.staging',
                environmentVariables,
              };
            },
          },
          processEnvironment: {},
        });

        // Act
        const result = await apiEaseCommandConfigurationResolver.resolveConfiguration();

        // Assert
        assert.deepEqual(result, {
          ok: false,
          errorCode: 'APIEASE_COMMAND_CONFIGURATION_MISSING',
          message: 'Required APIEase configuration is missing.',
          fieldErrors: [{
            path: missingConfiguration.path,
            code: 'REQUIRED',
            message: missingConfiguration.message,
          }],
        });
      });
    }
  });
});
