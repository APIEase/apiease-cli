import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectDirectoryPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedExportNames = Object.freeze([
  'ApiEaseCreateRequestClient',
  'ApiEaseProjectApiClient',
  'ApiEaseReadRequestClient',
  'ApiEaseUpdateRequestClient',
  'PersonalProjectAuthenticationAdapter',
  'ProjectAuthenticationAdapter',
  'WorkerProjectAuthenticationAdapter',
]);
const requiredContractPaths = Object.freeze([
  'contracts/apex-projects/v1/apiease-project-contract.schema.json',
  'contracts/apex-projects/v1/fixtures/bootstrap-synchronized.json',
  'contracts/apex-projects/v1/fixtures/project-failures.json',
  'contracts/apex-projects/v1/fixtures/project-proposal-failures.json',
  'contracts/apex-projects/v1/fixtures/project-proposal-workflow.json',
  'contracts/apex-projects/v1/fixtures/project-workflow-success.json',
  'contracts/apex-projects/v1/fixtures/resource-operations.json',
  'contracts/apex-projects/v1/provenance.json',
]);

async function runInstalledPackageSmoke({ expectedVersion = readExpectedVersion(process.argv.slice(2)) } = {}) {
  const smokeDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-installed-smoke-'));

  try {
    const packageArtifact = packPackage(smokeDirectoryPath);
    verifyPackedFiles(packageArtifact.files.map(({ path: filePath }) => filePath));
    assert.equal(packageArtifact.version, expectedVersion, `Installed version did not match ${expectedVersion}`);
    installPackage(smokeDirectoryPath, packageArtifact.filename);
    verifyInstalledExecutable(smokeDirectoryPath, expectedVersion);
    verifyInstalledExports(smokeDirectoryPath);
    process.stdout.write(`Installed apiease ${expectedVersion} smoke verification passed.\n`);
  } finally {
    await fs.rm(smokeDirectoryPath, { recursive: true, force: true });
  }
}

function packPackage(smokeDirectoryPath) {
  const packResult = runCommand('npm', [
    'pack', '--json', '--pack-destination', smokeDirectoryPath, projectDirectoryPath,
  ], buildSmokeEnvironment(smokeDirectoryPath));
  const packageArtifacts = JSON.parse(packResult.stdout);

  assert.equal(packageArtifacts.length, 1, 'npm pack must produce exactly one artifact');
  return packageArtifacts[0];
}

function verifyPackedFiles(packedFilePaths) {
  const packedFilePathSet = new Set(packedFilePaths);
  const requiredPackagePaths = [
    'bin/apiease-cli', 'bin/apiease-cli.js', 'package.json', 'README.md', 'src/index.js',
    ...requiredContractPaths,
  ];

  for (const requiredPackagePath of requiredPackagePaths) {
    assert.equal(packedFilePathSet.has(requiredPackagePath), true, `Packed artifact omitted ${requiredPackagePath}`);
  }
  assert.equal(packedFilePaths.some((filePath) => filePath.startsWith('test/')), false);
  assert.equal(packedFilePaths.some((filePath) => filePath.startsWith('.codex/')), false);
}

function installPackage(smokeDirectoryPath, packageFilename) {
  const packagePath = path.join(smokeDirectoryPath, packageFilename);
  const localDependencyPaths = [
    'ajv', 'fast-deep-equal', 'fast-uri', 'json-schema-traverse', 'require-from-string',
  ].map((dependencyName) => path.join(projectDirectoryPath, 'node_modules', dependencyName));
  runCommand('npm', [
    'install', '--prefix', smokeDirectoryPath, '--ignore-scripts', '--no-audit', '--no-fund', '--offline',
    packagePath, ...localDependencyPaths,
  ], buildSmokeEnvironment(smokeDirectoryPath));
}

function verifyInstalledExecutable(smokeDirectoryPath, expectedVersion) {
  const executablePath = path.join(smokeDirectoryPath, 'node_modules', '.bin', 'apiease');
  const arbitraryWorkingDirectoryPath = path.join(smokeDirectoryPath, 'arbitrary-working-directory');
  const commandEnvironment = { ...process.env, HOME: '/dev/null' };

  mkdirSync(arbitraryWorkingDirectoryPath);
  assert.equal(runCommand(executablePath, ['--version'], commandEnvironment, arbitraryWorkingDirectoryPath).stdout.trim(), expectedVersion);
  verifyInstalledHelp(runCommand(executablePath, ['--help'], commandEnvironment, arbitraryWorkingDirectoryPath).stdout);
  verifyNoninteractiveProjectCommand(executablePath, commandEnvironment, arbitraryWorkingDirectoryPath);
}

function verifyInstalledHelp(helpText) {
  for (const commandName of ['create', 'read', 'update', 'delete', 'init', 'upgrade', 'pull', 'validate', 'apply', 'rename']) {
    assert.match(helpText, new RegExp(`\\b${commandName}\\b`));
  }
  assert.equal(helpText.includes('--require-approval'), false);
}

function verifyNoninteractiveProjectCommand(executablePath, commandEnvironment, workingDirectoryPath) {
  const validateResult = spawnSync(executablePath, [
    'validate', '--json', '--api-key', 'smoke-key', '--base-url', 'https://example.invalid',
    '--shop-domain', 'smoke.myshopify.com',
  ], { cwd: workingDirectoryPath, encoding: 'utf8', env: commandEnvironment });

  assert.equal(validateResult.status, 6);
  assert.match(validateResult.stderr, /did not execute resources or verify external runtime behavior/);
  assert.equal(JSON.parse(validateResult.stdout).command, 'validate');
}

function verifyInstalledExports(smokeDirectoryPath) {
  const indexPath = path.join(smokeDirectoryPath, 'node_modules', 'apiease', 'src', 'index.js');
  const importExpression = `import(${JSON.stringify(pathToFileURL(indexPath).href)}).then((module) => `
    + `console.log(JSON.stringify(Object.keys(module).sort())))`;
  const exportResult = runCommand(process.execPath, ['--input-type=module', '--eval', importExpression], {
    ...process.env,
    HOME: '/dev/null',
  });

  assert.deepEqual(JSON.parse(exportResult.stdout), expectedExportNames);
}

function buildSmokeEnvironment(smokeDirectoryPath) {
  return {
    ...process.env,
    HOME: '/dev/null',
    npm_config_cache: path.join(smokeDirectoryPath, 'npm-cache'),
  };
}

function runCommand(command, commandArguments, environment, workingDirectoryPath = projectDirectoryPath) {
  const commandResult = spawnSync(command, commandArguments, {
    cwd: workingDirectoryPath,
    encoding: 'utf8',
    env: environment,
  });
  if (commandResult.status !== 0) {
    throw new Error(commandResult.stderr || commandResult.stdout || `${command} failed`);
  }

  return commandResult;
}

function readExpectedVersion(commandArguments) {
  const optionIndex = commandArguments.indexOf('--expected-version');
  if (optionIndex === -1) {
    return '0.2.0';
  }

  return commandArguments[optionIndex + 1];
}

await runInstalledPackageSmoke();

export { runInstalledPackageSmoke };
