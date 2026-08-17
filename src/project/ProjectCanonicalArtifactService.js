import crypto from 'node:crypto';

const CANONICAL_RESOURCE_DIGEST_CONTEXT = 'apiease-canonical-resource-digest-v1';
const CANONICAL_RESOURCE_SOURCE_CONTRACT_VERSION = 1;
const CANONICAL_RESOURCE_SOURCE_FORMAT_VERSION = 1;
const DOMAIN_SEPARATOR = Buffer.from([0]);
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PROTECTED_VALUE_PLACEHOLDER = Object.freeze({ mode: 'preserve' });
const RESOURCE_SOURCE_DIRECTORIES = Object.freeze({
  function: 'resources/functions',
  request: 'resources/requests',
  variable: 'resources/variables',
  widget: 'resources/widgets',
});

const PROJECT_CANONICAL_ARTIFACT_ERROR_CODES = Object.freeze({
  contractVersion: 'CANONICAL_RESOURCE_SOURCE_CONTRACT_VERSION_UNSUPPORTED',
  formatVersion: 'CANONICAL_RESOURCE_SOURCE_FORMAT_VERSION_UNSUPPORTED',
  handlePathMismatch: 'CANONICAL_RESOURCE_SOURCE_HANDLE_PATH_MISMATCH',
  invalidContent: 'CANONICAL_RESOURCE_SOURCE_INVALID_CONTENT',
  invalidNewline: 'CANONICAL_RESOURCE_SOURCE_INVALID_NEWLINE',
  invalidPath: 'CANONICAL_RESOURCE_SOURCE_INVALID_PATH',
  invalidUtf8: 'CANONICAL_RESOURCE_SOURCE_INVALID_UTF8',
  nonCanonicalContent: 'CANONICAL_RESOURCE_SOURCE_NONCANONICAL_CONTENT',
  protectedValue: 'CANONICAL_RESOURCE_SOURCE_INVALID_PROTECTED_VALUE',
  resourceType: 'CANONICAL_RESOURCE_SOURCE_RESOURCE_TYPE_INVALID',
  resourceTypeMismatch: 'CANONICAL_RESOURCE_SOURCE_RESOURCE_TYPE_MISMATCH',
  unsupportedField: 'CANONICAL_RESOURCE_SOURCE_UNSUPPORTED_FIELD',
});

class ProjectCanonicalArtifactError extends Error {
  constructor(code) {
    super('Canonical resource source is invalid');
    this.name = 'ProjectCanonicalArtifactError';
    this.code = code;
  }
}

class ProjectCanonicalArtifactService {
  serializeCanonicalValue(value) {
    return JSON.stringify(buildCanonicalValue(value, new Set()));
  }

  serializeResourceSource({ resourceType, resource, requestHandles } = {}) {
    const resourceFamily = requireResourceFamily(resourceType);
    const source = resourceFamily.buildSource(resource, requestHandles, this);
    requireValidSource(source, resourceFamily);

    return `${this.serializeCanonicalValue(source)}\n`;
  }

  serializeParsedResourceSource(source) {
    requireValidSource(source, requireResourceFamily(source?.resourceType));

    return this.serializeResourceSource({
      resource: { ...source },
      resourceType: source.resourceType,
    });
  }

  parseResourceSource({ path, content } = {}) {
    const decodedContent = decodeUtf8Content(content);
    requireCanonicalNewline(decodedContent);
    const source = parseJsonSource(decodedContent);
    const pathIdentity = parseResourcePath(path);
    requireSourceIdentity(source, pathIdentity);
    requireValidSource(source, requireResourceFamily(source.resourceType));
    requireCanonicalBytes(this, source, decodedContent);

    return source;
  }

  buildRequestHandles(requests) {
    if (!Array.isArray(requests)) throwArtifactError('invalidContent');

    return buildRequestHandles(requests);
  }

  computeFileDigest(content) {
    const decodedContent = decodeUtf8Content(content);
    const digestHex = crypto.createHash('sha256').update(decodedContent, 'utf8').digest('hex');

    return `sha256:${digestHex}`;
  }

  computeResourceSnapshotDigest(files) {
    if (!Array.isArray(files)) {
      throw new TypeError('Canonical resource snapshot files are required');
    }
    const exactFiles = files.map(file => ({ content: file.content, path: file.path }));

    return this.computeDomainSeparatedDigest('resource-snapshot', { files: exactFiles });
  }

  computeDomainSeparatedDigest(domain, value) {
    if (!['managed-tree', 'resource-snapshot'].includes(domain)) {
      throw new TypeError('A supported canonical resource digest domain is required');
    }
    const canonicalBytes = Buffer.from(this.serializeCanonicalValue(value), 'utf8');
    const digestHex = crypto.createHash('sha256')
      .update(CANONICAL_RESOURCE_DIGEST_CONTEXT, 'utf8')
      .update(DOMAIN_SEPARATOR)
      .update(domain, 'utf8')
      .update(DOMAIN_SEPARATOR)
      .update(canonicalBytes)
      .digest('hex');

    return `sha256:${digestHex}`;
  }
}

const COMMON_FIELDS = Object.freeze([
  'contractVersion', 'formatVersion', 'resourceType', 'handle',
]);
const REQUEST_FIELDS = Object.freeze([
  ...COMMON_FIELDS, 'name', 'type', 'method', 'address', 'liquid',
  'parameters', 'triggers', 'nextRequestHandle',
]);
const WIDGET_FIELDS = Object.freeze([
  ...COMMON_FIELDS, 'name', 'liquid', 'javascript',
  'externalJavascriptUrls', 'disableJavascript',
]);
const VARIABLE_FIELDS = Object.freeze([
  ...COMMON_FIELDS, 'name', 'sensitive', 'value',
]);
const FUNCTION_FIELDS = Object.freeze([
  ...COMMON_FIELDS, 'name', 'description', 'type', 'liquid', 'parameters',
]);

const RESOURCE_FAMILIES = Object.freeze({
  function: buildResourceFamily('function', FUNCTION_FIELDS, buildCanonicalFunction),
  request: buildResourceFamily('request', REQUEST_FIELDS, buildCanonicalRequest),
  variable: buildResourceFamily('variable', VARIABLE_FIELDS, buildCanonicalVariable),
  widget: buildResourceFamily('widget', WIDGET_FIELDS, buildCanonicalWidget),
});

const REQUEST_TRIGGER_DETAIL_FIELDS = Object.freeze({
  cron: Object.freeze(['value']),
  proxyEndpoint: Object.freeze(['path', 'method', 'authenticated']),
  storefrontAppProxy: Object.freeze(['sensitiveRequest', 'sensitiveResponse']),
  webhook: Object.freeze(['event']),
});

const REQUEST_TRIGGER_REQUIRED_FIELDS = Object.freeze({
  cron: Object.freeze(['value']),
  proxyEndpoint: REQUEST_TRIGGER_DETAIL_FIELDS.proxyEndpoint,
  storefrontAppProxy: Object.freeze([]),
  webhook: Object.freeze(['event']),
});

const STRING_FIELDS_BY_RESOURCE_TYPE = Object.freeze({
  function: Object.freeze(['name', 'description', 'type', 'liquid']),
  request: Object.freeze([
    'name', 'type', 'method', 'address', 'liquid', 'nextRequestHandle',
  ]),
  variable: Object.freeze(['name']),
  widget: Object.freeze(['name', 'liquid', 'javascript']),
});

const REQUIRED_FIELDS_BY_RESOURCE_TYPE = Object.freeze({
  function: Object.freeze(['name', 'description', 'type', 'liquid', 'parameters']),
  request: Object.freeze(['name', 'type', 'parameters', 'triggers']),
  variable: Object.freeze(['name', 'sensitive', 'value']),
  widget: Object.freeze([
    'name', 'liquid', 'javascript', 'externalJavascriptUrls', 'disableJavascript',
  ]),
});

function buildResourceFamily(resourceType, fields, buildSource) {
  return Object.freeze({ buildSource, fields: new Set(fields), resourceType });
}

function buildCanonicalRequest(request, requestHandles, canonicalArtifactService) {
  const source = buildSourceHeader('request', request);
  assignDefinedFields(source, request, ['name', 'type', 'method', 'address', 'liquid']);
  source.parameters = buildSortedValues(
    request?.parameters,
    buildRequestParameter,
    canonicalArtifactService,
  );
  source.triggers = buildSortedValues(
    request?.triggers,
    buildRequestTrigger,
    canonicalArtifactService,
  );
  assignNextRequestHandle(source, request, requestHandles);

  return source;
}

function buildRequestParameter(parameter) {
  const source = compactDefinedFields(parameter, ['type', 'name']);
  source.sensitive = parameter?.sensitive === true;
  source.value = source.sensitive ? PROTECTED_VALUE_PLACEHOLDER : parameter?.value;

  return source;
}

function buildRequestTrigger(trigger) {
  const type = trigger?.type;
  const detailFields = REQUEST_TRIGGER_DETAIL_FIELDS[type];
  const source = { type };
  if (detailFields) source[type] = compactDefinedFields(trigger?.[type], detailFields);

  return source;
}

function buildCanonicalVariable(variable) {
  const source = buildSourceHeader('variable', variable);
  assignDefinedFields(source, variable, ['name']);
  source.sensitive = variable?.sensitive === true;
  source.value = source.sensitive ? PROTECTED_VALUE_PLACEHOLDER : variable?.value;

  return source;
}

function buildCanonicalWidget(widget) {
  const source = buildSourceHeader('widget', widget);
  assignDefinedFields(source, widget, [
    'name', 'liquid', 'javascript', 'externalJavascriptUrls',
  ]);
  source.disableJavascript = widget?.disableJavascript === true;

  return source;
}

function buildCanonicalFunction(functionRecord, requestHandles, canonicalArtifactService) {
  const source = buildSourceHeader('function', functionRecord);
  assignDefinedFields(source, functionRecord, ['name', 'description', 'type', 'liquid']);
  source.parameters = buildSortedValues(
    functionRecord?.parameters,
    parameter => compactDefinedFields(parameter, ['name', 'description', 'type']),
    canonicalArtifactService,
  );

  return source;
}

function buildSourceHeader(resourceType, resource) {
  return {
    contractVersion: CANONICAL_RESOURCE_SOURCE_CONTRACT_VERSION,
    formatVersion: CANONICAL_RESOURCE_SOURCE_FORMAT_VERSION,
    resourceType,
    handle: requireSafeHandle(resource?.handle),
  };
}

function buildSortedValues(values, mapper, canonicalArtifactService) {
  if (!Array.isArray(values)) throwArtifactError('invalidContent');

  return values.map(mapper).sort((left, right) => compareText(
    canonicalArtifactService.serializeCanonicalValue(left),
    canonicalArtifactService.serializeCanonicalValue(right),
  ));
}

function buildRequestHandles(requests) {
  const requestHandles = new Map();
  requests.forEach(request => addRequestIdentities(requestHandles, request));

  return requestHandles;
}

function addRequestIdentities(requestHandles, request) {
  const handle = requireSafeHandle(request?.handle);
  [request?.id, request?.handle, request?.name].forEach(identity => (
    addRequestIdentity(requestHandles, identity, handle)
  ));
}

function addRequestIdentity(requestHandles, identity, handle) {
  if (typeof identity !== 'string' || identity.length === 0) return;
  const existingHandle = requestHandles.get(identity);
  requestHandles.set(identity, existingHandle && existingHandle !== handle ? null : handle);
}

function assignNextRequestHandle(source, request, requestHandles) {
  if (typeof request?.nextRequestHandle === 'string') {
    source.nextRequestHandle = request.nextRequestHandle;
    return;
  }
  const nextRequestIdentity = request?.nextRequest;
  if (nextRequestIdentity === undefined || nextRequestIdentity === '') return;
  const nextRequestHandle = requestHandles?.get(nextRequestIdentity);
  if (!nextRequestHandle) throwArtifactError('invalidContent');
  source.nextRequestHandle = nextRequestHandle;
}

function requireValidSource(source, resourceFamily) {
  requirePlainObject(source);
  requireVersions(source);
  requireAllowedFields(source, resourceFamily.fields);
  requireSourceFieldTypes(source, resourceFamily.resourceType);
}

function requireVersions(source) {
  if (source.contractVersion !== CANONICAL_RESOURCE_SOURCE_CONTRACT_VERSION) {
    throwArtifactError('contractVersion');
  }
  if (source.formatVersion !== CANONICAL_RESOURCE_SOURCE_FORMAT_VERSION) {
    throwArtifactError('formatVersion');
  }
}

function requireAllowedFields(source, allowedFields) {
  if (Object.keys(source).some(fieldName => !allowedFields.has(fieldName))) {
    throwArtifactError('unsupportedField');
  }
}

function requireSourceFieldTypes(source, resourceType) {
  requireSafeHandle(source.handle);
  requireRequiredFields(source, REQUIRED_FIELDS_BY_RESOURCE_TYPE[resourceType]);
  requireStringFields(source, STRING_FIELDS_BY_RESOURCE_TYPE[resourceType]);
  if (resourceType === 'request') requireRequestFields(source);
  if (resourceType === 'widget') requireWidgetFields(source);
  if (resourceType === 'variable') requireProtectedValue(source);
  if (resourceType === 'function') requireFunctionFields(source);
}

function requireRequiredFields(source, fieldNames) {
  if (fieldNames.some(fieldName => !Object.hasOwn(source, fieldName))) {
    throwArtifactError('invalidContent');
  }
}

function requireStringFields(source, fieldNames) {
  if (fieldNames.some(fieldName => (
    source[fieldName] !== undefined && typeof source[fieldName] !== 'string'
  ))) {
    throwArtifactError('invalidContent');
  }
}

function requireRequestFields(source) {
  requireArray(source.parameters);
  requireArray(source.triggers);
  source.parameters.forEach(requireRequestParameter);
  source.triggers.forEach(requireRequestTrigger);
  if (source.nextRequestHandle !== undefined) requireSafeHandle(source.nextRequestHandle);
}

function requireRequestParameter(parameter) {
  requireExactFields(
    parameter,
    ['type', 'name', 'sensitive', 'value'],
    ['type', 'sensitive', 'value'],
  );
  if (typeof parameter.type !== 'string' || typeof parameter.sensitive !== 'boolean') {
    throwArtifactError('invalidContent');
  }
  if (parameter.name !== undefined && typeof parameter.name !== 'string') {
    throwArtifactError('invalidContent');
  }
  requireProtectedValue(parameter);
}

function requireRequestTrigger(trigger) {
  requirePlainObject(trigger);
  const detailFields = REQUEST_TRIGGER_DETAIL_FIELDS[trigger.type];
  if (!detailFields) throwArtifactError('invalidContent');
  requireExactFields(trigger, ['type', trigger.type], ['type', trigger.type]);
  requireExactFields(
    trigger[trigger.type],
    detailFields,
    REQUEST_TRIGGER_REQUIRED_FIELDS[trigger.type],
  );
  requireRequestTriggerDetailTypes(trigger.type, trigger[trigger.type]);
}

function requireRequestTriggerDetailTypes(type, details) {
  const booleanFields = type === 'proxyEndpoint'
    ? ['authenticated']
    : ['sensitiveRequest', 'sensitiveResponse'];
  const stringFields = type === 'proxyEndpoint'
    ? ['path', 'method']
    : ['value', 'event'];
  requireOptionalFieldsOfType(details, booleanFields, 'boolean');
  requireOptionalFieldsOfType(details, stringFields, 'string');
}

function requireOptionalFieldsOfType(source, fieldNames, expectedType) {
  if (fieldNames.some(fieldName => (
    source[fieldName] !== undefined && typeof source[fieldName] !== expectedType
  ))) {
    throwArtifactError('invalidContent');
  }
}

function requireWidgetFields(source) {
  if (typeof source.disableJavascript !== 'boolean') throwArtifactError('invalidContent');
  requireArray(source.externalJavascriptUrls);
  if (source.externalJavascriptUrls.some(url => typeof url !== 'string')) {
    throwArtifactError('invalidContent');
  }
}

function requireProtectedValue(source) {
  if (typeof source.sensitive !== 'boolean' || !Object.hasOwn(source, 'value')) {
    throwArtifactError('invalidContent');
  }
  if (source.sensitive && !isProtectedValuePlaceholder(source.value)) {
    throwArtifactError('protectedValue');
  }
  if (!source.sensitive && isProtectedValuePlaceholder(source.value)) {
    throwArtifactError('protectedValue');
  }
  if (!source.sensitive && typeof source.value !== 'string') {
    throwArtifactError('invalidContent');
  }
}

function requireFunctionFields(source) {
  requireArray(source.parameters);
  source.parameters.forEach(parameter => {
    requireExactFields(parameter, ['name', 'description', 'type'], ['name', 'type']);
    requireStringFields(parameter, ['name', 'description', 'type']);
  });
}

function requireExactFields(value, allowedFields, requiredFields) {
  requirePlainObject(value);
  const fieldNames = Object.keys(value);
  if (fieldNames.some(fieldName => !allowedFields.includes(fieldName))) {
    throwArtifactError('unsupportedField');
  }
  if (requiredFields.some(fieldName => !Object.hasOwn(value, fieldName))) {
    throwArtifactError('invalidContent');
  }
}

function decodeUtf8Content(content) {
  if (typeof content === 'string') return requireValidUnicode(content);
  if (!Buffer.isBuffer(content) && !(content instanceof Uint8Array)) {
    throwArtifactError('invalidUtf8');
  }
  try {
    return rejectByteOrderMark(new TextDecoder('utf-8', { fatal: true }).decode(content));
  } catch {
    throwArtifactError('invalidUtf8');
  }
}

function requireValidUnicode(content) {
  const roundTripContent = Buffer.from(content, 'utf8').toString('utf8');
  if (roundTripContent !== content) throwArtifactError('invalidUtf8');

  return rejectByteOrderMark(content);
}

function rejectByteOrderMark(content) {
  if (content.startsWith('\uFEFF')) throwArtifactError('invalidUtf8');

  return content;
}

function requireCanonicalNewline(content) {
  if (!content.endsWith('\n') || content.endsWith('\n\n')
    || content.includes('\r') || content.includes('\0')) {
    throwArtifactError('invalidNewline');
  }
}

function parseJsonSource(content) {
  try {
    return JSON.parse(content);
  } catch {
    throwArtifactError('invalidContent');
  }
}

function parseResourcePath(resourcePath) {
  if (typeof resourcePath !== 'string') throwArtifactError('invalidPath');
  for (const [resourceType, directory] of Object.entries(RESOURCE_SOURCE_DIRECTORIES)) {
    const prefix = `${directory}/`;
    if (!resourcePath.startsWith(prefix) || !resourcePath.endsWith('.json')) continue;
    const handle = resourcePath.slice(prefix.length, -'.json'.length);
    if (!HANDLE_PATTERN.test(handle)) throwArtifactError('invalidPath');

    return { handle, resourceType };
  }
  throwArtifactError('invalidPath');
}

function requireSourceIdentity(source, pathIdentity) {
  requirePlainObject(source);
  requireVersions(source);
  requireResourceFamily(source.resourceType);
  if (source.resourceType !== pathIdentity.resourceType) {
    throwArtifactError('resourceTypeMismatch');
  }
  if (source.handle !== pathIdentity.handle) throwArtifactError('handlePathMismatch');
}

function requireCanonicalBytes(projectCanonicalArtifactService, source, content) {
  if (projectCanonicalArtifactService.serializeParsedResourceSource(source) !== content) {
    throwArtifactError('nonCanonicalContent');
  }
}

function requireResourceFamily(resourceType) {
  const resourceFamily = RESOURCE_FAMILIES[resourceType];
  if (!resourceFamily) throwArtifactError('resourceType');

  return resourceFamily;
}

function requireSafeHandle(handle) {
  if (typeof handle !== 'string' || !HANDLE_PATTERN.test(handle)) {
    throwArtifactError('invalidPath');
  }

  return handle;
}

function requireArray(value) {
  if (!Array.isArray(value)) throwArtifactError('invalidContent');
}

function requirePlainObject(value) {
  if (!isPlainObject(value)) throwArtifactError('invalidContent');
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function isProtectedValuePlaceholder(value) {
  if (!isPlainObject(value)) return false;
  const fieldNames = Object.keys(value);
  if (fieldNames.length !== 1 || fieldNames[0] !== 'mode') return false;
  if (Reflect.ownKeys(value).length !== 1) return false;
  const modeDescriptor = Object.getOwnPropertyDescriptor(value, 'mode');

  return Object.hasOwn(modeDescriptor, 'value')
    && modeDescriptor.value === PROTECTED_VALUE_PLACEHOLDER.mode;
}

function assignDefinedFields(target, source, fieldNames) {
  fieldNames.forEach(fieldName => {
    if (source?.[fieldName] !== undefined) target[fieldName] = source[fieldName];
  });
}

function compactDefinedFields(source, fieldNames) {
  const value = {};
  assignDefinedFields(value, source, fieldNames);

  return value;
}

function buildCanonicalValue(value, ancestors) {
  if (isJsonPrimitive(value)) return normalizeJsonPrimitive(value);
  if (!isCanonicalContainer(value) || ancestors.has(value)) {
    throw canonicalValueError();
  }

  return buildCanonicalContainer(value, ancestors);
}

function buildCanonicalContainer(value, ancestors) {
  ancestors.add(value);
  try {
    return Array.isArray(value)
      ? buildCanonicalArray(value, ancestors)
      : buildCanonicalObject(value, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

function buildCanonicalArray(values, ancestors) {
  requireDenseDataArray(values);

  return values.map(value => buildCanonicalValue(value, ancestors));
}

function requireDenseDataArray(values) {
  if (Object.keys(values).length !== values.length
    || Reflect.ownKeys(values).length !== values.length + 1) {
    throw canonicalValueError();
  }
  for (let index = 0; index < values.length; index += 1) {
    requireDataProperty(values, String(index));
  }
}

function buildCanonicalObject(value, ancestors) {
  requirePlainDataProperties(value);
  requireNoSensitivePlaintext(value);

  return Object.fromEntries(Object.keys(value).sort().map(fieldName => [
    fieldName,
    buildCanonicalValue(value[fieldName], ancestors),
  ]));
}

function requirePlainDataProperties(value) {
  const enumerableFieldNames = Object.keys(value);
  if (Reflect.ownKeys(value).length !== enumerableFieldNames.length) {
    throw canonicalValueError();
  }
  enumerableFieldNames.forEach(fieldName => requireDataProperty(value, fieldName));
}

function requireDataProperty(value, fieldName) {
  const descriptor = Object.getOwnPropertyDescriptor(value, fieldName);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw canonicalValueError();
}

function requireNoSensitivePlaintext(value) {
  if (value.sensitive !== true || !Object.hasOwn(value, 'value')) return;
  if (!isProtectedValuePlaceholder(value.value)) {
    throw new TypeError('Plaintext sensitive values cannot be canonically digested');
  }
}

function isJsonPrimitive(value) {
  return value === null || ['boolean', 'number', 'string'].includes(typeof value);
}

function normalizeJsonPrimitive(value) {
  if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) {
    throw canonicalValueError();
  }

  return value;
}

function isCanonicalContainer(value) {
  return Array.isArray(value) || isPlainObject(value);
}

function canonicalValueError() {
  return new TypeError('Canonical resource values must be lossless JSON data');
}

function compareText(left, right) {
  if (left === right) return 0;

  return left < right ? -1 : 1;
}

function throwArtifactError(errorName) {
  throw new ProjectCanonicalArtifactError(PROJECT_CANONICAL_ARTIFACT_ERROR_CODES[errorName]);
}

export {
  CANONICAL_RESOURCE_DIGEST_CONTEXT,
  CANONICAL_RESOURCE_SOURCE_CONTRACT_VERSION,
  CANONICAL_RESOURCE_SOURCE_FORMAT_VERSION,
  PROJECT_CANONICAL_ARTIFACT_ERROR_CODES,
  PROTECTED_VALUE_PLACEHOLDER,
  ProjectCanonicalArtifactError,
  ProjectCanonicalArtifactService,
  RESOURCE_SOURCE_DIRECTORIES,
};
