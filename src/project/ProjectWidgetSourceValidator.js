import AdminWidgetSourceCompiler from './AdminWidgetSourceCompiler.js';
import {
  ADMIN_WIDGET_TARGETS,
  ADMIN_WIDGET_UI_LIMITS,
  PUBLIC_HANDLE_PATTERN,
  SAMPLE_REQUESTS,
} from '../../contracts/widgets/v1/constants.js';

const COMPONENT_FIELDS = Object.freeze({
  text: ['type', 'text'],
  input: ['type', 'name', 'label', 'defaultValue', 'required'],
  button: ['type', 'id', 'label', 'requestHandle'],
});

// Mirrors WidgetEditorValidationService and AdminWidgetDefinitionService on the server.
// Validation inspects source only; it never executes a widget or a request.
class ProjectWidgetSourceValidator {
  constructor({ adminWidgetSourceCompiler = new AdminWidgetSourceCompiler() } = {}) {
    this.adminWidgetSourceCompiler = adminWidgetSourceCompiler;
  }

  validate(source) {
    this.requireTypeAndTarget(source);
    this.requireBoundedFields(source);
    if (source.type === 'admin' && !source.adminText?.trim() && !source.adminUi?.trim()) fail();
    if (source.adminUi?.trim()) this.validateDefinition(source.adminUi);
  }

  requireTypeAndTarget(source) {
    if (source.type !== undefined && !['storefront', 'admin'].includes(source.type)) fail();
    if (source.adminTarget !== undefined && !ADMIN_WIDGET_TARGETS.includes(source.adminTarget)) fail();
  }

  requireBoundedFields(source) {
    for (const field of ['adminText', 'adminUi', 'adminTarget', 'description', 'liquid', 'javascript']) {
      if (source[field] !== undefined) requireString(source[field], 65536, true);
    }
    if (source.name !== undefined) requireString(source.name, 1024, true);
    if (Array.isArray(source.externalJavascriptUrls)) {
      if (source.externalJavascriptUrls.length > 1000) fail();
      source.externalJavascriptUrls.forEach(value => requireString(value, 65536, true));
    }
  }

  validateDefinition(source) {
    let definition;
    try { definition = JSON.parse(source); } catch { fail(); }
    if (definition?.version === 2) return this.validateBlock(definition);
    requireFields(definition, ['version', 'components']);
    if (definition.version !== 1) fail();
    this.validateComponents(definition.components);
  }

  validateBlock(definition) {
    requireFields(definition, ['version', 'targets']);
    if (!Array.isArray(definition.targets) || definition.targets.length !== 1) fail();
    const block = definition.targets[0];
    requireFields(block, ['type', 'variables', 'render']);
    if (block.type !== 'block') fail();
    try { this.adminWidgetSourceCompiler.compile(block); } catch { fail(); }
  }

  validateComponents(components) {
    if (!Array.isArray(components) || components.length === 0
      || components.length > ADMIN_WIDGET_UI_LIMITS.maximumComponents) fail();
    const names = new Set();
    const buttonIds = new Set();
    components.forEach(component => this.validateComponent(component, names, buttonIds));
  }

  validateComponent(component, names, buttonIds) {
    if (!Object.hasOwn(COMPONENT_FIELDS, component?.type ?? '')) fail();
    requireFields(component, COMPONENT_FIELDS[component.type]);
    if (component.type === 'text') return requireString(component.text, ADMIN_WIDGET_UI_LIMITS.maximumTextCharacters);
    requireString(component.label, ADMIN_WIDGET_UI_LIMITS.maximumLabelCharacters);
    if (component.type === 'input') this.validateInput(component, names);
    if (component.type === 'button') this.validateButton(component, buttonIds);
  }

  validateInput(component, names) {
    requireIdentifier(component.name, names);
    if (component.defaultValue !== undefined) {
      requireString(component.defaultValue, ADMIN_WIDGET_UI_LIMITS.maximumInputCharacters, true);
    }
    if (component.required !== undefined && typeof component.required !== 'boolean') fail();
  }

  validateButton(component, buttonIds) {
    requireIdentifier(component.id, buttonIds);
    requireString(component.requestHandle, ADMIN_WIDGET_UI_LIMITS.maximumLabelCharacters);
    if (!PUBLIC_HANDLE_PATTERN.test(component.requestHandle)
      && !SAMPLE_REQUESTS.some(sample => sample.id === component.requestHandle)) fail();
  }
}

function requireFields(value, fields) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail();
  if (Object.keys(value).some(field => !fields.includes(field))) fail();
}

function requireString(value, maximum, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) fail();
  if ([...value].length > maximum) fail();
}

function requireIdentifier(value, seen) {
  requireString(value, ADMIN_WIDGET_UI_LIMITS.maximumNameCharacters);
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value) || ['constructor', 'prototype'].includes(value)
    || seen.has(value)) fail();
  seen.add(value);
}

function fail() {
  throw Object.assign(new Error('Canonical widget source is invalid'), {
    code: 'CANONICAL_RESOURCE_SOURCE_INVALID_CONTENT',
  });
}

export { ProjectWidgetSourceValidator };
