import { ProjectAuthenticationAdapter } from './ProjectAuthenticationAdapter.js';

const WORKER_PROJECT_AUTHENTICATION_CONFIGURATION_ERROR_CODE =
  'WORKER_PROJECT_AUTHENTICATION_CONFIGURATION_INVALID';
const WORKER_PROJECT_AUTHENTICATION_ERROR_CODE =
  'WORKER_PROJECT_AUTHENTICATION_FAILED';
const WORKER_PROJECT_AUTHENTICATION_CONFIGURATION_ERROR_MESSAGE =
  'Worker Project authentication configuration is invalid.';
const WORKER_PROJECT_AUTHENTICATION_ERROR_MESSAGE =
  'Worker Project authentication failed.';
const WORKER_PROJECT_CAPABILITY_ACTIONS = Object.freeze({
  bootstrap: 'project:bootstrap',
  pull: 'project:pull',
  validate: 'project:validate',
  plan: 'project:plan',
  checkpointPublish: 'checkpoint:publish',
  checkpointRetrieve: 'checkpoint:retrieve',
  proposalSubmit: 'proposal:submit',
});
const WORKER_PROJECT_CAPABILITY_ACTION_SET = new Set(
  Object.values(WORKER_PROJECT_CAPABILITY_ACTIONS),
);
const COMPACT_CAPABILITY_PATTERN = /^[^\s,]+\.[^\s,]+\.[^\s,]+$/u;

class WorkerProjectAuthenticationAdapter extends ProjectAuthenticationAdapter {
  #brokerContextByAuthenticationContext = new WeakMap();
  #apiBaseUrl;
  #capabilityBroker;
  #capabilityBrokerContext;

  constructor({ apiBaseUrl, capabilityBroker, capabilityBrokerContext } = {}) {
    super();
    this.#apiBaseUrl = apiBaseUrl;
    this.#capabilityBroker = capabilityBroker;
    this.#capabilityBrokerContext = capabilityBrokerContext;
  }

  async resolveRequestConfiguration(configurationOptions = {}) {
    if (!this.hasValidConfiguration(configurationOptions)) {
      return buildConfigurationFailure();
    }

    const authenticationContext = Object.freeze(Object.create(null));
    this.#brokerContextByAuthenticationContext.set(
      authenticationContext,
      this.#capabilityBrokerContext,
    );
    return { ok: true, apiBaseUrl: this.#apiBaseUrl, authenticationContext };
  }

  async buildRequestHeaders(authenticationContext, { action } = {}) {
    const brokerContext = this.#brokerContextByAuthenticationContext.get(authenticationContext);
    if (!brokerContext || !WORKER_PROJECT_CAPABILITY_ACTION_SET.has(action)) {
      throw buildAuthenticationError();
    }

    const capability = await this.requestCapability({ action, brokerContext });
    return { authorization: `Bearer ${capability}` };
  }

  readAuthorityMode() {
    return 'worker';
  }

  hasValidConfiguration(configurationOptions) {
    return isEmptyConfiguration(configurationOptions)
      && isValidApiBaseUrl(this.#apiBaseUrl)
      && typeof this.#capabilityBroker?.requestCapability === 'function'
      && Boolean(this.#capabilityBrokerContext);
  }

  async requestCapability(request) {
    try {
      const response = await this.#capabilityBroker.requestCapability(request);
      if (isValidCapabilityResponse(response)) return response.capability;
    } catch {
      throw buildAuthenticationError();
    }
    throw buildAuthenticationError();
  }
}

function isEmptyConfiguration(configurationOptions) {
  return configurationOptions !== null
    && typeof configurationOptions === 'object'
    && !Array.isArray(configurationOptions)
    && Object.keys(configurationOptions).length === 0;
}

function isValidApiBaseUrl(apiBaseUrl) {
  try {
    return ['http:', 'https:'].includes(new URL(apiBaseUrl).protocol);
  } catch {
    return false;
  }
}

function isValidCapabilityResponse(response) {
  return response !== null
    && typeof response === 'object'
    && !Array.isArray(response)
    && Object.keys(response).length === 1
    && typeof response.capability === 'string'
    && COMPACT_CAPABILITY_PATTERN.test(response.capability);
}

function buildConfigurationFailure() {
  return {
    ok: false,
    errorCode: WORKER_PROJECT_AUTHENTICATION_CONFIGURATION_ERROR_CODE,
    message: WORKER_PROJECT_AUTHENTICATION_CONFIGURATION_ERROR_MESSAGE,
  };
}

function buildAuthenticationError() {
  const error = new Error(WORKER_PROJECT_AUTHENTICATION_ERROR_MESSAGE);
  error.code = WORKER_PROJECT_AUTHENTICATION_ERROR_CODE;
  return error;
}

export {
  WORKER_PROJECT_AUTHENTICATION_CONFIGURATION_ERROR_CODE,
  WORKER_PROJECT_AUTHENTICATION_ERROR_CODE,
  WORKER_PROJECT_CAPABILITY_ACTIONS,
  WorkerProjectAuthenticationAdapter,
};
