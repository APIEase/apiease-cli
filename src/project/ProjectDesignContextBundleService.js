import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

class ProjectDesignContextBundleService {
  constructor({ fileSystem = fs } = {}) {
    this.fileSystem = fileSystem;
  }

  async writeBundle({ designContext, outputDirectoryPath }) {
    this.requireSuccessfulContext(designContext);
    const directory = path.resolve(outputDirectoryPath);
    await this.createBundleDirectory(directory);
    try {
      const files = await this.writeContextFiles(directory, designContext);
      return this.buildSummary(directory, designContext, files);
    } catch {
      await this.fileSystem.rm(directory, { recursive: true, force: true }).catch(() => {});
      throw buildBundleError('PROJECT_DESIGN_BUNDLE_WRITE_FAILED');
    }
  }

  requireSuccessfulContext(designContext) {
    if (!designContext.ok || designContext.conflicts.length > 0) {
      throw buildBundleError('PROJECT_DESIGN_BUNDLE_CONTEXT_INVALID');
    }
  }

  async createBundleDirectory(directory) {
    try {
      await this.fileSystem.mkdir(directory, { mode: 0o700 });
    } catch (error) {
      throw buildBundleError(error.code === 'EEXIST'
        ? 'PROJECT_DESIGN_BUNDLE_DESTINATION_EXISTS' : 'PROJECT_DESIGN_BUNDLE_WRITE_FAILED');
    }
  }

  async writeContextFiles(directory, context) {
    const files = {};
    for (const [key, name, content] of this.buildContextFiles(context)) {
      const filePath = path.join(directory, name);
      await this.fileSystem.writeFile(filePath, content, { flag: 'wx', mode: 0o600 });
      files[key] = { path: filePath, bytes: Buffer.byteLength(content), digest: digest(content) };
    }
    return files;
  }

  buildContextFiles(context) {
    return [
      ['context', 'context.json', serialize(context)],
      ['instructions', 'instructions.md', context.protocol.commonInstructions],
      ['codexEnvelope', 'codex-envelope.md', context.protocol.codexEnvelope],
      ['inventory', 'inventory.json', serialize(context.inventory)],
      ['serverResources', 'server-resources.json', serialize(context.canonicalBodies)],
      ['localChanges', 'local-changes.json', serialize({
        localEdits: context.localEdits, deletions: context.deletions, secureSelectors: context.secureSelectors,
      })],
    ];
  }

  buildSummary(directory, context, files) {
    return {
      ok: true, outcome: context.outcome, delivery: 'files', directory,
      protocol: {
        protocolVersion: context.protocol.protocolVersion,
        commonInstructionDigest: context.protocol.commonInstructionDigest,
      },
      serverBaseline: context.serverBaseline,
      localBaseline: context.localBaseline,
      hasManagedEdits: context.localEdits.hasManagedEdits,
      counts: this.buildCounts(context),
      files,
      workflowGuidance: context.workflowGuidance,
      readingGuide: [
        'Read instructions and codexEnvelope before authoring; these files preserve the verified protocol exactly.',
        'Inspect inventory and localChanges, then read relevant entries from serverResources as needed.',
        'context contains the complete captured result, including bindings, requirements when supplied, limits and diagnostics.',
        'This bundle is a point-in-time reference, not an offline baseline or approval. Retrieve fresh context when starting new work.',
      ],
      diagnostics: context.diagnostics,
    };
  }

  buildCounts(context) {
    return {
      resources: context.inventory.length,
      creates: context.localEdits.creates.length,
      updates: context.localEdits.updates.length,
      deletions: context.deletions.length,
      secureSelectors: context.secureSelectors.length,
    };
  }
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function digest(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function buildBundleError(code) {
  return Object.assign(new Error(code), { code, failureType: 'local-integrity' });
}

export { ProjectDesignContextBundleService };
