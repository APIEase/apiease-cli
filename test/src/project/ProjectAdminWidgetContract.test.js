import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { ProjectCanonicalArtifactService } from '../../../src/project/ProjectCanonicalArtifactService.js';
import { ProjectBootstrapArtifactService } from '../../../src/project/ProjectBootstrapArtifactService.js';
import { ProjectContractService } from '../../../src/project/ProjectContractService.js';

const codec = new ProjectCanonicalArtifactService();
const source = { contractVersion: 1, formatVersion: 1, resourceType: 'widget', handle: 'admin-demo',
  name: 'Admin demo', type: 'admin', adminTarget: 'admin.order-details.block.render', adminText: '',
  adminUi: '{"version":1,"components":[{"type":"text","text":"Hello"}]}',
  liquid: '', javascript: '', externalJavascriptUrls: [], disableJavascript: false };
const sourcePath = 'resources/widgets/admin-demo.json';
const canonicalContent = value => `${codec.serializeCanonicalValue(value)}\n`;

describe('Admin widget Project API contract', () => {
  describe('canonical source', () => {
    it('should serialize and parse every supported Admin field without changing bytes', () => {
      // Act
      const content = codec.serializeResourceSource({ resourceType: 'widget', resource: source });
      // Assert
      assert.equal(content, canonicalContent(source));
      assert.deepEqual(codec.parseResourceSource({ path: sourcePath, content }), source);
    });
    it('should preserve omitted storefront fields and existing canonical bytes', () => {
      // Arrange
      const storefront = { ...source, liquid: '<p>Hello</p>' };
      for (const field of ['type', 'adminTarget', 'adminText', 'adminUi']) delete storefront[field];
      // Act and Assert
      assert.equal(codec.serializeParsedResourceSource(storefront), canonicalContent(storefront));
    });
    it('should reject invalid Admin content rather than discard fields on serialization', () => {
      // Act and Assert
      assert.throws(() => codec.serializeResourceSource({ resourceType: 'widget',
        resource: { ...source, adminUi: '{"version":1,"components":[]}' } }),
      { code: 'CANONICAL_RESOURCE_SOURCE_INVALID_CONTENT' });
    });
    it('should still reject arbitrary canonical fields', () => {
      // Act and Assert
      assert.throws(() => codec.parseResourceSource({ path: sourcePath,
        content: canonicalContent({ ...source, extra: true }) }),
      { code: 'CANONICAL_RESOURCE_SOURCE_UNSUPPORTED_FIELD' });
    });
  });
  describe('schema and snapshot verification', () => {
    it('should accept Admin sources in change sets and validation requests intact', () => {
      // Arrange
      const service = new ProjectContractService();
      const changeSet = { contractVersion: 1, changeSetId: 'admin_demo', changeSetDigest: `sha256:${'a'.repeat(64)}`,
        baseline: { liveRevision: 1, snapshotDigest: `sha256:${'b'.repeat(64)}` },
        creates: [{ resourceType: 'widget', handle: source.handle, source }], updates: [], deletes: [],
        verifiedBindings: [], secureInputs: [] };
      // Act and Assert
      assert.deepEqual(service.validateCanonicalResourceChangeSet(changeSet), { ok: true });
      assert.deepEqual(service.validateProjectApiRequest('/api/v1/projects/validate', { contractVersion: 1, changeSet }), { ok: true });
    });
    for (const fields of [{ type: 'wrong' }, { adminTarget: 'unsupported' }, { adminUi: 7 },
      { adminText: '', adminUi: '' }]) {
      it('should reject unsupported Admin fields in the schema', () => {
        // Act and Assert
        assert.equal(new ProjectContractService().validateFixtureDocument('canonicalWidgetSource', { ...source, ...fields }).ok, false);
      });
    }
    it('should verify exact Admin source bytes and bindings in a bootstrap snapshot', async () => {
      // Arrange
      const response = await buildAdminBootstrap();
      // Act
      const artifact = new ProjectBootstrapArtifactService().verifySynchronizedArtifact(response);
      // Assert
      assert.equal(artifact.files[1].content.toString(), canonicalContent(source));
      assert.equal(artifact.localState.resources[0].handle, source.handle);
    });
    it('should reject tampered Admin bytes with the original digest', async () => {
      // Arrange
      const response = await buildAdminBootstrap();
      response.result.files[1].content = response.result.files[1].content.replace('Hello', 'Other');
      // Act and Assert
      assert.throws(() => new ProjectBootstrapArtifactService().verifySynchronizedArtifact(response),
        { code: 'PROJECT_BOOTSTRAP_ARTIFACT_FILE_DIGEST_MISMATCH' });
    });
  });
});

async function buildAdminBootstrap() {
  const fixture = JSON.parse(await fs.readFile(new URL('../../../contracts/apex-projects/v1/fixtures/bootstrap-synchronized.json', import.meta.url), 'utf8'));
  const response = structuredClone(fixture.fixtures[0].document);
  const result = response.result;
  const content = canonicalContent(source);
  result.files[1] = { ...result.files[1], path: sourcePath, content, digest: codec.computeFileDigest(content) };
  const binding = { ...result.bindings[0], path: sourcePath, resourceType: 'widget', handle: source.handle };
  result.bindings = [binding];
  result.manifest.resources = [binding];
  result.localState.resources = [binding];
  result.snapshotDigest = codec.computeResourceSnapshotDigest(result.files);
  result.manifest.snapshotDigest = result.snapshotDigest;
  result.localState.baseline.snapshotDigest = result.snapshotDigest;
  result.manifest.totalBytes = result.files.reduce((sum, file) => sum + Buffer.byteLength(file.content), 0);
  return response;
}
