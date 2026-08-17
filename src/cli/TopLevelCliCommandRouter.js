import { CrudResourceDefinitionCollection } from '../crud/CrudResourceDefinitionCollection.js';

const CREATE_COMMAND_NAME = 'create';
const DELETE_COMMAND_NAME = 'delete';
const APPLY_COMMAND_NAME = 'apply';
const INIT_COMMAND_NAME = 'init';
const PULL_COMMAND_NAME = 'pull';
const READ_COMMAND_NAME = 'read';
const RENAME_COMMAND_NAME = 'rename';
const UPGRADE_COMMAND_NAME = 'upgrade';
const UPDATE_COMMAND_NAME = 'update';
const VALIDATE_COMMAND_NAME = 'validate';
const VERSION_FLAG = '--version';
const HELP_FLAG = '--help';

class TopLevelCliCommandRouter {
  constructor({
    crudResourceDefinitionCollection = new CrudResourceDefinitionCollection(),
  } = {}) {
    this.crudResourceDefinitionCollection = crudResourceDefinitionCollection;
  }

  resolveCommand({
    commandArguments,
    createRequestCommand,
    readRequestCommand,
    updateRequestCommand,
    deleteRequestCommand,
    initProjectCommand,
    pullProjectCommand,
    validateProjectCommand,
    applyProjectCommand,
    renameProjectResourceCommand,
    upgradeProjectCommand,
    versionCommand,
  }) {
    const commandName = commandArguments[0];
    if (!commandName) {
      return this.buildFailureResult('Missing command.');
    }

    if (commandName === VERSION_FLAG) {
      return this.buildSuccessResult(versionCommand);
    }

    if (commandName === HELP_FLAG) {
      return { ok: true, help: true };
    }

    if (commandName === INIT_COMMAND_NAME) {
      return this.buildSuccessResult(initProjectCommand);
    }

    if (commandName === PULL_COMMAND_NAME) {
      return this.buildSuccessResult(pullProjectCommand);
    }

    if (commandName === VALIDATE_COMMAND_NAME) {
      return this.buildSuccessResult(validateProjectCommand);
    }

    if (commandName === APPLY_COMMAND_NAME) {
      return this.buildSuccessResult(applyProjectCommand);
    }

    if (commandName === RENAME_COMMAND_NAME) {
      return this.buildSuccessResult(renameProjectResourceCommand);
    }

    if (commandName === UPGRADE_COMMAND_NAME) {
      return this.buildSuccessResult(upgradeProjectCommand);
    }

    const crudCommand = this.readCrudCommand({
      commandName,
      createRequestCommand,
      readRequestCommand,
      updateRequestCommand,
      deleteRequestCommand,
    });
    if (!crudCommand) {
      return this.buildFailureResult(`Unknown command: ${commandName}`);
    }

    const resourceValidationResult = this.validateCrudResource({ commandArguments, commandName });
    if (!resourceValidationResult.ok) {
      return resourceValidationResult;
    }

    return this.buildSuccessResult(crudCommand);
  }

  buildUsageText() {
    const supportedResourceToken = this.buildSupportedResourceToken();
    return [
      'Usage: apiease <command> [options]',
      '',
      'Commands:',
      `  create ${supportedResourceToken}   Create a resource from a definition file.`,
      `  read ${supportedResourceToken}     Read a resource by identifier.`,
      `  update ${supportedResourceToken}   Update a resource by identifier from a definition file.`,
      `  delete ${supportedResourceToken}   Delete a resource by identifier.`,
      '  init [project-name] [--from-existing-resources]   Initialize a new APIEase project.',
      '  pull                              Pull verified Project API resources.',
      '  validate                          Validate the complete project without execution.',
      '  apply                             Validate, plan, and immediately apply the project.',
      '  rename <resource-type> <old-handle> <new-handle>   Rename a bound project resource.',
      '  upgrade                           Upgrade an existing APIEase project.',
      '',
      'Options:',
      '  --base-url <url>                  APIEase base URL.',
      '  --shop-domain <shop-domain>       Shopify shop domain.',
      '  --api-key <api-key>               APIEase API key.',
      '  --json                            Emit one JSON result document.',
      '  --help                            Show this help.',
      '  --version                         Print the installed apiease CLI version.',
    ].join('\n');
  }

  readCrudCommand({
    commandName,
    createRequestCommand,
    readRequestCommand,
    updateRequestCommand,
    deleteRequestCommand,
  }) {
    if (commandName === CREATE_COMMAND_NAME) {
      return createRequestCommand;
    }

    if (commandName === READ_COMMAND_NAME) {
      return readRequestCommand;
    }

    if (commandName === UPDATE_COMMAND_NAME) {
      return updateRequestCommand;
    }

    if (commandName === DELETE_COMMAND_NAME) {
      return deleteRequestCommand;
    }

    return null;
  }

  validateCrudResource({ commandArguments, commandName }) {
    const resourceName = commandArguments[1];
    if (!resourceName || resourceName.startsWith('--')) {
      return this.buildFailureResult(`Missing required resource argument for ${commandName}.`);
    }

    if (!this.crudResourceDefinitionCollection.findResourceDefinition(resourceName)) {
      return this.buildFailureResult(`Unsupported resource for ${commandName}: ${resourceName}.`);
    }

    return { ok: true };
  }

  buildSupportedResourceToken() {
    return `<${this.crudResourceDefinitionCollection.listSupportedResourceNames().join('|')}>`;
  }

  buildSuccessResult(command) {
    return {
      ok: true,
      command,
    };
  }

  buildFailureResult(message) {
    return {
      ok: false,
      message,
    };
  }
}

export { TopLevelCliCommandRouter };
