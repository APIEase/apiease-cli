import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..', '..');
const upgradeProjectCommandModuleUrl = pathToFileURL(
  path.join(projectDirectoryPath, 'src', 'cli', 'UpgradeProjectCommand.js'),
).href;

describe('UpgradeProjectCommand', () => {
  describe('run', () => {
    it('should report success when the project template version matches the current template version', async () => {
      // Arrange
      const { UpgradeProjectCommand } = await import(upgradeProjectCommandModuleUrl);
      const stdoutChunks = [];
      const stderrChunks = [];
      const upgradeProjectCommand = new UpgradeProjectCommand({
        templateProjectManifestBuilder: {buildTemplateManifest: async () => ({})},
        projectUpgradePlanService: {buildUpgradePlan: async () => ({addPaths: [], removePaths: [], updatePaths: [], skipPaths: []})},
        projectMetadataFileService: {
          async readProjectMetadata() {
            return {
              ok: true,
              projectMetadata: {
                template: {
                  manifest: {},
                  version: {
                    type: 'gitCommit',
                    value: 'template-sha-1',
                  },
                },
              },
            };
          },
        },
        templateProjectSourceResolver: {
          resolveTemplateSource() {
            return {
              templateDirectoryPath: '/tmp/apiease-template',
            };
          },
        },
        templateProjectVersionResolver: {
          async resolveTemplateVersion() {
            return {
              type: 'gitCommit',
              value: 'template-sha-1',
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await upgradeProjectCommand.run(['upgrade', '--check']);

      // Assert
      assert.equal(exitCode, 0);
      assert.equal(stdoutChunks.join(''), 'APIEASE project template is up to date.\n');
      assert.equal(stderrChunks.join(''), '');
    });

    it('should report a pending upgrade when the current template version differs from the stored project metadata', async () => {
      // Arrange
      const { UpgradeProjectCommand } = await import(upgradeProjectCommandModuleUrl);
      const stdoutChunks = [];
      const stderrChunks = [];
      const upgradeProjectCommand = new UpgradeProjectCommand({
        templateProjectManifestBuilder: {buildTemplateManifest: async () => ({})},
        projectUpgradePlanService: {buildUpgradePlan: async () => ({addPaths: [], removePaths: [], updatePaths: [], skipPaths: []})},
        projectMetadataFileService: {
          async readProjectMetadata() {
            return {
              ok: true,
              projectMetadata: {
                template: {
                  manifest: {},
                  version: {
                    type: 'gitCommit',
                    value: 'template-sha-1',
                  },
                },
              },
            };
          },
        },
        templateProjectSourceResolver: {
          resolveTemplateSource() {
            return {
              templateDirectoryPath: '/tmp/apiease-template',
            };
          },
        },
        templateProjectVersionResolver: {
          async resolveTemplateVersion() {
            return {
              type: 'gitCommit',
              value: 'template-sha-2',
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await upgradeProjectCommand.run(['upgrade', '--check']);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(
        stdoutChunks.join(''),
        [
          'APIEASE project template upgrade is available.',
          'APIEASE project upgrade dry run.',
          'Current project template version: template-sha-1',
          'Latest template version: template-sha-2',
          '',
        ].join('\n'),
      );
      assert.equal(stderrChunks.join(''), '');
    });

    it('should return a structured failure when the project metadata file is missing', async () => {
      // Arrange
      const { UpgradeProjectCommand } = await import(upgradeProjectCommandModuleUrl);
      const stdoutChunks = [];
      const stderrChunks = [];
      const upgradeProjectCommand = new UpgradeProjectCommand({
        projectMetadataFileService: {
          async readProjectMetadata() {
            return {
              ok: false,
              errorCode: 'APIEASE_PROJECT_METADATA_NOT_FOUND',
              message: 'Missing metadata',
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await upgradeProjectCommand.run(['upgrade', '--check']);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stdoutChunks.join(''), '');
      assert.equal(
        stderrChunks.join(''),
        [
          'APIEASE project upgrade check failed.',
          'Error Code: APIEASE_PROJECT_METADATA_NOT_FOUND',
          'Message: Missing metadata',
          '',
        ].join('\n'),
      );
    });

    it('should report the upgrade plan in dry run mode', async () => {
      // Arrange
      const { UpgradeProjectCommand } = await import(upgradeProjectCommandModuleUrl);
      const stdoutChunks = [];
      const stderrChunks = [];
      const upgradeProjectCommand = new UpgradeProjectCommand({
        projectMetadataFileService: {
          async readProjectMetadata() {
            return {
              ok: true,
              projectMetadata: {
                template: {
                  manifest: {
                    'updated.txt': 'old-hash',
                  },
                  version: {
                    type: 'gitCommit',
                    value: 'template-sha-1',
                  },
                },
              },
            };
          },
        },
        templateProjectSourceResolver: {
          resolveTemplateSource() {
            return {
              templateDirectoryPath: '/tmp/apiease-template',
            };
          },
        },
        templateProjectVersionResolver: {
          async resolveTemplateVersion() {
            return {
              type: 'gitCommit',
              value: 'template-sha-2',
            };
          },
        },
        templateProjectManifestBuilder: {
          async buildTemplateManifest() {
            return {
              'updated.txt': 'new-hash',
              'added.txt': 'added-hash',
            };
          },
        },
        projectUpgradePlanService: {
          async buildUpgradePlan() {
            return {
              addPaths: ['added.txt'],
              removePaths: ['removed.txt'],
              skipPaths: ['conflict.txt'],
              updatePaths: ['updated.txt'],
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await upgradeProjectCommand.run(['upgrade', '--dry-run']);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(
        stdoutChunks.join(''),
        [
          'APIEASE project upgrade dry run.',
          'Current project template version: template-sha-1',
          'Latest template version: template-sha-2',
          '',
          'Add:',
          'added.txt',
          '',
          'Update:',
          'updated.txt',
          '',
          'Remove:',
          'removed.txt',
          '',
          'Skip conflict:',
          'conflict.txt',
          '',
          'Preserved conflicts. Choose --on-conflict overwrite to replace them, or --on-conflict ignore to preserve them for this upgrade.',
          '',
        ].join('\n'),
      );
      assert.equal(stderrChunks.join(''), '');
    });

    it('should apply safe project upgrades and write updated metadata when run without flags', async () => {
      // Arrange
      const { UpgradeProjectCommand } = await import(upgradeProjectCommandModuleUrl);
      const stdoutChunks = [];
      const stderrChunks = [];
      const writeCalls = [];
      const applyCalls = [];
      const upgradeProjectCommand = new UpgradeProjectCommand({
        projectMetadataFileService: {
          async readProjectMetadata() {
            return {
              ok: true,
              projectMetadata: {
                cliVersion: '0.1.0-test',
                template: {
                  displayTemplateSource: '../apiease-template',
                  manifest: {
                    'README.md': 'readme-old-hash',
                    'updated.txt': 'old-hash',
                    'removed.txt': 'remove-hash',
                  },
                  publicRepositoryUrl: 'https://github.com/kevinstl-org/apiease-template',
                  sourceType: 'localDevelopment',
                  version: {
                    type: 'gitCommit',
                    value: 'template-sha-1',
                  },
                },
              },
            };
          },
          async writeProjectMetadata(writePayload) {
            writeCalls.push(writePayload);
          },
        },
        templateProjectSourceResolver: {
          resolveTemplateSource() {
            return {
              displayTemplateSource: '../apiease-template',
              publicRepositoryUrl: 'https://github.com/kevinstl-org/apiease-template',
              sourceType: 'localDevelopment',
              templateDirectoryPath: '/tmp/apiease-template',
            };
          },
        },
        templateProjectVersionResolver: {
          async resolveTemplateVersion() {
            return {
              type: 'gitCommit',
              value: 'template-sha-2',
            };
          },
        },
        templateProjectManifestBuilder: {
          async buildTemplateManifest() {
            return {
              'updated.txt': 'new-hash',
              'added.txt': 'added-hash',
              'README.md': 'readme-new-hash',
            };
          },
        },
        projectUpgradePlanService: {
          async buildUpgradePlan(upgradePlanInput) {
            applyCalls.push({
              kind: 'plan',
              upgradePlanInput,
            });
            return {
              addPaths: ['added.txt'],
              removePaths: ['removed.txt'],
              skipPaths: [],
              updatePaths: ['README.md', 'updated.txt'],
            };
          },
        },
        projectUpgradeApplierService: {
          async applyUpgradePlan(applyPayload) {
            applyCalls.push({
              applyPayload,
              kind: 'apply',
            });
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await upgradeProjectCommand.run(['upgrade'], {
        currentWorkingDirectoryPath: '/tmp/project',
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(applyCalls, [
        {
          kind: 'plan',
          upgradePlanInput: {
            templateDirectoryPath: '/tmp/apiease-template',
            conflictChoice: undefined,
            currentProjectDirectoryPath: '/tmp/project',
            currentTemplateManifest: {
              'added.txt': 'added-hash',
              'README.md': 'readme-new-hash',
              'updated.txt': 'new-hash',
            },
            storedTemplateManifest: {
              'README.md': 'readme-old-hash',
              'removed.txt': 'remove-hash',
              'updated.txt': 'old-hash',
            },
          },
        },
        {
          applyPayload: {
            currentProjectDirectoryPath: '/tmp/project',
            templateDirectoryPath: '/tmp/apiease-template',
            upgradePlan: {
              addPaths: ['added.txt'],
              removePaths: ['removed.txt'],
              skipPaths: [],
              updatePaths: ['README.md', 'updated.txt'],
            },
          },
          kind: 'apply',
        },
      ]);
      assert.deepEqual(writeCalls, [
        {
          projectDirectoryPath: '/tmp/project',
          projectMetadata: {
            cliVersion: '0.1.0-test',
            template: {
              displayTemplateSource: '../apiease-template',
              manifest: {
                'added.txt': 'added-hash',
                'README.md': 'readme-new-hash',
                'updated.txt': 'new-hash',
              },
              publicRepositoryUrl: 'https://github.com/kevinstl-org/apiease-template',
              sourceType: 'localDevelopment',
              version: {
                type: 'gitCommit',
                value: 'template-sha-2',
              },
            },
          },
        },
      ]);
      assert.equal(
        stdoutChunks.join(''),
        [
          'APIEASE project template upgraded successfully.',
          'Current project template version: template-sha-1',
          'Latest template version: template-sha-2',
          '',
          'Added:',
          'added.txt',
          '',
          'Updated:',
          'README.md',
          'updated.txt',
          '',
          'Removed:',
          'removed.txt',
          '',
        ].join('\n'),
      );
      assert.equal(stderrChunks.join(''), '');
    });

    it('should ignore previously tracked .codex files during upgrade planning and metadata writes', async () => {
      // Arrange
      const { UpgradeProjectCommand } = await import(upgradeProjectCommandModuleUrl);
      const stdoutChunks = [];
      const stderrChunks = [];
      const writeCalls = [];
      const applyCalls = [];
      const upgradeProjectCommand = new UpgradeProjectCommand({
        projectMetadataFileService: {
          async readProjectMetadata() {
            return {
              ok: true,
              projectMetadata: {
                cliVersion: '0.1.0-test',
                template: {
                  displayTemplateSource: '../apiease-template',
                  manifest: {
                    '.codex/goal.json': 'goal-old-hash',
                    'README.md': 'readme-old-hash',
                  },
                  publicRepositoryUrl: 'https://github.com/kevinstl-org/apiease-template',
                  sourceType: 'localDevelopment',
                  version: {
                    type: 'gitCommit',
                    value: 'template-sha-1',
                  },
                },
              },
            };
          },
          async writeProjectMetadata(writePayload) {
            writeCalls.push(writePayload);
          },
        },
        templateProjectSourceResolver: {
          resolveTemplateSource() {
            return {
              displayTemplateSource: '../apiease-template',
              publicRepositoryUrl: 'https://github.com/kevinstl-org/apiease-template',
              sourceType: 'localDevelopment',
              templateDirectoryPath: '/tmp/apiease-template',
            };
          },
        },
        templateProjectVersionResolver: {
          async resolveTemplateVersion() {
            return {
              type: 'gitCommit',
              value: 'template-sha-2',
            };
          },
        },
        templateProjectManifestBuilder: {
          async buildTemplateManifest() {
            return {
              'README.md': 'readme-new-hash',
            };
          },
        },
        projectUpgradePlanService: {
          async buildUpgradePlan(upgradePlanInput) {
            applyCalls.push({
              kind: 'plan',
              upgradePlanInput,
            });
            return {
              addPaths: [],
              removePaths: [],
              skipPaths: [],
              updatePaths: ['README.md'],
            };
          },
        },
        projectUpgradeApplierService: {
          async applyUpgradePlan(applyPayload) {
            applyCalls.push({
              applyPayload,
              kind: 'apply',
            });
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await upgradeProjectCommand.run(['upgrade'], {
        currentWorkingDirectoryPath: '/tmp/project',
      });

      // Assert
      assert.equal(exitCode, 0);
      assert.deepEqual(applyCalls, [
        {
          kind: 'plan',
          upgradePlanInput: {
            templateDirectoryPath: '/tmp/apiease-template',
            conflictChoice: undefined,
            currentProjectDirectoryPath: '/tmp/project',
            currentTemplateManifest: {
              'README.md': 'readme-new-hash',
            },
            storedTemplateManifest: {
              'README.md': 'readme-old-hash',
            },
          },
        },
        {
          applyPayload: {
            currentProjectDirectoryPath: '/tmp/project',
            templateDirectoryPath: '/tmp/apiease-template',
            upgradePlan: {
              addPaths: [],
              removePaths: [],
              skipPaths: [],
              updatePaths: ['README.md'],
            },
          },
          kind: 'apply',
        },
      ]);
      assert.deepEqual(writeCalls, [
        {
          projectDirectoryPath: '/tmp/project',
          projectMetadata: {
            cliVersion: '0.1.0-test',
            template: {
              displayTemplateSource: '../apiease-template',
              manifest: {
                'README.md': 'readme-new-hash',
              },
              publicRepositoryUrl: 'https://github.com/kevinstl-org/apiease-template',
              sourceType: 'localDevelopment',
              version: {
                type: 'gitCommit',
                value: 'template-sha-2',
              },
            },
          },
        },
      ]);
      assert.equal(
        stdoutChunks.join(''),
        [
          'APIEASE project template upgraded successfully.',
          'Current project template version: template-sha-1',
          'Latest template version: template-sha-2',
          '',
          'Updated:',
          'README.md',
          '',
        ].join('\n'),
      );
      assert.equal(stderrChunks.join(''), '');
    });

    it('should apply safe upgrades while preserving the previous template version when managed conflicts remain', async () => {
      // Arrange
      const { UpgradeProjectCommand } = await import(upgradeProjectCommandModuleUrl);
      const stdoutChunks = [];
      const stderrChunks = [];
      const writeCalls = [];
      const applyCalls = [];
      const upgradeProjectCommand = new UpgradeProjectCommand({
        projectMetadataFileService: {
          async readProjectMetadata() {
            return {
              ok: true,
              projectMetadata: {
                cliVersion: '0.1.0-test',
                template: {
                  displayTemplateSource: '../apiease-template',
                  manifest: {
                    'updated.txt': 'old-hash',
                    'conflict.txt': 'conflict-old-hash',
                  },
                  publicRepositoryUrl: 'https://github.com/kevinstl-org/apiease-template',
                  sourceType: 'localDevelopment',
                  version: {
                    type: 'gitCommit',
                    value: 'template-sha-1',
                  },
                },
              },
            };
          },
          async writeProjectMetadata(writePayload) {
            writeCalls.push(writePayload);
          },
        },
        templateProjectSourceResolver: {
          resolveTemplateSource() {
            return {
              displayTemplateSource: '../apiease-template',
              publicRepositoryUrl: 'https://github.com/kevinstl-org/apiease-template',
              sourceType: 'localDevelopment',
              templateDirectoryPath: '/tmp/apiease-template',
            };
          },
        },
        templateProjectVersionResolver: {
          async resolveTemplateVersion() {
            return {
              type: 'gitCommit',
              value: 'template-sha-2',
            };
          },
        },
        templateProjectManifestBuilder: {
          async buildTemplateManifest() {
            return {
              'updated.txt': 'new-hash',
              'conflict.txt': 'conflict-new-hash',
            };
          },
        },
        projectUpgradePlanService: {
          async buildUpgradePlan() {
            return {
              addPaths: [],
              removePaths: [],
              skipPaths: ['conflict.txt'],
              updatePaths: ['updated.txt'],
            };
          },
        },
        projectUpgradeApplierService: {
          async applyUpgradePlan(applyPayload) {
            applyCalls.push(applyPayload);
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await upgradeProjectCommand.run(['upgrade'], {
        currentWorkingDirectoryPath: '/tmp/project',
      });

      // Assert
      assert.equal(exitCode, 1);
      assert.deepEqual(applyCalls, [
        {
          currentProjectDirectoryPath: '/tmp/project',
          templateDirectoryPath: '/tmp/apiease-template',
          upgradePlan: {
            addPaths: [],
            removePaths: [],
            skipPaths: ['conflict.txt'],
            updatePaths: ['updated.txt'],
          },
        },
      ]);
      assert.deepEqual(writeCalls, [
        {
          projectDirectoryPath: '/tmp/project',
          projectMetadata: {
            cliVersion: '0.1.0-test',
            template: {
              displayTemplateSource: '../apiease-template',
              pendingPaths: ['conflict.txt'],
              manifest: {
                'conflict.txt': 'conflict-old-hash',
                'updated.txt': 'new-hash',
              },
              publicRepositoryUrl: 'https://github.com/kevinstl-org/apiease-template',
              sourceType: 'localDevelopment',
              version: {
                type: 'gitCommit',
                value: 'template-sha-1',
              },
            },
          },
        },
      ]);
      assert.equal(
        stdoutChunks.join(''),
        [
          'APIEASE project template upgrade applied with conflicts.',
          'Current project template version: template-sha-1',
          'Latest template version: template-sha-2',
          '',
          'Updated:',
          'updated.txt',
          '',
          'Skipped conflicting paths:',
          'conflict.txt',
          '',
          'Preserved conflicts. Choose --on-conflict overwrite to replace them, or --on-conflict ignore to preserve them for this upgrade.',
          '',
        ].join('\n'),
      );
      assert.equal(stderrChunks.join(''), '');
    });

    it('should fail dry run when the stored project metadata does not include a template manifest', async () => {
      // Arrange
      const { UpgradeProjectCommand } = await import(upgradeProjectCommandModuleUrl);
      const stdoutChunks = [];
      const stderrChunks = [];
      const upgradeProjectCommand = new UpgradeProjectCommand({
        projectMetadataFileService: {
          async readProjectMetadata() {
            return {
              ok: true,
              projectMetadata: {
                template: {
                  version: {
                    type: 'gitCommit',
                    value: 'template-sha-1',
                  },
                },
              },
            };
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await upgradeProjectCommand.run(['upgrade', '--dry-run']);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stdoutChunks.join(''), '');
      assert.equal(
        stderrChunks.join(''),
        [
          'APIEASE project upgrade check failed.',
          'Error Code: APIEASE_PROJECT_TEMPLATE_MANIFEST_NOT_FOUND',
          'Message: APIEASE project metadata does not include a template manifest. Run "apiease init" again to adopt the current project state.',
          '',
        ].join('\n'),
      );
    });

    it('should return a structured failure when the upgrade plan includes a managed path traversal attempt', async () => {
      // Arrange
      const { UpgradeProjectCommand } = await import(upgradeProjectCommandModuleUrl);
      const stdoutChunks = [];
      const stderrChunks = [];
      const upgradeProjectCommand = new UpgradeProjectCommand({
        projectMetadataFileService: {
          async readProjectMetadata() {
            return {
              ok: true,
              projectMetadata: {
                template: {
                  manifest: {
                    '../../.zshrc': 'malicious-hash',
                  },
                  version: {
                    type: 'gitCommit',
                    value: 'template-sha-1',
                  },
                },
              },
            };
          },
        },
        templateProjectSourceResolver: {
          resolveTemplateSource() {
            return {
              templateDirectoryPath: '/tmp/apiease-template',
            };
          },
        },
        templateProjectVersionResolver: {
          async resolveTemplateVersion() {
            return {
              type: 'gitCommit',
              value: 'template-sha-2',
            };
          },
        },
        templateProjectManifestBuilder: {
          async buildTemplateManifest() {
            return {};
          },
        },
        projectUpgradePlanService: {
          async buildUpgradePlan() {
            const error = new Error(
              'Managed template path must stay within the project root: ../../.zshrc',
            );
            error.code = 'APIEASE_INVALID_MANAGED_PATH';
            throw error;
          },
        },
        stdout: createWritableStream(stdoutChunks),
        stderr: createWritableStream(stderrChunks),
      });

      // Act
      const exitCode = await upgradeProjectCommand.run(['upgrade', '--dry-run']);

      // Assert
      assert.equal(exitCode, 1);
      assert.equal(stdoutChunks.join(''), '');
      assert.equal(
        stderrChunks.join(''),
        [
          'APIEASE project upgrade check failed.',
          'Error Code: APIEASE_INVALID_MANAGED_PATH',
          'Message: Managed template path must stay within the project root: ../../.zshrc',
          '',
        ].join('\n'),
      );
    });
  });
});

function createWritableStream(chunks) {
  return {
    write(chunk) {
      chunks.push(chunk);
    },
  };
}
