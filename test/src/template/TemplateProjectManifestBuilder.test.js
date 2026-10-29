import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const templateProjectManifestBuilderModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'template', 'TemplateProjectManifestBuilder.js'),
).href;

describe('TemplateProjectManifestBuilder', () => {
  describe('buildTemplateManifest', () => {
    it('should build a relative-path manifest for managed template files while excluding ignored directories', async () => {
      // Arrange
      const { TemplateProjectManifestBuilder } = await import(templateProjectManifestBuilderModuleUrl);
      const templateProjectManifestBuilder = new TemplateProjectManifestBuilder();
      const temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-template-manifest-'));
      const templateDirectoryPath = path.join(temporaryDirectoryPath, 'apiease-template');

      await fs.mkdir(path.join(templateDirectoryPath, '.git'), { recursive: true });
      await fs.mkdir(path.join(templateDirectoryPath, '.idea'), { recursive: true });
      await fs.mkdir(path.join(templateDirectoryPath, '.codex'), { recursive: true });
      await fs.mkdir(path.join(templateDirectoryPath, 'node_modules', 'left-pad'), { recursive: true });
      await fs.mkdir(path.join(templateDirectoryPath, 'resources', 'requests'), { recursive: true });
      await fs.writeFile(path.join(templateDirectoryPath, '.gitignore'), 'node_modules/\n');
      await fs.writeFile(path.join(templateDirectoryPath, '.git', 'HEAD'), 'ref: refs/heads/main\n');
      await fs.writeFile(path.join(templateDirectoryPath, '.idea', 'workspace.xml'), '<xml />\n');
      await fs.writeFile(path.join(templateDirectoryPath, '.codex', 'goal.json'), '{\n  "goal": "ignore me"\n}\n');
      await fs.writeFile(path.join(templateDirectoryPath, 'node_modules', 'left-pad', 'index.js'), 'module.exports = 1;\n');
      await fs.writeFile(path.join(templateDirectoryPath, 'README.md'), 'template readme\n');
      await fs.writeFile(path.join(templateDirectoryPath, 'CUSTOM_AGENT_GUIDANCE.md'), 'custom guidance\n');
      await fs.writeFile(path.join(templateDirectoryPath, 'CUSTOM_README.md'), 'custom readme\n');
      await fs.writeFile(path.join(templateDirectoryPath, 'resources', 'requests', 'example.json'), '{}\n');

      // Act
      const manifest = await templateProjectManifestBuilder.buildTemplateManifest(templateDirectoryPath);

      // Assert
      assert.deepEqual(Object.keys(manifest).sort(), [
        '.gitignore',
        'README.md',
      ]);
      assert.equal(typeof manifest['.gitignore'], 'string');
      assert.equal(typeof manifest['README.md'], 'string');
      assert.equal(Object.hasOwn(manifest, 'resources/requests/example.json'), false);
    });
  });
});
