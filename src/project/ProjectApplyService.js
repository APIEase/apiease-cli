import crypto from 'node:crypto';

import { ApiEaseProjectApiClient } from '../client/ApiEaseProjectApiClient.js';
import { ProjectApplyRequestPolicy } from './ProjectApplyRequestPolicy.js';
import { ProjectCandidateBuilder } from './ProjectCandidateBuilder.js';
import { ProjectDeletionIntentService } from './ProjectDeletionIntentService.js';
import { ProjectLocalStateService } from './ProjectLocalStateService.js';
import {
  PROJECT_REQUIRED_SECURE_VALUES_GUIDANCE,
  ProjectValidationService,
} from './ProjectValidationService.js';

const PROJECT_APPLY_RUNTIME_VERIFICATION_GUIDANCE =
  'Server validation and atomic persistence succeeded, but runtime behavior is not verified. A person must verify affected live resources through established APIEase execution paths.';
const PROJECT_APPLY_SECURE_VALUE_GUIDANCE = PROJECT_REQUIRED_SECURE_VALUES_GUIDANCE;
const PROJECT_APPLY_CONFLICT_GUIDANCE =
  'Preserve the intended source and deletion files, complete a verified pull, then deliberately reapply the changes with a new logical operation key.';
const EXPECTED_PROJECT_PLAN_OUTCOMES = new Set([
  'PROJECT_PLAN_NO_CHANGE',
  'PROJECT_PLAN_READY',
]);
const PROJECT_PROPOSAL_ACCEPTED_OUTCOME = 'PROJECT_PROPOSAL_ACCEPTED';
const EXPECTED_PERSONAL_APPLY_OUTCOMES = new Set([
  'PROJECT_APPLIED',
  'PROJECT_APPLY_NO_CHANGE',
  'PROJECT_APPLY_REPLAYED',
]);
const EXPECTED_PERSONAL_DEFERRED_OUTCOMES = new Set([PROJECT_PROPOSAL_ACCEPTED_OUTCOME]);
const PROJECT_APPLY_CONFLICT_OUTCOMES = new Set([
  'PROJECT_BASELINE_CONFLICT',
  'PROJECT_IDEMPOTENCY_CONFLICT',
  'PROJECT_PROJECTION_CONFLICT',
  'RESOURCE_ALREADY_EXISTS',
  'RESOURCE_VERSION_CONFLICT',
]);

class ProjectApplyService {
  constructor({
    projectApplyRequestPolicy = new ProjectApplyRequestPolicy(),
    projectCandidateBuilder = new ProjectCandidateBuilder(),
    apiEaseProjectApiClient,
    projectValidationService,
    projectLocalStateService = new ProjectLocalStateService(),
    projectDeletionIntentService = new ProjectDeletionIntentService(),
    operationKeyFactory = () => crypto.randomUUID(),
  } = {}) {
    this.projectApplyRequestPolicy = projectApplyRequestPolicy;
    this.projectCandidateBuilder = projectCandidateBuilder;
    this.apiEaseProjectApiClient = apiEaseProjectApiClient
      ?? new ApiEaseProjectApiClient({
        projectAuthenticationAdapter:
          projectApplyRequestPolicy.personalProjectAuthenticationAdapter,
      });
    this.projectValidationService = projectValidationService
      ?? new ProjectValidationService({
        apiEaseProjectApiClient: this.apiEaseProjectApiClient,
        projectCandidateBuilder,
      });
    this.projectLocalStateService = projectLocalStateService;
    this.projectDeletionIntentService = projectDeletionIntentService;
    this.operationKeyFactory = operationKeyFactory;
  }

  async applyProject({
    projectDirectoryPath,
    requireApproval = false,
    configurationOptions = {},
  } = {}) {
    const requestPolicy = this.projectApplyRequestPolicy.selectRequestPolicy({ requireApproval });
    if (!requestPolicy.ok) return this.buildPolicyFailure(requestPolicy);

    const requestConfiguration = await requestPolicy.projectAuthenticationAdapter
      .resolveRequestConfiguration(configurationOptions);
    if (!requestConfiguration.ok) return this.buildConfigurationFailure(requestConfiguration);

    return await this.executeImmediateApply({
      projectDirectoryPath,
      requestConfiguration,
      requestPolicy,
    });
  }

  async executeImmediateApply({ projectDirectoryPath, requestConfiguration, requestPolicy }) {
    const candidateBuildResult = await this.projectCandidateBuilder.buildCandidate({
      projectDirectoryPath,
    });
    const projectApiInvocation = this.buildProjectApiInvocation(requestConfiguration);
    const validationResult = await this.projectValidationService.validateCandidate({
      candidateBuildResult,
      projectApiInvocation,
    });
    this.requireExpectedValidationOutcome(validationResult);
    if (!validationResult.ok) return this.buildValidationFailure(validationResult);

    return await this.planAndApply({
      candidateBuildResult,
      projectApiInvocation,
      requestPolicy,
      validationResult,
    });
  }

  buildProjectApiInvocation(requestConfiguration) {
    return {
      apiBaseUrl: requestConfiguration.apiBaseUrl,
      authenticationContext: requestConfiguration.authenticationContext,
    };
  }

  requireExpectedValidationOutcome(validationResult) {
    if (!validationResult.ok || validationResult.outcome === 'PROJECT_VALID') return;
    throw buildServiceError('PROJECT_VALIDATION_OUTCOME_INVALID');
  }

  async planAndApply({
    candidateBuildResult,
    projectApiInvocation,
    requestPolicy,
    validationResult,
  }) {
    const planResponse = await this.apiEaseProjectApiClient.planProject({
      ...projectApiInvocation,
      request: { contractVersion: 1, changeSet: candidateBuildResult.changeSet },
    });
    this.requireExpectedPlanOutcome(planResponse);
    if (!planResponse.ok) return this.buildPlanFailure(validationResult, planResponse);

    return await this.applyRetainedPlan({
      candidateBuildResult,
      planResponse,
      projectApiInvocation,
      requestPolicy,
      validationResult,
    });
  }

  requireExpectedPlanOutcome(planResponse) {
    if (!planResponse.ok || EXPECTED_PROJECT_PLAN_OUTCOMES.has(planResponse.outcome)) return;
    throw buildServiceError('PROJECT_PLAN_OUTCOME_INVALID');
  }

  async applyRetainedPlan({
    candidateBuildResult,
    planResponse,
    projectApiInvocation,
    requestPolicy,
    validationResult,
  }) {
    const operationKey = this.operationKeyFactory();
    const applyResponse = await this.submitRetainedApply({
      ...projectApiInvocation,
      request: this.buildApplyRequest({
        candidateBuildResult,
        operationKey,
        requestPolicy,
      }),
    });
    this.requireExpectedApplyOutcome(applyResponse, requestPolicy);
    const result = this.buildApplyResult({ applyResponse, planResponse, validationResult });
    if (!this.permitsCommittedLocalTransitions(result)) return result;

    result.localTransitions = await this.publishCommittedLocalTransitions({
      applyReceipt: applyResponse.result,
      candidateBuildResult,
    });
    return result;
  }

  async submitRetainedApply(invocation) {
    return await this.apiEaseProjectApiClient.applyProject(invocation);
  }

  requireExpectedApplyOutcome(applyResponse, requestPolicy) {
    if (!applyResponse.ok) return;
    const expectedOutcomes = requestPolicy.applyRequestFields.requireApproval
      ? EXPECTED_PERSONAL_DEFERRED_OUTCOMES
      : EXPECTED_PERSONAL_APPLY_OUTCOMES;
    if (!expectedOutcomes.has(applyResponse.outcome)) {
      const errorCode = requestPolicy.applyRequestFields.requireApproval
        ? 'PROJECT_PROPOSAL_SUBMISSION_OUTCOME_INVALID'
        : 'PROJECT_APPLY_OUTCOME_INVALID';
      throw buildServiceError(errorCode);
    }
  }

  buildApplyRequest({ candidateBuildResult, operationKey, requestPolicy }) {
    return {
      contractVersion: 1,
      operationKey,
      authorityMode: requestPolicy.authorityMode,
      changeSet: candidateBuildResult.changeSet,
      ...requestPolicy.applyRequestFields,
    };
  }

  permitsCommittedLocalTransitions(result) {
    return this.projectApplyRequestPolicy.permitsCommittedLocalTransitions(result);
  }

  async publishCommittedLocalTransitions({ applyReceipt, candidateBuildResult }) {
    const committedLocalState = this.projectLocalStateService.deriveCommittedLocalState({
      localState: candidateBuildResult.localState,
      changeSet: candidateBuildResult.changeSet,
      applyReceipt,
      candidateSnapshotDigest: candidateBuildResult.candidateSnapshotDigest,
    });
    const localStateLocation = await this.projectLocalStateService.publishLocalState({
      projectDirectoryPath: candidateBuildResult.repositoryTopLevelPath,
      localState: committedLocalState,
    });
    const deletionArchive = candidateBuildResult.deletionIntents.length > 0
      ? await this.archiveCommittedDeletions({ applyReceipt, candidateBuildResult })
      : { archivedPaths: [], alreadyArchivedPaths: [] };

    return { localStateLocation, deletionArchive };
  }

  async archiveCommittedDeletions({ applyReceipt, candidateBuildResult }) {
    return await this.projectDeletionIntentService.archiveCommittedDeletionIntents({
      repositoryTopLevelPath: candidateBuildResult.repositoryTopLevelPath,
      deletionIntents: candidateBuildResult.deletionIntents,
      applyReceipt,
    });
  }

  buildPolicyFailure(requestPolicy) {
    return {
      ok: false,
      state: 'failure',
      stage: 'policy',
      error: requestPolicy.error,
      diagnostics: requestPolicy.diagnostics ?? [],
      requiredSecureValues: [],
      guidance: [],
    };
  }

  buildConfigurationFailure(requestConfiguration) {
    return {
      ok: false,
      state: 'failure',
      stage: 'authentication',
      error: { code: requestConfiguration.errorCode, category: 'configuration' },
      diagnostics: requestConfiguration.fieldErrors ?? [],
      requiredSecureValues: [],
      guidance: [],
    };
  }

  buildValidationFailure(validationResult) {
    return {
      ok: false,
      state: 'failure',
      stage: 'validation',
      outcome: validationResult.outcome,
      error: validationResult.error,
      diagnostics: validationResult.diagnostics,
      requiredSecureValues: validationResult.requiredSecureValues,
      guidance: validationResult.guidance,
    };
  }

  buildPlanFailure(validationResult, planResponse) {
    return {
      ok: false,
      state: 'failure',
      stage: 'plan',
      outcome: planResponse.outcome,
      error: planResponse.error,
      diagnostics: planResponse.error?.diagnostics ?? [],
      requiredSecureValues: validationResult.requiredSecureValues,
      guidance: this.buildFailureGuidance(planResponse.outcome),
    };
  }

  buildApplyResult({ applyResponse, planResponse, validationResult }) {
    const accepted = applyResponse.ok && applyResponse.outcome === PROJECT_PROPOSAL_ACCEPTED_OUTCOME;
    const state = accepted ? 'accepted' : (applyResponse.ok ? 'success' : 'failure');
    const sharedResult = {
      ok: applyResponse.ok,
      state,
      stage: 'apply',
      outcome: applyResponse.outcome,
      plan: planResponse.result,
      receipt: applyResponse.ok && !accepted ? applyResponse.result : null,
      proposal: accepted ? applyResponse.result : null,
      diagnostics: applyResponse.error?.diagnostics ?? [],
      requiredSecureValues: validationResult.requiredSecureValues,
      guidance: applyResponse.ok
        ? this.buildSuccessGuidance(validationResult.requiredSecureValues, accepted)
        : this.buildFailureGuidance(applyResponse.outcome),
    };

    return applyResponse.ok ? sharedResult : { ...sharedResult, error: applyResponse.error };
  }

  buildSuccessGuidance(requiredSecureValues, accepted) {
    return accepted
      ? this.buildRequiredSecureValueGuidance(requiredSecureValues)
      : this.buildCommittedGuidance(requiredSecureValues);
  }

  buildRequiredSecureValueGuidance(requiredSecureValues) {
    return requiredSecureValues.length > 0 ? [PROJECT_APPLY_SECURE_VALUE_GUIDANCE] : [];
  }

  buildCommittedGuidance(requiredSecureValues) {
    const guidance = [PROJECT_APPLY_RUNTIME_VERIFICATION_GUIDANCE];
    if (requiredSecureValues.length > 0) guidance.push(PROJECT_APPLY_SECURE_VALUE_GUIDANCE);
    return guidance;
  }

  buildFailureGuidance(outcome) {
    return PROJECT_APPLY_CONFLICT_OUTCOMES.has(outcome)
      ? [PROJECT_APPLY_CONFLICT_GUIDANCE]
      : [];
  }
}

function buildServiceError(code) {
  const error = new Error(code);
  error.code = code;
  error.failureType = 'contract';
  error.diagnostics = [{ code }];
  return error;
}

export {
  PROJECT_APPLY_CONFLICT_GUIDANCE,
  PROJECT_APPLY_RUNTIME_VERIFICATION_GUIDANCE,
  PROJECT_APPLY_SECURE_VALUE_GUIDANCE,
  ProjectApplyService,
};
