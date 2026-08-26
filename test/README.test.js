import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..');
const readmeFilePath = path.join(projectDirectoryPath, 'README.md');

describe('README', () => {
  describe('installation documentation', () => {
    it('should describe the public package as apiease', async () => {
      // Arrange
      const readme = await fs.readFile(readmeFilePath, 'utf8');

      // Assert
      assert.match(readme, /# apiease\b/);
      assert.match(readme, /npm install -g apiease/);
      assert.match(readme, /apiease --version/);
      assert.doesNotMatch(readme, /npm install -g apiease-cli/);
    });

    it('should document only personal Project API authentication', async () => {
      // Arrange
      const readme = await fs.readFile(readmeFilePath, 'utf8');

      // Assert
      assert.doesNotMatch(readme, /bearer|worker|checkpoint|proposal branch/iu);
    });
  });

  describe('CRUD resource documentation', () => {
    it('should list function in the top-level command reference', async () => {
      // Arrange
      const readme = await fs.readFile(readmeFilePath, 'utf8');

      // Act
      const commandSection = readme;

      // Assert
      assert.match(commandSection, /apiease create <request\|widget\|variable\|function> --file <path>/);
      assert.match(commandSection, /apiease read function --function-handle <handle>/);
      assert.match(commandSection, /apiease update function --function-handle <handle> --file <path>/);
      assert.match(commandSection, /apiease delete function --function-handle <handle>/);
    });

    it('should describe function in the supported resource guidance', async () => {
      // Arrange
      const readme = await fs.readFile(readmeFilePath, 'utf8');

      // Act
      const resourceGuidanceSection = readme;

      // Assert
      assert.match(resourceGuidanceSection, /Supported resource names are `request`, `widget`, `variable`, and `function`\./);
      assert.match(resourceGuidanceSection, /Use `--request-handle` for `request`, `--widget-handle` for `widget`, `--variable-handle` for `variable`, and `--function-handle` for `function`\./);
    });

    it('should include function examples for each CRUD verb', async () => {
      // Arrange
      const readme = await fs.readFile(readmeFilePath, 'utf8');

      // Act
      const exampleSection = readme;

      // Assert
      assert.match(exampleSection, /apiease create function \\\n  --file \.\/function-definition\.json/);
      assert.match(exampleSection, /apiease read function --function-handle apply-discount/);
      assert.match(exampleSection, /apiease update function --function-handle apply-discount --file \.\/function-definition\.json/);
      assert.match(exampleSection, /apiease delete function --function-handle apply-discount/);
    });

    it('should document request handles as source file identifiers', async () => {
      // Arrange
      const readme = await fs.readFile(readmeFilePath, 'utf8');

      // Act
      const requestSourceExampleSection = readme;

      // Assert
      assert.match(requestSourceExampleSection, /Resource source files use `handle` as the stable repository identifier\./);
      assert.match(requestSourceExampleSection, /`id` is server-owned and should not be stored in request, widget, variable, or function source files\./);
      assert.match(requestSourceExampleSection, /"handle": "cli-demo-request"/);
      assert.match(requestSourceExampleSection, /--auto-update-source-identifier/);
      assert.doesNotMatch(requestSourceExampleSection, /"id": "cli-demo-request"/);
    });

    it('should document canonical widget source fields', async () => {
      // Arrange
      const readme = await fs.readFile(readmeFilePath, 'utf8');

      // Act
      const widgetSourceGuidance = readme;

      // Assert
      assert.match(widgetSourceGuidance, /Widget source files use `handle` for the stable identifier and `name` for display text\./);
      assert.doesNotMatch(widgetSourceGuidance, /`widgetHandle`/);
      assert.doesNotMatch(widgetSourceGuidance, /`widgetName`/);
    });

    it('should document create as idempotent by handle for every supported resource', async () => {
      // Arrange
      const readme = await fs.readFile(readmeFilePath, 'utf8');

      // Act
      const createBehaviorSection = readme;

      // Assert
      assert.match(createBehaviorSection, /`apiease create` is idempotent by `handle` for `request`, `widget`, `variable`, and `function` source files\./);
      assert.match(createBehaviorSection, /When a source file has a valid `handle`, the CLI looks up the remote resource by handle, updates it when found, and creates it when missing\./);
      assert.match(createBehaviorSection, /Rerunning `apiease create widget --file <widget\.json>` updates the existing widget instead of creating a duplicate\./);
      assert.doesNotMatch(createBehaviorSection, /When a request source file has a valid `handle`, `apiease create request` looks up the remote request/);
    });

    it('should document that auto source identifier update rewrites request and widget source files', async () => {
      // Arrange
      const readme = await fs.readFile(readmeFilePath, 'utf8');

      // Act
      const autoUpdateSourceIdentifierSection = readme;

      // Assert
      assert.match(autoUpdateSourceIdentifierSection, /`--auto-update-source-identifier` rewrites the source JSON file before creating the resource\./);
      assert.match(autoUpdateSourceIdentifierSection, /For older widget source files, it migrates legacy widget fields to `handle` and `name` and removes server-owned id fields\./);
      assert.match(autoUpdateSourceIdentifierSection, /apiease create widget \\\n  --file \.\/widget-definition\.json \\\n  --auto-update-source-identifier/);
    });

    it('should document request id option compatibility with handles', async () => {
      // Arrange
      const readme = await fs.readFile(readmeFilePath, 'utf8');

      // Act
      const requestIdentifierSection = readme;

      // Assert
      assert.match(requestIdentifierSection, /apiease read request --request-handle <handle>/);
      assert.match(requestIdentifierSection, /apiease update request --request-handle <handle> --file <path>/);
      assert.match(requestIdentifierSection, /apiease delete request --request-handle <handle>/);
      assert.match(requestIdentifierSection, /Legacy id or name option flags remain available as compatibility aliases; pass handles through those options during migration only\./);
      assert.match(requestIdentifierSection, /apiease read request --request-handle cli-demo-request/);
      assert.match(requestIdentifierSection, /apiease update request --request-handle cli-demo-request --file \.\/request-definition\.json/);
      assert.match(requestIdentifierSection, /apiease delete request --request-handle cli-demo-request/);
      assert.doesNotMatch(requestIdentifierSection, /apiease read request --request-id request-123/);
    });
  });
});
