import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const templateProjectOwnershipPolicyModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'template', 'TemplateProjectOwnershipPolicy.js'),
).href;

describe('TemplateProjectOwnershipPolicy', () => {
  describe('isTemplateManagedPath', () => {
    it('should return false for customer-owned template files', async () => {
      // Arrange
      const { TemplateProjectOwnershipPolicy } = await import(templateProjectOwnershipPolicyModuleUrl);
      const templateProjectOwnershipPolicy = new TemplateProjectOwnershipPolicy();

      // Act
      const isCustomReadmeManaged = templateProjectOwnershipPolicy.isTemplateManagedPath('CUSTOM_README.md');
      const isCustomAgentGuidanceManaged = templateProjectOwnershipPolicy.isTemplateManagedPath(
        'CUSTOM_AGENT_GUIDANCE.md',
      );

      // Assert
      assert.equal(isCustomReadmeManaged, false);
      assert.equal(isCustomAgentGuidanceManaged, false);
    });

    it('keeps resource JSON and operational synchronization metadata outside template ownership', async () => {
      const {TemplateProjectOwnershipPolicy} = await import(templateProjectOwnershipPolicyModuleUrl);
      const policy = new TemplateProjectOwnershipPolicy();
      for (const file of ['resources/widgets/example-widget.json', '.apiease/project.json', '.apiease/template.json']) {
        assert.equal(policy.isTemplateManagedPath(file), false);
      }
      assert.equal(policy.isTemplateManagedPath('docs/resource-instructions/source-authoring.md'), true);
    });

    it('should return true for scaffold-managed template files', async () => {
      // Arrange
      const { TemplateProjectOwnershipPolicy } = await import(templateProjectOwnershipPolicyModuleUrl);
      const templateProjectOwnershipPolicy = new TemplateProjectOwnershipPolicy();

      // Act
      const isReadmeManaged = templateProjectOwnershipPolicy.isTemplateManagedPath('README.md');
      const isConfigManaged = templateProjectOwnershipPolicy.isTemplateManagedPath('apiease.config.js');
      const isWidgetManaged = templateProjectOwnershipPolicy.isTemplateManagedPath(
        'docs/examples/resources/widgets/example-widget.json',
      );

      // Assert
      assert.equal(isReadmeManaged, true);
      assert.equal(isConfigManaged, true);
      assert.equal(isWidgetManaged, true);
    });
  });
});
