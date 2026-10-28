import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('AdminWidgetSourceCompiler', () => {
  describe('compile', () => {
    it('should compile the supported Block and embedded request groups without executing source', async () => {
      // Arrange
      const { default: AdminWidgetSourceCompiler } = await import('../../../src/project/AdminWidgetSourceCompiler.js');
      const block = { variables: 'const reference = inputs.reference;',
        render: '<s-admin-block><s-button onClick={() => apiease.runRequest("lookup", {liquidParamsEmbedded: {reference}})}>Lookup</s-button></s-admin-block>' };
      // Act
      const compiled = new AdminWidgetSourceCompiler().compile(block);
      // Assert
      assert.equal(compiled.render.tag, 's-admin-block');
      assert.equal(compiled.buttons[0].requestHandle, 'lookup');
    });
    for (const block of [
      { variables: 'fetch("https://example.invalid")', render: '<s-admin-block />' },
      { variables: '', render: '<s-admin-block><s-button onClick={() => apiease.runRequest("lookup", {inputs: {}})} /></s-admin-block>' },
      { variables: '', render: '<div />' },
    ]) {
      it('should reject unsupported Block source', async () => {
        // Arrange
        const { default: AdminWidgetSourceCompiler } = await import('../../../src/project/AdminWidgetSourceCompiler.js');
        // Act and Assert
        assert.throws(() => new AdminWidgetSourceCompiler().compile(block));
      });
    }
  });
});
