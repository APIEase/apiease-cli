import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const APIEASE_DIRECTORY_NAME = '.apiease';
const APIEASE_API_KEY_NAME = 'APIEASE_API_KEY';
const APIEASE_BASE_URL_NAME = 'APIEASE_BASE_URL';
const APIEASE_SHOP_DOMAIN_NAME = 'APIEASE_SHOP_DOMAIN';

class ApiEaseHomeConfigurationResolver {
  constructor({
    fileSystem = fs,
    homeDirectoryPath = os.homedir(),
  } = {}) {
    this.fileSystem = fileSystem;
    this.homeDirectoryPath = homeDirectoryPath;
  }

  async resolveConfiguration() {
    const environmentVariablesResult = await this.resolveEnvironmentVariables();
    if (!environmentVariablesResult.ok) {
      return environmentVariablesResult;
    }

    const apiKey = environmentVariablesResult.environmentVariables[APIEASE_API_KEY_NAME];
    if (!apiKey) {
      return this.buildApiKeyMissingFailureResult(environmentVariablesResult.environmentVariablesFilePath);
    }

    return {
      ok: true,
      environment: environmentVariablesResult.environment,
      apiKey,
      environmentDeclarationFilePath: environmentVariablesResult.environmentDeclarationFilePath,
      environmentVariablesFilePath: environmentVariablesResult.environmentVariablesFilePath,
    };
  }

  async resolveEnvironmentVariables({ environment } = {}) {
    const environmentDeclarationFilePath = this.buildEnvironmentDeclarationFilePath();
    const environmentResult = await this.resolveEnvironment({ environment, environmentDeclarationFilePath });
    if (!environmentResult.ok) {
      return environmentResult;
    }

    const environmentVariablesFilePath = this.buildEnvironmentVariablesFilePath(environmentResult.environment);
    const environmentVariablesResult = await this.readEnvironmentVariablesFile(environmentVariablesFilePath);
    if (!environmentVariablesResult.ok) {
      return environmentVariablesResult;
    }

    return {
      ok: true,
      environment: environmentResult.environment,
      environmentDeclarationFilePath,
      environmentVariablesFilePath,
      environmentVariables: {
        [APIEASE_API_KEY_NAME]: environmentVariablesResult.environmentVariables[APIEASE_API_KEY_NAME],
        [APIEASE_BASE_URL_NAME]: environmentVariablesResult.environmentVariables[APIEASE_BASE_URL_NAME],
        [APIEASE_SHOP_DOMAIN_NAME]: environmentVariablesResult.environmentVariables[APIEASE_SHOP_DOMAIN_NAME],
      },
    };
  }

  async resolveEnvironment({ environment, environmentDeclarationFilePath }) {
    if (environment === undefined) return this.readEnvironment(environmentDeclarationFilePath);
    if (typeof environment === 'string' && /^[a-z0-9][a-z0-9._-]*$/iu.test(environment)) {
      return { ok: true, environment };
    }
    return {
      ok: false,
      errorCode: 'APIEASE_HOME_ENVIRONMENT_INVALID',
      message: 'Environment must start with a letter or digit and contain only letters, digits, dots, underscores, or hyphens.',
      fieldErrors: [{ path: 'environment', code: 'INVALID' }],
    };
  }

  buildEnvironmentDeclarationFilePath() {
    return path.join(this.homeDirectoryPath, APIEASE_DIRECTORY_NAME, 'environment');
  }

  buildEnvironmentVariablesFilePath(environment) {
    return path.join(this.homeDirectoryPath, APIEASE_DIRECTORY_NAME, `.env.${environment}`);
  }

  async readEnvironment(environmentDeclarationFilePath) {
    const fileContentResult = await this.readFileContent({
      filePath: environmentDeclarationFilePath,
      notFoundErrorCode: 'APIEASE_HOME_ENVIRONMENT_FILE_NOT_FOUND',
      readFailedErrorCode: 'APIEASE_HOME_ENVIRONMENT_FILE_READ_FAILED',
      fileDescription: 'APIEASE home environment file',
    });
    if (!fileContentResult.ok) {
      return fileContentResult;
    }

    const environment = fileContentResult.fileContent.trim();
    if (!environment) {
      return this.buildFailureResult(
        'APIEASE_HOME_ENVIRONMENT_INVALID',
        `APIEASE home environment must not be blank: ${environmentDeclarationFilePath}`,
        environmentDeclarationFilePath,
      );
    }

    return {
      ok: true,
      environment,
    };
  }

  async readEnvironmentVariablesFile(environmentVariablesFilePath) {
    const fileContentResult = await this.readFileContent({
      filePath: environmentVariablesFilePath,
      notFoundErrorCode: 'APIEASE_HOME_ENV_FILE_NOT_FOUND',
      readFailedErrorCode: 'APIEASE_HOME_ENV_FILE_READ_FAILED',
      fileDescription: 'APIEASE home environment file',
    });
    if (!fileContentResult.ok) {
      return fileContentResult;
    }

    return {
      ok: true,
      environmentVariables: this.parseEnvironmentVariables(fileContentResult.fileContent),
    };
  }

  async readFileContent({ filePath, notFoundErrorCode, readFailedErrorCode, fileDescription }) {
    try {
      const fileContent = await this.fileSystem.readFile(filePath, 'utf8');
      return {
        ok: true,
        fileContent,
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return this.buildFailureResult(
          notFoundErrorCode,
          `${fileDescription} was not found: ${filePath}`,
          filePath,
        );
      }

      return this.buildFailureResult(
        readFailedErrorCode,
        `${fileDescription} could not be read: ${filePath}`,
        filePath,
      );
    }
  }

  parseEnvironmentVariables(fileContent) {
    return fileContent.split(/\r?\n/u).reduce((environmentVariables, line) => {
      const environmentVariable = this.parseEnvironmentVariable(line);
      if (!environmentVariable) {
        return environmentVariables;
      }

      environmentVariables[environmentVariable.name] = environmentVariable.value;
      return environmentVariables;
    }, {});
  }

  parseEnvironmentVariable(line) {
    const normalizedLine = this.normalizeEnvironmentVariableLine(line);
    if (!normalizedLine) {
      return null;
    }

    const equalsSignIndex = normalizedLine.indexOf('=');
    if (equalsSignIndex < 1) {
      return null;
    }

    return {
      name: normalizedLine.slice(0, equalsSignIndex).trim(),
      value: this.stripWrappingQuotes(normalizedLine.slice(equalsSignIndex + 1).trim()),
    };
  }

  normalizeEnvironmentVariableLine(line) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return null;
    }

    return trimmedLine.startsWith('export ')
      ? trimmedLine.slice('export '.length).trim()
      : trimmedLine;
  }

  stripWrappingQuotes(value) {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }

    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }

    return value;
  }

  buildFailureResult(errorCode, message, filePath) {
    return {
      ok: false,
      errorCode,
      message,
      filePath,
      fieldErrors: [],
    };
  }

  buildApiKeyMissingFailureResult(environmentVariablesFilePath) {
    return this.buildFailureResult(
      'APIEASE_HOME_API_KEY_MISSING',
      `APIEASE_API_KEY was not found in environment file: ${environmentVariablesFilePath}`,
      environmentVariablesFilePath,
    );
  }
}

export { ApiEaseHomeConfigurationResolver };
