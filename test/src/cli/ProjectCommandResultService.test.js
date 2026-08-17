import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROJECT_CLI_EXIT_CODES,
  ProjectCommandResultService,
} from '../../../src/cli/ProjectCommandResultService.js';

describe('ProjectCommandResultService', () => {
  describe('normalizeResult', () => {
    it('should preserve an accepted authoritative outcome separately from committed success', () => {
      // Arrange
      const service = new ProjectCommandResultService();

      // Act
      const normalizedResult = service.normalizeResult({
        command: 'apply',
        state: 'accepted',
        outcome: 'PROJECT_APPROVAL_PENDING',
        result: { proposalId: 'proposal-safe', authenticationContext: { apiKey: 'secret' } },
      });

      // Assert
      assert.deepEqual(normalizedResult, {
        cliResultVersion: 1,
        command: 'apply',
        state: 'accepted',
        outcome: 'PROJECT_APPROVAL_PENDING',
        result: { proposalId: 'proposal-safe' },
        diagnostics: [],
        requiredSecureValues: [],
      });
    });

    it('should preserve only normalized error data and safe deterministic diagnostics', () => {
      // Arrange
      const service = new ProjectCommandResultService();
      const diagnostics = [
        { code: 'Z_CODE', message: 'server text', apiKey: 'secret', path: 'z.json' },
        { code: 'A_CODE', path: 'a.json', providerBody: { value: 'secret' } },
        { code: 'A_CODE', path: 'a.json' },
      ];

      // Act
      const normalizedResult = service.normalizeResult({
        command: 'validate',
        state: 'failure',
        outcome: 'PROJECT_CANDIDATE_INVALID',
        error: {
          code: 'PROJECT_CANDIDATE_INVALID',
          category: 'validation',
          message: 'arbitrary server text',
          stack: 'secret stack',
        },
        diagnostics,
      });

      // Assert
      assert.deepEqual(normalizedResult.error, {
        code: 'PROJECT_CANDIDATE_INVALID',
        category: 'validation',
      });
      assert.deepEqual(normalizedResult.diagnostics, [
        { code: 'A_CODE', path: 'a.json' },
        { code: 'Z_CODE', path: 'z.json' },
      ]);
    });

    it('should bound diagnostics and required secure values to one hundred unique sorted entries', () => {
      // Arrange
      const service = new ProjectCommandResultService();
      const diagnostics = Array.from({ length: 105 }, (_, index) => ({
        code: `CODE_${String(index).padStart(3, '0')}`,
      })).reverse();
      const requiredSecureValues = Array.from({ length: 105 }, (_, index) => ({
        resourceType: 'request',
        handle: `request-${String(index).padStart(3, '0')}`,
        fieldPath: 'parameters.token.value',
        value: 'must-not-leak',
      })).reverse();

      // Act
      const normalizedResult = service.normalizeResult({
        command: 'apply',
        state: 'success',
        diagnostics,
        requiredSecureValues,
      });

      // Assert
      assert.equal(normalizedResult.diagnostics.length, 100);
      assert.equal(normalizedResult.diagnostics[0].code, 'CODE_000');
      assert.equal(normalizedResult.requiredSecureValues.length, 100);
      assert.deepEqual(normalizedResult.requiredSecureValues[0], {
        resourceType: 'request',
        handle: 'request-000',
        fieldPath: 'parameters.token.value',
      });
    });
  });

  describe('resolveExitCode', () => {
    it('should return zero for success and accepted states', () => {
      // Arrange
      const service = new ProjectCommandResultService();

      // Act
      const successExitCode = service.resolveExitCode({ state: 'success' });
      const acceptedExitCode = service.resolveExitCode({ state: 'accepted' });

      // Assert
      assert.equal(successExitCode, PROJECT_CLI_EXIT_CODES.success);
      assert.equal(acceptedExitCode, PROJECT_CLI_EXIT_CODES.success);
    });

    it('should map every normalized failure category to its stable exit code', () => {
      // Arrange
      const service = new ProjectCommandResultService();
      const expectedExitCodes = {
        internal: 1,
        usage: 2,
        configuration: 2,
        authentication: 3,
        authorization: 3,
        validation: 4,
        contract: 4,
        conflict: 5,
        'local-integrity': 6,
        state: 6,
        git: 6,
        publication: 6,
        retry: 7,
        service: 7,
        transport: 7,
      };

      // Act
      const actualExitCodes = Object.fromEntries(Object.keys(expectedExitCodes).map(category => [
        category,
        service.resolveExitCode({ state: 'failure', error: { code: 'SAFE_CODE', category } }),
      ]));

      // Assert
      assert.deepEqual(actualExitCodes, expectedExitCodes);
    });

    it('should infer conflict exit behavior from an authoritative error code', () => {
      // Arrange
      const service = new ProjectCommandResultService();

      // Act
      const exitCode = service.resolveExitCode({
        state: 'failure',
        error: { code: 'PROJECT_BASELINE_CONFLICT' },
      });

      // Assert
      assert.equal(exitCode, PROJECT_CLI_EXIT_CODES.conflict);
    });
  });

  describe('renderResult', () => {
    it('should emit exactly one JSON document to stdout and guidance only to stderr', () => {
      // Arrange
      const stdoutChunks = [];
      const stderrChunks = [];
      const service = new ProjectCommandResultService({
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });
      const envelope = service.normalizeResult({ command: 'pull', state: 'success' });

      // Act
      service.renderResult(envelope, {
        json: true,
        progress: ['Polling APIEase.'],
        guidance: ['Review the synchronized files.'],
      });

      // Assert
      assert.equal(stdoutChunks.length, 1);
      assert.deepEqual(JSON.parse(stdoutChunks[0]), envelope);
      assert.equal(stderrChunks.join(''), 'Polling APIEase.\nReview the synchronized files.\n');
    });

    it('should render human success to stdout and human failure to stderr', () => {
      // Arrange
      const successStdoutChunks = [];
      const failureStderrChunks = [];
      const successService = new ProjectCommandResultService({
        stdout: createWritableStream(successStdoutChunks),
        stderr: createWritableStream([]),
      });
      const failureService = new ProjectCommandResultService({
        stdout: createWritableStream([]),
        stderr: createWritableStream(failureStderrChunks),
      });

      // Act
      successService.renderResult(successService.normalizeResult({
        command: 'pull',
        state: 'success',
        outcome: 'PROJECT_BOOTSTRAP_SYNCHRONIZED',
      }));
      failureService.renderResult(failureService.normalizeResult({
        command: 'validate',
        state: 'failure',
        error: { code: 'PROJECT_CANDIDATE_INVALID', category: 'validation' },
      }));

      // Assert
      assert.match(successStdoutChunks.join(''), /PROJECT_BOOTSTRAP_SYNCHRONIZED/);
      assert.match(failureStderrChunks.join(''), /PROJECT_CANDIDATE_INVALID/);
    });
  });
});

function createWritableStream(chunks) {
  return {
    write(chunk) {
      chunks.push(chunk);
    },
  };
}
