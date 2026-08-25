import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ProjectLocalStateService } from '../../../src/project/ProjectLocalStateService.js';

describe('ProjectLocalStateService', () => {
  describe('resolveLocalStateLocation', () => {
    it('should use Git to resolve an ordinary checkout state path', async () => {
      // Arrange
      const projectDirectoryPath = '/workspace/project/resources';
      const gitInvocations = [];
      const projectLocalStateService = buildService({
        gitOutputs: ['/workspace/project\n', '.git/apiease/project-state-v1.json\n'],
        gitInvocations,
      });

      // Act
      const location = await projectLocalStateService.resolveLocalStateLocation(projectDirectoryPath);

      // Assert
      assert.deepEqual(location, {
        repositoryTopLevelPath: '/workspace/project',
        localStateFilePath: '/workspace/project/.git/apiease/project-state-v1.json',
      });
      assert.deepEqual(gitInvocations, [
        { arguments: ['rev-parse', '--show-toplevel'], workingDirectoryPath: projectDirectoryPath },
        {
          arguments: ['rev-parse', '--git-path', 'apiease/project-state-v1.json'],
          workingDirectoryPath: '/workspace/project',
        },
      ]);
    });

    it('should preserve the absolute Git path returned for a linked worktree', async () => {
      // Arrange
      const projectLocalStateService = buildService({
        gitOutputs: [
          '/workspace/project-worktree\n',
          '/workspace/project/.git/worktrees/project-worktree/apiease/project-state-v1.json\n',
        ],
      });

      // Act
      const location = await projectLocalStateService.resolveLocalStateLocation('/workspace/project-worktree');

      // Assert
      assert.equal(
        location.localStateFilePath,
        '/workspace/project/.git/worktrees/project-worktree/apiease/project-state-v1.json',
      );
    });
  });

  describe('readLocalState', () => {
    it('should read and strictly validate local state version one', async () => {
      // Arrange
      const fixture = await createStateFixture();
      const projectLocalStateService = buildService({
        gitOutputs: [fixture.repositoryTopLevelPath, fixture.localStateRelativePath],
      });
      await writeStateFixture(fixture, buildLocalState());

      // Act
      const result = await projectLocalStateService.readLocalState(fixture.repositoryTopLevelPath);

      // Assert
      assert.deepEqual(result.localState, buildLocalState());
    });

    it('should fail with local integrity diagnostics when state is missing', async () => {
      // Arrange
      const fixture = await createStateFixture();
      const projectLocalStateService = buildService({
        gitOutputs: [fixture.repositoryTopLevelPath, fixture.localStateRelativePath],
      });

      // Act
      const result = await projectLocalStateService.readLocalState(fixture.repositoryTopLevelPath);

      // Assert
      assert.deepEqual(result, {
        ok: false,
        error: {
          code: 'PROJECT_LOCAL_STATE_NOT_FOUND',
          diagnostics: [{ code: 'PROJECT_LOCAL_STATE_NOT_FOUND' }],
        },
      });
    });

    it('should fail closed for malformed or incompatible state', async () => {
      // Arrange
      const fixture = await createStateFixture();
      const projectLocalStateService = buildService({
        gitOutputs: [fixture.repositoryTopLevelPath, fixture.localStateRelativePath],
      });
      await fs.mkdir(path.dirname(fixture.localStateFilePath), { recursive: true });
      await fs.writeFile(fixture.localStateFilePath, '{"localStateVersion":2}\n');

      // Act
      const result = await projectLocalStateService.readLocalState(fixture.repositoryTopLevelPath);

      // Assert
      assert.equal(result.ok, false);
      assert.equal(result.error.code, 'PROJECT_LOCAL_STATE_INVALID');
    });
  });

  describe('publishLocalState', () => {
    it('should atomically replace state and leave no same-directory temporary file', async () => {
      // Arrange
      const fixture = await createStateFixture();
      const projectLocalStateService = buildService({
        gitOutputs: [fixture.repositoryTopLevelPath, fixture.localStateRelativePath],
      });
      const localState = buildLocalState();

      // Act
      await projectLocalStateService.publishLocalState({
        projectDirectoryPath: fixture.repositoryTopLevelPath,
        localState,
      });

      // Assert
      assert.deepEqual(JSON.parse(await fs.readFile(fixture.localStateFilePath, 'utf8')), localState);
      assert.deepEqual(await fs.readdir(path.dirname(fixture.localStateFilePath)), [
        'project-state-v1.json',
      ]);
    });

    it('should reject invalid replacement state without changing the old state', async () => {
      // Arrange
      const fixture = await createStateFixture();
      const projectLocalStateService = buildService({
        gitOutputs: [fixture.repositoryTopLevelPath, fixture.localStateRelativePath],
      });
      const oldLocalState = buildLocalState();
      await writeStateFixture(fixture, oldLocalState);

      // Act
      await assert.rejects(
        projectLocalStateService.publishLocalState({
          projectDirectoryPath: fixture.repositoryTopLevelPath,
          localState: { ...oldLocalState, localStateVersion: 2 },
        }),
        { code: 'PROJECT_LOCAL_STATE_INVALID' },
      );

      // Assert
      assert.deepEqual(JSON.parse(await fs.readFile(fixture.localStateFilePath, 'utf8')), oldLocalState);
    });
  });

  describe('deriveCommittedLocalState', () => {
    it('should use receipt versions and candidate paths while preserving project identity', async () => {
      // Arrange
      const workflowFixture = await readWorkflowFixture();
      const applyPair = workflowFixture.pairs.find(pair => pair.name === 'apply');
      const projectLocalStateService = buildService();
      const localState = buildLocalState({
        projectIdentity: buildProjectIdentity(workflowFixture.initialState.projectId),
        baseline: workflowFixture.initialState.baseline,
        resources: workflowFixture.initialState.resources,
      });

      // Act
      const committedLocalState = projectLocalStateService.deriveCommittedLocalState({
        localState,
        changeSet: applyPair.request.document.changeSet,
        applyReceipt: applyPair.response.document.result,
        candidateSnapshotDigest: workflowFixture.resultingState.baseline.snapshotDigest,
      });

      // Assert
      assert.deepEqual(committedLocalState, {
        localStateVersion: 1,
        projectIdentity: buildProjectIdentity(workflowFixture.resultingState.projectId),
        baseline: workflowFixture.resultingState.baseline,
        resources: workflowFixture.resultingState.resources.map(resource => ({
          path: buildResourcePath(resource.resourceType, resource.handle),
          ...resource,
        })),
      });
    });

    it('should reject a noncommitted or malformed receipt', () => {
      // Arrange
      const projectLocalStateService = buildService();

      // Act and Assert
      assert.throws(() => projectLocalStateService.deriveCommittedLocalState({
        localState: buildLocalState(),
        changeSet: {},
        applyReceipt: { outcome: 'PROJECT_PLAN_READY' },
        candidateSnapshotDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }), { code: 'PROJECT_APPLY_RECEIPT_INVALID' });
    });

    it('should retain resource bindings after a committed no-change receipt', async () => {
      // Arrange
      const workflowFixture = await readWorkflowFixture();
      const noChangePair = workflowFixture.pairs.find(pair => pair.name === 'no-change');
      const projectLocalStateService = buildService();
      const localState = buildLocalState({
        baseline: noChangePair.request.document.changeSet.baseline,
        resources: noChangePair.request.document.changeSet.verifiedBindings.map(binding => ({
          path: buildResourcePath(binding.resourceType, binding.handle),
          resourceType: binding.resourceType,
          resourceId: binding.resourceId,
          handle: binding.handle,
          resourceVersion: binding.expectedResourceVersion,
        })),
      });

      // Act
      const committedLocalState = projectLocalStateService.deriveCommittedLocalState({
        localState,
        changeSet: noChangePair.request.document.changeSet,
        applyReceipt: noChangePair.response.document.result,
        candidateSnapshotDigest: noChangePair.request.document.changeSet.baseline.snapshotDigest,
      });

      // Assert
      assert.deepEqual(committedLocalState.resources, localState.resources);
    });
  });

  describe('deriveRenamedLocalState', () => {
    it('should update only the binding path for an uncommitted rename', () => {
      // Arrange
      const projectLocalStateService = buildService();
      const localState = buildLocalState();

      // Act
      const renamedLocalState = projectLocalStateService.deriveRenamedLocalState({
        localState,
        currentPath: 'resources/requests/inventory-sync.json',
        renamedPath: 'resources/requests/renamed-inventory-sync.json',
      });

      // Assert
      assert.deepEqual(renamedLocalState.resources[0], {
        ...localState.resources[0],
        path: 'resources/requests/renamed-inventory-sync.json',
      });
      assert.deepEqual(renamedLocalState.projectIdentity, localState.projectIdentity);
      assert.deepEqual(renamedLocalState.baseline, localState.baseline);
    });

    it('should reject a rename for a missing resource binding', () => {
      // Arrange
      const projectLocalStateService = buildService();

      // Act and Assert
      assert.throws(() => projectLocalStateService.deriveRenamedLocalState({
        localState: buildLocalState(),
        currentPath: 'resources/requests/missing.json',
        renamedPath: 'resources/requests/renamed.json',
      }), { code: 'PROJECT_LOCAL_STATE_BINDING_NOT_FOUND' });
    });
  });
});

function buildService({ gitOutputs = [], gitInvocations = [] } = {}) {
  return new ProjectLocalStateService({
    gitExecution: async invocation => {
      gitInvocations.push(invocation);
      return gitOutputs.shift();
    },
  });
}

function buildLocalState(overrides = {}) {
  return {
    localStateVersion: 1,
    projectIdentity: buildProjectIdentity('project_workflow_fixture'),
    baseline: {
      liveRevision: 42,
      snapshotDigest: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    },
    resources: [{
      path: 'resources/requests/inventory-sync.json',
      resourceType: 'request',
      resourceId: 'request_inventory_sync',
      handle: 'inventory-sync',
      resourceVersion: 'rv1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    }],
    ...overrides,
  };
}

function buildProjectIdentity(projectId) {
  return {
    normalizedShopDomain: 'fixture.myshopify.com',
    projectId,
    templateOwner: 'APIEase',
    templateRef: 'main',
    templateRepository: 'apiease-template',
  };
}

async function createStateFixture() {
  const temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-local-state-'));
  const repositoryTopLevelPath = path.join(temporaryDirectoryPath, 'project');
  const localStateRelativePath = '.git-data/apiease/project-state-v1.json';
  const localStateFilePath = path.join(repositoryTopLevelPath, localStateRelativePath);
  await fs.mkdir(repositoryTopLevelPath, { recursive: true });

  return { repositoryTopLevelPath, localStateRelativePath, localStateFilePath };
}

async function writeStateFixture(fixture, localState) {
  await fs.mkdir(path.dirname(fixture.localStateFilePath), { recursive: true });
  await fs.writeFile(fixture.localStateFilePath, `${JSON.stringify(localState)}\n`);
}

async function readWorkflowFixture() {
  const fixtureUrl = new URL(
    '../../../contracts/apex-projects/v1/fixtures/project-workflow-success.json',
    import.meta.url,
  );
  return JSON.parse(await fs.readFile(fixtureUrl, 'utf8'));
}

function buildResourcePath(resourceType, handle) {
  return `resources/${resourceType === 'request' ? 'requests' : `${resourceType}s`}/${handle}.json`;
}
