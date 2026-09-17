import { CrudResourceDefinitionCollection } from '../crud/CrudResourceDefinitionCollection.js';

const JSON_CONTENT_TYPE = 'application/json';
const DEFAULT_FAILURE_STATUS = 500;
const RESOURCE_API_CONTRACT_VERSION = 1;
const CREATE_IF_ABSENT_OPERATION = 'create-if-absent';

class ApiEaseCrudResourceClient {
  constructor({
    fetchImplementation = globalThis.fetch,
    crudResourceDefinitionCollection = new CrudResourceDefinitionCollection(),
  } = {}) {
    this.fetchImplementation = fetchImplementation;
    this.crudResourceDefinitionCollection = crudResourceDefinitionCollection;
  }

  async createResource({
    resourceName,
    apiBaseUrl,
    apiKey,
    shopDomain,
    resource,
    failureErrorCode,
  } = {}) {
    return await this.sendResourceRequest({
      method: 'POST',
      resourceName,
      apiBaseUrl,
      apiKey,
      shopDomain,
      resource: this.buildCreateEnvelope(resource),
      failureErrorCode,
    });
  }

  async readResource({
    resourceName,
    apiBaseUrl,
    apiKey,
    shopDomain,
    resourceIdentifier,
    failureErrorCode,
  } = {}) {
    return await this.sendResourceRequest({
      method: 'GET',
      resourceName,
      apiBaseUrl,
      apiKey,
      shopDomain,
      resourceIdentifier,
      failureErrorCode,
    });
  }

  async readResourceByHandle({
    resourceName,
    apiBaseUrl,
    apiKey,
    shopDomain,
    resourceHandle,
    failureErrorCode,
  } = {}) {
    return await this.readResource({
      resourceName,
      apiBaseUrl,
      apiKey,
      shopDomain,
      resourceIdentifier: resourceHandle,
      failureErrorCode,
    });
  }

  async updateResource({
    resourceName,
    apiBaseUrl,
    apiKey,
    shopDomain,
    resourceIdentifier,
    resource,
    expectedResourceVersion,
    failureErrorCode,
  } = {}) {
    const versionResult = await this.resolveExpectedResourceVersion({
      resourceName,
      apiBaseUrl,
      apiKey,
      shopDomain,
      resourceIdentifier,
      expectedResourceVersion,
      failureErrorCode,
    });
    if (!versionResult.ok) {
      return versionResult;
    }

    return await this.sendResourceRequest({
      method: 'PUT',
      resourceName,
      apiBaseUrl,
      apiKey,
      shopDomain,
      resourceIdentifier,
      resource: this.buildUpdateEnvelope(resource, versionResult.expectedResourceVersion),
      failureErrorCode,
    });
  }

  async updateResourceByHandle({
    resourceName,
    apiBaseUrl,
    apiKey,
    shopDomain,
    resourceHandle,
    resource,
    expectedResourceVersion,
    failureErrorCode,
  } = {}) {
    return await this.updateResource({
      resourceName,
      apiBaseUrl,
      apiKey,
      shopDomain,
      resourceIdentifier: resourceHandle,
      resource,
      expectedResourceVersion,
      failureErrorCode,
    });
  }

  async deleteResource({
    resourceName,
    apiBaseUrl,
    apiKey,
    shopDomain,
    resourceIdentifier,
    expectedResourceVersion,
    failureErrorCode,
  } = {}) {
    const versionResult = await this.resolveExpectedResourceVersion({
      resourceName,
      apiBaseUrl,
      apiKey,
      shopDomain,
      resourceIdentifier,
      expectedResourceVersion,
      failureErrorCode,
    });
    if (!versionResult.ok) {
      return versionResult;
    }

    return await this.sendResourceRequest({
      method: 'DELETE',
      resourceName,
      apiBaseUrl,
      apiKey,
      shopDomain,
      resourceIdentifier,
      resource: this.buildDeleteEnvelope(versionResult.expectedResourceVersion),
      failureErrorCode,
    });
  }

  buildCreateEnvelope(resource) {
    return {
      contractVersion: RESOURCE_API_CONTRACT_VERSION,
      operation: CREATE_IF_ABSENT_OPERATION,
      resource,
    };
  }

  buildUpdateEnvelope(resource, expectedResourceVersion) {
    return {
      contractVersion: RESOURCE_API_CONTRACT_VERSION,
      expectedResourceVersion,
      resource,
    };
  }

  buildDeleteEnvelope(expectedResourceVersion) {
    return {
      contractVersion: RESOURCE_API_CONTRACT_VERSION,
      expectedResourceVersion,
    };
  }

  async resolveExpectedResourceVersion(options) {
    if (this.isResourceVersion(options.expectedResourceVersion)) {
      return { ok: true, expectedResourceVersion: options.expectedResourceVersion };
    }

    const readResult = await this.readResource(options);
    if (!readResult.ok) {
      return readResult;
    }

    return this.buildVersionResult(readResult, options.failureErrorCode);
  }

  buildVersionResult(readResult, failureErrorCode) {
    const expectedResourceVersion = readResult?.result?.resource?.resourceVersion;
    if (this.isResourceVersion(expectedResourceVersion)) {
      return { ok: true, expectedResourceVersion };
    }

    return {
      status: DEFAULT_FAILURE_STATUS,
      ok: false,
      errorCode: failureErrorCode,
      message: 'API response did not include a resource version',
      fieldErrors: [],
    };
  }

  isResourceVersion(value) {
    return typeof value === 'string' && value.length > 0;
  }

  async sendResourceRequest({
    method,
    resourceName,
    apiBaseUrl,
    apiKey,
    shopDomain,
    resourceIdentifier,
    resource,
    failureErrorCode,
  }) {
    try {
      const response = await this.fetchImplementation(
        this.buildResourceUrl({
          resourceName,
          apiBaseUrl,
          resourceIdentifier,
        }),
        this.buildFetchOptions({
          method,
          apiKey,
          shopDomain,
          resource,
        }),
      );
      return await this.buildResponseResult({ response, failureErrorCode });
    } catch (error) {
      return this.buildTransportFailureResult({ error, failureErrorCode });
    }
  }

  buildResourceUrl({ resourceName, apiBaseUrl, resourceIdentifier }) {
    return new URL(
      this.buildResourcePath({ resourceName, resourceIdentifier }),
      this.buildNormalizedBaseUrl(apiBaseUrl),
    ).toString();
  }

  buildResourcePath({ resourceName, resourceIdentifier }) {
    if (resourceIdentifier === undefined) {
      return this.crudResourceDefinitionCollection.buildCollectionPath(resourceName);
    }

    return this.crudResourceDefinitionCollection.buildItemPath({
      resourceName,
      resourceIdentifier,
    });
  }

  buildNormalizedBaseUrl(apiBaseUrl) {
    return apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
  }

  buildFetchOptions({ method, apiKey, shopDomain, resource }) {
    const options = {
      method,
      headers: this.buildRequestHeaders({
        apiKey,
        shopDomain,
        resource,
      }),
    };
    if (resource !== undefined) {
      options.body = JSON.stringify(resource);
    }

    return options;
  }

  buildRequestHeaders({ apiKey, shopDomain, resource }) {
    const requestHeaders = {
      'x-apiease-api-key': apiKey,
      'x-shop-myshopify-domain': shopDomain,
    };
    if (resource !== undefined) {
      requestHeaders['content-type'] = JSON_CONTENT_TYPE;
    }

    return requestHeaders;
  }

  async buildResponseResult({ response, failureErrorCode }) {
    const responseContentType = this.readResponseContentType(response);
    if (responseContentType && !this.isJsonContentType(responseContentType)) {
      return await this.buildNonJsonFailureResult({
        response,
        responseContentType,
        failureErrorCode,
      });
    }

    const payload = await response.json();
    return {
      status: response.status,
      ...payload,
    };
  }

  readResponseContentType(response) {
    return response?.headers?.get?.('content-type') || '';
  }

  isJsonContentType(responseContentType) {
    return responseContentType.toLowerCase().includes(JSON_CONTENT_TYPE);
  }

  async buildNonJsonFailureResult({ response, responseContentType, failureErrorCode }) {
    return {
      status: response?.status || DEFAULT_FAILURE_STATUS,
      ok: false,
      errorCode: failureErrorCode,
      message: this.buildNonJsonFailureMessage({
        responseStatus: response?.status,
        responseContentType,
        responseBody: await this.readResponseText(response),
      }),
      fieldErrors: [],
    };
  }

  async readResponseText(response) {
    if (typeof response?.text !== 'function') {
      return '';
    }

    return await response.text();
  }

  buildNonJsonFailureMessage({ responseStatus, responseContentType, responseBody }) {
    const normalizedContentType = responseContentType.split(';')[0] || 'unknown';
    const responsePreview = this.buildResponsePreview(responseBody);
    return `API returned a non-JSON response with status ${responseStatus || DEFAULT_FAILURE_STATUS} and content-type ${normalizedContentType}; response starts with ${responsePreview}`;
  }

  buildResponsePreview(responseBody) {
    const normalizedResponseBody = String(responseBody || '').replace(/\s+/g, ' ').trim();
    if (normalizedResponseBody.length === 0) {
      return '(empty body)';
    }

    return normalizedResponseBody.slice(0, 120);
  }

  buildTransportFailureResult({ error, failureErrorCode }) {
    return {
      status: DEFAULT_FAILURE_STATUS,
      ok: false,
      errorCode: failureErrorCode,
      message: error.message,
      fieldErrors: [],
    };
  }
}

export { ApiEaseCrudResourceClient };
