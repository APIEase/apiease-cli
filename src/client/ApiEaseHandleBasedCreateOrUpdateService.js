import { ApiEaseCrudResourceClient } from './ApiEaseCrudResourceClient.js';

const NOT_FOUND_STATUS = 404;
const CREATED_OPERATION = 'created';
const UPDATED_OPERATION = 'updated';

class ApiEaseHandleBasedCreateOrUpdateService {
  constructor({
    apiEaseCrudResourceClient = new ApiEaseCrudResourceClient(),
  } = {}) {
    this.apiEaseCrudResourceClient = apiEaseCrudResourceClient;
  }

  async createOrUpdateResourceByHandle(options = {}) {
    const lookupResult = await this.readResourceByHandle(options);
    if (lookupResult.ok) {
      return await this.updateExistingResourceByHandle(options, lookupResult);
    }

    if (lookupResult.status === NOT_FOUND_STATUS) {
      return await this.createMissingResource(options);
    }

    return lookupResult;
  }

  async readResourceByHandle({
    resourceName,
    apiBaseUrl,
    apiKey,
    shopDomain,
    resourceHandle,
    readFailureErrorCode,
  }) {
    return await this.apiEaseCrudResourceClient.readResourceByHandle({
      resourceName,
      apiBaseUrl,
      apiKey,
      shopDomain,
      resourceHandle,
      failureErrorCode: readFailureErrorCode,
    });
  }

  async updateExistingResourceByHandle(options, lookupResult) {
    const result = await this.apiEaseCrudResourceClient.updateResourceByHandle({
      ...this.buildSharedWriteOptions(options),
      resourceHandle: options.resourceHandle,
      expectedResourceVersion: lookupResult.result.resource.resourceVersion,
      failureErrorCode: options.updateFailureErrorCode,
    });

    return this.addOperationToSuccessfulResult(result, UPDATED_OPERATION);
  }

  async createMissingResource(options) {
    const result = await this.apiEaseCrudResourceClient.createResource({
      ...this.buildSharedWriteOptions(options),
      failureErrorCode: options.createFailureErrorCode,
    });

    return this.addOperationToSuccessfulResult(result, CREATED_OPERATION);
  }

  buildSharedWriteOptions({
    resourceName,
    apiBaseUrl,
    apiKey,
    shopDomain,
    resource,
  }) {
    return {
      resourceName,
      apiBaseUrl,
      apiKey,
      shopDomain,
      resource,
    };
  }

  addOperationToSuccessfulResult(result, operation) {
    if (!result.ok) {
      return result;
    }

    return {
      ...result,
      operation,
    };
  }
}

export { ApiEaseHandleBasedCreateOrUpdateService };
