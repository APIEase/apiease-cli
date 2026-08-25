import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROJECT_DESIGN_WORKFLOW_GUIDANCE,
  ProjectDesignContextService,
} from '../../../src/project/ProjectDesignContextService.js';

const LOCAL_BASELINE_DIGEST = `sha256:${'a'.repeat(64)}`;
const LOCAL_SNAPSHOT_DIGEST = `sha256:${'b'.repeat(64)}`;
const SERVER_SNAPSHOT_DIGEST = `sha256:${'c'.repeat(64)}`;
const SOURCE_DIGEST = `sha256:${'d'.repeat(64)}`;

describe('ProjectDesignContextService', () => {
  describe('buildDesignContext', () => {
    it('should combine verified server protocol context with deterministic local design intent', async () => {
      // Arrange
      const fixture = buildFixture();
      const projectDesignContextService = buildService(fixture);

      // Act
      const result = await projectDesignContextService.buildDesignContext({
        projectDirectoryPath: '/checkout/nested',
        projectApiInvocation: fixture.projectApiInvocation,
        projectRequirements: fixture.projectRequirements,
      });

      // Assert
      assert.deepEqual(result, buildExpectedContext(fixture));
      assert.deepEqual(fixture.receivedRequest, {
        contractVersion: 1,
        designContextContractVersion: 1,
        projectId: 'project-1',
        projectRequirements: fixture.projectRequirements,
      });
    });

    it('should report revision and snapshot digest conflicts explicitly', async () => {
      // Arrange
      const fixture = buildFixture();
      const projectDesignContextService = buildService(fixture);

      // Act
      const result = await projectDesignContextService.buildDesignContext({
        projectDirectoryPath: '/checkout',
        projectApiInvocation: fixture.projectApiInvocation,
        projectRequirements: fixture.projectRequirements,
      });

      // Assert
      assert.deepEqual(result.conflicts, [{
        code: 'PROJECT_DESIGN_BASELINE_REVISION_CONFLICT',
        localLiveRevision: 6,
        serverLiveRevision: 7,
      }, {
        code: 'PROJECT_DESIGN_BASELINE_DIGEST_CONFLICT',
        localSnapshotDigest: LOCAL_BASELINE_DIGEST,
        serverSnapshotDigest: SERVER_SNAPSHOT_DIGEST,
      }]);
    });

    it('should preserve a safe Project API failure without presenting local context as authoritative', async () => {
      // Arrange
      const fixture = buildFixture();
      fixture.serverResponse = {
        ok: false,
        outcome: 'PROJECT_UNAUTHORIZED',
        error: {
          code: 'PROJECT_UNAUTHORIZED',
          message: 'The Project API request did not complete.',
          diagnostics: [],
        },
      };
      const projectDesignContextService = buildService(fixture);

      // Act
      const result = await projectDesignContextService.buildDesignContext({
        projectDirectoryPath: '/checkout',
        projectApiInvocation: fixture.projectApiInvocation,
        projectRequirements: fixture.projectRequirements,
      });

      // Assert
      assert.deepEqual(result, fixture.serverResponse);
    });

    it('should not read protected operational values while selecting safe server bindings', async () => {
      // Arrange
      const fixture = buildFixture();
      Object.defineProperty(fixture.serverResponse.result.bindings[0], 'protectedValue', {
        enumerable: true,
        get: () => { throw new Error('protected values must not be read'); },
      });
      const projectDesignContextService = buildService(fixture);

      // Act
      const result = await projectDesignContextService.buildDesignContext({
        projectDirectoryPath: '/checkout',
        projectApiInvocation: fixture.projectApiInvocation,
        projectRequirements: fixture.projectRequirements,
      });

      // Assert
      assert.deepEqual(result.bindings, [{
        path: 'resources/variables/updated-variable.json',
        resourceType: 'variable',
        resourceId: 'variable-updated',
        resourceVersion: 'rv1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        handle: 'updated-variable',
      }]);
    });

    it('should reject a successful response for a different project identity', async () => {
      // Arrange
      const fixture = buildFixture();
      fixture.serverResponse.result.snapshot.projectIdentity.projectId = 'project-2';
      const projectDesignContextService = buildService(fixture);

      // Act and Assert
      await assert.rejects(projectDesignContextService.buildDesignContext({
        projectDirectoryPath: '/checkout',
        projectApiInvocation: fixture.projectApiInvocation,
        projectRequirements: fixture.projectRequirements,
      }), { code: 'PROJECT_DESIGN_IDENTITY_CONFLICT' });
    });
  });
});

function buildService(fixture) {
  return new ProjectDesignContextService({
    apiEaseProjectApiClient: {
      retrieveProjectDesignContext: async invocation => {
        fixture.receivedRequest = invocation.request;
        return fixture.serverResponse;
      },
    },
    projectCandidateBuilder: {
      buildCandidate: async () => fixture.candidateBuildResult,
    },
    projectCanonicalArtifactService: {
      serializeCanonicalValue: value => JSON.stringify(sortCanonicalValue(value)),
    },
  });
}

function buildFixture() {
  const unchangedSource = buildVariableSource('existing-variable', 'Existing variable');
  const updatedSource = buildVariableSource('updated-variable', 'Updated locally');
  const createdSource = buildFunctionSource();
  const binding = {
    path: 'resources/variables/updated-variable.json',
    resourceType: 'variable',
    resourceId: 'variable-updated',
    resourceVersion: 'rv1_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    handle: 'updated-variable',
  };
  const changeSet = {
    creates: [{ resourceType: 'function', handle: 'new-function', source: createdSource }],
    updates: [
      { resourceType: 'variable', handle: 'existing-variable', source: unchangedSource },
      { resourceType: 'variable', handle: 'updated-variable', source: updatedSource },
    ],
    deletes: [{
      resourceType: 'request',
      handle: 'deleted-request',
      bindingId: 'binding_request_deleted_request',
    }],
    secureInputs: [{
      resourceType: 'variable',
      handle: 'updated-variable',
      fieldPath: 'value',
      mode: 'preserve',
    }],
  };
  const projectRequirements = {
    projectName: 'Inventory tools',
    customerRequirements: [{ id: 'requirement-1', text: 'Keep inventory current.' }],
    confirmedDecisions: [],
  };
  const fixture = {
    binding,
    projectApiInvocation: {
      apiBaseUrl: 'https://apiease.example.com',
      authenticationContext: { opaque: true },
    },
    projectRequirements,
    candidateBuildResult: {
      changeSet,
      candidateSnapshotDigest: LOCAL_SNAPSHOT_DIGEST,
      localState: {
        projectIdentity: {
          normalizedShopDomain: 'shop.myshopify.com',
          projectId: 'project-1',
          templateOwner: 'APIEase',
          templateRepository: 'apiease-template',
          templateRef: 'main',
        },
        baseline: { liveRevision: 6, snapshotDigest: LOCAL_BASELINE_DIGEST },
      },
      deletionIntents: [{
        sourcePath: 'resources/requests/deleted-request.json',
        deletePath: 'resources/requests/delete/deleted-request.json',
        resourceType: 'request',
        handle: 'deleted-request',
        sourceDigest: SOURCE_DIGEST,
      }],
      requiredSecureValues: [],
    },
  };
  fixture.serverResponse = {
    ok: true,
    outcome: 'PROJECT_DESIGN_CONTEXT_READY',
    result: {
      protocol: {
        protocolVersion: '1.0.0',
        commonInstructions: 'exact common instructions\n',
        commonInstructionDigest: `sha256:${'e'.repeat(64)}`,
        codexEnvelope: 'exact Codex envelope\n',
      },
      projectRequirements,
      snapshot: {
        projectIdentity: {
          normalizedShopDomain: 'shop.myshopify.com',
          projectId: 'project-1',
        },
        liveRevision: 7,
        snapshotDigest: SERVER_SNAPSHOT_DIGEST,
      },
      inventory: [
        buildInventoryEntry('existing-variable'),
        buildInventoryEntry('updated-variable'),
      ],
      canonicalBodies: [
        buildCanonicalBody(unchangedSource),
        buildCanonicalBody(buildVariableSource('updated-variable', 'Updated remotely')),
      ],
      bindings: [binding],
      limits: { maximumFileCount: 1_000, maximumAggregateBytes: 25_000_000 },
      diagnostics: [],
    },
  };

  return fixture;
}

function buildExpectedContext(fixture) {
  const serverResult = fixture.serverResponse.result;
  const candidateResult = fixture.candidateBuildResult;
  return {
    ok: true,
    outcome: 'PROJECT_DESIGN_CONTEXT_READY',
    protocol: serverResult.protocol,
    projectRequirements: serverResult.projectRequirements,
    serverBaseline: serverResult.snapshot,
    localBaseline: {
      projectIdentity: {
        normalizedShopDomain: 'shop.myshopify.com',
        projectId: 'project-1',
      },
      liveRevision: 6,
      snapshotDigest: LOCAL_BASELINE_DIGEST,
    },
    inventory: serverResult.inventory,
    canonicalBodies: serverResult.canonicalBodies,
    bindings: [fixture.binding],
    localEdits: {
      snapshotDigest: LOCAL_SNAPSHOT_DIGEST,
      hasManagedEdits: true,
      creates: [candidateResult.changeSet.creates[0]],
      updates: [candidateResult.changeSet.updates[1]],
    },
    deletions: [{
      sourcePath: 'resources/requests/deleted-request.json',
      deletePath: 'resources/requests/delete/deleted-request.json',
      resourceType: 'request',
      handle: 'deleted-request',
      sourceDigest: SOURCE_DIGEST,
    }],
    secureSelectors: candidateResult.changeSet.secureInputs,
    conflicts: [{
      code: 'PROJECT_DESIGN_BASELINE_REVISION_CONFLICT',
      localLiveRevision: 6,
      serverLiveRevision: 7,
    }, {
      code: 'PROJECT_DESIGN_BASELINE_DIGEST_CONFLICT',
      localSnapshotDigest: LOCAL_BASELINE_DIGEST,
      serverSnapshotDigest: SERVER_SNAPSHOT_DIGEST,
    }],
    limits: serverResult.limits,
    diagnostics: serverResult.diagnostics,
    workflowGuidance: [...PROJECT_DESIGN_WORKFLOW_GUIDANCE],
  };
}

function buildVariableSource(handle, name) {
  return {
    contractVersion: 1,
    formatVersion: 1,
    resourceType: 'variable',
    handle,
    name,
    sensitive: true,
    value: { mode: 'preserve' },
  };
}

function buildFunctionSource() {
  return {
    contractVersion: 1,
    formatVersion: 1,
    resourceType: 'function',
    handle: 'new-function',
    name: 'New function',
    description: 'New',
    type: 'liquid',
    liquid: '',
    parameters: [],
  };
}

function buildInventoryEntry(handle) {
  return {
    handle,
    path: `resources/variables/${handle}.json`,
    resourceType: 'variable',
    sourceDigest: SOURCE_DIGEST,
  };
}

function buildCanonicalBody(source) {
  return {
    path: `resources/variables/${source.handle}.json`,
    sourceDigest: SOURCE_DIGEST,
    source,
  };
}

function sortCanonicalValue(value) {
  if (Array.isArray(value)) return value.map(sortCanonicalValue);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(Object.keys(value).sort().map(key => (
    [key, sortCanonicalValue(value[key])]
  )));
}
