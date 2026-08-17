import { PersonalProjectAuthenticationAdapter } from '../auth/PersonalProjectAuthenticationAdapter.js';

const PERSONAL_PROJECT_AUTHORITY_MODE = 'personal';
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
  } = {}) {
    this.personalProjectAuthenticationAdapter = personalProjectAuthenticationAdapter;
  }

  selectRequestPolicy({ requireApproval = false } = {}) {
    return requireApproval
      ? this.buildWorkerAuthorityUnavailableFailure()
      : this.buildImmediatePersonalPolicy();
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

export {
  PERSONAL_PROJECT_AUTHORITY_MODE,
  PROJECT_WORKER_AUTHORITY_UNAVAILABLE_ERROR_CODE,
  ProjectApplyRequestPolicy,
};
