import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CreateRequestCommand } from '../../../src/cli/CreateRequestCommand.js';
import { ReadRequestCommand } from '../../../src/cli/ReadRequestCommand.js';
import { UpdateRequestCommand } from '../../../src/cli/UpdateRequestCommand.js';
import { DeleteRequestCommand } from '../../../src/cli/DeleteRequestCommand.js';
import { CrudResourceDefinitionCollection } from '../../../src/crud/CrudResourceDefinitionCollection.js';

const commands = [
  ['create', 'creation', CreateRequestCommand],
  ['read', 'read', ReadRequestCommand],
  ['update', 'update', UpdateRequestCommand],
  ['delete', 'delete', DeleteRequestCommand],
];
const resourceDefinitions = new CrudResourceDefinitionCollection();

for (const [operation, failureLabel, Command] of commands) {
  describe(`${Command.name} error reporting`, () => {
    describe('run', () => {
      for (const resourceName of resourceDefinitions.listSupportedResourceNames()) {
        it(`should report nested API failures for ${resourceName} without undefined or invented details`, async () => {
          // Arrange
          const result = { contractVersion: 1, ok: false, outcome: 'RESOURCE_VALIDATION_FAILED',
            error: { code: 'RESOURCE_VALIDATION_FAILED', message: 'The resource is invalid.', fieldErrors: [] } };
          const { command, stdout, stderr } = buildCommand(Command, result);
          const resource = resourceDefinitions.readResourceDefinition(resourceName);

          // Act
          const exitCode = await command.run(buildArguments(operation, resource));

          // Assert
          assert.equal(exitCode, 1);
          assert.equal(stdout.join(''), '');
          assert.equal(stderr.join(''), `${resource.humanReadableLabel} ${failureLabel} failed.\nError Code: RESOURCE_VALIDATION_FAILED\nMessage: The resource is invalid.\n`);
        });

        it(`should retain all nested JSON error data for ${resourceName}`, async () => {
          // Arrange
          const result = { status: 422, contractVersion: 1, ok: false, outcome: 'RESOURCE_VALIDATION_FAILED',
            error: { code: 'RESOURCE_VALIDATION_FAILED', message: 'Invalid resource.',
              fieldErrors: [{ path: 'source', code: 'INVALID', message: 'Invalid source.' }],
              diagnostics: [{ code: 'DEPENDENCY_MISSING', dependency: { resourceType: 'variable', handle: 'token' } }],
              details: [{ resourceType: resourceName, handle: 'example', fieldPath: 'source' }] } };
          const { command, stdout, stderr } = buildCommand(Command, result);

          // Act
          const exitCode = await command.run([...buildArguments(operation, resourceDefinitions.readResourceDefinition(resourceName)), '--json']);

          // Assert
          assert.equal(exitCode, 1);
          assert.deepEqual(JSON.parse(stdout.join('')), result);
          assert.equal(stderr.join(''), '');
        });
      }
    });
  });
}

function buildArguments(operation, resource) {
  return [operation, resource.resourceName, resource.identifierOptionName, 'example', '--file', '/tmp/example.json'];
}

function buildCommand(Command, result) {
  const stdout = [];
  const stderr = [];
  const respond = async () => result;
  const command = new Command({
    apiEaseCommandConfigurationResolver: { resolveConfiguration: async () => ({ ok: true, apiBaseUrl: 'https://example.com', apiKey: 'test', shopDomain: 'test.myshopify.com' }) },
    requestDefinitionFileLoader: { loadRequestDefinition: async () => ({ ok: true, requestDefinition: { handle: 'example' } }) },
    apiEaseCreateRequestClient: { createRequest: respond },
    apiEaseReadRequestClient: { readRequest: respond },
    apiEaseUpdateRequestClient: { updateRequest: respond },
    apiEaseDeleteRequestClient: { deleteRequest: respond },
    apiEaseCrudResourceClient: { createResource: respond, readResource: respond, updateResource: respond, deleteResource: respond },
    apiEaseHandleBasedCreateOrUpdateService: { createOrUpdateResourceByHandle: respond },
    stdout: { write: chunk => stdout.push(chunk) },
    stderr: { write: chunk => stderr.push(chunk) },
  });
  return { command, stdout, stderr };
}
