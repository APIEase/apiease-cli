import { ProjectChangeSetBuilder } from './ProjectChangeSetBuilder.js';
import { ProjectCanonicalArtifactService } from './ProjectCanonicalArtifactService.js';
import { ProjectDesignReferenceCacheService } from './ProjectDesignReferenceCacheService.js';

const PROJECT_DESIGN_WORKFLOW_GUIDANCE = Object.freeze([
  'Follow the exact common Project Design Protocol instructions and Codex envelope.',
  'Treat canonical files as encodings of Canonical Resource Source objects.',
  'Represent removals with explicit deletion intent and protected fields with placeholders.',
  'Use APIEase validation and planning before choosing immediate apply or deferred review.',
]);

class ProjectDesignContextService {
  constructor({
    apiEaseProjectApiClient,
    projectChangeSetBuilder = new ProjectChangeSetBuilder(),
    projectCanonicalArtifactService = new ProjectCanonicalArtifactService(),
    projectDesignReferenceCacheService = new ProjectDesignReferenceCacheService(),
  } = {}) {
    this.apiEaseProjectApiClient = apiEaseProjectApiClient;
    this.projectChangeSetBuilder = projectChangeSetBuilder;
    this.projectCanonicalArtifactService = projectCanonicalArtifactService;
    this.projectDesignReferenceCacheService = projectDesignReferenceCacheService;
  }

  async buildDesignContext({
    projectDirectoryPath,
    projectApiInvocation,
    projectRequirements,
    referenceMode = false,
    resourcePaths = [],
  } = {}) {
    const changeSetBuildResult = await this.projectChangeSetBuilder.buildChangeSet({
      projectDirectoryPath,
    });
    const cache = referenceMode ? await this.projectDesignReferenceCacheService.prepare({
      projectDirectoryPath: changeSetBuildResult.repositoryTopLevelPath ?? projectDirectoryPath,
      projectIdentity: this.copyProjectIdentity(changeSetBuildResult.localState.projectIdentity),
      apiBaseUrl: projectApiInvocation.apiBaseUrl,
    }) : undefined;
    const serverResponse = await this.retrieveServerContext({
      changeSetBuildResult,
      projectApiInvocation,
      projectRequirements,
      referenceOptions: cache ? {designContextContractVersion: 2,
        knownModuleDigests: cache.knownModuleDigests, resourcePaths} : undefined,
    });
    if (!serverResponse.ok) return serverResponse;
    if (referenceMode && serverResponse.designContextContractVersion !== 2) {
      throw buildServiceError('PROJECT_DESIGN_REFERENCE_VERSION_MISMATCH');
    }
    this.requireMatchingProjectIdentity(changeSetBuildResult.localState, serverResponse.result);

    const context = this.buildCombinedContext(changeSetBuildResult, serverResponse);
    return referenceMode && context.conflicts.length === 0
      ? await this.buildReferenceBriefing(cache, context) : context;
  }

  async retrieveServerContext({
    changeSetBuildResult,
    projectApiInvocation,
    projectRequirements,
    referenceOptions,
  }) {
    return await this.apiEaseProjectApiClient.retrieveProjectDesignContext({
      ...projectApiInvocation,
      request: {...this.buildServerRequest(changeSetBuildResult.localState, projectRequirements), ...referenceOptions},
    });
  }

  buildServerRequest(localState, projectRequirements) {
    return {
      contractVersion: 1,
      designContextContractVersion: 1,
      projectId: localState.projectIdentity.projectId,
      ...(projectRequirements === undefined ? {} : { projectRequirements }),
    };
  }

  buildCombinedContext(changeSetBuildResult, serverResponse) {
    const serverContext = serverResponse.result;
    return {
      ok: true,
      outcome: serverResponse.outcome,
      protocol: serverContext.protocol,
      ...(Object.hasOwn(serverContext, 'projectRequirements')
        ? { projectRequirements: serverContext.projectRequirements } : {}),
      serverBaseline: serverContext.snapshot,
      localBaseline: this.buildLocalBaseline(changeSetBuildResult.localState),
      inventory: serverContext.inventory,
      canonicalBodies: serverContext.canonicalBodies,
      bindings: serverContext.bindings.map(binding => this.copySafeBinding(binding)),
      ...(serverResponse.designContextContractVersion === 2 ? {
        dependencies: serverContext.dependencies, dependencyDiagnostics: serverContext.dependencyDiagnostics,
      } : {}),
      localEdits: this.buildLocalEdits(changeSetBuildResult, serverContext),
      deletions: changeSetBuildResult.deletionIntents.map(intent => this.copySafeDeletion(intent)),
      secureSelectors: changeSetBuildResult.changeSet.secureInputs,
      conflicts: this.buildBaselineConflicts(changeSetBuildResult.localState, serverContext),
      limits: serverContext.limits,
      diagnostics: serverContext.diagnostics,
      workflowGuidance: [...PROJECT_DESIGN_WORKFLOW_GUIDANCE],
    };
  }

  buildLocalBaseline(localState) {
    return {
      projectIdentity: this.copyProjectIdentity(localState.projectIdentity),
      liveRevision: localState.baseline.liveRevision,
      snapshotDigest: localState.baseline.snapshotDigest,
    };
  }

  buildLocalEdits(changeSetBuildResult, serverContext) {
    const serverSources = this.buildServerSourcesByIdentity(serverContext.canonicalBodies);
    return {
      snapshotDigest: changeSetBuildResult.changeSetSnapshotDigest,
      hasManagedEdits: changeSetBuildResult.changeSetSnapshotDigest
        !== changeSetBuildResult.localState.baseline.snapshotDigest,
      creates: changeSetBuildResult.changeSet.creates,
      updates: changeSetBuildResult.changeSet.updates.filter(update => (
        Object.hasOwn(serverContext, 'dependencies')
          ? this.isChangedInventoryUpdate(update, serverContext.inventory)
          : this.isChangedUpdate(update, serverSources)
      )),
    };
  }

  isChangedInventoryUpdate(update, inventory) {
    const previous = inventory.find(entry => this.buildResourceIdentity(entry) === this.buildResourceIdentity(update));
    const content = this.projectCanonicalArtifactService.serializeParsedResourceSource(update.source);
    return !previous || previous.sourceDigest !== this.projectCanonicalArtifactService.computeFileDigest(content);
  }

  async buildReferenceBriefing(cache, context) {
    const protocol = await this.projectDesignReferenceCacheService.publishProtocol({cache, protocol: context.protocol});
    const files = await this.writeContextReferences(cache, {...context, protocol});
    return {
      ok: true, outcome: context.outcome, delivery: 'references', conflicts: [],
      protocol: {protocolVersion: protocol.protocolVersion, manifestIdentity: protocol.manifestIdentity,
        moduleSetIdentity: protocol.moduleSetIdentity},
      serverBaseline: context.serverBaseline, localBaseline: context.localBaseline,
      hasManagedEdits: context.localEdits.hasManagedEdits,
      counts: {resources: context.inventory.length, creates: context.localEdits.creates.length,
        updates: context.localEdits.updates.length, deletions: context.deletions.length,
        secureSelectors: context.secureSelectors.length, dependencies: context.dependencies.length},
      cache: {downloadedBytes: protocol.downloadedBytes, reusedModules: protocol.reusedModules}, files,
      readFirst: [...protocol.modules.filter(module => module.required), protocol.envelope]
        .map(({id, path, bytes}) => ({...(id ? {id} : {}), path, bytes})),
      readingGuide: [
        'Read readFirst, then the applicable family, request-type and provider modules in files.instructionIndex. Unrelated modules need not be read.',
        'Inspect files.inventory and files.localChanges; read relevant canonical resource files and dependency sources in this checkout.',
        'Use --resource-path <resources/family/handle.json> to retrieve selected current server sources; --inline returns full JSON.',
        'References are refreshed by authenticated design-context. They are not an offline baseline, template upgrade, approval, or apply authority.',
      ], diagnostics: context.diagnostics,
    };
  }

  async writeContextReferences(cache, context) {
    const snapshotKey = this.projectCanonicalArtifactService.computeFileDigest(JSON.stringify(context)).slice(7);
    const values = {
      context: context,
      instructionIndex: context.protocol,
      inventory: {resources: context.inventory, dependencies: context.dependencies, diagnostics: context.dependencyDiagnostics},
      localChanges: {localEdits: context.localEdits, deletions: context.deletions, secureSelectors: context.secureSelectors},
      serverResources: context.canonicalBodies,
    };
    const files = {};
    for (const [key, value] of Object.entries(values)) {
      files[key] = await this.projectDesignReferenceCacheService.writeReferenceFile(cache, `${snapshotKey}-${key}.json`, `${JSON.stringify(value, null, 2)}\n`);
    }
    return files;
  }

  buildServerSourcesByIdentity(canonicalBodies) {
    return new Map(canonicalBodies.map(canonicalBody => [
      this.buildResourceIdentity(canonicalBody.source),
      canonicalBody.source,
    ]));
  }

  isChangedUpdate(update, serverSources) {
    const serverSource = serverSources.get(this.buildResourceIdentity(update));
    if (!serverSource) return true;

    return this.serializeCanonicalValue(serverSource)
      !== this.serializeCanonicalValue(update.source);
  }

  serializeCanonicalValue(value) {
    return this.projectCanonicalArtifactService.serializeCanonicalValue(value);
  }

  buildResourceIdentity(resource) {
    return `${resource.resourceType}:${resource.handle}`;
  }

  buildBaselineConflicts(localState, serverContext) {
    const conflicts = [];
    this.appendRevisionConflict(conflicts, localState.baseline, serverContext.snapshot);
    this.appendDigestConflict(conflicts, localState.baseline, serverContext.snapshot);
    return conflicts;
  }

  appendRevisionConflict(conflicts, localBaseline, serverBaseline) {
    if (localBaseline.liveRevision === serverBaseline.liveRevision) return;
    conflicts.push({
      code: 'PROJECT_DESIGN_BASELINE_REVISION_CONFLICT',
      localLiveRevision: localBaseline.liveRevision,
      serverLiveRevision: serverBaseline.liveRevision,
    });
  }

  appendDigestConflict(conflicts, localBaseline, serverBaseline) {
    if (localBaseline.snapshotDigest === serverBaseline.snapshotDigest) return;
    conflicts.push({
      code: 'PROJECT_DESIGN_BASELINE_DIGEST_CONFLICT',
      localSnapshotDigest: localBaseline.snapshotDigest,
      serverSnapshotDigest: serverBaseline.snapshotDigest,
    });
  }

  requireMatchingProjectIdentity(localState, serverContext) {
    const localIdentity = this.copyProjectIdentity(localState.projectIdentity);
    const serverIdentity = serverContext.snapshot.projectIdentity;
    if (this.identitiesMatch(localIdentity, serverIdentity)) return;

    throw buildServiceError('PROJECT_DESIGN_IDENTITY_CONFLICT');
  }

  identitiesMatch(localIdentity, serverIdentity) {
    return localIdentity.projectId === serverIdentity.projectId
      && localIdentity.normalizedShopDomain === serverIdentity.normalizedShopDomain;
  }

  copyProjectIdentity(projectIdentity) {
    return {
      normalizedShopDomain: projectIdentity.normalizedShopDomain,
      projectId: projectIdentity.projectId,
    };
  }

  copySafeBinding(binding) {
    return {
      path: binding.path,
      resourceType: binding.resourceType,
      resourceId: binding.resourceId,
      resourceVersion: binding.resourceVersion,
      handle: binding.handle,
    };
  }

  copySafeDeletion(deletionIntent) {
    return {
      sourcePath: deletionIntent.sourcePath,
      deletePath: deletionIntent.deletePath,
      resourceType: deletionIntent.resourceType,
      handle: deletionIntent.handle,
      sourceDigest: deletionIntent.sourceDigest,
    };
  }
}

function buildServiceError(code) {
  const error = new Error(code);
  error.code = code;
  error.diagnostics = [{ code }];
  error.failureType = 'contract';

  return error;
}

export { PROJECT_DESIGN_WORKFLOW_GUIDANCE, ProjectDesignContextService };
