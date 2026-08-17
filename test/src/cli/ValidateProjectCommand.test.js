import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE } from '../../../src/project/ProjectValidationService.js';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const validateProjectCommandModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'cli', 'ValidateProjectCommand.js'),
).href;

describe('ValidateProjectCommand', () => {
  describe('run', () => {
    it('should resolve personal authentication and validate the complete project candidate', async () => {
      // Arrange
      const { ValidateProjectCommand } = await import(validateProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const authenticationContext = Object.freeze(Object.create(null));
      const validateProjectCommand = buildValidateProjectCommand({
        ValidateProjectCommand,
        authenticationContext,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await validateProjectCommand.run([
        'validate',
        '--base-url',
        'https://apiease.example.com',
        '--shop-domain',
        'example.myshopify.com',
        '--api-key',
        'private-api-key',
        '--json',
      ], { currentWorkingDirectoryPath: '/checkout/resources/requests' });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(calls, [
        ['resolveRequestConfiguration', {
          explicitApiBaseUrl: 'https://apiease.example.com',
          explicitApiKey: 'private-api-key',
          explicitShopDomain: 'example.myshopify.com',
        }],
        ['buildAndValidateProject', {
          projectDirectoryPath: '/checkout/resources/requests',
          projectApiInvocation: {
            apiBaseUrl: 'https://apiease.example.com',
            authenticationContext,
          },
        }],
      ]);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), {
        cliResultVersion: 1,
        command: 'validate',
        state: 'success',
        outcome: 'PROJECT_VALID',
        result: buildValidationSuccess().result,
        diagnostics: [{ code: 'NOTICE', path: '/candidate/files/0' }],
        requiredSecureValues: [{
          resourceType: 'request',
          handle: 'inventory-sync',
          fieldPath: 'parameters.api-key.value',
        }],
      });
      assert.equal(stdoutChunks.join('').includes('private-api-key'), false);
      assert.equal(stderrChunks.join(''), `${PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE}\n`);
    });

    it('should render the non-execution boundary for human-readable validation', async () => {
      // Arrange
      const { ValidateProjectCommand } = await import(validateProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const validateProjectCommand = buildValidateProjectCommand({
        ValidateProjectCommand,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await validateProjectCommand.run(['validate']);

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(stdoutChunks.join(''), 'validate: success (PROJECT_VALID)\n');
      assert.equal(stderrChunks.join(''), `${PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE}\n`);
    });

    it('should use exit code four for an authoritative validation failure', async () => {
      // Arrange
      const { ValidateProjectCommand } = await import(validateProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const validateProjectCommand = buildValidateProjectCommand({
        ValidateProjectCommand,
        calls,
        stdoutChunks,
        stderrChunks,
        validationResult: buildValidationFailure(),
      });

      // Act
      const exitCode = await validateProjectCommand.run(['validate', '--json']);

      // Assert
      assert.equal(exitCode, 4);
      const envelope = JSON.parse(stdoutChunks.join(''));
      assert.equal(envelope.outcome, 'PROJECT_CANDIDATE_INVALID');
      assert.deepEqual(envelope.error, {
        code: 'PROJECT_CANDIDATE_INVALID',
        category: 'validation',
      });
      assert.deepEqual(envelope.diagnostics, [{
        code: 'PROJECT_CANDIDATE_INVALID',
        path: '/candidate/files',
      }]);
      assert.equal(stderrChunks.join(''), `${PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE}\n`);
    });

    it('should use exit code four for a local candidate contract failure', async () => {
      // Arrange
      const { ValidateProjectCommand } = await import(validateProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const validationError = Object.assign(new Error('sensitive source details'), {
        code: 'PROJECT_CANDIDATE_INVALID',
        diagnostics: [{ code: 'CONTRACT_REQUIRED', path: '/files' }],
      });
      const validateProjectCommand = buildValidateProjectCommand({
        ValidateProjectCommand,
        calls,
        stdoutChunks,
        stderrChunks,
        validationError,
      });

      // Act
      const exitCode = await validateProjectCommand.run(['validate', '--json']);

      // Assert
      assert.equal(exitCode, 4);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')).error, {
        code: 'PROJECT_CANDIDATE_INVALID',
        category: 'contract',
      });
      assert.equal(stdoutChunks.join('').includes('sensitive source details'), false);
      assert.equal(stderrChunks.join(''), `${PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE}\n`);
    });

    it('should reject duplicate or unsupported options before resolving configuration', async () => {
      // Arrange
      const { ValidateProjectCommand } = await import(validateProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const validateProjectCommand = buildValidateProjectCommand({
        ValidateProjectCommand,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await validateProjectCommand.run([
        'validate',
        '--json',
        '--json',
        '--unsupported',
      ]);

      // Assert
      assert.equal(exitCode, 2);
      assert.deepEqual(calls, []);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), {
        cliResultVersion: 1,
        command: 'validate',
        state: 'failure',
        error: { code: 'PROJECT_VALIDATE_USAGE_INVALID', category: 'usage' },
        diagnostics: [{ code: 'PROJECT_VALIDATE_ARGUMENT_INVALID' }],
        requiredSecureValues: [],
      });
      assert.equal(stderrChunks.join(''), `${PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE}\n`);
    });

    it('should return a secret-safe configuration failure before validation', async () => {
      // Arrange
      const { ValidateProjectCommand } = await import(validateProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const validateProjectCommand = buildValidateProjectCommand({
        ValidateProjectCommand,
        calls,
        stdoutChunks,
        stderrChunks,
        requestConfiguration: {
          ok: false,
          errorCode: 'APIEASE_COMMAND_CONFIGURATION_MISSING',
          fieldErrors: [{ path: 'apiKey', code: 'REQUIRED', message: 'API key is required.' }],
        },
      });

      // Act
      const exitCode = await validateProjectCommand.run(['validate', '--json']);

      // Assert
      assert.equal(exitCode, 2);
      assert.deepEqual(calls, [['resolveRequestConfiguration', {
        explicitApiBaseUrl: undefined,
        explicitApiKey: undefined,
        explicitShopDomain: undefined,
      }]]);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')).diagnostics, [{
        code: 'REQUIRED',
        path: 'apiKey',
      }]);
      assert.equal(stdoutChunks.join('').includes('API key is required.'), false);
      assert.equal(stderrChunks.join(''), `${PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE}\n`);
    });
  });
});

function buildValidateProjectCommand({
  ValidateProjectCommand,
  calls,
  stdoutChunks,
  stderrChunks,
  authenticationContext = Object.freeze(Object.create(null)),
  requestConfiguration = {
    ok: true,
    apiBaseUrl: 'https://apiease.example.com',
    authenticationContext,
  },
  validationError,
  validationResult = buildValidationSuccess(),
}) {
  return new ValidateProjectCommand({
    personalProjectAuthenticationAdapter: {
      async resolveRequestConfiguration(invocation) {
        calls.push(['resolveRequestConfiguration', invocation]);
        return requestConfiguration;
      },
    },
    projectValidationService: {
      async buildAndValidateProject(invocation) {
        calls.push(['buildAndValidateProject', invocation]);
        if (validationError) throw validationError;
        return validationResult;
      },
    },
    stdout: { write: chunk => stdoutChunks.push(chunk) },
    stderr: { write: chunk => stderrChunks.push(chunk) },
  });
}

function buildValidationSuccess() {
  return {
    ok: true,
    outcome: 'PROJECT_VALID',
    result: {
      candidateFormatVersion: 1,
      summary: {
        fileCount: 2,
        resourceCount: 1,
        createCount: 0,
        updateCount: 1,
        deleteCount: 0,
        totalBytes: 512,
      },
    },
    diagnostics: [{ code: 'NOTICE', path: '/candidate/files/0' }],
    requiredSecureValues: [{
      resourceType: 'request',
      handle: 'inventory-sync',
      fieldPath: 'parameters.api-key.value',
    }],
    guidance: [PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE],
  };
}

function buildValidationFailure() {
  return {
    ok: false,
    outcome: 'PROJECT_CANDIDATE_INVALID',
    error: {
      code: 'PROJECT_CANDIDATE_INVALID',
      diagnostics: [{ code: 'PROJECT_CANDIDATE_INVALID', path: '/candidate/files' }],
    },
    diagnostics: [{ code: 'PROJECT_CANDIDATE_INVALID', path: '/candidate/files' }],
    requiredSecureValues: [],
    guidance: [PROJECT_VALIDATION_NON_EXECUTION_GUIDANCE],
    validationResponse: { status: 422 },
  };
}
