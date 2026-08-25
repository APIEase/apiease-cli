import { PersonalProjectAuthenticationAdapter } from '../auth/PersonalProjectAuthenticationAdapter.js';

const PERSONAL_PROJECT_AUTHORITY_MODE = 'personal';
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
    return {
      ok: true,
      authorityMode: PERSONAL_PROJECT_AUTHORITY_MODE,
      projectAuthenticationAdapter: this.personalProjectAuthenticationAdapter,
      applyRequestFields: { requireApproval },
    };
  }

  permitsCommittedLocalTransitions({ state, outcome } = {}) {
    return state === 'success' && COMMITTED_PROJECT_APPLY_OUTCOMES.has(outcome);
  }
}

export {
  PERSONAL_PROJECT_AUTHORITY_MODE,
  ProjectApplyRequestPolicy,
};
