import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {runCli} from '../../bin/apiease-cli.js';

describe('normal project command update notices', () => {
  for (const [name, dependency] of [['pull', 'pullProjectCommand'], ['validate', 'validateProjectCommand'], ['apply', 'applyProjectCommand']]) {
    it(`checks during ${name} without altering JSON output or installing updates`, async () => {
      const stdout = [];
      const stderr = [];
      let checks = 0;
      const code = await runCli({commandArguments: [name, '--json'],
        [dependency]: {run: async () => {stdout.push('{"state":"success"}\n'); return 0;}},
        projectTemplateUpdateService: {checkForUpdate: async () => {checks++; return {status: 'available'};}},
        stdout: {write: value => stdout.push(value)}, stderr: {write: value => stderr.push(value)},
      });
      assert.equal(code, 0);
      assert.equal(checks, 1);
      assert.deepEqual(JSON.parse(stdout.join('')), {state: 'success'});
      assert.match(stderr.join(''), /apiease upgrade/);
    });
  }

  it('does not block a valid command when the update check is unavailable', async () => {
    const stderr = [];
    const code = await runCli({commandArguments: ['validate', '--json'],
      validateProjectCommand: {run: async () => 0},
      projectTemplateUpdateService: {checkForUpdate: async () => ({status: 'unavailable'})},
      stderr: {write: value => stderr.push(value)},
    });
    assert.equal(code, 0);
    assert.match(stderr.join(''), /unavailable/i);
    assert.doesNotMatch(stderr.join(''), /up to date/);
  });
});
