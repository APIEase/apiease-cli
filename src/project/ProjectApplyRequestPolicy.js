import { PersonalProjectAuthenticationAdapter } from '../auth/PersonalProjectAuthenticationAdapter.js';

const PERSONAL_PROJECT_AUTHORITY_MODE = 'personal';
const WORKER_PROJECT_AUTHORITY_MODE = 'worker';
const PROJECT_WORKER_AUTHORITY_UNAVAILABLE_ERROR_CODE =
  'PROJECT_WORKER_AUTHORITY_UNAVAILABLE';
const COMMITTED_PROJECT_APPLY_OUTCOMES = new Set([
  'PROJECT_APPLIED',
  'PROJECT_APPLY_NO_CHANGE',
  'PROJECT_APPLY_REPLAYED',
]);

class ProjectApplyRequestPolicy {
  constructor({
    personalProjectAuthenticationAdapter = new PersonalProjectAuthenticationAdapter(),
    approvalProjectContext,
  } = {}) {
    this.personalProjectAuthenticationAdapter = personalProjectAuthenticationAdapter;
    this.approvalProjectContext = approvalProjectContext;
  }

  selectRequestPolicy({ requireApproval = false } = {}) {
    return requireApproval
      ? this.buildApprovalRequiredPolicy()
      : this.buildImmediatePersonalPolicy();
  }

  buildApprovalRequiredPolicy() {
    if (!this.hasExactApprovalProjectContext()) {
      return this.buildWorkerAuthorityUnavailableFailure();
    }
    return {
      ok: true,
      authorityMode: WORKER_PROJECT_AUTHORITY_MODE,
      projectAuthenticationAdapter: this.approvalProjectContext.projectAuthenticationAdapter,
      applyRequestFields: {
        requireApproval: true,
        proposalCheckpoint: this.approvalProjectContext.proposalCheckpoint,
      },
    };
  }

  hasExactApprovalProjectContext() {
    return hasExactFields(this.approvalProjectContext, [
      'projectAuthenticationAdapter',
      'proposalCheckpoint',
    ])
      && hasBearerAuthorityMode(this.approvalProjectContext.projectAuthenticationAdapter)
      && isValidProposalCheckpoint(this.approvalProjectContext.proposalCheckpoint);
  }

  buildImmediatePersonalPolicy() {
    return {
      ok: true,
      authorityMode: PERSONAL_PROJECT_AUTHORITY_MODE,
      projectAuthenticationAdapter: this.personalProjectAuthenticationAdapter,
      applyRequestFields: {},
    };
  }

  buildWorkerAuthorityUnavailableFailure() {
    return {
      ok: false,
      error: {
        code: PROJECT_WORKER_AUTHORITY_UNAVAILABLE_ERROR_CODE,
        category: 'authorization',
      },
      diagnostics: [{ code: PROJECT_WORKER_AUTHORITY_UNAVAILABLE_ERROR_CODE }],
    };
  }

  permitsCommittedLocalTransitions({ state, outcome } = {}) {
    return state === 'success' && COMMITTED_PROJECT_APPLY_OUTCOMES.has(outcome);
  }
}

function hasExactFields(value, expectedFields) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).sort().join('\0') === [...expectedFields].sort().join('\0');
}

function isValidProposalCheckpoint(proposalCheckpoint) {
  return hasExactFields(proposalCheckpoint, [
    'branchName',
    'commit',
    'designSessionId',
    'proposalId',
  ])
    && ['designSessionId', 'proposalId'].every(fieldName => isBoundedIdentity(
      proposalCheckpoint[fieldName],
    ))
    && typeof proposalCheckpoint.branchName === 'string'
    && /^apiease\/proposals\/[A-Za-z0-9._/-]+$/u.test(proposalCheckpoint.branchName)
    && proposalCheckpoint.branchName.length <= 255
    && typeof proposalCheckpoint.commit === 'string'
    && /^[a-f0-9]{40,64}$/u.test(proposalCheckpoint.commit);
}

function hasBearerAuthorityMode(projectAuthenticationAdapter) {
  return typeof projectAuthenticationAdapter?.readAuthorityMode === 'function'
    && projectAuthenticationAdapter.readAuthorityMode() === 'bearer';
}

function isBoundedIdentity(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 256;
}

export {
  PERSONAL_PROJECT_AUTHORITY_MODE,
  PROJECT_WORKER_AUTHORITY_UNAVAILABLE_ERROR_CODE,
  WORKER_PROJECT_AUTHORITY_MODE,
  ProjectApplyRequestPolicy,
};
