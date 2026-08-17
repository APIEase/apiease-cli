import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { PUBLIC_TEMPLATE_IDENTITY } from './ProjectBootstrapArtifactService.js';
import { ProjectLocalStateService } from './ProjectLocalStateService.js';

const executeFile = promisify(execFile);
const PROJECT_METADATA_PATH = '.apiease/project.json';
const PUBLIC_TEMPLATE_URL = 'https://github.com/APIEase/apiease-template.git';
const PROJECT_PUBLIC_TEMPLATE_CLONE_ARGUMENTS = Object.freeze([
  'clone',
  '--branch',
  PUBLIC_TEMPLATE_IDENTITY.ref,
  '--single-branch',
  PUBLIC_TEMPLATE_URL,
]);
const PROJECT_METADATA_FIELDS = new Set([
  'formatVersion',
  'managedPathContractVersion',
  'projectId',
  'normalizedShopDomain',
  'template',
]);
const PROJECT_METADATA_TEMPLATE_FIELDS = new Set([
  'owner',
  'ref',
  'repository',
  'sourceIdentity',
]);
const IDENTITY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,1023}$/u;
const GIT_COMMIT_PATTERN = /^[a-f0-9]{40,64}$/u;
const SHOP_DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/u;

class ProjectGitCheckoutService {
  constructor({
    gitExecution = defaultGitExecution,
    projectLocalStateService = new ProjectLocalStateService(),
  } = {}) {
    this.gitExecution = gitExecution;
    this.projectLocalStateService = projectLocalStateService;
  }

  async clonePublicTemplate({ destinationDirectoryPath }) {
    const resolvedDestinationPath = path.resolve(destinationDirectoryPath);
    await this.requireCloneDestination(resolvedDestinationPath);
    const parentDirectoryPath = path.dirname(resolvedDestinationPath);
    await fs.mkdir(parentDirectoryPath, { recursive: true });

    try {
      await this.gitExecution({
        arguments: [...PROJECT_PUBLIC_TEMPLATE_CLONE_ARGUMENTS, resolvedDestinationPath],
        workingDirectoryPath: parentDirectoryPath,
      });
    } catch {
      throw buildCheckoutError('PROJECT_PUBLIC_TEMPLATE_CLONE_FAILED');
    }

    return { repositoryTopLevelPath: resolvedDestinationPath };
  }

  async validateProjectCheckout(projectDirectoryPath) {
    const repositoryTopLevelPath = await this.resolveRepositoryTopLevelPath(projectDirectoryPath);
    const metadata = await this.readProjectMetadata(repositoryTopLevelPath);
    const localStateRead = await this.readLocalState(repositoryTopLevelPath);
    this.requireReadableLocalState(localStateRead);
    this.requireMatchingCheckout(metadata, localStateRead, repositoryTopLevelPath);

    return { repositoryTopLevelPath, localState: localStateRead.localState };
  }

  async readLocalState(repositoryTopLevelPath) {
    try {
      return await this.projectLocalStateService.readLocalState(repositoryTopLevelPath);
    } catch (error) {
      if (error?.failureType === 'local-integrity') throw error;
      throw buildCheckoutError('PROJECT_CHECKOUT_STATE_INVALID');
    }
  }

  async requireCloneDestination(destinationDirectoryPath) {
    const destinationStatus = await readOptionalStatus(destinationDirectoryPath);
    if (!destinationStatus) return;
    if (!destinationStatus.isDirectory() || destinationStatus.isSymbolicLink()) {
      throw buildCheckoutError('PROJECT_CLONE_DESTINATION_INVALID');
    }
    if ((await fs.readdir(destinationDirectoryPath)).length !== 0) {
      throw buildCheckoutError('PROJECT_CLONE_DESTINATION_NOT_EMPTY');
    }
  }

  async resolveRepositoryTopLevelPath(projectDirectoryPath) {
    try {
      const gitOutput = await this.gitExecution({
        arguments: ['rev-parse', '--show-toplevel'],
        workingDirectoryPath: projectDirectoryPath,
      });
      const repositoryTopLevelPath = readGitOutput(gitOutput);

      return path.resolve(repositoryTopLevelPath);
    } catch (error) {
      if (error?.failureType === 'local-integrity') throw error;
      throw buildCheckoutError('PROJECT_CHECKOUT_GIT_INVALID');
    }
  }

  async readProjectMetadata(repositoryTopLevelPath) {
    try {
      const metadataFilePath = path.join(repositoryTopLevelPath, PROJECT_METADATA_PATH);
      const metadataContent = await fs.readFile(metadataFilePath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      if (!isValidProjectMetadata(metadata, metadataContent)) {
        throw buildCheckoutError('PROJECT_CHECKOUT_METADATA_INVALID');
      }

      return metadata;
    } catch (error) {
      if (error?.failureType === 'local-integrity') throw error;
      throw buildCheckoutError('PROJECT_CHECKOUT_METADATA_INVALID');
    }
  }

  requireReadableLocalState(localStateRead) {
    if (localStateRead.ok) return;
    throw buildCheckoutError(localStateRead.error.code, localStateRead.error.diagnostics);
  }

  requireMatchingCheckout(metadata, localStateRead, repositoryTopLevelPath) {
    if (path.resolve(localStateRead.repositoryTopLevelPath) !== repositoryTopLevelPath
      || metadata.projectId !== localStateRead.localState.projectId) {
      throw buildCheckoutError('PROJECT_CHECKOUT_STATE_MISMATCH');
    }
  }
}

async function defaultGitExecution({ arguments: gitArguments, workingDirectoryPath }) {
  const result = await executeFile('git', gitArguments, { cwd: workingDirectoryPath });
  return result.stdout;
}

async function readOptionalStatus(filePath) {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function readGitOutput(gitOutput) {
  const output = typeof gitOutput === 'string' ? gitOutput : gitOutput.stdout;
  const trimmedOutput = output.trim();
  if (!trimmedOutput) throw buildCheckoutError('PROJECT_CHECKOUT_GIT_INVALID');

  return trimmedOutput;
}

function isValidProjectMetadata(metadata, metadataContent) {
  return isPlainObjectWithExactFields(metadata, PROJECT_METADATA_FIELDS)
    && metadata.formatVersion === 1
    && metadata.managedPathContractVersion === 1
    && IDENTITY_PATTERN.test(metadata.projectId)
    && SHOP_DOMAIN_PATTERN.test(metadata.normalizedShopDomain)
    && isValidTemplateMetadata(metadata.template)
    && `${JSON.stringify(metadata, null, 2)}\n` === metadataContent;
}

function isValidTemplateMetadata(template) {
  return isPlainObjectWithExactFields(template, PROJECT_METADATA_TEMPLATE_FIELDS)
    && template.owner === PUBLIC_TEMPLATE_IDENTITY.owner
    && template.repository === PUBLIC_TEMPLATE_IDENTITY.repository
    && template.ref === PUBLIC_TEMPLATE_IDENTITY.ref
    && GIT_COMMIT_PATTERN.test(template.sourceIdentity);
}

function isPlainObjectWithExactFields(value, expectedFields) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const valueFields = Object.keys(value);

  return valueFields.length === expectedFields.size
    && valueFields.every(field => expectedFields.has(field));
}

function buildCheckoutError(code, diagnostics = [{ code }]) {
  const error = new Error(code);
  error.code = code;
  error.diagnostics = diagnostics;
  error.failureType = 'local-integrity';

  return error;
}

export {
  PROJECT_PUBLIC_TEMPLATE_CLONE_ARGUMENTS,
  PUBLIC_TEMPLATE_URL,
  ProjectGitCheckoutService,
};
