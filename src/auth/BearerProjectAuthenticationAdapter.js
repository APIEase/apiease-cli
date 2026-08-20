import { ProjectAuthenticationAdapter } from './ProjectAuthenticationAdapter.js';

const TOKEN_PATTERN = /^[^\s,]+\.[^\s,]+\.[^\s,]+$/u;
const CONFIGURATION_ERROR_CODE = 'PROJECT_BEARER_AUTHENTICATION_CONFIGURATION_INVALID';
const OPTIONS_CONFLICT_ERROR_CODE = 'PROJECT_AUTHENTICATION_OPTIONS_CONFLICT';
const AUTHENTICATION_ERROR_CODE = 'PROJECT_BEARER_AUTHENTICATION_FAILED';

class BearerProjectAuthenticationAdapter extends ProjectAuthenticationAdapter {
  #apiBaseUrl;
  #authenticationOptionsConflict;
  #queuesByContext = new WeakMap();
  #tokenQueues;

  constructor({ apiBaseUrl, authenticationOptionsConflict = false, bearerTokensByAction } = {}) {
    super();
    this.#apiBaseUrl = apiBaseUrl;
    this.#authenticationOptionsConflict = authenticationOptionsConflict;
    this.#tokenQueues = cloneTokenQueues(bearerTokensByAction);
  }

  async resolveRequestConfiguration(configurationOptions = {}) {
    if (this.#authenticationOptionsConflict || hasPersonalAuthentication(configurationOptions)) {
      return buildConfigurationFailure(OPTIONS_CONFLICT_ERROR_CODE);
    }
    if (!isValidApiBaseUrl(this.#apiBaseUrl) || !this.#tokenQueues) {
      return buildConfigurationFailure(CONFIGURATION_ERROR_CODE);
    }
    const authenticationContext = Object.freeze(Object.create(null));
    this.#queuesByContext.set(authenticationContext, cloneTokenQueues(this.#tokenQueues));
    return { ok: true, apiBaseUrl: this.#apiBaseUrl, authenticationContext };
  }

  async buildRequestHeaders(authenticationContext, { action } = {}) {
    const tokenQueues = this.#queuesByContext.get(authenticationContext);
    const tokenQueue = tokenQueues?.[action] ?? tokenQueues?.['*'];
    const bearerToken = tokenQueue?.shift();
    if (!TOKEN_PATTERN.test(bearerToken ?? '')) throw buildAuthenticationError();
    return { authorization: `Bearer ${bearerToken}` };
  }

  readAuthorityMode() {
    return 'bearer';
  }
}

function cloneTokenQueues(bearerTokensByAction) {
  if (!isPlainObject(bearerTokensByAction)) return null;
  const entries = Object.entries(bearerTokensByAction);
  if (entries.length === 0 || entries.some(([action, tokens]) => (
    typeof action !== 'string' || action.length === 0 || !Array.isArray(tokens)
    || tokens.length === 0 || tokens.some(token => !TOKEN_PATTERN.test(token))
  ))) return null;
  return Object.fromEntries(entries.map(([action, tokens]) => [action, [...tokens]]));
}

function hasPersonalAuthentication(options) {
  return [options?.explicitApiKey, options?.explicitShopDomain]
    .some(value => typeof value === 'string' && value.length > 0);
}

function isValidApiBaseUrl(apiBaseUrl) {
  try {
    return ['http:', 'https:'].includes(new URL(apiBaseUrl).protocol);
  } catch {
    return false;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function buildConfigurationFailure(errorCode) {
  return {
    ok: false,
    errorCode,
    message: 'Bearer authentication configuration is invalid.',
    fieldErrors: [],
  };
}

function buildAuthenticationError() {
  return Object.assign(new Error('Bearer authentication failed.'), {
    code: AUTHENTICATION_ERROR_CODE,
  });
}

export {
  AUTHENTICATION_ERROR_CODE as PROJECT_BEARER_AUTHENTICATION_ERROR_CODE,
  BearerProjectAuthenticationAdapter,
};
