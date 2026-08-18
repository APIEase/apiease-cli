const MAX_SECURE_INPUT_COUNT = 1000;
const PROTECTED_FIELD_PATH_PATTERN = /^(?:value|parameters\.[^.]+\.value)$/u;
const SAFE_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

class ProjectSecureInputService {
  buildSecureInputs({ parsedResourceSources, localState } = {}) {
    const protectedTargets = this.discoverProtectedTargets(parsedResourceSources);
    this.requireUniqueProtectedTargets(protectedTargets);
    const boundResourcesByPath = this.buildBoundResourcesByPath(localState);
    const secureInputs = protectedTargets.map(target => this.buildSecureInput(
      target,
      boundResourcesByPath,
    ));
    const requiredSecureValues = secureInputs
      .filter(secureInput => secureInput.mode === 'defer')
      .map(secureInput => this.buildSafeSelector(secureInput));

    return {
      secureInputs,
      requiredSecureValues,
    };
  }

  buildSecureInput(target, boundResourcesByPath) {
    return {
      ...this.buildSafeSelector(target),
      mode: this.isBoundTarget(target, boundResourcesByPath) ? 'preserve' : 'defer',
    };
  }

  discoverProtectedTargets(parsedResourceSources) {
    if (!Array.isArray(parsedResourceSources)) {
      throwServiceError('PROJECT_SECURE_INPUT_SOURCES_INVALID');
    }
    const protectedTargets = parsedResourceSources.flatMap(parsedResourceSource => (
      this.discoverSourceProtectedTargets(parsedResourceSource)
    ));

    if (protectedTargets.length > MAX_SECURE_INPUT_COUNT) {
      throwServiceError('PROJECT_SECURE_INPUT_LIMIT_EXCEEDED');
    }

    return protectedTargets.sort(compareProtectedTargets);
  }

  discoverSourceProtectedTargets(parsedResourceSource) {
    const source = parsedResourceSource?.source;
    if (source?.resourceType === 'variable') {
      return this.discoverVariableProtectedTargets(parsedResourceSource);
    }
    if (source?.resourceType === 'request') {
      return this.discoverRequestProtectedTargets(parsedResourceSource);
    }

    return [];
  }

  discoverVariableProtectedTargets({ path, source }) {
    const target = this.buildProtectedTarget({ path, source, fieldPath: 'value' });
    if (source.sensitive === false) {
      this.requireOrdinaryValue(source.value, target);
      return [];
    }
    if (source.sensitive !== true) {
      throwServiceError('PROJECT_SECURE_INPUT_SOURCES_INVALID');
    }
    this.requirePreservePlaceholder(source.value, target);

    return [target];
  }

  discoverRequestProtectedTargets({ path, source }) {
    if (!Array.isArray(source.parameters)) {
      throwServiceError('PROJECT_SECURE_INPUT_SOURCES_INVALID');
    }

    return source.parameters.flatMap(parameter => {
      const fieldPath = `parameters.${parameter.name}.value`;
      if (parameter?.sensitive === false && typeof parameter.value === 'string') return [];
      const target = this.buildProtectedTarget({ path, source, fieldPath });
      if (parameter?.sensitive === false) {
        this.requireOrdinaryValue(parameter.value, target);
        return [];
      }
      if (parameter?.sensitive !== true) {
        throwServiceError('PROJECT_SECURE_INPUT_SOURCES_INVALID');
      }
      this.requirePreservePlaceholder(parameter.value, target);
      return [target];
    });
  }

  buildProtectedTarget({ path, source, fieldPath }) {
    const target = {
      path,
      resourceType: source.resourceType,
      handle: source.handle,
      fieldPath,
    };
    if (!this.isValidProtectedTarget(target)) {
      throwServiceError('PROJECT_SECURE_INPUT_TARGET_INVALID');
    }

    return target;
  }

  isValidProtectedTarget(target) {
    return typeof target.path === 'string'
      && ['request', 'variable'].includes(target.resourceType)
      && typeof target.handle === 'string'
      && SAFE_HANDLE_PATTERN.test(target.handle)
      && typeof target.fieldPath === 'string'
      && target.fieldPath.length <= 1024
      && PROTECTED_FIELD_PATH_PATTERN.test(target.fieldPath);
  }

  requirePreservePlaceholder(value, target) {
    const isPlainObject = value !== null
      && typeof value === 'object'
      && Object.getPrototypeOf(value) === Object.prototype;
    if (!isPlainObject || Object.keys(value).length !== 1 || value.mode !== 'preserve') {
      this.throwInvalidValue(target);
    }
  }

  requireOrdinaryValue(value, target) {
    if (typeof value !== 'string') this.throwInvalidValue(target);
  }

  throwInvalidValue(target) {
    const code = 'PROJECT_SECURE_INPUT_VALUE_INVALID';
    throwServiceError(code, [{ code, ...this.buildSafeSelector(target) }]);
  }

  buildBoundResourcesByPath(localState) {
    if (!Array.isArray(localState?.resources)) {
      throwServiceError('PROJECT_SECURE_INPUT_LOCAL_STATE_INVALID');
    }

    return new Map(localState.resources.map(resource => [resource.path, resource]));
  }

  isBoundTarget(target, boundResourcesByPath) {
    const binding = boundResourcesByPath.get(target.path);

    return binding?.resourceType === target.resourceType;
  }

  requireUniqueProtectedTargets(protectedTargets) {
    const identities = protectedTargets.map(target => JSON.stringify(this.buildSafeSelector(target)));
    if (new Set(identities).size !== identities.length) {
      throwServiceError('PROJECT_SECURE_INPUT_TARGET_DUPLICATE');
    }
  }

  buildSafeSelector(target) {
    return {
      resourceType: target.resourceType,
      handle: target.handle,
      fieldPath: target.fieldPath,
    };
  }
}

function compareProtectedTargets(leftTarget, rightTarget) {
  const leftIdentity = `${leftTarget.resourceType}\0${leftTarget.handle}\0${leftTarget.fieldPath}`;
  const rightIdentity = `${rightTarget.resourceType}\0${rightTarget.handle}\0${rightTarget.fieldPath}`;

  if (leftIdentity === rightIdentity) return 0;

  return leftIdentity < rightIdentity ? -1 : 1;
}

function buildServiceError(code, diagnostics = [{ code }]) {
  const error = new Error(code);
  error.code = code;
  error.diagnostics = diagnostics;

  return error;
}

function throwServiceError(code, diagnostics) {
  throw buildServiceError(code, diagnostics);
}

export { MAX_SECURE_INPUT_COUNT, ProjectSecureInputService };
