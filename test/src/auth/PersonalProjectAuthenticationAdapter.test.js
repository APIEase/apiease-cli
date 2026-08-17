import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const personalProjectAuthenticationAdapterModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'auth', 'PersonalProjectAuthenticationAdapter.js'),
).href;

describe('PersonalProjectAuthenticationAdapter', () => {
  describe('resolveRequestConfiguration', () => {
    it('should retain resolved personal credentials in an opaque authentication context', async () => {
      // Arrange
      const { PersonalProjectAuthenticationAdapter } = await import(
        personalProjectAuthenticationAdapterModuleUrl
      );
      const resolveConfigurationArguments = {
        explicitApiBaseUrl: 'https://apiease.example.com',
        explicitApiKey: 'private-api-key',
        explicitShopDomain: 'cool-shop.myshopify.com',
      };
      const expectedResolverArguments = {
        ...resolveConfigurationArguments,
        requiredConfigurationFieldPaths: ['apiBaseUrl', 'apiKey', 'shopDomain'],
      };
      const apiEaseCommandConfigurationResolver = {
        async resolveConfiguration(argumentsValue) {
          assert.deepEqual(argumentsValue, expectedResolverArguments);

          return {
            ok: true,
            apiBaseUrl: 'https://apiease.example.com',
            apiKey: 'private-api-key',
            shopDomain: 'cool-shop.myshopify.com',
          };
        },
      };
      const personalProjectAuthenticationAdapter = new PersonalProjectAuthenticationAdapter({
        apiEaseCommandConfigurationResolver,
      });

      // Act
      const requestConfiguration = await personalProjectAuthenticationAdapter.resolveRequestConfiguration(
        {
          ...resolveConfigurationArguments,
          requiredConfigurationFieldPaths: ['apiBaseUrl'],
        },
      );

      // Assert
      assert.equal(requestConfiguration.ok, true);
      assert.equal(requestConfiguration.apiBaseUrl, 'https://apiease.example.com');
      assert.deepEqual(Object.keys(requestConfiguration.authenticationContext), []);
      assert.equal(JSON.stringify(requestConfiguration).includes('private-api-key'), false);
      assert.equal(JSON.stringify(requestConfiguration).includes('cool-shop.myshopify.com'), false);
    });

    for (const missingCredentialPath of ['apiKey', 'shopDomain']) {
      it(`should return a secret-safe failure when ${missingCredentialPath} is missing`, async () => {
        // Arrange
        const { PersonalProjectAuthenticationAdapter } = await import(
          personalProjectAuthenticationAdapterModuleUrl
        );
        const configurationFailure = {
          ok: false,
          errorCode: 'APIEASE_COMMAND_CONFIGURATION_MISSING',
          message: 'Required APIEase configuration is missing.',
          fieldErrors: [{
            path: missingCredentialPath,
            code: 'REQUIRED',
            message: `${missingCredentialPath} is required.`,
          }],
        };
        const personalProjectAuthenticationAdapter = new PersonalProjectAuthenticationAdapter({
          apiEaseCommandConfigurationResolver: {
            async resolveConfiguration() {
              return configurationFailure;
            },
          },
        });

        // Act
        const requestConfiguration = await personalProjectAuthenticationAdapter.resolveRequestConfiguration();

        // Assert
        assert.equal(requestConfiguration, configurationFailure);
        assert.equal('authenticationContext' in requestConfiguration, false);
      });
    }
  });

  describe('buildRequestHeaders', () => {
    it('should build exactly the required personal Project API headers', async () => {
      // Arrange
      const { PersonalProjectAuthenticationAdapter } = await import(
        personalProjectAuthenticationAdapterModuleUrl
      );
      const personalProjectAuthenticationAdapter = new PersonalProjectAuthenticationAdapter({
        apiEaseCommandConfigurationResolver: {
          async resolveConfiguration() {
            return {
              ok: true,
              apiBaseUrl: 'https://apiease.example.com',
              apiKey: 'private-api-key',
              shopDomain: 'cool-shop.myshopify.com',
            };
          },
        },
      });
      const requestConfiguration = await personalProjectAuthenticationAdapter.resolveRequestConfiguration();

      // Act
      const requestHeaders = personalProjectAuthenticationAdapter.buildRequestHeaders(
        requestConfiguration.authenticationContext,
      );

      // Assert
      assert.deepEqual(requestHeaders, {
        'x-apiease-api-key': 'private-api-key',
        'x-shop-myshopify-domain': 'cool-shop.myshopify.com',
      });
    });

    it('should reject an authentication context not issued by the adapter', async () => {
      // Arrange
      const { PersonalProjectAuthenticationAdapter } = await import(
        personalProjectAuthenticationAdapterModuleUrl
      );
      const personalProjectAuthenticationAdapter = new PersonalProjectAuthenticationAdapter({
        apiEaseCommandConfigurationResolver: {},
      });

      // Act and Assert
      assert.throws(
        () => personalProjectAuthenticationAdapter.buildRequestHeaders(Object.freeze({})),
        /Personal authentication context is invalid/,
      );
    });
  });

  describe('readAuthorityMode', () => {
    it('should declare personal authority', async () => {
      // Arrange
      const { PersonalProjectAuthenticationAdapter } = await import(
        personalProjectAuthenticationAdapterModuleUrl
      );
      const personalProjectAuthenticationAdapter = new PersonalProjectAuthenticationAdapter({
        apiEaseCommandConfigurationResolver: {},
      });

      // Act
      const authorityMode = personalProjectAuthenticationAdapter.readAuthorityMode();

      // Assert
      assert.equal(authorityMode, 'personal');
    });
  });
});
