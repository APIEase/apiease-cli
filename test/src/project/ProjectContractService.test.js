import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const contractDirectoryPath = path.join(projectDirectoryPath, 'contracts', 'apex-projects', 'v1');
const projectContractServiceModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'project', 'ProjectContractService.js'),
).href;

describe('ProjectContractService', () => {
  describe('validateFixtureDocument', () => {
    it('should validate every named document in the vendored compatibility fixtures', async () => {
      // Arrange
      const { ProjectContractService } = await import(projectContractServiceModuleUrl);
      const projectContractService = new ProjectContractService();
      const fixtureDocuments = await readAnnotatedFixtureDocuments();

      // Act
      const validationResults = fixtureDocuments.map(({ schemaDefinition, document }) => (
        projectContractService.validateFixtureDocument(schemaDefinition, document)
      ));

      // Assert
      assert.equal(validationResults.every(validationResult => validationResult.ok), true);
    });

    it('should reject a fixture document with an unsupported named definition', async () => {
      // Arrange
      const { ProjectContractService } = await import(projectContractServiceModuleUrl);
      const projectContractService = new ProjectContractService();

      // Act
      const validationResult = projectContractService.validateFixtureDocument(
        'unpublishedDefinition',
        {},
      );

      // Assert
      assert.deepEqual(validationResult, {
        ok: false,
        diagnostics: [{ code: 'CONTRACT_SCHEMA_DEFINITION_UNSUPPORTED' }],
      });
    });
  });

  describe('validateProjectApiRequest', () => {
    it('should validate bootstrap, validate, plan, and apply requests against endpoint definitions', async () => {
      // Arrange
      const { ProjectContractService } = await import(projectContractServiceModuleUrl);
      const projectContractService = new ProjectContractService();
      const requestsByEndpoint = await readProjectRequestsByEndpoint();

      // Act
      const validationResults = [...requestsByEndpoint].map(([endpoint, document]) => (
        projectContractService.validateProjectApiRequest(endpoint, document)
      ));

      // Assert
      assert.equal(validationResults.every(validationResult => validationResult.ok), true);
    });

    it('should reject unknown request fields without applying schema defaults or removing data', async () => {
      // Arrange
      const { ProjectContractService } = await import(projectContractServiceModuleUrl);
      const projectContractService = new ProjectContractService();
      const requestDocument = {
        contractVersion: 1,
        privateCredential: 'must-remain-unreported',
      };

      // Act
      const validationResult = projectContractService.validateProjectApiRequest(
        '/api/v1/projects/bootstrap',
        requestDocument,
      );

      // Assert
      assert.equal(validationResult.ok, false);
      assert.deepEqual(requestDocument, {
        contractVersion: 1,
        privateCredential: 'must-remain-unreported',
      });
      assert.equal(JSON.stringify(validationResult).includes('must-remain-unreported'), false);
      assert.equal('wakeProjection' in requestDocument, false);
    });
  });

  describe('validateProjectApiResponse', () => {
    it('should validate every Project API fixture response for its endpoint and outcome', async () => {
      // Arrange
      const { ProjectContractService } = await import(projectContractServiceModuleUrl);
      const projectContractService = new ProjectContractService();
      const fixtureResponses = await readProjectFixtureResponses();

      // Act
      const validationResults = fixtureResponses.map(({ endpoint, document }) => (
        projectContractService.validateProjectApiResponse(endpoint, document)
      ));

      // Assert
      assert.equal(validationResults.every(validationResult => validationResult.ok), true);
    });

    it('should reject a valid response envelope when its outcome belongs to another endpoint', async () => {
      // Arrange
      const { ProjectContractService } = await import(projectContractServiceModuleUrl);
      const projectContractService = new ProjectContractService();
      const validateResponse = await readWorkflowResponse('validate');

      // Act
      const validationResult = projectContractService.validateProjectApiResponse(
        '/api/v1/projects/plan',
        validateResponse,
      );

      // Assert
      assert.deepEqual(validationResult, {
        ok: false,
        diagnostics: [{ code: 'CONTRACT_OUTCOME_UNSUPPORTED' }],
      });
    });

    it('should reject a malformed error envelope whose outcome differs from its error code', async () => {
      // Arrange
      const { ProjectContractService } = await import(projectContractServiceModuleUrl);
      const projectContractService = new ProjectContractService();
      const failureFixture = await readFailureFixture('stale-baseline');
      failureFixture.document.error.code = 'PROJECT_IDEMPOTENCY_CONFLICT';

      // Act
      const validationResult = projectContractService.validateProjectApiResponse(
        failureFixture.endpoint,
        failureFixture.document,
      );

      // Assert
      assert.deepEqual(validationResult, {
        ok: false,
        diagnostics: [{ code: 'CONTRACT_ERROR_CODE_MISMATCH', path: '/error/code' }],
      });
    });
  });

  describe('validateCanonicalResourceChangeSet', () => {
    it('should validate the Canonical Resource Change Set from the authoritative fixture', async () => {
      // Arrange
      const { ProjectContractService } = await import(projectContractServiceModuleUrl);
      const projectContractService = new ProjectContractService();
      const candidate = await readCanonicalResourceChangeSet();

      // Act
      const validationResult = projectContractService.validateCanonicalResourceChangeSet(candidate);

      // Assert
      assert.deepEqual(validationResult, { ok: true });
    });

    it('should reject an unsupported change-set contract version', async () => {
      // Arrange
      const { ProjectContractService } = await import(projectContractServiceModuleUrl);
      const projectContractService = new ProjectContractService();
      const candidate = await readCanonicalResourceChangeSet();
      candidate.contractVersion = 2;

      // Act
      const validationResult = projectContractService.validateCanonicalResourceChangeSet(candidate);

      // Assert
      assert.equal(validationResult.ok, false);
    });
  });

  describe('validateLocalState', () => {
    it('should validate local state from the synchronized bootstrap fixture', async () => {
      // Arrange
      const { ProjectContractService } = await import(projectContractServiceModuleUrl);
      const projectContractService = new ProjectContractService();
      const bootstrapFixture = await readBootstrapFixture('bootstrap-synchronized');
      const bootstrapResult = bootstrapFixture.document.result;
      const localState = {
        localStateVersion: bootstrapResult.localState.localStateVersion,
        projectIdentity: bootstrapResult.projectIdentity,
        baseline: bootstrapResult.localState.baseline,
        resources: bootstrapResult.bindings,
      };

      // Act
      const validationResult = projectContractService.validateLocalState(localState);

      // Assert
      assert.deepEqual(validationResult, { ok: true });
    });

    it('should return bounded secret-safe diagnostics for invalid local state', async () => {
      // Arrange
      const { MAXIMUM_CONTRACT_DIAGNOSTICS, ProjectContractService } = await import(
        projectContractServiceModuleUrl
      );
      const projectContractService = new ProjectContractService();
      const localState = Object.fromEntries(Array.from({ length: 30 }, (_, index) => [
        `secret-${index}`,
        `protected-value-${index}`,
      ]));

      // Act
      const validationResult = projectContractService.validateLocalState(localState);

      // Assert
      assert.equal(validationResult.ok, false);
      assert.equal(validationResult.diagnostics.length <= MAXIMUM_CONTRACT_DIAGNOSTICS, true);
      assert.equal(JSON.stringify(validationResult).includes('protected-value-'), false);
      assert.equal(validationResult.diagnostics.every(diagnostic => (
        Object.keys(diagnostic).every(key => ['code', 'path'].includes(key))
      )), true);
    });
  });
});

async function readJson(relativePath) {
  const fileContent = await fs.readFile(path.join(contractDirectoryPath, relativePath), 'utf8');

  return JSON.parse(fileContent);
}

async function readAnnotatedFixtureDocuments() {
  const fixtureFileNames = (await fs.readdir(path.join(contractDirectoryPath, 'fixtures')))
    .filter(fixtureFileName => fixtureFileName !== 'unified-project-contracts.json');
  const fixtureDocuments = await Promise.all(fixtureFileNames.map(async fixtureFileName => (
    collectAnnotatedDocuments(await readJson(path.join('fixtures', fixtureFileName)))
  )));

  return fixtureDocuments.flat();
}

function collectAnnotatedDocuments(value) {
  if (Array.isArray(value)) {
    return value.flatMap(collectAnnotatedDocuments);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const currentDocument = typeof value.schemaDefinition === 'string'
    && Object.hasOwn(value, 'document')
    ? [{ schemaDefinition: value.schemaDefinition, document: value.document }]
    : [];

  return currentDocument.concat(Object.values(value).flatMap(collectAnnotatedDocuments));
}

async function readProjectRequestsByEndpoint() {
  const workflowFixture = await readJson('fixtures/project-workflow-success.json');
  const bootstrapRequest = { contractVersion: 1 };
  const requestsByEndpoint = new Map([['/api/v1/projects/bootstrap', bootstrapRequest]]);

  for (const pair of workflowFixture.pairs) {
    requestsByEndpoint.set(pair.endpoint, pair.request.document);
  }

  return requestsByEndpoint;
}

async function readProjectFixtureResponses() {
  const bootstrapFixture = await readJson('fixtures/bootstrap-synchronized.json');
  const workflowFixture = await readJson('fixtures/project-workflow-success.json');
  const failureFixture = await readJson('fixtures/project-failures.json');
  const bootstrapResponses = bootstrapFixture.fixtures.map(fixture => ({
    endpoint: '/api/v1/projects/bootstrap',
    document: fixture.document,
  }));
  const workflowResponses = workflowFixture.pairs.map(pair => ({
    endpoint: pair.endpoint,
    document: pair.response.document,
  }));
  const failureResponses = failureFixture.fixtures.map(fixture => ({
    endpoint: fixture.endpoint,
    document: fixture.document,
  }));

  return bootstrapResponses.concat(workflowResponses, failureResponses);
}

async function readWorkflowResponse(pairName) {
  const workflowFixture = await readJson('fixtures/project-workflow-success.json');

  return workflowFixture.pairs.find(pair => pair.name === pairName).response.document;
}

async function readFailureFixture(fixtureName) {
  const failureFixture = await readJson('fixtures/project-failures.json');

  return structuredClone(failureFixture.fixtures.find(fixture => fixture.name === fixtureName));
}

async function readWorkflowCandidate() {
  const workflowFixture = await readJson('fixtures/project-workflow-success.json');

  return structuredClone(workflowFixture.pairs[0].request.document.candidate);
}

async function readCanonicalResourceChangeSet() {
  const unifiedFixture = await readJson('fixtures/unified-project-contracts.json');
  const changeSetFixture = unifiedFixture.fixtures.find(
    fixture => fixture.schemaDefinition === 'canonicalResourceChangeSet',
  );

  return structuredClone(changeSetFixture.document);
}

async function readBootstrapFixture(fixtureName) {
  const bootstrapFixture = await readJson('fixtures/bootstrap-synchronized.json');

  return bootstrapFixture.fixtures.find(fixture => fixture.name === fixtureName);
}
