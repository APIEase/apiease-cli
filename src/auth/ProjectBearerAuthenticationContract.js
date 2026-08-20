const PROJECT_BEARER_AUTHENTICATION_ACTIONS = Object.freeze({
  bootstrap: 'project:bootstrap',
  checkpointPublish: 'checkpoint:publish',
  checkpointRetrieve: 'checkpoint:retrieve',
  plan: 'project:plan',
  proposalSubmit: 'proposal:submit',
  pull: 'project:pull',
  validate: 'project:validate',
});

const PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES = Object.freeze({
  apiBaseUrl: 'APIEASE_API_BASE_URL',
  proposalContext: 'APIEASE_PROPOSAL_CONTEXT',
  tokenSet: 'APIEASE_BEARER_TOKEN_SET',
});

export {
  PROJECT_BEARER_AUTHENTICATION_ACTIONS,
  PROJECT_BEARER_TOKEN_ENVIRONMENT_NAMES,
};
