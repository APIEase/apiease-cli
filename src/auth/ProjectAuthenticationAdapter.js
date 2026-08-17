class ProjectAuthenticationAdapter {
  async resolveRequestConfiguration() {
    throw new Error('ProjectAuthenticationAdapter.resolveRequestConfiguration must be implemented');
  }

  buildRequestHeaders(authenticationContext) {
    throw new Error('ProjectAuthenticationAdapter.buildRequestHeaders must be implemented');
  }

  readAuthorityMode() {
    throw new Error('ProjectAuthenticationAdapter.readAuthorityMode must be implemented');
  }
}

export { ProjectAuthenticationAdapter };
