import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { TemplateProjectOwnershipPolicy } from '../template/TemplateProjectOwnershipPolicy.js';
import { ProjectManagedPathResolver } from './ProjectManagedPathResolver.js';

class ProjectUpgradePlanService {
  constructor({
    projectManagedPathResolver = new ProjectManagedPathResolver(),
    templateProjectOwnershipPolicy = new TemplateProjectOwnershipPolicy(),
  } = {}) {
    this.projectManagedPathResolver = projectManagedPathResolver;
    this.templateProjectOwnershipPolicy = templateProjectOwnershipPolicy;
  }

  async buildUpgradePlan({
    currentProjectDirectoryPath,
    currentTemplateManifest,
    storedTemplateManifest,
    templateDirectoryPath,
    conflictChoice = 'ignore',
  }) {
    const addPaths = [];
    const removePaths = [];
    const skipPaths = [];
    const updatePaths = [];
    const managedPaths = new Set([
      ...Object.keys(currentTemplateManifest),
      ...Object.keys(storedTemplateManifest),
    ]);

    for (const managedPath of [...managedPaths].sort()) {
      const currentTemplateHash = currentTemplateManifest[managedPath];
      const storedTemplateHash = storedTemplateManifest[managedPath];
      const currentProjectFileHash = await this.readProjectFileHash(currentProjectDirectoryPath, managedPath);

      if (this.shouldAlwaysRefreshManagedPath({ currentProjectFileHash, currentTemplateHash, managedPath })) {
        if (!currentProjectFileHash) {
          addPaths.push(managedPath);
          continue;
        }

        updatePaths.push(managedPath);
        continue;
      }

      if (!storedTemplateHash && currentTemplateHash) {
        if (!currentProjectFileHash) {
          addPaths.push(managedPath);
          continue;
        }

        if (currentProjectFileHash !== currentTemplateHash) {
          skipPaths.push(managedPath);
        }

        continue;
      }

      if (storedTemplateHash && !currentTemplateHash) {
        if (currentProjectFileHash === storedTemplateHash) {
          removePaths.push(managedPath);
          continue;
        }

        if (currentProjectFileHash) {
          skipPaths.push(managedPath);
        }

        continue;
      }

      if (!currentProjectFileHash) {
        addPaths.push(managedPath);
        continue;
      }

      if (currentProjectFileHash === currentTemplateHash) {
        continue;
      }

      if (currentProjectFileHash === storedTemplateHash) {
        updatePaths.push(managedPath);
        continue;
      }

      skipPaths.push(managedPath);
    }

    const plan = {addPaths, removePaths, skipPaths, updatePaths};
    const newerInstructions = templateDirectoryPath && await this.hasNewerInstructionVersion(
      currentProjectDirectoryPath, templateDirectoryPath,
    );
    if (newerInstructions || skipPaths.some(managedPath => this.isInstructionSetPath(managedPath))) {
      const instructionPaths = [...managedPaths].filter(managedPath => this.isInstructionSetPath(managedPath));
      for (const key of ['addPaths', 'removePaths', 'updatePaths']) {
        plan[key] = plan[key].filter(managedPath => !instructionPaths.includes(managedPath));
      }
      plan.skipPaths = [...new Set([...skipPaths, ...instructionPaths])].sort();
    }
    if (newerInstructions) plan.conflictReason = 'Installed instructions declare a newer protocol version.';
    if (conflictChoice === 'overwrite') await this.overwriteConflicts(plan, currentTemplateManifest, currentProjectDirectoryPath);
    return plan;
  }

  isInstructionSetPath(managedPath) {
    return managedPath.startsWith('docs/resource-instructions/') || [
      'AGENTS.md', 'CLAUDE.md', 'README.md', '.github/copilot-instructions.md', 'docs/shared-ongoing-ai-guidance.md',
    ].includes(managedPath);
  }

  async hasNewerInstructionVersion(projectDirectoryPath, templateDirectoryPath) {
    const versions = await Promise.all([projectDirectoryPath, templateDirectoryPath].map(async rootDirectoryPath => {
      const manifestPath = this.projectManagedPathResolver.resolveManagedPath({
        managedPath: 'docs/resource-instructions/manifest.json', rootDirectoryPath,
      });
      try { return JSON.parse(await fs.readFile(manifestPath, 'utf8')).protocolVersion; }
      catch (error) { if (error.code === 'ENOENT' || error instanceof SyntaxError) return null; throw error; }
    }));
    if (!versions.every(version => typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version))) return false;
    const [installed, available] = versions.map(version => version.split('.').map(Number));
    const difference = installed.findIndex((part, index) => part !== available[index]);
    return difference !== -1 && installed[difference] > available[difference];
  }

  async overwriteConflicts(plan, currentTemplateManifest, projectDirectoryPath) {
    for (const managedPath of plan.skipPaths) {
      const existingHash = await this.readProjectFileHash(projectDirectoryPath, managedPath);
      const templateHash = currentTemplateManifest[managedPath];
      if (existingHash === templateHash) continue;
      if (!templateHash) { if (existingHash) plan.removePaths.push(managedPath); }
      else plan[existingHash ? 'updatePaths' : 'addPaths'].push(managedPath);
    }
    plan.skipPaths = [];
    for (const key of ['addPaths', 'removePaths', 'updatePaths']) plan[key].sort();
  }

  async readProjectFileHash(currentProjectDirectoryPath, managedPath) {
    try {
      const fileBuffer = await fs.readFile(this.projectManagedPathResolver.resolveManagedPath({
        managedPath,
        rootDirectoryPath: currentProjectDirectoryPath,
      }));
      return this.buildContentHash(fileBuffer);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  buildContentHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  shouldAlwaysRefreshManagedPath({ currentProjectFileHash, currentTemplateHash, managedPath }) {
    if (!currentTemplateHash) {
      return false;
    }

    if (!this.templateProjectOwnershipPolicy.shouldAlwaysRefreshPath(managedPath)) {
      return false;
    }

    return currentProjectFileHash !== currentTemplateHash;
  }
}

export { ProjectUpgradePlanService };
