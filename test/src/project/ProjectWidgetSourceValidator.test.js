import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const moduleUrl = '../../../src/project/ProjectWidgetSourceValidator.js';

function widget(overrides = {}) {
  return { name: 'Admin demo', type: 'admin', adminText: 'Hello', liquid: '', javascript: '',
    externalJavascriptUrls: [], disableJavascript: false, ...overrides };
}

describe('ProjectWidgetSourceValidator', () => {
  describe('validate', () => {
    for (const fields of [
      {}, { adminTarget: '' }, { adminTarget: 'admin.product-index.selection-action.render' },
      { adminText: undefined, adminUi: JSON.stringify({ version: 1, components: [
        { type: 'input', name: 'reference', label: 'Reference', defaultValue: '', required: true },
        { type: 'button', id: 'lookup', label: 'Lookup', requestHandle: 'sampleRequest1' },
      ] }) },
      { adminUi: JSON.stringify({ version: 2, targets: [{ type: 'block', variables: 'const title = "Hello";',
        render: '<s-admin-block heading={title}><s-text>Hello</s-text></s-admin-block>' }] }) },
    ]) {
      it(`should accept supported Admin source ${JSON.stringify(fields).slice(0, 80)}`, async () => {
        // Arrange
        const { ProjectWidgetSourceValidator } = await import(moduleUrl);
        // Act and Assert
        assert.doesNotThrow(() => new ProjectWidgetSourceValidator().validate(widget(fields)));
      });
    }

    for (const [label, fields] of [
      ['unknown type', { type: 'other' }], ['null type', { type: null }],
      ['unsupported target', { adminTarget: 'admin.unknown.block.render' }],
      ['null target', { adminTarget: null }], ['non-string text', { adminText: {} }],
      ['blank Admin content', { adminText: ' ', adminUi: '\t' }],
      ['oversized text', { adminText: 'a'.repeat(65537) }],
      ['non-string UI', { adminUi: {} }], ['invalid UI JSON', { adminUi: '{' }],
      ['unknown UI property', { adminUi: '{"version":1,"components":[{"type":"text","text":"Hi","extra":true}]}' }],
      ['empty components', { adminUi: '{"version":1,"components":[]}' }],
      ['duplicate inputs', { adminUi: JSON.stringify({ version: 1, components: Array(2).fill({ type: 'input', name: 'same', label: 'Same' }) }) }],
      ['invalid button handle', { adminUi: '{"version":1,"components":[{"type":"button","id":"go","label":"Go","requestHandle":"bad handle"}]}' }],
      ['unsupported component', { adminUi: JSON.stringify({ version: 2, targets: [{ type: 'block', variables: '', render: '<s-admin-block><script /></s-admin-block>' }] }) }],
      ['too many targets', { adminUi: '{"version":2,"targets":[]}' }],
    ]) {
      it(`should reject ${label}`, async () => {
        // Arrange
        const { ProjectWidgetSourceValidator } = await import(moduleUrl);
        // Act and Assert
        assert.throws(() => new ProjectWidgetSourceValidator().validate(widget(fields)),
          { code: 'CANONICAL_RESOURCE_SOURCE_INVALID_CONTENT' });
      });
    }
  });
});
