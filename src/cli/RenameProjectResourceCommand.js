import { RESOURCE_SOURCE_DIRECTORIES } from '../project/ProjectCanonicalArtifactService.js';
import {
  ProjectRenameService,
  RESOURCE_HANDLE_PATTERN,
} from '../project/ProjectRenameService.js';
import { ProjectCommandResultService } from './ProjectCommandResultService.js';

const JSON_FLAG = '--json';
const PROJECT_RENAME_APPLY_GUIDANCE = 'The rename is local only. Run apiease apply to modify live APIEase resources.';

class RenameProjectResourceCommand {
  constructor({
    projectRenameService = new ProjectRenameService(),
    stdout = process.stdout,
    stderr = process.stderr,
    projectCommandResultService = new ProjectCommandResultService({ stdout, stderr }),
  } = {}) {
    this.projectRenameService = projectRenameService;
    this.projectCommandResultService = projectCommandResultService;
  }

  async run(commandArguments = [], { currentWorkingDirectoryPath = process.cwd() } = {}) {
    const parseResult = this.parseCommandArguments(commandArguments);
    if (!parseResult.ok) return this.renderResult(this.buildUsageFailure(), parseResult.json, []);

    try {
      const renameResult = await this.renameProjectResource(parseResult, currentWorkingDirectoryPath);
      return this.renderResult(this.buildSuccessResult(parseResult, renameResult), parseResult.json);
    } catch (error) {
      return this.renderResult(this.buildCommandErrorFailure(error), parseResult.json, []);
    }
  }

  parseCommandArguments(commandArguments) {
    const jsonArgumentCount = commandArguments.filter(argument => argument === JSON_FLAG).length;
    const positionalArguments = commandArguments.filter(argument => argument !== JSON_FLAG);
    const [command, resourceType, currentHandle, renamedHandle] = positionalArguments;
    const valid = command === 'rename'
      && positionalArguments.length === 4
      && jsonArgumentCount <= 1
      && this.isValidResourceType(resourceType)
      && this.areValidHandles(currentHandle, renamedHandle);

    return { ok: valid, json: jsonArgumentCount > 0, resourceType, currentHandle, renamedHandle };
  }

  isValidResourceType(resourceType) {
    return typeof resourceType === 'string'
      && Object.hasOwn(RESOURCE_SOURCE_DIRECTORIES, resourceType);
  }

  areValidHandles(currentHandle, renamedHandle) {
    return [currentHandle, renamedHandle]
      .every(handle => typeof handle === 'string' && RESOURCE_HANDLE_PATTERN.test(handle));
  }

  async renameProjectResource(parseResult, projectDirectoryPath) {
    return await this.projectRenameService.renameResource({
      projectDirectoryPath,
      resourceType: parseResult.resourceType,
      currentHandle: parseResult.currentHandle,
      renamedHandle: parseResult.renamedHandle,
    });
  }

  buildSuccessResult(parseResult, renameResult) {
    return {
      command: 'rename',
      state: 'success',
      result: {
        resourceType: parseResult.resourceType,
        currentHandle: parseResult.currentHandle,
        renamedHandle: parseResult.renamedHandle,
        currentPath: renameResult.currentPath,
        renamedPath: renameResult.renamedPath,
      },
    };
  }

  buildUsageFailure() {
    return {
      command: 'rename',
      state: 'failure',
      error: { code: 'PROJECT_RENAME_USAGE_INVALID', category: 'usage' },
      diagnostics: [{ code: 'PROJECT_RENAME_ARGUMENT_INVALID' }],
    };
  }

  buildCommandErrorFailure(error) {
    const errorCode = typeof error?.code === 'string' ? error.code : 'PROJECT_RENAME_FAILED';
    return {
      command: 'rename',
      state: 'failure',
      error: { code: errorCode, category: this.resolveCommandErrorCategory(error) },
      diagnostics: error?.diagnostics ?? [{ code: errorCode }],
    };
  }

  resolveCommandErrorCategory(error) {
    if (error?.failureType === 'contract') return 'contract';
    if (error?.failureType === 'local-integrity') return 'local-integrity';
    if (/^(?:PROJECT_RENAME|CANONICAL_RESOURCE_SOURCE|PROJECT_(?:LOCAL|GIT|MANAGED))/.test(error?.code ?? '')) {
      return 'local-integrity';
    }
    return 'internal';
  }

  renderResult(commandResult, json, guidance = [PROJECT_RENAME_APPLY_GUIDANCE]) {
    const envelope = this.projectCommandResultService.normalizeResult(commandResult);
    this.projectCommandResultService.renderResult(envelope, { json, guidance });
    return this.projectCommandResultService.resolveExitCode(envelope);
  }
}

export {
  PROJECT_RENAME_APPLY_GUIDANCE,
  RenameProjectResourceCommand,
};
