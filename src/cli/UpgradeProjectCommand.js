import {createInterface} from 'node:readline/promises';
import { ProjectMetadataFileService } from '../project/ProjectMetadataFileService.js';
import { ProjectUpgradeApplierService } from '../project/ProjectUpgradeApplierService.js';
import { ProjectUpgradePlanService } from '../project/ProjectUpgradePlanService.js';
import { TemplateProjectManifestBuilder } from '../template/TemplateProjectManifestBuilder.js';
import { TemplateProjectOwnershipPolicy } from '../template/TemplateProjectOwnershipPolicy.js';
import { TemplateProjectSourceMaterializer } from '../template/TemplateProjectSourceMaterializer.js';
import { TemplateProjectSourceResolver } from '../template/TemplateProjectSourceResolver.js';
import { TemplateProjectVersionResolver } from '../template/TemplateProjectVersionResolver.js';

const CHECK_FLAG = '--check';
const DRY_RUN_FLAG = '--dry-run';
const TEMPLATE_MANIFEST_NOT_FOUND_ERROR_CODE = 'APIEASE_PROJECT_TEMPLATE_MANIFEST_NOT_FOUND';
const USAGE_TEXT = 'Usage: apiease upgrade [--check | --dry-run] [--on-conflict overwrite|ignore]';

class UpgradeProjectCommand {
  constructor({
    projectUpgradePlanService = new ProjectUpgradePlanService(),
    projectUpgradeApplierService = new ProjectUpgradeApplierService(),
    projectMetadataFileService = new ProjectMetadataFileService(),
    templateProjectManifestBuilder = new TemplateProjectManifestBuilder(),
    templateProjectOwnershipPolicy = new TemplateProjectOwnershipPolicy(),
    templateProjectSourceMaterializer = new TemplateProjectSourceMaterializer(),
    templateProjectSourceResolver = new TemplateProjectSourceResolver(),
    templateProjectVersionResolver = new TemplateProjectVersionResolver(),
    stdin = process.stdin,
    promptConflictChoice,
    stdout = process.stdout,
    stderr = process.stderr,
  } = {}) {
    this.projectUpgradePlanService = projectUpgradePlanService;
    this.projectUpgradeApplierService = projectUpgradeApplierService;
    this.projectMetadataFileService = projectMetadataFileService;
    this.templateProjectManifestBuilder = templateProjectManifestBuilder;
    this.templateProjectOwnershipPolicy = templateProjectOwnershipPolicy;
    this.templateProjectSourceMaterializer = templateProjectSourceMaterializer;
    this.templateProjectSourceResolver = templateProjectSourceResolver;
    this.templateProjectVersionResolver = templateProjectVersionResolver;
    this.stdin = stdin;
    this.promptConflictChoice = promptConflictChoice;
    this.stdout = stdout;
    this.stderr = stderr;
  }

  async run(commandArguments = [], { currentWorkingDirectoryPath = process.cwd() } = {}) {
    const parseResult = this.parseCommandArguments(commandArguments);
    if (!parseResult.ok) {
      this.stderr.write(`${parseResult.message}\n${USAGE_TEXT}\n`);
      return 1;
    }

    const projectMetadataResult = await this.projectMetadataFileService.readProjectMetadata(currentWorkingDirectoryPath);
    if (!projectMetadataResult.ok) {
      this.stderr.write(this.buildFailureOutput(projectMetadataResult));
      return 1;
    }

    const templateSource = this.templateProjectSourceResolver.resolveTemplateSource();
    const materializedTemplate = await this.templateProjectSourceMaterializer.materializeTemplateSource(templateSource);

    try {
      const templateVersion = materializedTemplate.templateVersion
        ?? await this.templateProjectVersionResolver.resolveTemplateVersion(materializedTemplate.templateDirectoryPath);
      const currentProjectTemplateVersion = projectMetadataResult.projectMetadata.template?.version?.value;

      let upgradePlanResult = await this.tryBuildUpgradePlan({
        currentWorkingDirectoryPath,
        projectMetadata: projectMetadataResult.projectMetadata,
        templateDirectoryPath: materializedTemplate.templateDirectoryPath,
        conflictChoice: parseResult.conflictChoice,
      });
      if (!upgradePlanResult.ok) {
        this.stderr.write(this.buildFailureOutput(upgradePlanResult));
        return 1;
      }
      if (parseResult.mode === 'apply' && !parseResult.conflictChoice
        && upgradePlanResult.upgradePlan.skipPaths.length && this.stdin.isTTY) {
        const choice = await this.askConflictChoice(upgradePlanResult.upgradePlan);
        if (choice === 'overwrite') upgradePlanResult = await this.tryBuildUpgradePlan({
          currentWorkingDirectoryPath, projectMetadata: projectMetadataResult.projectMetadata,
          templateDirectoryPath: materializedTemplate.templateDirectoryPath, conflictChoice: choice,
        });
        if (!upgradePlanResult.ok) {
          this.stderr.write(this.buildFailureOutput(upgradePlanResult));
          return 1;
        }
      }
      const {upgradePlan, currentTemplateManifest} = upgradePlanResult;
      const outputArguments = {currentProjectTemplateVersion, templateVersion, upgradePlan};
      if (parseResult.mode === 'dryRun') {
        this.stdout.write(this.buildDryRunOutput(outputArguments));
        return this.hasPlannedChanges(upgradePlan) || currentProjectTemplateVersion !== templateVersion.value ? 1 : 0;
      }
      if (parseResult.mode === 'check') {
        if (!this.hasPlannedChanges(upgradePlan) && currentProjectTemplateVersion === templateVersion.value) {
          this.stdout.write('APIEASE project template is up to date.\n');
          return 0;
        }
        this.stdout.write('APIEASE project template upgrade is available.\n');
        this.stdout.write(this.buildDryRunOutput(outputArguments));
        return 1;
      }
      const applyResult = await this.tryApplyUpgradePlan({
        currentProjectDirectoryPath: currentWorkingDirectoryPath,
        templateDirectoryPath: materializedTemplate.templateDirectoryPath, upgradePlan,
      });
      if (!applyResult.ok) {
        this.stderr.write(this.buildFailureOutput(applyResult));
        return 1;
      }
      await this.projectMetadataFileService.writeProjectMetadata({
        projectDirectoryPath: currentWorkingDirectoryPath,
        projectMetadata: this.buildUpdatedProjectMetadata({
          currentTemplateManifest, projectMetadata: projectMetadataResult.projectMetadata,
          templateSource, templateVersion: upgradePlan.skipPaths.length === 0
            ? templateVersion : projectMetadataResult.projectMetadata.template.version,
          upgradePlan,
        }),
      });
      this.stdout.write(this.buildApplyOutput(outputArguments));
      return upgradePlan.skipPaths.length === 0 ? 0 : 1;
    } finally {
      await materializedTemplate.cleanup();
    }
  }

  async tryBuildUpgradePlan({ currentWorkingDirectoryPath, projectMetadata, templateDirectoryPath, conflictChoice }) {
    try {
      return await this.buildUpgradePlan({
        currentWorkingDirectoryPath,
        projectMetadata,
        templateDirectoryPath,
        conflictChoice,
      });
    } catch (error) {
      return this.buildManagedPathFailureResult(error);
    }
  }

  async tryApplyUpgradePlan({ currentProjectDirectoryPath, templateDirectoryPath, upgradePlan }) {
    try {
      await this.projectUpgradeApplierService.applyUpgradePlan({
        currentProjectDirectoryPath,
        templateDirectoryPath,
        upgradePlan,
      });
      return { ok: true };
    } catch (error) {
      return this.buildManagedPathFailureResult(error);
    }
  }

  async buildUpgradePlan({ currentWorkingDirectoryPath, projectMetadata, templateDirectoryPath, conflictChoice }) {
    const storedTemplateManifest = projectMetadata.template?.manifest;
    if (!storedTemplateManifest) {
      return {
        ok: false,
        ...this.buildManifestNotFoundFailure(),
      };
    }

    const currentTemplateManifest = await this.templateProjectManifestBuilder.buildTemplateManifest(
      templateDirectoryPath,
    );
    const managedStoredTemplateManifest = this.templateProjectOwnershipPolicy.filterTemplateManifest(
      storedTemplateManifest,
    );

    return {
      currentTemplateManifest,
      ok: true,
      upgradePlan: await this.projectUpgradePlanService.buildUpgradePlan({
        currentProjectDirectoryPath: currentWorkingDirectoryPath,
        currentTemplateManifest,
        storedTemplateManifest: managedStoredTemplateManifest,
        templateDirectoryPath,
        conflictChoice,
      }),
    };
  }

  parseCommandArguments(commandArguments) {
    if (commandArguments[0] !== 'upgrade') {
      return {
        ok: false,
        message: 'Unsupported upgrade command arguments.',
      };
    }

    const options = commandArguments.slice(1);
    const result = {ok: true, mode: 'apply'};
    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      if ([CHECK_FLAG, DRY_RUN_FLAG].includes(option) && result.mode === 'apply') {
        result.mode = option === CHECK_FLAG ? 'check' : 'dryRun';
      } else if (option === '--on-conflict' && !result.conflictChoice
        && ['overwrite', 'ignore'].includes(options[index + 1])) {
        result.conflictChoice = options[++index];
      } else return {ok: false, message: 'Use --check or --dry-run, and --on-conflict overwrite|ignore.'};
    }
    return result;
  }

  async askConflictChoice(upgradePlan) {
    const prompt = `${upgradePlan.conflictReason ?? 'Differing or conflicting template content.'}\n${upgradePlan.skipPaths.join('\n')}\nOverwrite with template instructions, or Ignore for this upgrade? [Ignore]: `;
    if (this.promptConflictChoice) return await this.promptConflictChoice(prompt);
    const reader = createInterface({input: this.stdin, output: this.stderr});
    try { return (await reader.question(prompt)).trim().toLowerCase(); }
    finally { reader.close(); }
  }

  buildFailureOutput(projectMetadataResult) {
    return [
      'APIEASE project upgrade check failed.',
      `Error Code: ${projectMetadataResult.errorCode}`,
      `Message: ${projectMetadataResult.message}`,
      '',
    ].join('\n');
  }

  buildManifestNotFoundFailure() {
    return {
      errorCode: TEMPLATE_MANIFEST_NOT_FOUND_ERROR_CODE,
      message: 'APIEASE project metadata does not include a template manifest. Run "apiease init" again to adopt the current project state.',
    };
  }

  buildManagedPathFailureResult(error) {
    if (error?.code !== 'APIEASE_INVALID_MANAGED_PATH') {
      throw error;
    }

    return {
      ok: false,
      errorCode: error.code,
      message: error.message,
    };
  }

  buildDryRunOutput({ currentProjectTemplateVersion, templateVersion, upgradePlan }) {
    const outputLines = [
      'APIEASE project upgrade dry run.',
      `Current project template version: ${currentProjectTemplateVersion}`,
      `Latest template version: ${templateVersion.value}`,
      '',
    ];

    this.appendSection(outputLines, 'Add:', upgradePlan.addPaths);
    this.appendSection(outputLines, 'Update:', upgradePlan.updatePaths);
    this.appendSection(outputLines, 'Remove:', upgradePlan.removePaths);
    this.appendSection(outputLines, 'Skip conflict:', upgradePlan.skipPaths);
    this.appendConflictGuidance(outputLines, upgradePlan);

    return outputLines.join('\n');
  }

  buildApplyOutput({ currentProjectTemplateVersion, templateVersion, upgradePlan }) {
    const outputLines = [
      upgradePlan.skipPaths.length === 0
        ? 'APIEASE project template upgraded successfully.'
        : 'APIEASE project template upgrade applied with conflicts.',
      `Current project template version: ${currentProjectTemplateVersion}`,
      `Latest template version: ${templateVersion.value}`,
      '',
    ];

    this.appendSection(outputLines, 'Added:', upgradePlan.addPaths);
    this.appendSection(outputLines, 'Updated:', upgradePlan.updatePaths);
    this.appendSection(outputLines, 'Removed:', upgradePlan.removePaths);
    this.appendSection(outputLines, 'Skipped conflicting paths:', upgradePlan.skipPaths);
    this.appendConflictGuidance(outputLines, upgradePlan);

    return outputLines.join('\n');
  }

  buildUpdatedProjectMetadata({ currentTemplateManifest, projectMetadata, templateSource, templateVersion, upgradePlan }) {
    const {pendingPaths, ...previousTemplate} = projectMetadata.template;
    return {
      ...projectMetadata,
      template: {
        ...previousTemplate,
        ...(upgradePlan.skipPaths.length ? {pendingPaths: upgradePlan.skipPaths} : {}),
        displayTemplateSource: templateSource.displayTemplateSource,
        manifest: this.buildUpdatedTemplateManifest({
          currentTemplateManifest,
          storedTemplateManifest: projectMetadata.template.manifest,
          upgradePlan,
        }),
        publicRepositoryUrl: templateSource.publicRepositoryUrl,
        sourceType: templateSource.sourceType,
        version: templateVersion,
      },
    };
  }

  buildUpdatedTemplateManifest({ currentTemplateManifest, storedTemplateManifest, upgradePlan }) {
    const updatedTemplateManifest = {};
    const skippedPaths = new Set(upgradePlan.skipPaths);
    const managedPaths = new Set([
      ...Object.keys(currentTemplateManifest),
      ...Object.keys(storedTemplateManifest),
    ]);

    for (const managedPath of [...managedPaths].sort()) {
      if (skippedPaths.has(managedPath)) {
        if (storedTemplateManifest[managedPath]) {
          updatedTemplateManifest[managedPath] = storedTemplateManifest[managedPath];
        }

        continue;
      }

      if (currentTemplateManifest[managedPath]) {
        updatedTemplateManifest[managedPath] = currentTemplateManifest[managedPath];
      }
    }

    return updatedTemplateManifest;
  }

  appendConflictGuidance(outputLines, upgradePlan) {
    if (upgradePlan.conflictReason) outputLines.push(upgradePlan.conflictReason);
    if (upgradePlan.skipPaths.length) outputLines.push(
      'Preserved conflicts. Choose --on-conflict overwrite to replace them, or --on-conflict ignore to preserve them for this upgrade.', '',
    );
  }

  appendSection(outputLines, heading, paths) {
    if (paths.length === 0) {
      return;
    }

    outputLines.push(heading);
    outputLines.push(...paths);
    outputLines.push('');
  }

  hasPlannedChanges(upgradePlan) {
    return [
      ...upgradePlan.addPaths,
      ...upgradePlan.removePaths,
      ...upgradePlan.skipPaths,
      ...upgradePlan.updatePaths,
    ].length > 0;
  }
}

export { UpgradeProjectCommand };
