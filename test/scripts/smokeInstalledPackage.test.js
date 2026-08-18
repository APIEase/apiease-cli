import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const projectDirectoryPath = path.resolve(currentDirectoryPath, '..', '..');
const smokeScriptPath = path.join(projectDirectoryPath, 'scripts', 'smokeInstalledPackage.js');

describe('smokeInstalledPackage', () => {
  describe('installed artifact workflow', () => {
    it('should verify the packed CLI from an arbitrary working directory without a writable home', async () => {
      // Arrange
      const arbitraryWorkingDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-smoke-cwd-'));
      const npmCacheDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-smoke-cache-'));

      // Act
      const { stdout } = await execFileAsync(process.execPath, [smokeScriptPath], {
        cwd: arbitraryWorkingDirectoryPath,
        env: {
          ...process.env,
          HOME: '/dev/null',
          npm_config_cache: npmCacheDirectoryPath,
        },
      });

      // Assert
      assert.match(stdout, /Installed apiease 0\.2\.0 smoke verification passed\./);
    });

    it('should fail when the expected package version does not match the artifact', async () => {
      // Arrange
      const arbitraryWorkingDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-smoke-cwd-'));
      const npmCacheDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-smoke-cache-'));

      // Act and Assert
      await assert.rejects(execFileAsync(process.execPath, [smokeScriptPath, '--expected-version', '9.9.9'], {
        cwd: arbitraryWorkingDirectoryPath,
        env: {
          ...process.env,
          HOME: '/dev/null',
          npm_config_cache: npmCacheDirectoryPath,
        },
      }), /Installed version did not match 9\.9\.9/);
    });
  });
});
