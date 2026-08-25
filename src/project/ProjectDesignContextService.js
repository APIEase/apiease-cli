import { ProjectCandidateBuilder } from './ProjectCandidateBuilder.js';
import { ProjectCanonicalArtifactService } from './ProjectCanonicalArtifactService.js';

const PROJECT_DESIGN_WORKFLOW_GUIDANCE = Object.freeze([
  'Follow the exact common Project Design Protocol instructions and Codex envelope.',
  'Treat canonical files as encodings of Canonical Resource Source objects.',
  'Represent removals with explicit deletion intent and protected fields with placeholders.',
  'Use APIEase validation and planning before choosing immediate apply or deferred review.',
]);

class ProjectDesignContextService {
  constructor({
    apiEaseProjectApiClient,
    projectCandidateBuilder = new ProjectCandidateBuilder(),
    projectCanonicalArtifactService = new ProjectCanonicalArtifactService(),
  } = {}) {
    this.apiEaseProjectApiClient = apiEaseProjectApiClient;
    this.projectCandidateBuilder = projectCandidateBuilder;
    this.projectCanonicalArtifactService = projectCanonicalArtifactService;
  }

  async buildDesignContext({
    projectDirectoryPath,
    projectApiInvocation,
    projectRequirements,
  } = {}) {
    const candidateBuildResult = await this.projectCandidateBuilder.buildCandidate({
      projectDirectoryPath,
    });
    const serverResponse = await this.retrieveServerContext({
      candidateBuildResult,
      projectApiInvocation,
      projectRequirements,
    });
    if (!serverResponse.ok) return serverResponse;
    this.requireMatchingProjectIdentity(candidateBuildResult.localState, serverResponse.result);

    return this.buildCombinedContext(candidateBuildResult, serverResponse);
  }

  async retrieveServerContext({
    candidateBuildResult,
    projectApiInvocation,
    projectRequirements,
  }) {
    return await this.apiEaseProjectApiClient.retrieveProjectDesignContext({
      ...projectApiInvocation,
      request: this.buildServerRequest(candidateBuildResult.localState, projectRequirements),
    });
  }

  buildServerRequest(localState, projectRequirements) {
    return {
      contractVersion: 1,
      designContextContractVersion: 1,
      projectId: localState.projectIdentity.projectId,
      projectRequirements,
    };
  }

  buildCombinedContext(candidateBuildResult, serverResponse) {
    const serverContext = serverResponse.result;
    return {
      ok: true,
      outcome: serverResponse.outcome,
      protocol: serverContext.protocol,
      projectRequirements: serverContext.projectRequirements,
      serverBaseline: serverContext.snapshot,
      localBaseline: this.buildLocalBaseline(candidateBuildResult.localState),
      inventory: serverContext.inventory,
      canonicalBodies: serverContext.canonicalBodies,
      bindings: serverContext.bindings.map(binding => this.copySafeBinding(binding)),
      localEdits: this.buildLocalEdits(candidateBuildResult, serverContext),
      deletions: candidateBuildResult.deletionIntents.map(intent => this.copySafeDeletion(intent)),
      secureSelectors: candidateBuildResult.candidate.secureInputs,
      conflicts: this.buildBaselineConflicts(candidateBuildResult.localState, serverContext),
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

  buildLocalEdits(candidateBuildResult, serverContext) {
    const serverSources = this.buildServerSourcesByIdentity(serverContext.canonicalBodies);
    return {
      snapshotDigest: candidateBuildResult.candidateSnapshotDigest,
      hasManagedEdits: candidateBuildResult.candidateSnapshotDigest
        !== candidateBuildResult.localState.baseline.snapshotDigest,
      creates: candidateBuildResult.candidate.creates,
      updates: candidateBuildResult.candidate.updates.filter(update => (
        this.isChangedUpdate(update, serverSources)
      )),
    };
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
