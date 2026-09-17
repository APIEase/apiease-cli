import { ApiEaseWebhookEventService } from './ApiEaseWebhookEventService.js';

const REQUEST_TYPES = ['http', 'flow', 'liquid', 'system'];
const MAXIMUM_DESCRIPTION_CODE_POINTS = 65_536;
const PARAMETER_TYPES = ['body', 'flow', 'header', 'liquid', 'path', 'query', 'system'];
const TRIGGER_TYPES = ['webhook', 'cron', 'proxyEndpoint'];
const TOP_LEVEL_FIELDS = ['id', 'handle', 'name', 'description', 'type', 'method', 'address', 'liquid', 'parameters', 'triggers'];
const PARAMETER_FIELDS = ['type', 'name', 'value', 'sensitive'];
const TRIGGER_FIELDS = ['type', 'webhook', 'cron', 'proxyEndpoint'];
const WEBHOOK_FIELDS = ['event'];
const CRON_FIELDS = ['value'];
const PROXY_ENDPOINT_FIELDS = ['path', 'method', 'authenticated'];

class ApiEaseCreateRequestContractValidator {
  constructor({
    apiEaseWebhookEventService = new ApiEaseWebhookEventService(),
  } = {}) {
    this.apiEaseWebhookEventService = apiEaseWebhookEventService;
  }

  validate(payload) {
    if (!this.isPlainObject(payload)) {
      return this.buildInvalidResult([
        this.buildFieldError('', 'INVALID_TYPE', 'Payload must be an object'),
      ]);
    }

    const fieldErrors = [];
    this.addTopLevelFieldErrors(payload, fieldErrors);
    this.addTypeFieldErrors(payload, fieldErrors);
    this.addConditionalFieldErrors(payload, fieldErrors);
    this.addParameterFieldErrors(payload.parameters, fieldErrors);
    this.addTriggerFieldErrors(payload.triggers, fieldErrors);
    return fieldErrors.length === 0 ? this.buildValidResult() : this.buildInvalidResult(fieldErrors);
  }

  buildValidResult() {
    return {
      isValid: true,
      errorCode: null,
      message: '',
      fieldErrors: [],
    };
  }

  buildInvalidResult(fieldErrors) {
    return {
      isValid: false,
      errorCode: 'INVALID_REQUEST_CREATE_CONTRACT',
      message: 'Request create payload is invalid',
      fieldErrors: this.dedupeFieldErrors(fieldErrors),
    };
  }

  addTopLevelFieldErrors(payload, fieldErrors) {
    this.addUnsupportedFieldErrors(payload, TOP_LEVEL_FIELDS, '', fieldErrors);
    this.addOptionalStringFieldError(payload, 'id', fieldErrors);
    this.addOptionalStringFieldError(payload, 'handle', fieldErrors);
    this.addOptionalStringFieldError(payload, 'name', fieldErrors);
    this.addOptionalBoundedDescriptionError(payload, fieldErrors);
    this.addOptionalStringFieldError(payload, 'method', fieldErrors);
    this.addOptionalStringFieldError(payload, 'address', fieldErrors);
    this.addOptionalStringFieldError(payload, 'liquid', fieldErrors);
    this.addOptionalArrayFieldError(payload, 'parameters', fieldErrors);
    this.addOptionalArrayFieldError(payload, 'triggers', fieldErrors);
  }

  addTypeFieldErrors(payload, fieldErrors) {
    if (!this.hasOwnProperty(payload, 'type')) {
      fieldErrors.push(this.buildFieldError('type', 'REQUIRED', 'Field is required'));
      return;
    }

    if (!this.isNonEmptyString(payload.type)) {
      fieldErrors.push(this.buildFieldError('type', 'INVALID_TYPE', 'Field must be a non-empty string'));
      return;
    }

    if (!REQUEST_TYPES.includes(payload.type)) {
      fieldErrors.push(this.buildFieldError('type', 'INVALID_VALUE', 'Field is invalid'));
    }
  }

  addConditionalFieldErrors(payload, fieldErrors) {
    if (payload.type === 'http') {
      this.addRequiredStringFieldError(payload, 'method', fieldErrors);
      this.addRequiredStringFieldError(payload, 'address', fieldErrors);
    }

    if (payload.type === 'liquid') {
      this.addRequiredStringFieldError(payload, 'liquid', fieldErrors);
    }

    if (payload.type === 'system') {
      this.addRequiredArrayFieldError(payload, 'parameters', fieldErrors);
      this.addSystemParameterErrors(payload.parameters, fieldErrors);
    }
  }

  addSystemParameterErrors(parameters, fieldErrors) {
    if (!Array.isArray(parameters) || parameters.length === 0) {
      return;
    }

    parameters.forEach((parameter, parameterIndex) => {
      if (!this.isPlainObject(parameter)) {
        return;
      }

      if (parameter.type !== 'system') {
        fieldErrors.push(
          this.buildFieldError(`parameters[${parameterIndex}].type`, 'INVALID_VALUE', 'Field is invalid'),
        );
      }
    });
  }

  addParameterFieldErrors(parameters, fieldErrors) {
    if (!Array.isArray(parameters)) {
      return;
    }

    parameters.forEach((parameter, parameterIndex) => {
      const parameterPath = `parameters[${parameterIndex}]`;
      if (!this.isPlainObject(parameter)) {
        fieldErrors.push(this.buildFieldError(parameterPath, 'INVALID_TYPE', 'Field must be an object'));
        return;
      }

      this.addUnsupportedFieldErrors(parameter, PARAMETER_FIELDS, parameterPath, fieldErrors);
      this.addRequiredEnumFieldError(parameter, 'type', PARAMETER_TYPES, parameterPath, fieldErrors);
      this.addRequiredStringFieldError(parameter, 'value', fieldErrors, parameterPath);
      this.addParameterNameFieldError(parameter, parameterPath, fieldErrors);
      this.addOptionalBooleanFieldError(parameter, 'sensitive', fieldErrors, parameterPath);
    });
  }

  addParameterNameFieldError(parameter, parameterPath, fieldErrors) {
    if (parameter.type === 'body') {
      return;
    }

    this.addRequiredStringFieldError(parameter, 'name', fieldErrors, parameterPath);
  }

  addTriggerFieldErrors(triggers, fieldErrors) {
    if (!Array.isArray(triggers)) {
      return;
    }

    triggers.forEach((trigger, triggerIndex) => {
      const triggerPath = `triggers[${triggerIndex}]`;
      if (!this.isPlainObject(trigger)) {
        fieldErrors.push(this.buildFieldError(triggerPath, 'INVALID_TYPE', 'Field must be an object'));
        return;
      }

      this.addUnsupportedFieldErrors(trigger, TRIGGER_FIELDS, triggerPath, fieldErrors);
      this.addRequiredEnumFieldError(trigger, 'type', TRIGGER_TYPES, triggerPath, fieldErrors);
      this.addConditionalTriggerFieldErrors(trigger, triggerPath, fieldErrors);
    });
  }

  addConditionalTriggerFieldErrors(trigger, triggerPath, fieldErrors) {
    if (trigger.type === 'webhook') {
      this.addNestedObjectFieldErrors(trigger, 'webhook', WEBHOOK_FIELDS, triggerPath, fieldErrors);
      this.addRequiredStringFieldError(trigger.webhook, 'event', fieldErrors, `${triggerPath}.webhook`);
      this.addSupportedWebhookEventFieldError(trigger.webhook, `${triggerPath}.webhook.event`, fieldErrors);
    }

    if (trigger.type === 'cron') {
      this.addNestedObjectFieldErrors(trigger, 'cron', CRON_FIELDS, triggerPath, fieldErrors);
      this.addRequiredStringFieldError(trigger.cron, 'value', fieldErrors, `${triggerPath}.cron`);
    }

    if (trigger.type === 'proxyEndpoint') {
      this.addNestedObjectFieldErrors(trigger, 'proxyEndpoint', PROXY_ENDPOINT_FIELDS, triggerPath, fieldErrors);
      this.addRequiredStringFieldError(trigger.proxyEndpoint, 'path', fieldErrors, `${triggerPath}.proxyEndpoint`);
      this.addRequiredStringFieldError(trigger.proxyEndpoint, 'method', fieldErrors, `${triggerPath}.proxyEndpoint`);
      this.addRequiredBooleanFieldError(
        trigger.proxyEndpoint,
        'authenticated',
        fieldErrors,
        `${triggerPath}.proxyEndpoint`,
      );
    }
  }

  addSupportedWebhookEventFieldError(webhook, fieldPath, fieldErrors) {
    if (!this.isPlainObject(webhook) || !this.hasOwnProperty(webhook, 'event') || !this.isNonEmptyString(webhook.event)) {
      return;
    }

    if (!this.apiEaseWebhookEventService.isValidWebhookEvent(webhook.event)) {
      fieldErrors.push(this.buildFieldError(fieldPath, 'INVALID_VALUE', 'Field is invalid'));
    }
  }

  addNestedObjectFieldErrors(parentObject, fieldName, allowedFields, parentPath, fieldErrors) {
    const fieldPath = this.joinPath(parentPath, fieldName);
    if (!this.hasOwnProperty(parentObject, fieldName)) {
      fieldErrors.push(this.buildFieldError(fieldPath, 'REQUIRED', 'Field is required'));
      return;
    }

    if (!this.isPlainObject(parentObject[fieldName])) {
      fieldErrors.push(this.buildFieldError(fieldPath, 'INVALID_TYPE', 'Field must be an object'));
      return;
    }

    this.addUnsupportedFieldErrors(parentObject[fieldName], allowedFields, fieldPath, fieldErrors);
  }

  addRequiredEnumFieldError(payload, fieldName, allowedValues, basePath, fieldErrors) {
    const fieldPath = this.joinPath(basePath, fieldName);
    if (!this.hasOwnProperty(payload, fieldName)) {
      fieldErrors.push(this.buildFieldError(fieldPath, 'REQUIRED', 'Field is required'));
      return;
    }

    if (!this.isNonEmptyString(payload[fieldName])) {
      fieldErrors.push(this.buildFieldError(fieldPath, 'INVALID_TYPE', 'Field must be a non-empty string'));
      return;
    }

    if (!allowedValues.includes(payload[fieldName])) {
      fieldErrors.push(this.buildFieldError(fieldPath, 'INVALID_VALUE', 'Field is invalid'));
    }
  }

  addRequiredStringFieldError(payload, fieldName, fieldErrors, basePath = '') {
    const fieldPath = this.joinPath(basePath, fieldName);
    if (!this.isPlainObject(payload) || !this.hasOwnProperty(payload, fieldName)) {
      fieldErrors.push(this.buildFieldError(fieldPath, 'REQUIRED', 'Field is required'));
      return;
    }

    if (typeof payload[fieldName] !== 'string') {
      fieldErrors.push(this.buildFieldError(fieldPath, 'INVALID_TYPE', 'Field must be a string'));
      return;
    }

    if (payload[fieldName].trim().length === 0) {
      fieldErrors.push(this.buildFieldError(fieldPath, 'MIN_LENGTH', 'Must not be empty'));
    }
  }

  addRequiredArrayFieldError(payload, fieldName, fieldErrors) {
    if (!this.hasOwnProperty(payload, fieldName)) {
      fieldErrors.push(this.buildFieldError(fieldName, 'REQUIRED', 'Field is required'));
      return;
    }

    if (!Array.isArray(payload[fieldName])) {
      fieldErrors.push(this.buildFieldError(fieldName, 'INVALID_TYPE', 'Field must be an array'));
      return;
    }

    if (payload[fieldName].length === 0) {
      fieldErrors.push(this.buildFieldError(fieldName, 'MIN_ITEMS', 'At least 1 item is required'));
    }
  }

  addRequiredBooleanFieldError(payload, fieldName, fieldErrors, basePath = '') {
    const fieldPath = this.joinPath(basePath, fieldName);
    if (!this.isPlainObject(payload) || !this.hasOwnProperty(payload, fieldName)) {
      fieldErrors.push(this.buildFieldError(fieldPath, 'REQUIRED', 'Field is required'));
      return;
    }

    if (typeof payload[fieldName] !== 'boolean') {
      fieldErrors.push(this.buildFieldError(fieldPath, 'INVALID_TYPE', 'Field must be a boolean'));
    }
  }

  addOptionalStringFieldError(payload, fieldName, fieldErrors, basePath = '') {
    if (!this.hasOwnProperty(payload, fieldName)) {
      return;
    }

    const fieldValue = payload[fieldName];
    const fieldPath = this.joinPath(basePath, fieldName);
    if (typeof fieldValue !== 'string') {
      fieldErrors.push(this.buildFieldError(fieldPath, 'INVALID_TYPE', 'Field must be a string'));
    }
  }

  addOptionalBoundedDescriptionError(payload, fieldErrors) {
    if (!this.hasOwnProperty(payload, 'description')) {
      return;
    }

    if (typeof payload.description !== 'string') {
      fieldErrors.push(this.buildFieldError('description', 'INVALID_TYPE', 'Field must be a string'));
      return;
    }

    if ([...payload.description].length > MAXIMUM_DESCRIPTION_CODE_POINTS) {
      fieldErrors.push(this.buildFieldError(
        'description',
        'MAX_LENGTH',
        'Must contain at most 65536 Unicode code points',
      ));
    }
  }

  addOptionalArrayFieldError(payload, fieldName, fieldErrors) {
    if (this.hasOwnProperty(payload, fieldName) && !Array.isArray(payload[fieldName])) {
      fieldErrors.push(this.buildFieldError(fieldName, 'INVALID_TYPE', 'Field must be an array'));
    }
  }

  addOptionalBooleanFieldError(payload, fieldName, fieldErrors, basePath = '') {
    if (!this.hasOwnProperty(payload, fieldName)) {
      return;
    }

    const fieldPath = this.joinPath(basePath, fieldName);
    if (typeof payload[fieldName] !== 'boolean') {
      fieldErrors.push(this.buildFieldError(fieldPath, 'INVALID_TYPE', 'Field must be a boolean'));
    }
  }

  addUnsupportedFieldErrors(payload, allowedFields, basePath, fieldErrors) {
    Object.keys(payload).forEach((fieldName) => {
      if (!allowedFields.includes(fieldName)) {
        fieldErrors.push(this.buildFieldError(this.joinPath(basePath, fieldName), 'UNSUPPORTED_FIELD', 'Field is not supported'));
      }
    });
  }

  buildFieldError(path, code, message) {
    return {
      path,
      code,
      message,
    };
  }

  dedupeFieldErrors(fieldErrors) {
    const seenFieldErrors = new Set();
    return fieldErrors.filter((fieldError) => {
      const dedupeKey = `${fieldError.path}:${fieldError.code}:${fieldError.message}`;
      if (seenFieldErrors.has(dedupeKey)) {
        return false;
      }

      seenFieldErrors.add(dedupeKey);
      return true;
    });
  }

  hasOwnProperty(payload, fieldName) {
    return this.isPlainObject(payload) && Object.prototype.hasOwnProperty.call(payload, fieldName);
  }

  isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  joinPath(basePath, fieldName) {
    return basePath ? `${basePath}.${fieldName}` : fieldName;
  }
}

export { ApiEaseCreateRequestContractValidator };
