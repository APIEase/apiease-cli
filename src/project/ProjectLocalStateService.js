import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { ProjectContractService } from './ProjectContractService.js';

const executeFile = promisify(execFile);
const LOCAL_STATE_GIT_PATH = 'apiease/project-state-v1.json';
const COMMITTED_APPLY_OUTCOMES = new Set(['PROJECT_APPLIED', 'PROJECT_APPLY_NO_CHANGE']);

class ProjectLocalStateService {
  constructor({
    projectContractService = new ProjectContractService(),
    gitExecution = defaultGitExecution,
    temporaryNameFactory = () => crypto.randomUUID(),
  } = {}) {
    this.projectContractService = projectContractService;
    this.gitExecution = gitExecution;
    this.temporaryNameFactory = temporaryNameFactory;
  }

  async resolveLocalStateLocation(projectDirectoryPath) {
    const repositoryTopLevelPath = await this.resolveRepositoryTopLevelPath(projectDirectoryPath);
    const gitPathOutput = await this.gitExecution({
      arguments: ['rev-parse', '--git-path', LOCAL_STATE_GIT_PATH],
      workingDirectoryPath: repositoryTopLevelPath,
    });
    const returnedGitPath = this.readGitOutput(gitPathOutput);

    return {
      repositoryTopLevelPath,
      localStateFilePath: path.resolve(repositoryTopLevelPath, returnedGitPath),
    };
  }

  async readLocalState(projectDirectoryPath) {
    const location = await this.resolveLocalStateLocation(projectDirectoryPath);

    try {
      const localState = JSON.parse(await fs.readFile(location.localStateFilePath, 'utf8'));
      const validationResult = this.validateLocalState(localState);

      return validationResult.ok
        ? { ok: true, ...location, localState }
        : this.buildReadFailure('PROJECT_LOCAL_STATE_INVALID', validationResult.diagnostics);
    } catch (error) {
      return this.buildLocalStateReadError(error);
    }
  }

  async publishLocalState({ projectDirectoryPath, localState }) {
    this.requireValidLocalState(localState);
    const location = await this.resolveLocalStateLocation(projectDirectoryPath);
    await fs.mkdir(path.dirname(location.localStateFilePath), { recursive: true });
    await this.replaceLocalStateFile(location.localStateFilePath, localState);

    return location;
  }

  deriveCommittedLocalState({
    localState,
    candidate,
    applyReceipt,
    candidateSnapshotDigest,
  }) {
    this.requireValidLocalState(localState);
    this.requireCommittedApplyReceipt(applyReceipt);
    this.requireValidCandidate(candidate);
    const candidateFilePaths = new Set(candidate.files.map(file => file.path));
    const resources = applyReceipt.outcome === 'PROJECT_APPLY_NO_CHANGE'
      ? localState.resources.map(resource => ({ ...resource }))
      : applyReceipt.resources
        .filter(resource => resource.operation !== 'delete')
        .map(resource => this.buildCommittedResource(resource, candidateFilePaths))
        .sort(compareResourcesByPath);
    const committedLocalState = {
      ...localState,
      baseline: {
        liveRevision: applyReceipt.resultingLiveRevision,
        snapshotDigest: candidateSnapshotDigest,
      },
      resources,
    };

    this.requireValidLocalState(committedLocalState);
    return committedLocalState;
  }

  deriveRenamedLocalState({ localState, currentPath, renamedPath }) {
    this.requireValidLocalState(localState);
    const resourceIndex = localState.resources.findIndex(resource => resource.path === currentPath);

    if (resourceIndex === -1) {
      throw buildServiceError('PROJECT_LOCAL_STATE_BINDING_NOT_FOUND');
    }

    const resources = localState.resources.map((resource, index) => index === resourceIndex
      ? { ...resource, path: renamedPath }
      : { ...resource });
    const renamedLocalState = { ...localState, resources: resources.sort(compareResourcesByPath) };
    this.requireValidLocalState(renamedLocalState);

    return renamedLocalState;
  }

  async resolveRepositoryTopLevelPath(projectDirectoryPath) {
    const gitOutput = await this.gitExecution({
      arguments: ['rev-parse', '--show-toplevel'],
      workingDirectoryPath: projectDirectoryPath,
    });

    return path.resolve(this.readGitOutput(gitOutput));
  }

  readGitOutput(gitOutput) {
    const output = typeof gitOutput === 'string' ? gitOutput : gitOutput.stdout;
    const trimmedOutput = output.trim();

    if (!trimmedOutput) {
      throw buildServiceError('PROJECT_GIT_PATH_INVALID');
    }

    return trimmedOutput;
  }

  validateLocalState(localState) {
    const contractValidation = this.projectContractService.validateLocalState(localState);

    if (!contractValidation.ok) {
      return contractValidation;
    }

    return this.validateResourceOrderAndUniqueness(localState.resources);
  }

  validateResourceOrderAndUniqueness(resources) {
    const paths = resources.map(resource => resource.path);
    const sortedPaths = [...paths].sort(compareText);

    if (new Set(paths).size !== paths.length) {
      return { ok: false, diagnostics: [{ code: 'PROJECT_LOCAL_STATE_RESOURCE_PATH_DUPLICATE' }] };
    }

    return paths.every((resourcePath, index) => resourcePath === sortedPaths[index])
      ? { ok: true }
      : { ok: false, diagnostics: [{ code: 'PROJECT_LOCAL_STATE_RESOURCE_ORDER_INVALID' }] };
  }

  requireValidLocalState(localState) {
    const validationResult = this.validateLocalState(localState);

    if (!validationResult.ok) {
      throw buildServiceError('PROJECT_LOCAL_STATE_INVALID', validationResult.diagnostics);
    }
  }

  requireCommittedApplyReceipt(applyReceipt) {
    const validationResult = this.projectContractService.validateFixtureDocument(
      'applyReceiptResult',
      applyReceipt,
    );

    if (!validationResult.ok || !COMMITTED_APPLY_OUTCOMES.has(applyReceipt?.outcome)) {
      throw buildServiceError('PROJECT_APPLY_RECEIPT_INVALID', validationResult.diagnostics);
    }
  }

  requireValidCandidate(candidate) {
    const validationResult = this.projectContractService.validateProjectCandidate(candidate);

    if (!validationResult.ok) {
      throw buildServiceError('PROJECT_CANDIDATE_INVALID', validationResult.diagnostics);
    }
  }

  buildCommittedResource(appliedResource, candidateFilePaths) {
    const resourcePath = buildResourcePath(appliedResource.resourceType, appliedResource.handle);

    if (!candidateFilePaths.has(resourcePath)) {
      throw buildServiceError('PROJECT_APPLY_RECEIPT_RESOURCE_PATH_INVALID');
    }

    return {
      path: resourcePath,
      resourceType: appliedResource.resourceType,
      resourceId: appliedResource.resourceId,
      handle: appliedResource.handle,
      resourceVersion: appliedResource.resourceVersion,
    };
  }

  async replaceLocalStateFile(localStateFilePath, localState) {
    const temporaryFilePath = path.join(
      path.dirname(localStateFilePath),
      `.${path.basename(localStateFilePath)}.${this.temporaryNameFactory()}.tmp`,
    );
    let temporaryFileHandle;

    try {
      temporaryFileHandle = await fs.open(temporaryFilePath, 'wx');
      await temporaryFileHandle.writeFile(`${JSON.stringify(localState, null, 2)}\n`);
      await temporaryFileHandle.sync();
      await temporaryFileHandle.close();
      temporaryFileHandle = undefined;
      await fs.rename(temporaryFilePath, localStateFilePath);
    } catch (error) {
      await temporaryFileHandle?.close().catch(() => {});
      await fs.unlink(temporaryFilePath).catch(() => {});
      throw error;
    }
  }

  buildLocalStateReadError(error) {
    if (error?.code === 'ENOENT') {
      return this.buildReadFailure('PROJECT_LOCAL_STATE_NOT_FOUND');
    }

    if (error instanceof SyntaxError) {
      return this.buildReadFailure('PROJECT_LOCAL_STATE_INVALID');
    }

    throw error;
  }

  buildReadFailure(code, diagnostics = [{ code }]) {
    return { ok: false, error: { code, diagnostics } };
  }
}

async function defaultGitExecution({ arguments: gitArguments, workingDirectoryPath }) {
  const result = await executeFile('git', gitArguments, { cwd: workingDirectoryPath });
  return result.stdout;
}

function buildResourcePath(resourceType, handle) {
  const resourceDirectoryName = resourceType === 'request' ? 'requests' : `${resourceType}s`;
  return `resources/${resourceDirectoryName}/${handle}.json`;
}

function compareResourcesByPath(leftResource, rightResource) {
  return compareText(leftResource.path, rightResource.path);
}

function compareText(leftText, rightText) {
  if (leftText === rightText) return 0;

  return leftText < rightText ? -1 : 1;
}

function buildServiceError(code, diagnostics = [{ code }]) {
  const error = new Error(code);
  error.code = code;
  error.diagnostics = diagnostics;
  return error;
}

export { LOCAL_STATE_GIT_PATH, ProjectLocalStateService };
