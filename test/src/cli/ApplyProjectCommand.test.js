import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  PROJECT_APPLY_RUNTIME_VERIFICATION_GUIDANCE,
  PROJECT_APPLY_SECURE_VALUE_GUIDANCE,
} from '../../../src/project/ProjectApplyService.js';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const applyProjectCommandModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'cli', 'ApplyProjectCommand.js'),
).href;

describe('ApplyProjectCommand', () => {
  describe('run', () => {
    it('should immediately apply with explicit personal configuration and return the exact plan', async () => {
      // Arrange
      const { ApplyProjectCommand } = await import(applyProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const applyResult = buildApplySuccess();
      const applyProjectCommand = buildApplyProjectCommand({
        ApplyProjectCommand,
        applyResult,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await applyProjectCommand.run([
        'apply',
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
      assert.deepEqual(calls, [['applyProject', {
        projectDirectoryPath: '/checkout/resources/requests',
        requireApproval: false,
        configurationOptions: {
          explicitApiBaseUrl: 'https://apiease.example.com',
          explicitApiKey: 'private-api-key',
          explicitShopDomain: 'example.myshopify.com',
        },
      }]]);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), {
        cliResultVersion: 1,
        command: 'apply',
        state: 'success',
        outcome: 'PROJECT_APPLIED',
        result: {
          plan: applyResult.plan,
          receipt: applyResult.receipt,
        },
        diagnostics: [{ code: 'NOTICE', operationIndex: 0 }],
        requiredSecureValues: applyResult.requiredSecureValues,
      });
      assert.equal(stdoutChunks.join('').includes('private-api-key'), false);
      assert.equal(stderrChunks.join(''), [
        PROJECT_APPLY_RUNTIME_VERIFICATION_GUIDANCE,
        PROJECT_APPLY_SECURE_VALUE_GUIDANCE,
        '',
      ].join('\n'));
    });

    it('should display the exact plan before the authoritative human-readable outcome', async () => {
      // Arrange
      const { ApplyProjectCommand } = await import(applyProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const applyResult = buildApplySuccess({ requiredSecureValues: [] });
      applyResult.guidance = [PROJECT_APPLY_RUNTIME_VERIFICATION_GUIDANCE];
      const applyProjectCommand = buildApplyProjectCommand({
        ApplyProjectCommand,
        applyResult,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await applyProjectCommand.run(['apply']);

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(stdoutChunks.join(''), 'apply: success (PROJECT_APPLIED)\n');
      assert.equal(stderrChunks.join(''), [
        `Plan: ${JSON.stringify(applyResult.plan)}`,
        PROJECT_APPLY_RUNTIME_VERIFICATION_GUIDANCE,
        '',
      ].join('\n'));
    });

    it('should return accepted proposal metadata for personal deferred approval', async () => {
      // Arrange
      const { ApplyProjectCommand } = await import(applyProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const applyProjectCommand = buildApplyProjectCommand({
        ApplyProjectCommand,
        applyResult: buildProposalAccepted(),
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await applyProjectCommand.run([
        'apply',
        '--require-approval',
        '--json',
      ]);

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(calls[0][1].requireApproval, true);
      assert.deepEqual(calls[0][1].configurationOptions, {
        explicitApiBaseUrl: undefined,
        explicitApiKey: undefined,
        explicitShopDomain: undefined,
      });
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), {
        cliResultVersion: 1,
        command: 'apply',
        state: 'accepted',
        outcome: 'PROJECT_PROPOSAL_ACCEPTED',
        result: {
          plan: buildProposalAccepted().plan,
          proposal: buildProposalAccepted().proposal,
        },
        diagnostics: [],
        requiredSecureValues: [],
      });
      assert.equal(stderrChunks.join(''), '');
    });

    it('should preserve personal configuration on approval-required apply', async () => {
      // Arrange
      const { ApplyProjectCommand } = await import(applyProjectCommandModuleUrl);
      const calls = [];
      const applyProjectCommand = buildApplyProjectCommand({
        ApplyProjectCommand,
        applyResult: buildProposalAccepted(),
        calls,
        stdoutChunks: [],
        stderrChunks: [],
      });

      // Act
      await applyProjectCommand.run([
        'apply',
        '--require-approval',
        '--api-key',
        'personal-key-must-be-rejected',
      ]);

      // Assert
      assert.deepEqual(calls[0][1].configurationOptions, {
        explicitApiBaseUrl: undefined,
        explicitApiKey: 'personal-key-must-be-rejected',
        explicitShopDomain: undefined,
      });
    });

    it('should reject duplicate and unsupported authority or secure-input options', async () => {
      // Arrange
      const { ApplyProjectCommand } = await import(applyProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const applyProjectCommand = buildApplyProjectCommand({
        ApplyProjectCommand,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await applyProjectCommand.run([
        'apply',
        '--json',
        '--json',
        '--conversation-id',
        'conversation-1',
        '--secure-value',
        'forbidden',
      ]);

      // Assert
      assert.equal(exitCode, 2);
      assert.deepEqual(calls, []);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')), {
        cliResultVersion: 1,
        command: 'apply',
        state: 'failure',
        error: { code: 'PROJECT_APPLY_USAGE_INVALID', category: 'usage' },
        diagnostics: [{ code: 'PROJECT_APPLY_ARGUMENT_INVALID' }],
        requiredSecureValues: [],
      });
      assert.equal(stdoutChunks.join('').includes('forbidden'), false);
      assert.equal(stderrChunks.join(''), '');
    });

    it('should normalize local apply errors without exposing their messages', async () => {
      // Arrange
      const { ApplyProjectCommand } = await import(applyProjectCommandModuleUrl);
      const calls = [];
      const stdoutChunks = [];
      const stderrChunks = [];
      const applyError = Object.assign(new Error('private local source contents'), {
        code: 'PROJECT_LOCAL_STATE_INVALID',
        failureType: 'local-integrity',
        diagnostics: [{ code: 'PROJECT_LOCAL_STATE_INVALID' }],
      });
      const applyProjectCommand = buildApplyProjectCommand({
        ApplyProjectCommand,
        applyError,
        calls,
        stdoutChunks,
        stderrChunks,
      });

      // Act
      const exitCode = await applyProjectCommand.run(['apply', '--json']);

      // Assert
      assert.equal(exitCode, 6);
      assert.deepEqual(JSON.parse(stdoutChunks.join('')).error, {
        code: 'PROJECT_LOCAL_STATE_INVALID',
        category: 'local-integrity',
      });
      assert.equal(stdoutChunks.join('').includes('private local source contents'), false);
      assert.equal(stderrChunks.join(''), '');
    });
  });
});

function buildApplyProjectCommand({
  ApplyProjectCommand,
  calls,
  stdoutChunks,
  stderrChunks,
  applyError,
  applyResult = buildApplySuccess(),
}) {
  return new ApplyProjectCommand({
    projectApplyService: {
      async applyProject(invocation) {
        calls.push(['applyProject', invocation]);
        if (applyError) throw applyError;
        return applyResult;
      },
    },
    stdout: createWritableStream(stdoutChunks),
    stderr: createWritableStream(stderrChunks),
  });
}

function buildApplySuccess({
  requiredSecureValues = [{
    resourceType: 'request',
    handle: 'inventory-sync',
    fieldPath: 'parameters.api-key.value',
  }],
} = {}) {
  return {
    ok: true,
    state: 'success',
    stage: 'apply',
    outcome: 'PROJECT_APPLIED',
    plan: {
      baseline: { liveRevision: 12 },
      operations: [{ operation: 'update', path: 'resources/requests/inventory-sync.json' }],
      operationDigest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      summary: { operationCount: 1, updateCount: 1 },
    },
    receipt: {
      applyReceiptVersion: 1,
      operationKey: 'opaque-operation-key',
      replayed: false,
      outcome: 'PROJECT_APPLIED',
      resultingLiveRevision: 13,
      resources: [],
    },
    diagnostics: [{ code: 'NOTICE', operationIndex: 0 }],
    requiredSecureValues,
    guidance: [
      PROJECT_APPLY_RUNTIME_VERIFICATION_GUIDANCE,
      PROJECT_APPLY_SECURE_VALUE_GUIDANCE,
    ],
  };
}

function buildProposalAccepted() {
  return {
    ok: true,
    state: 'accepted',
    stage: 'apply',
    outcome: 'PROJECT_PROPOSAL_ACCEPTED',
    plan: {
      baseline: { liveRevision: 12 },
      operations: [],
      operationDigest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      summary: { operationCount: 0 },
    },
    proposal: {
      proposalId: 'proposal-safe',
      designSessionId: 'design-session-safe',
      status: 'pending',
      replayed: false,
    },
    receipt: null,
    diagnostics: [],
    requiredSecureValues: [],
    guidance: [],
  };
}

function createWritableStream(chunks) {
  return {
    write(chunk) {
      chunks.push(chunk);
    },
  };
}
