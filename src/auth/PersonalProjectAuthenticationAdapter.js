import { ApiEaseCommandConfigurationResolver } from '../cli/ApiEaseCommandConfigurationResolver.js';
import { ProjectAuthenticationAdapter } from './ProjectAuthenticationAdapter.js';

const PERSONAL_PROJECT_CONFIGURATION_FIELD_PATHS = Object.freeze([
  'apiBaseUrl',
  'apiKey',
  'shopDomain',
]);

class PersonalProjectAuthenticationAdapter extends ProjectAuthenticationAdapter {
  #authenticationCredentialsByContext = new WeakMap();

  constructor({
    apiEaseCommandConfigurationResolver = new ApiEaseCommandConfigurationResolver(),
  } = {}) {
    super();
    this.apiEaseCommandConfigurationResolver = apiEaseCommandConfigurationResolver;
  }

  async resolveRequestConfiguration({ explicitApiBaseUrl, explicitApiKey, explicitShopDomain } = {}) {
    const configuration = await this.apiEaseCommandConfigurationResolver.resolveConfiguration({
      explicitApiBaseUrl,
      explicitApiKey,
      explicitShopDomain,
      requiredConfigurationFieldPaths: PERSONAL_PROJECT_CONFIGURATION_FIELD_PATHS,
    });
    if (!configuration.ok) {
      return configuration;
    }

    return this.buildRequestConfiguration(configuration);
  }

  buildRequestHeaders(authenticationContext) {
    const authenticationCredentials = this.#authenticationCredentialsByContext.get(authenticationContext);
    if (!authenticationCredentials) {
      throw new Error('Personal authentication context is invalid.');
    }

    return {
      'x-apiease-api-key': authenticationCredentials.apiKey,
      'x-shop-myshopify-domain': authenticationCredentials.shopDomain,
    };
  }

  readAuthorityMode() {
    return 'personal';
  }

  buildRequestConfiguration({ apiBaseUrl, apiKey, shopDomain }) {
    const authenticationContext = Object.freeze(Object.create(null));
    this.#authenticationCredentialsByContext.set(authenticationContext, { apiKey, shopDomain });

    return { ok: true, apiBaseUrl, authenticationContext };
  }
}

export { PersonalProjectAuthenticationAdapter };
