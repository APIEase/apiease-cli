const CUSTOMER_OWNED_TEMPLATE_PATHS = new Set([
  'CUSTOM_AGENT_GUIDANCE.md',
  'CUSTOM_README.md',
]);
const EXCLUDED_TEMPLATE_DIRECTORY_NAMES = new Set([
  '.git',
  '.idea',
  '.codex',
  '.apiease',
  'node_modules',
]);
const ALWAYS_REFRESH_TEMPLATE_PATHS = new Set([
  'docs/knowledgebase/apiEaseDocsConsolidated.md',
]);

class TemplateProjectOwnershipPolicy {
  isTemplateManagedPath(templatePath) {
    return !CUSTOMER_OWNED_TEMPLATE_PATHS.has(templatePath) && !this.hasExcludedDirectorySegment(templatePath)
      && !(templatePath.startsWith('resources/') && templatePath.endsWith('.json'));
  }

  shouldAlwaysRefreshPath(templatePath) {
    return ALWAYS_REFRESH_TEMPLATE_PATHS.has(templatePath);
  }

  filterTemplateManifest(templateManifest) {
    const managedTemplateManifest = {};

    for (const [templatePath, templateHash] of Object.entries(templateManifest)) {
      if (!this.isTemplateManagedPath(templatePath)) {
        continue;
      }

      managedTemplateManifest[templatePath] = templateHash;
    }

    return managedTemplateManifest;
  }

  hasExcludedDirectorySegment(templatePath) {
    return templatePath
      .split(/[\\/]/)
      .some((pathSegment) => EXCLUDED_TEMPLATE_DIRECTORY_NAMES.has(pathSegment));
  }
}

export { TemplateProjectOwnershipPolicy };
