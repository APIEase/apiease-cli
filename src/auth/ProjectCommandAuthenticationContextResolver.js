import { BearerProjectAuthenticationAdapter } from './BearerProjectAuthenticationAdapter.js';
import { PersonalProjectAuthenticationAdapter } from './PersonalProjectAuthenticationAdapter.js';
import {
  PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES,
} from './ProjectBearerAuthenticationContract.js';

const BEARER_TOKEN_FLAG = '--bearer-token';
const API_BASE_URL_FLAG = '--base-url';

class ProjectCommandAuthenticationContextResolver {
  constructor({ environment = process.env } = {}) {
    this.environment = environment;
  }

  resolveContext(commandArguments = []) {
    const explicitBearerToken = readOptionValue(commandArguments, BEARER_TOKEN_FLAG);
    const environmentTokenSet = this.readEnvironmentTokenSet();
    if (!explicitBearerToken && !environmentTokenSet) return buildPersonalContext();
    const bearerTokensByAction = environmentTokenSet ?? {'*': [explicitBearerToken]};
    const projectAuthenticationAdapter = new BearerProjectAuthenticationAdapter({
      apiBaseUrl: readOptionValue(commandArguments, API_BASE_URL_FLAG)
        ?? this.environment[PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES.apiBaseUrl],
      authenticationOptionsConflict: Boolean(
        (explicitBearerToken && environmentTokenSet)
        || readOptionValue(commandArguments, '--api-key')
        || this.environment.APIEASE_API_KEY,
      ),
      bearerTokensByAction,
    });
    return Object.freeze({
      approvalProjectContext: this.buildApprovalProjectContext(projectAuthenticationAdapter),
      projectAuthenticationAdapter,
    });
  }

  readEnvironmentTokenSet() {
    const serializedTokenSet = this.environment[
      PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES.tokenSet
    ];
    if (typeof serializedTokenSet !== 'string') return null;
    try {
      const parsedTokenSet = JSON.parse(serializedTokenSet);
      return isPlainObject(parsedTokenSet) ? parsedTokenSet : {};
    } catch {
      return {};
    }
  }

  buildApprovalProjectContext(projectAuthenticationAdapter) {
    const serializedContext = this.environment[
      PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES.proposalContext
    ];
    try {
      const proposalCheckpoint = JSON.parse(serializedContext);
      return Object.freeze({projectAuthenticationAdapter, proposalCheckpoint});
    } catch {
      return undefined;
    }
  }
}

function buildPersonalContext() {
  return Object.freeze({
    approvalProjectContext: undefined,
    projectAuthenticationAdapter: new PersonalProjectAuthenticationAdapter(),
  });
}

function readOptionValue(commandArguments, optionName) {
  const optionIndex = commandArguments.indexOf(optionName);
  const value = optionIndex >= 0 ? commandArguments[optionIndex + 1] : undefined;
  return typeof value === 'string' && !value.startsWith('--') ? value : undefined;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

export {
  BEARER_TOKEN_FLAG,
  ProjectCommandAuthenticationContextResolver,
};
