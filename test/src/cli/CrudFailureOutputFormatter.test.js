import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('CrudFailureOutputFormatter', () => {
  describe('format', () => {
    const cases = [
      ['nested errors take precedence', { errorCode: 'OLD', message: 'Old', error: { code: 'INVALID', message: 'Invalid resource.' } }, 'Error Code: INVALID\nMessage: Invalid resource.\n'],
      ['local validation errors', { errorCode: 'INVALID_INPUT', message: 'Invalid input.', fieldErrors: [{ path: 'handle', code: 'REQUIRED', message: 'Provide a handle.' }] }, 'Error Code: INVALID_INPUT\nMessage: Invalid input.\nField Error: handle REQUIRED Provide a handle.\n'],
      ['local configuration errors', { errorCode: 'CONFIGURATION_INVALID', message: 'API key missing.' }, 'Error Code: CONFIGURATION_INVALID\nMessage: API key missing.\n'],
      ['local transport errors', { errorCode: 'REQUEST_READ_FAILED', message: 'fetch failed', status: 502 }, 'Error Code: REQUEST_READ_FAILED\nMessage: fetch failed\nStatus: 502\n'],
      ['missing optional field error properties', { error: { code: 'INVALID', message: 'Invalid resource.', fieldErrors: [{ path: 'source' }, { message: 'Invalid value.' }] } }, 'Error Code: INVALID\nMessage: Invalid resource.\nField Error: source\nField Error: Invalid value.\n'],
      ['empty diagnostics and details', { error: { code: 'INVALID', message: 'Invalid resource.', fieldErrors: [], diagnostics: [], details: [] } }, 'Error Code: INVALID\nMessage: Invalid resource.\n'],
      ['outcome when no error code is supplied', { outcome: 'RESOURCE_VALIDATION_FAILED' }, 'Error Code: RESOURCE_VALIDATION_FAILED\n'],
      ['error-level resource and dependency context', { error: { code: 'INVALID', message: 'Invalid resource.', resource: { resourceType: 'request', handle: 'example' }, dependency: { handle: 'token' }, fieldPath: 'source' } },
        'Error Code: INVALID\nMessage: Invalid resource.\nContext:\n  {\n    "resource": {\n      "resourceType": "request",\n      "handle": "example"\n    },\n    "dependency": {\n      "handle": "token"\n    },\n    "fieldPath": "source"\n  }\n'],
      ['absent error information', { ok: false }, ''],
      ['nested structured context', { error: { code: 'INVALID', message: 'Invalid resource.', fieldErrors: [{ path: 'source', code: 'REFERENCE_INVALID', message: 'Unknown reference.', resourceType: 'request', handle: 'example' }], diagnostics: [{ code: 'DEPENDENCY_MISSING', fieldPath: 'source', dependency: { resourceType: 'variable', handle: 'token' } }], details: [{ resourceType: 'request', handle: 'example', fieldPath: 'source', operationIndex: 0 }] } },
        'Error Code: INVALID\nMessage: Invalid resource.\nField Error: source REFERENCE_INVALID Unknown reference.\n' +
        '  {\n    "resourceType": "request",\n    "handle": "example"\n  }\n' +
        'Diagnostic: DEPENDENCY_MISSING\n  {\n    "fieldPath": "source",\n    "dependency": {\n      "resourceType": "variable",\n      "handle": "token"\n    }\n  }\n' +
        'Details:\n  [\n    {\n      "resourceType": "request",\n      "handle": "example",\n      "fieldPath": "source",\n      "operationIndex": 0\n    }\n  ]\n'],
    ];
    for (const [name, result, expected] of cases) {
      it(`should format ${name}`, async () => {
        // Arrange
        const { CrudFailureOutputFormatter } = await import('../../../src/cli/CrudFailureOutputFormatter.js');
        const formatter = new CrudFailureOutputFormatter();

        // Act
        const output = formatter.format(result, 'Request creation failed.');

        // Assert
        assert.equal(output, `Request creation failed.\n${expected}`);
      });
    }
  });
});
