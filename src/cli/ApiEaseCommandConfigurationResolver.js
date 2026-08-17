import { ApiEaseHomeConfigurationResolver } from '../config/ApiEaseHomeConfigurationResolver.js';

const APIEASE_API_KEY_NAME = 'APIEASE_API_KEY';
const APIEASE_BASE_URL_NAME = 'APIEASE_BASE_URL';
const APIEASE_SHOP_DOMAIN_NAME = 'APIEASE_SHOP_DOMAIN';
const REQUIRED_CONFIGURATION_FIELDS = [
  { path: 'apiBaseUrl', code: 'REQUIRED', message: 'API base URL is required.' },
  { path: 'apiKey', code: 'REQUIRED', message: 'API key is required.' },
  { path: 'shopDomain', code: 'REQUIRED', message: 'Shop domain is required.' },
];

class ApiEaseCommandConfigurationResolver {
  constructor({
    apiEaseHomeConfigurationResolver = new ApiEaseHomeConfigurationResolver(),
    processEnvironment = process.env,
  } = {}) {
    this.apiEaseHomeConfigurationResolver = apiEaseHomeConfigurationResolver;
    this.processEnvironment = processEnvironment;
  }

  async resolveConfiguration({
    explicitApiBaseUrl,
    explicitApiKey,
    explicitShopDomain,
    requiredConfigurationFieldPaths = REQUIRED_CONFIGURATION_FIELDS.map(({ path }) => path),
  } = {}) {
    const configuration = this.resolveAvailableConfiguration({
      explicitApiBaseUrl,
      explicitApiKey,
      explicitShopDomain,
    });
    if (this.hasCompleteConfiguration(configuration)) {
      return this.buildSuccessResult(configuration);
    }

    const environmentVariablesResult = await this.apiEaseHomeConfigurationResolver.resolveEnvironmentVariables();
    if (!environmentVariablesResult.ok) {
      return environmentVariablesResult;
    }

    const completeConfiguration = this.fillMissingConfiguration({
      configuration,
      homeEnvironmentVariables: environmentVariablesResult.environmentVariables,
    });
    const missingConfigurationFailure = this.buildMissingConfigurationFailure({
      configuration: completeConfiguration,
      requiredConfigurationFieldPaths,
    });
    if (missingConfigurationFailure) {
      return missingConfigurationFailure;
    }

    return this.buildSuccessResult(completeConfiguration);
  }

  resolveAvailableConfiguration({ explicitApiBaseUrl, explicitApiKey, explicitShopDomain }) {
    return {
      apiBaseUrl: explicitApiBaseUrl || this.processEnvironment[APIEASE_BASE_URL_NAME],
      apiKey: explicitApiKey || this.processEnvironment[APIEASE_API_KEY_NAME],
      shopDomain: explicitShopDomain || this.processEnvironment[APIEASE_SHOP_DOMAIN_NAME],
    };
  }

  fillMissingConfiguration({ configuration, homeEnvironmentVariables }) {
    return {
      apiBaseUrl: configuration.apiBaseUrl || homeEnvironmentVariables[APIEASE_BASE_URL_NAME],
      apiKey: configuration.apiKey || homeEnvironmentVariables[APIEASE_API_KEY_NAME],
      shopDomain: configuration.shopDomain || homeEnvironmentVariables[APIEASE_SHOP_DOMAIN_NAME],
    };
  }

  hasCompleteConfiguration(configuration) {
    return REQUIRED_CONFIGURATION_FIELDS.every(({ path }) => Boolean(configuration[path]));
  }

  buildMissingConfigurationFailure({ configuration, requiredConfigurationFieldPaths }) {
    const fieldErrors = REQUIRED_CONFIGURATION_FIELDS.filter(({ path }) => (
      requiredConfigurationFieldPaths.includes(path) && !configuration[path]
    ));
    if (fieldErrors.length === 0) {
      return null;
    }

    return {
      ok: false,
      errorCode: 'APIEASE_COMMAND_CONFIGURATION_MISSING',
      message: 'Required APIEase configuration is missing.',
      fieldErrors,
    };
  }

  buildSuccessResult({ apiBaseUrl, apiKey, shopDomain }) {
    return {
      ok: true,
      apiBaseUrl,
      apiKey,
      shopDomain,
    };
  }
}

export { ApiEaseCommandConfigurationResolver };
