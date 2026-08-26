import { PersonalProjectAuthenticationAdapter } from './PersonalProjectAuthenticationAdapter.js';

class ProjectCommandAuthenticationContextResolver {
  resolveContext() {
    return buildPersonalContext();
  }
}

function buildPersonalContext() {
  return Object.freeze({
    projectAuthenticationAdapter: new PersonalProjectAuthenticationAdapter(),
  });
}

export { ProjectCommandAuthenticationContextResolver };
