import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const apiEaseHomeConfigurationResolverModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'config', 'ApiEaseHomeConfigurationResolver.js'),
).href;

describe('ApiEaseHomeConfigurationResolver', () => {
  let temporaryDirectoryPath;

  before(async () => {
    temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-cli-home-config-'));
  });

  after(async () => {
    await fs.rm(temporaryDirectoryPath, { recursive: true, force: true });
  });

  describe('resolveConfiguration', () => {
    it('should resolve the active local environment and API key from the matching home env file', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const { apiEaseHomeConfigurationResolver, environmentDeclarationFilePath, environmentVariablesFilePath } =
        await createResolverWithHomeConfiguration({
          temporaryDirectoryPath,
          resolverHomeName: 'success-local-home',
          environment: 'local',
          apiKey: 'local-api-key',
          ApiEaseHomeConfigurationResolver,
        });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveConfiguration();

      // Assert
      assert.deepEqual(result, {
        ok: true,
        environment: 'local',
        apiKey: 'local-api-key',
        environmentDeclarationFilePath,
        environmentVariablesFilePath,
      });
    });

    it('should resolve the active staging environment and API key from the matching home env file', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const { apiEaseHomeConfigurationResolver, environmentDeclarationFilePath, environmentVariablesFilePath } =
        await createResolverWithHomeConfiguration({
          temporaryDirectoryPath,
          resolverHomeName: 'success-staging-home',
          environment: 'staging',
          apiKey: 'staging-api-key',
          ApiEaseHomeConfigurationResolver,
        });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveConfiguration();

      // Assert
      assert.deepEqual(result, {
        ok: true,
        environment: 'staging',
        apiKey: 'staging-api-key',
        environmentDeclarationFilePath,
        environmentVariablesFilePath,
      });
    });

    it('should resolve the active production environment and API key from the matching home env file', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const { apiEaseHomeConfigurationResolver, environmentDeclarationFilePath, environmentVariablesFilePath } =
        await createResolverWithHomeConfiguration({
          temporaryDirectoryPath,
          resolverHomeName: 'success-production-home',
          environment: 'production',
          apiKey: 'production-api-key',
          ApiEaseHomeConfigurationResolver,
        });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveConfiguration();

      // Assert
      assert.deepEqual(result, {
        ok: true,
        environment: 'production',
        apiKey: 'production-api-key',
        environmentDeclarationFilePath,
        environmentVariablesFilePath,
      });
    });

    it('should return a structured error when the environment declaration file is missing', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const homeDirectoryPath = path.join(temporaryDirectoryPath, 'missing-environment-home');
      const environmentDeclarationFilePath = path.join(homeDirectoryPath, '.apiease', 'environment');
      const apiEaseHomeConfigurationResolver = new ApiEaseHomeConfigurationResolver({
        homeDirectoryPath,
      });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveConfiguration();

      // Assert
      assert.deepEqual(result, {
        ok: false,
        errorCode: 'APIEASE_HOME_ENVIRONMENT_FILE_NOT_FOUND',
        message: `APIEASE home environment file was not found: ${environmentDeclarationFilePath}`,
        filePath: environmentDeclarationFilePath,
        fieldErrors: [],
      });
    });

    it('should resolve a custom environment name from the matching home env file', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const { apiEaseHomeConfigurationResolver, environmentDeclarationFilePath, environmentVariablesFilePath } =
        await createResolverWithHomeConfiguration({
          temporaryDirectoryPath,
          resolverHomeName: 'success-custom-environment-home',
          environment: 'qa',
          apiKey: 'qa-api-key',
          ApiEaseHomeConfigurationResolver,
        });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveConfiguration();

      // Assert
      assert.deepEqual(result, {
        ok: true,
        environment: 'qa',
        apiKey: 'qa-api-key',
        environmentDeclarationFilePath,
        environmentVariablesFilePath,
      });
    });

    it('should return a structured error when the environment declaration value is blank', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const homeDirectoryPath = path.join(temporaryDirectoryPath, 'blank-environment-home');
      const apieaseDirectoryPath = path.join(homeDirectoryPath, '.apiease');
      const environmentDeclarationFilePath = path.join(apieaseDirectoryPath, 'environment');
      await fs.mkdir(apieaseDirectoryPath, { recursive: true });
      await fs.writeFile(environmentDeclarationFilePath, '\n', 'utf8');
      const apiEaseHomeConfigurationResolver = new ApiEaseHomeConfigurationResolver({
        homeDirectoryPath,
      });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveConfiguration();

      // Assert
      assert.deepEqual(result, {
        ok: false,
        errorCode: 'APIEASE_HOME_ENVIRONMENT_INVALID',
        message: `APIEASE home environment must not be blank: ${environmentDeclarationFilePath}`,
        filePath: environmentDeclarationFilePath,
        fieldErrors: [],
      });
    });

    it('should return a structured error when the selected env file is missing', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const homeDirectoryPath = path.join(temporaryDirectoryPath, 'missing-env-file-home');
      const apieaseDirectoryPath = path.join(homeDirectoryPath, '.apiease');
      const environmentDeclarationFilePath = path.join(apieaseDirectoryPath, 'environment');
      const environmentVariablesFilePath = path.join(apieaseDirectoryPath, '.env.production');
      await fs.mkdir(apieaseDirectoryPath, { recursive: true });
      await fs.writeFile(environmentDeclarationFilePath, 'production\n', 'utf8');
      const apiEaseHomeConfigurationResolver = new ApiEaseHomeConfigurationResolver({
        homeDirectoryPath,
      });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveConfiguration();

      // Assert
      assert.deepEqual(result, {
        ok: false,
        errorCode: 'APIEASE_HOME_ENV_FILE_NOT_FOUND',
        message: `APIEASE home environment file was not found: ${environmentVariablesFilePath}`,
        filePath: environmentVariablesFilePath,
        fieldErrors: [],
      });
    });

    it('should return a structured error when the environment declaration file cannot be read', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const homeDirectoryPath = path.join(temporaryDirectoryPath, 'unreadable-environment-home');
      const environmentDeclarationFilePath = path.join(homeDirectoryPath, '.apiease', 'environment');
      const apiEaseHomeConfigurationResolver = new ApiEaseHomeConfigurationResolver({
        homeDirectoryPath,
        fileSystem: {
          async readFile() {
            const readError = new Error('permission denied');
            readError.code = 'EACCES';
            throw readError;
          },
        },
      });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveConfiguration();

      // Assert
      assert.deepEqual(result, {
        ok: false,
        errorCode: 'APIEASE_HOME_ENVIRONMENT_FILE_READ_FAILED',
        message: `APIEASE home environment file could not be read: ${environmentDeclarationFilePath}`,
        filePath: environmentDeclarationFilePath,
        fieldErrors: [],
      });
    });

    it('should return a structured error when the selected env file cannot be read', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const homeDirectoryPath = path.join(temporaryDirectoryPath, 'unreadable-env-file-home');
      const environmentVariablesFilePath = path.join(homeDirectoryPath, '.apiease', '.env.staging');
      let readFileCallCount = 0;
      const apiEaseHomeConfigurationResolver = new ApiEaseHomeConfigurationResolver({
        homeDirectoryPath,
        fileSystem: {
          async readFile() {
            readFileCallCount += 1;
            if (readFileCallCount === 1) {
              return 'staging\n';
            }

            const readError = new Error('permission denied');
            readError.code = 'EACCES';
            throw readError;
          },
        },
      });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveConfiguration();

      // Assert
      assert.deepEqual(result, {
        ok: false,
        errorCode: 'APIEASE_HOME_ENV_FILE_READ_FAILED',
        message: `APIEASE home environment file could not be read: ${environmentVariablesFilePath}`,
        filePath: environmentVariablesFilePath,
        fieldErrors: [],
      });
    });

    it('should return a structured error when the selected env file does not define APIEASE_API_KEY', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const homeDirectoryPath = path.join(temporaryDirectoryPath, 'missing-api-key-home');
      const apieaseDirectoryPath = path.join(homeDirectoryPath, '.apiease');
      const environmentDeclarationFilePath = path.join(apieaseDirectoryPath, 'environment');
      const environmentVariablesFilePath = path.join(apieaseDirectoryPath, '.env.local');
      await fs.mkdir(apieaseDirectoryPath, { recursive: true });
      await fs.writeFile(environmentDeclarationFilePath, 'local\n', 'utf8');
      await fs.writeFile(environmentVariablesFilePath, 'OTHER_KEY=value\n', 'utf8');
      const apiEaseHomeConfigurationResolver = new ApiEaseHomeConfigurationResolver({
        homeDirectoryPath,
      });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveConfiguration();

      // Assert
      assert.deepEqual(result, {
        ok: false,
        errorCode: 'APIEASE_HOME_API_KEY_MISSING',
        message: `APIEASE_API_KEY was not found in environment file: ${environmentVariablesFilePath}`,
        filePath: environmentVariablesFilePath,
        fieldErrors: [],
      });
    });
  });

  describe('resolveEnvironmentVariables', () => {
    for (const environment of ['staging', 'qa-us_2.1']) {
      it(`should read the explicit ${environment} environment without reading the default declaration`, async () => {
        // Arrange
        const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
        const readPaths = [];
        const homeDirectoryPath = path.join(temporaryDirectoryPath, 'explicit-environment-home');
        const environmentVariablesFilePath = path.join(homeDirectoryPath, '.apiease', `.env.${environment}`);
        const resolver = new ApiEaseHomeConfigurationResolver({
          homeDirectoryPath,
          fileSystem: {
            async readFile(filePath) {
              readPaths.push(filePath);
              return 'APIEASE_API_KEY=selected-key\nAPIEASE_BASE_URL=https://selected.example.com\nAPIEASE_SHOP_DOMAIN=selected.myshopify.com\n';
            },
          },
        });

        // Act
        const result = await resolver.resolveEnvironmentVariables({ environment });

        // Assert
        assert.deepEqual(result, {
          ok: true,
          environment,
          environmentDeclarationFilePath: path.join(homeDirectoryPath, '.apiease', 'environment'),
          environmentVariablesFilePath,
          environmentVariables: {
            APIEASE_API_KEY: 'selected-key',
            APIEASE_BASE_URL: 'https://selected.example.com',
            APIEASE_SHOP_DOMAIN: 'selected.myshopify.com',
          },
        });
        assert.deepEqual(readPaths, [environmentVariablesFilePath]);
      });
    }

    it('should fail for a missing explicit environment without falling back to the active environment', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const { apiEaseHomeConfigurationResolver, environmentDeclarationFilePath } =
        await createResolverWithHomeConfiguration({
          temporaryDirectoryPath,
          resolverHomeName: 'missing-explicit-environment-home',
          environment: 'local',
          apiKey: 'local-key',
          ApiEaseHomeConfigurationResolver,
        });
      const environmentVariablesFilePath = path.join(path.dirname(environmentDeclarationFilePath), '.env.missing');

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveEnvironmentVariables({ environment: 'missing' });

      // Assert
      assert.deepEqual(result, {
        ok: false,
        errorCode: 'APIEASE_HOME_ENV_FILE_NOT_FOUND',
        message: `APIEASE home environment file was not found: ${environmentVariablesFilePath}`,
        filePath: environmentVariablesFilePath,
        fieldErrors: [],
      });
      assert.equal(await fs.readFile(environmentDeclarationFilePath, 'utf8'), 'local\n');
    });

    for (const environment of ['', ' ', '../production', 'qa/production', 'qa\\production', '--json']) {
      it(`should reject invalid explicit environment ${JSON.stringify(environment)} before reading files`, async () => {
        // Arrange
        const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
        const resolver = new ApiEaseHomeConfigurationResolver({
          fileSystem: { async readFile() { assert.fail('Invalid environment must not read files.'); } },
        });

        // Act
        const result = await resolver.resolveEnvironmentVariables({ environment });

        // Assert
        assert.deepEqual(result, {
          ok: false,
          errorCode: 'APIEASE_HOME_ENVIRONMENT_INVALID',
          message: 'Environment must start with a letter or digit and contain only letters, digits, dots, underscores, or hyphens.',
          fieldErrors: [{ path: 'environment', code: 'INVALID' }],
        });
      });
    }

    it('should resolve the matching home env variables including APIEASE_BASE_URL and APIEASE_SHOP_DOMAIN', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const { apiEaseHomeConfigurationResolver, environmentDeclarationFilePath, environmentVariablesFilePath } =
        await createResolverWithHomeConfiguration({
          temporaryDirectoryPath,
          resolverHomeName: 'resolve-environment-variables-home',
          environment: 'local',
          apiKey: 'local-api-key',
          apiBaseUrl: 'https://apiease.example.com/root',
          shopDomain: 'cool-shop.myshopify.com',
          ApiEaseHomeConfigurationResolver,
        });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveEnvironmentVariables();

      // Assert
      assert.deepEqual(result, {
        ok: true,
        environment: 'local',
        environmentDeclarationFilePath,
        environmentVariablesFilePath,
        environmentVariables: {
          APIEASE_API_KEY: 'local-api-key',
          APIEASE_BASE_URL: 'https://apiease.example.com/root',
          APIEASE_SHOP_DOMAIN: 'cool-shop.myshopify.com',
        },
      });
    });

    it('should return a structured error when the selected env file is missing', async () => {
      // Arrange
      const { ApiEaseHomeConfigurationResolver } = await import(apiEaseHomeConfigurationResolverModuleUrl);
      const homeDirectoryPath = path.join(temporaryDirectoryPath, 'resolve-environment-variables-missing-env-file-home');
      const apieaseDirectoryPath = path.join(homeDirectoryPath, '.apiease');
      const environmentDeclarationFilePath = path.join(apieaseDirectoryPath, 'environment');
      const environmentVariablesFilePath = path.join(apieaseDirectoryPath, '.env.production');
      await fs.mkdir(apieaseDirectoryPath, { recursive: true });
      await fs.writeFile(environmentDeclarationFilePath, 'production\n', 'utf8');
      const apiEaseHomeConfigurationResolver = new ApiEaseHomeConfigurationResolver({
        homeDirectoryPath,
      });

      // Act
      const result = await apiEaseHomeConfigurationResolver.resolveEnvironmentVariables();

      // Assert
      assert.deepEqual(result, {
        ok: false,
        errorCode: 'APIEASE_HOME_ENV_FILE_NOT_FOUND',
        message: `APIEASE home environment file was not found: ${environmentVariablesFilePath}`,
        filePath: environmentVariablesFilePath,
        fieldErrors: [],
      });
    });
  });
});

async function createResolverWithHomeConfiguration({
  temporaryDirectoryPath,
  resolverHomeName,
  environment,
  apiKey,
  apiBaseUrl,
  shopDomain,
  ApiEaseHomeConfigurationResolver,
}) {
  const homeDirectoryPath = path.join(temporaryDirectoryPath, resolverHomeName);
  const apieaseDirectoryPath = path.join(homeDirectoryPath, '.apiease');
  const environmentDeclarationFilePath = path.join(apieaseDirectoryPath, 'environment');
  const environmentVariablesFilePath = path.join(apieaseDirectoryPath, `.env.${environment}`);

  await fs.mkdir(apieaseDirectoryPath, { recursive: true });
  await fs.writeFile(environmentDeclarationFilePath, `${environment}\n`, 'utf8');
  const environmentVariableLines = [`APIEASE_API_KEY=${apiKey}`];
  if (apiBaseUrl) {
    environmentVariableLines.push(`APIEASE_BASE_URL=${apiBaseUrl}`);
  }
  if (shopDomain) {
    environmentVariableLines.push(`APIEASE_SHOP_DOMAIN=${shopDomain}`);
  }
  await fs.writeFile(environmentVariablesFilePath, `${environmentVariableLines.join('\n')}\n`, 'utf8');

  return {
    apiEaseHomeConfigurationResolver: new ApiEaseHomeConfigurationResolver({
      homeDirectoryPath,
    }),
    environmentDeclarationFilePath,
    environmentVariablesFilePath,
  };
}
