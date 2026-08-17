import fs from 'node:fs/promises';
import path from 'node:path';
import { PersonalProjectAuthenticationAdapter } from '../auth/PersonalProjectAuthenticationAdapter.js';
import { ApiEaseProjectApiClient } from '../client/ApiEaseProjectApiClient.js';
import { ProjectGitCheckoutService } from '../project/ProjectGitCheckoutService.js';
import { ProjectMetadataFileService } from '../project/ProjectMetadataFileService.js';
import { ProjectSynchronizationService } from '../project/ProjectSynchronizationService.js';
import { TemplateProjectManifestBuilder } from '../template/TemplateProjectManifestBuilder.js';
import { TemplateProjectOwnershipPolicy } from '../template/TemplateProjectOwnershipPolicy.js';
import { TemplateProjectSourceMaterializer } from '../template/TemplateProjectSourceMaterializer.js';
import { TemplateProjectSourceResolver } from '../template/TemplateProjectSourceResolver.js';
import { TemplateProjectVersionResolver } from '../template/TemplateProjectVersionResolver.js';
import { ProjectCommandResultService } from './ProjectCommandResultService.js';

const EXCLUDED_DIRECTORY_NAMES = new Set(['.git', '.idea', '.codex', 'node_modules']);
const USAGE_TEXT = 'Usage: apiease init [project-name]';
const FROM_EXISTING_RESOURCES_FLAG = '--from-existing-resources';
const JSON_FLAG = '--json';
const PROJECT_CONFIGURATION_OPTION_FIELDS = Object.freeze({
  '--api-key': 'apiKey',
  '--base-url': 'apiBaseUrl',
  '--shop-domain': 'shopDomain',
});
const PROJECT_BOOTSTRAP_REQUEST = Object.freeze({ contractVersion: 1, wakeProjection: true });

class InitProjectCommand {
  constructor({
    cliVersion,
    projectMetadataFileService = new ProjectMetadataFileService(),
    templateProjectManifestBuilder = new TemplateProjectManifestBuilder(),
    templateProjectOwnershipPolicy = new TemplateProjectOwnershipPolicy(),
    templateProjectSourceMaterializer = new TemplateProjectSourceMaterializer(),
    templateProjectSourceResolver = new TemplateProjectSourceResolver(),
    templateProjectVersionResolver = new TemplateProjectVersionResolver(),
    personalProjectAuthenticationAdapter = new PersonalProjectAuthenticationAdapter(),
    projectGitCheckoutService = new ProjectGitCheckoutService(),
    projectSynchronizationService,
    stdout = process.stdout,
    stderr = process.stderr,
    projectCommandResultService = new ProjectCommandResultService({ stdout, stderr }),
  } = {}) {
    this.cliVersion = cliVersion;
    this.projectMetadataFileService = projectMetadataFileService;
    this.templateProjectManifestBuilder = templateProjectManifestBuilder;
    this.templateProjectOwnershipPolicy = templateProjectOwnershipPolicy;
    this.templateProjectSourceMaterializer = templateProjectSourceMaterializer;
    this.templateProjectSourceResolver = templateProjectSourceResolver;
    this.templateProjectVersionResolver = templateProjectVersionResolver;
    this.personalProjectAuthenticationAdapter = personalProjectAuthenticationAdapter;
    this.projectGitCheckoutService = projectGitCheckoutService;
    this.projectSynchronizationService = projectSynchronizationService;
    this.projectCommandResultService = projectCommandResultService;
    this.stdout = stdout;
    this.stderr = stderr;
  }

  async run(commandArguments = [], { currentWorkingDirectoryPath = process.cwd() } = {}) {
    const parseResult = this.parseCommandArguments(commandArguments);
    if (!parseResult.ok) {
      if (parseResult.fromExistingResources) {
        return this.renderExistingResourcesResult(this.buildUsageFailure(), parseResult.json);
      }
      this.stderr.write(`${parseResult.message}\n${USAGE_TEXT}\n`);
      return 1;
    }
    if (parseResult.fromExistingResources) {
      return await this.runExistingResourcesInitialization({
        currentWorkingDirectoryPath,
        parseResult,
      });
    }

    const templateSource = this.templateProjectSourceResolver.resolveTemplateSource();
    const materializedTemplate = await this.templateProjectSourceMaterializer.materializeTemplateSource(templateSource);
    const destinationDirectoryPath = path.resolve(currentWorkingDirectoryPath, parseResult.projectName);
    const destinationAlreadyExists = (await this.readPathStats(destinationDirectoryPath)) !== null;
    const destinationValidationResult = await this.validateDestinationDirectoryPath(destinationDirectoryPath);

    if (!destinationValidationResult.ok) {
      this.stderr.write(`${destinationValidationResult.message}\n`);
      await materializedTemplate.cleanup();
      return 1;
    }

    try {
      const copyPlan = await this.buildTemplateCopyPlan(
        materializedTemplate.templateDirectoryPath,
        destinationDirectoryPath,
      );

      await fs.mkdir(destinationDirectoryPath, { recursive: true });

      this.stdout.write(this.buildStartOutput({
        destinationAlreadyExists,
        displayTemplateSource: templateSource.displayTemplateSource,
        projectName: parseResult.projectName,
      }));

      await this.copyTemplateEntries(materializedTemplate.templateDirectoryPath, destinationDirectoryPath);

      const templateVersion = materializedTemplate.templateVersion
        ?? await this.templateProjectVersionResolver.resolveTemplateVersion(materializedTemplate.templateDirectoryPath);
      const templateManifest = await this.templateProjectManifestBuilder.buildTemplateManifest(
        materializedTemplate.templateDirectoryPath,
      );
      await this.projectMetadataFileService.writeProjectMetadata({
        projectDirectoryPath: destinationDirectoryPath,
        projectMetadata: this.buildProjectMetadata({
          destinationDirectoryPath,
          skippedPaths: copyPlan.skippedPaths,
          templateManifest,
          templateSource,
          templateVersion,
        }),
      });

      const hasExistingGitDirectory = await this.hasGitDirectory(destinationDirectoryPath);
      this.stdout.write(
        this.buildSuccessOutput({
          destinationAlreadyExists,
          hasExistingGitDirectory,
          projectName: parseResult.projectName,
          skippedPaths: copyPlan.skippedPaths,
        }),
      );
      return 0;
    } finally {
      await materializedTemplate.cleanup();
    }
  }

  parseCommandArguments(commandArguments) {
    if (commandArguments.includes(FROM_EXISTING_RESOURCES_FLAG)) {
      return this.parseExistingResourcesArguments(commandArguments);
    }

    if (commandArguments[0] !== 'init') {
      return {
        ok: false,
        message: 'Unsupported init command arguments.',
      };
    }

    if (commandArguments.length > 2) {
      return {
        ok: false,
        message: 'Only one optional project name argument is supported.',
      };
    }

    return {
      ok: true,
      projectName: commandArguments[1] ?? '.',
    };
  }

  parseExistingResourcesArguments(commandArguments) {
    const parseResult = this.buildExistingResourcesParseResult(commandArguments);
    if (commandArguments[0] !== 'init') return this.buildExistingResourcesParseFailure(commandArguments);

    for (let argumentIndex = 1; argumentIndex < commandArguments.length; argumentIndex += 1) {
      const argument = commandArguments[argumentIndex];
      const nextArgumentIndex = this.parseExistingResourcesArgument({
        argument,
        argumentIndex,
        commandArguments,
        parseResult,
      });
      if (nextArgumentIndex === null) return this.buildExistingResourcesParseFailure(commandArguments);
      argumentIndex = nextArgumentIndex;
    }

    return parseResult;
  }

  buildExistingResourcesParseResult(commandArguments) {
    return {
      ok: true,
      fromExistingResources: true,
      projectName: '.',
      json: commandArguments.includes(JSON_FLAG),
      seenArguments: new Set(),
    };
  }

  parseExistingResourcesArgument(argumentContext) {
    if ([FROM_EXISTING_RESOURCES_FLAG, JSON_FLAG].includes(argumentContext.argument)) {
      return this.parseBooleanExistingResourcesOption(argumentContext);
    }
    if (Object.hasOwn(PROJECT_CONFIGURATION_OPTION_FIELDS, argumentContext.argument)) {
      return this.parseValueExistingResourcesOption(argumentContext);
    }
    return this.parseExistingResourcesProjectName(argumentContext);
  }

  parseBooleanExistingResourcesOption({ argument, argumentIndex, parseResult }) {
    if (parseResult.seenArguments.has(argument)) return null;
    parseResult.seenArguments.add(argument);
    return argumentIndex;
  }

  parseValueExistingResourcesOption({ argument, argumentIndex, commandArguments, parseResult }) {
    const optionValue = commandArguments[argumentIndex + 1];
    if (parseResult.seenArguments.has(argument) || !optionValue || optionValue.startsWith('--')) return null;
    parseResult.seenArguments.add(argument);
    parseResult[PROJECT_CONFIGURATION_OPTION_FIELDS[argument]] = optionValue;
    return argumentIndex + 1;
  }

  parseExistingResourcesProjectName({ argument, argumentIndex, parseResult }) {
    if (argument.startsWith('--') || parseResult.seenArguments.has('projectName')) return null;
    parseResult.seenArguments.add('projectName');
    parseResult.projectName = argument;
    return argumentIndex;
  }

  buildExistingResourcesParseFailure(commandArguments) {
    return {
      ok: false,
      fromExistingResources: true,
      json: commandArguments.includes(JSON_FLAG),
    };
  }

  async runExistingResourcesInitialization({ currentWorkingDirectoryPath, parseResult }) {
    try {
      const requestConfiguration = await this.resolveExistingResourcesConfiguration(parseResult);
      if (!requestConfiguration.ok) {
        return this.renderExistingResourcesResult(
          this.buildConfigurationFailure(requestConfiguration),
          parseResult.json,
        );
      }

      return await this.cloneAndSynchronizeExistingResources({
        currentWorkingDirectoryPath,
        parseResult,
        requestConfiguration,
      });
    } catch (error) {
      return this.renderExistingResourcesResult(
        this.buildExistingResourcesErrorFailure(error),
        parseResult.json,
      );
    }
  }

  async resolveExistingResourcesConfiguration(parseResult) {
    return await this.personalProjectAuthenticationAdapter.resolveRequestConfiguration({
      explicitApiBaseUrl: parseResult.apiBaseUrl,
      explicitApiKey: parseResult.apiKey,
      explicitShopDomain: parseResult.shopDomain,
    });
  }

  async cloneAndSynchronizeExistingResources(existingResourcesRequest) {
    const checkout = await this.cloneExistingResourcesCheckout(existingResourcesRequest);
    const synchronization = await this.synchronizeExistingResources({
      checkout,
      requestConfiguration: existingResourcesRequest.requestConfiguration,
    });
    const commandResult = this.buildSynchronizationCommandResult({ checkout, synchronization });
    return this.renderExistingResourcesResult(commandResult, existingResourcesRequest.parseResult.json);
  }

  async cloneExistingResourcesCheckout({ currentWorkingDirectoryPath, parseResult }) {
    return await this.projectGitCheckoutService.clonePublicTemplate({
      destinationDirectoryPath: path.resolve(currentWorkingDirectoryPath, parseResult.projectName),
    });
  }

  async synchronizeExistingResources({ checkout, requestConfiguration }) {
    const projectSynchronizationService = this.resolveProjectSynchronizationService();
    return await projectSynchronizationService.initializeProject({
      projectDirectoryPath: checkout.repositoryTopLevelPath,
      projectApiInvocation: {
        apiBaseUrl: requestConfiguration.apiBaseUrl,
        authenticationContext: requestConfiguration.authenticationContext,
        request: PROJECT_BOOTSTRAP_REQUEST,
      },
    });
  }

  resolveProjectSynchronizationService() {
    this.projectSynchronizationService ??= new ProjectSynchronizationService({
      apiEaseProjectApiClient: new ApiEaseProjectApiClient({
        projectAuthenticationAdapter: this.personalProjectAuthenticationAdapter,
      }),
    });
    return this.projectSynchronizationService;
  }

  buildSynchronizationCommandResult({ checkout, synchronization }) {
    if (!synchronization.bootstrapResponse.ok) {
      return this.buildBootstrapFailure(synchronization.bootstrapResponse);
    }

    return {
      command: 'init',
      state: 'success',
      outcome: synchronization.bootstrapResponse.outcome,
      result: {
        projectDirectoryPath: checkout.repositoryTopLevelPath,
        publishedPaths: synchronization.publication.publishedPaths,
        removedPaths: synchronization.publication.removedPaths,
        warnings: synchronization.warnings,
      },
    };
  }

  buildUsageFailure() {
    return {
      command: 'init',
      state: 'failure',
      error: { code: 'PROJECT_INIT_USAGE_INVALID', category: 'usage' },
      diagnostics: [{ code: 'PROJECT_INIT_ARGUMENT_INVALID' }],
    };
  }

  buildConfigurationFailure(configurationFailure) {
    return {
      command: 'init',
      state: 'failure',
      error: { code: configurationFailure.errorCode, category: 'configuration' },
      diagnostics: this.buildConfigurationDiagnostics(configurationFailure.fieldErrors),
    };
  }

  buildConfigurationDiagnostics(fieldErrors = []) {
    return fieldErrors.map(({ code, path: fieldPath }) => ({ code, path: fieldPath }));
  }

  buildBootstrapFailure(bootstrapResponse) {
    return {
      command: 'init',
      state: 'failure',
      outcome: bootstrapResponse.outcome,
      error: {
        code: bootstrapResponse.error.code,
        category: this.resolveBootstrapFailureCategory(bootstrapResponse.status),
      },
      diagnostics: bootstrapResponse.error.diagnostics,
    };
  }

  resolveBootstrapFailureCategory(status) {
    if (status === 401) return 'authentication';
    if (status === 403 || status === 404) return 'authorization';
    if ([400, 413, 415].includes(status)) return 'contract';
    if (status === 422) return 'validation';
    if (status === 409) return 'conflict';
    if ([429, 503].includes(status)) return 'service';
    return 'internal';
  }

  buildExistingResourcesErrorFailure(error) {
    const errorCode = typeof error?.code === 'string' ? error.code : 'PROJECT_INIT_FAILED';
    return {
      command: 'init',
      state: 'failure',
      error: { code: errorCode, category: this.resolveExistingResourcesErrorCategory(error) },
      diagnostics: error?.diagnostics ?? [{ code: errorCode }],
    };
  }

  resolveExistingResourcesErrorCategory(error) {
    if (error?.code?.startsWith('PROJECT_BOOTSTRAP_ARTIFACT_')) return 'contract';
    if (error?.failureType === 'local-integrity') return 'local-integrity';
    if (/^PROJECT_(?:CLONE|PUBLIC_TEMPLATE|CHECKOUT|GIT|LOCAL|MANAGED|PUBLICATION)/.test(error?.code ?? '')) {
      return 'local-integrity';
    }
    return 'internal';
  }

  renderExistingResourcesResult(commandResult, json) {
    const envelope = this.projectCommandResultService.normalizeResult(commandResult);
    this.projectCommandResultService.renderResult(envelope, { json });
    return this.projectCommandResultService.resolveExitCode(envelope);
  }

  async validateDestinationDirectoryPath(destinationDirectoryPath) {
    const destinationPathStats = await this.readPathStats(destinationDirectoryPath);
    if (!destinationPathStats) {
      return {
        ok: true,
      };
    }

    if (destinationPathStats.isDirectory()) {
      return {
        ok: true,
      };
    }

    return {
      ok: false,
      message: `Destination path already exists and is not a directory: ${destinationDirectoryPath}`,
    };
  }

  async buildTemplateCopyPlan(
    templateDirectoryPath,
    destinationDirectoryPath,
    skippedPaths = [],
    rootTemplateDirectoryPath = templateDirectoryPath,
  ) {
    const templateEntries = await fs.readdir(templateDirectoryPath, { withFileTypes: true });

    for (const templateEntry of templateEntries) {
      if (EXCLUDED_DIRECTORY_NAMES.has(templateEntry.name)) {
        continue;
      }

      const templateEntryPath = path.join(templateDirectoryPath, templateEntry.name);
      const destinationEntryPath = path.join(destinationDirectoryPath, templateEntry.name);
      const destinationEntryStats = await this.readPathStats(destinationEntryPath);
      const templateRelativePath = this.buildTemplateRelativePath({
        rootTemplateDirectoryPath,
        templateEntryPath,
      });

      if (!destinationEntryStats) {
        continue;
      }

      if (templateEntry.isDirectory() && destinationEntryStats.isDirectory()) {
        await this.buildTemplateCopyPlan(
          templateEntryPath,
          destinationEntryPath,
          skippedPaths,
          rootTemplateDirectoryPath,
        );
        continue;
      }

      if (
        templateEntry.isFile()
        && destinationEntryStats.isFile()
        && this.templateProjectOwnershipPolicy.shouldAlwaysRefreshPath(templateRelativePath)
      ) {
        continue;
      }

      if (
        templateEntry.isFile() &&
        destinationEntryStats.isFile() &&
        (await this.areFilesIdentical(templateEntryPath, destinationEntryPath))
      ) {
        continue;
      }

      skippedPaths.push(destinationEntryPath);
    }

    return {
      ok: true,
      skippedPaths,
    };
  }

  async copyTemplateEntries(
    templateDirectoryPath,
    destinationDirectoryPath,
    rootTemplateDirectoryPath = templateDirectoryPath,
  ) {
    const templateEntries = await fs.readdir(templateDirectoryPath, { withFileTypes: true });

    for (const templateEntry of templateEntries) {
      if (EXCLUDED_DIRECTORY_NAMES.has(templateEntry.name)) {
        continue;
      }

      const templateEntryPath = path.join(templateDirectoryPath, templateEntry.name);
      const destinationEntryPath = path.join(destinationDirectoryPath, templateEntry.name);
      const destinationEntryStats = await this.readPathStats(destinationEntryPath);
      const templateRelativePath = this.buildTemplateRelativePath({
        rootTemplateDirectoryPath,
        templateEntryPath,
      });

      if (!destinationEntryStats) {
        await fs.cp(templateEntryPath, destinationEntryPath, { recursive: true });
        continue;
      }

      if (
        templateEntry.isFile()
        && destinationEntryStats.isFile()
        && this.templateProjectOwnershipPolicy.shouldAlwaysRefreshPath(templateRelativePath)
      ) {
        await fs.copyFile(templateEntryPath, destinationEntryPath);
        continue;
      }

      if (templateEntry.isDirectory() && destinationEntryStats.isDirectory()) {
        await this.copyTemplateEntries(
          templateEntryPath,
          destinationEntryPath,
          rootTemplateDirectoryPath,
        );
      }
    }
  }

  async readPathStats(targetPath) {
    try {
      return await fs.lstat(targetPath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  async hasGitDirectory(destinationDirectoryPath) {
    const gitDirectoryStats = await this.readPathStats(path.join(destinationDirectoryPath, '.git'));
    return gitDirectoryStats?.isDirectory() === true;
  }

  async areFilesIdentical(templateEntryPath, destinationEntryPath) {
    const [templateContent, destinationContent] = await Promise.all([
      fs.readFile(templateEntryPath),
      fs.readFile(destinationEntryPath),
    ]);

    return templateContent.equals(destinationContent);
  }

  shouldCopyPath(sourcePath) {
    return !this.buildPathSegments(sourcePath).some((pathSegment) => EXCLUDED_DIRECTORY_NAMES.has(pathSegment));
  }

  buildPathSegments(sourcePath) {
    return path.normalize(sourcePath).split(path.sep).filter(Boolean);
  }

  buildTemplateRelativePath({ rootTemplateDirectoryPath, templateEntryPath }) {
    return path.relative(rootTemplateDirectoryPath, templateEntryPath).split(path.sep).join('/');
  }

  buildStartOutput({ destinationAlreadyExists, displayTemplateSource, projectName }) {
    return [
      `${destinationAlreadyExists ? 'Initializing' : 'Creating'} APIEase project: ${projectName}`,
      `Using template: ${displayTemplateSource}`,
      '',
    ].join('\n');
  }

  buildSuccessOutput({ destinationAlreadyExists, hasExistingGitDirectory, projectName, skippedPaths = [] }) {
    const nextStepLines = [];

    if (projectName !== '.') {
      nextStepLines.push(`cd ${projectName}`);
    }

    if (!hasExistingGitDirectory) {
      nextStepLines.push('git init');
    }

    const outputLines = [
      destinationAlreadyExists ? 'Project initialized successfully.' : 'Project created successfully.',
      '',
    ];

    if (skippedPaths.length > 0) {
      outputLines.push('Skipped existing conflicting paths:');
      outputLines.push(...skippedPaths.map((skippedPath) => path.basename(skippedPath)));
      outputLines.push('');
    }

    if (nextStepLines.length > 0) {
      outputLines.push('Next steps:');
      outputLines.push(...nextStepLines);
      outputLines.push('');
    }

    return outputLines.join('\n');
  }

  buildProjectMetadata({
    destinationDirectoryPath,
    skippedPaths,
    templateManifest,
    templateSource,
    templateVersion,
  }) {
    return {
      cliVersion: this.cliVersion,
      template: {
        displayTemplateSource: templateSource.displayTemplateSource,
        manifest: this.buildStoredTemplateManifest({
          destinationDirectoryPath,
          skippedPaths,
          templateManifest,
        }),
        publicRepositoryUrl: templateSource.publicRepositoryUrl,
        sourceType: templateSource.sourceType,
        version: templateVersion,
      },
    };
  }

  buildStoredTemplateManifest({ destinationDirectoryPath, skippedPaths, templateManifest }) {
    const skippedRelativePaths = new Set(
      skippedPaths.map((skippedPath) => path.relative(destinationDirectoryPath, skippedPath).split(path.sep).join('/')),
    );
    const storedTemplateManifest = {};

    for (const [templatePath, templateHash] of Object.entries(templateManifest)) {
      if (skippedRelativePaths.has(templatePath)) {
        continue;
      }

      storedTemplateManifest[templatePath] = templateHash;
    }

    return storedTemplateManifest;
  }
}

export { InitProjectCommand };
