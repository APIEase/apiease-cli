import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {UpgradeProjectCommand} from '../../../src/cli/UpgradeProjectCommand.js';
import {InitProjectCommand} from '../../../src/cli/InitProjectCommand.js';
import {TemplateProjectManifestBuilder} from '../../../src/template/TemplateProjectManifestBuilder.js';
import {ProjectGitCheckoutService} from '../../../src/project/ProjectGitCheckoutService.js';

const instructionPath = 'docs/resource-instructions/source-authoring.md';
const indexPath = 'docs/resource-instructions/manifest.json';

async function write(root, name, content) {
  await fs.mkdir(path.dirname(path.join(root, name)), {recursive: true});
  await fs.writeFile(path.join(root, name), content);
}

async function fixture(context, {conflict = false, newer = false} = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'apiease-upgrade-instructions-'));
  context.after(() => fs.rm(root, {force: true, recursive: true}));
  const template = path.join(root, 'template');
  const project = path.join(root, 'project');
  await write(template, instructionPath, 'Old shared rules\n');
  await write(template, indexPath, JSON.stringify({protocolVersion: newer ? '2.0.0' : '1.0.0'}));
  await write(template, 'AGENTS.md', 'Read old rules\n');
  await write(template, 'CUSTOM_AGENT_GUIDANCE.md', 'Customer guidance\n');
  await fs.cp(template, project, {recursive: true});
  const manifest = await new TemplateProjectManifestBuilder().buildTemplateManifest(template);
  const metadata = {projectId: 'keep-project', baseline: {liveRevision: 4}, template: {
    version: {type: 'gitCommit', value: 'same-commit'}, manifest,
  }};
  await write(project, '.apiease/project.json', JSON.stringify(metadata));
  await write(project, 'resources/requests/customer.json', 'Customer resource edits');
  await write(template, instructionPath, 'New shared rules\n');
  await write(template, indexPath, JSON.stringify({protocolVersion: '1.0.0'}));
  await write(template, 'AGENTS.md', 'Read installed rules\n');
  if (conflict) await write(project, instructionPath, 'Locally customized rules\n');
  const stdout = [];
  const stderr = [];
  const dependencies = {
    templateProjectSourceResolver: {resolveTemplateSource: () => ({templateDirectoryPath: template})},
    templateProjectVersionResolver: {resolveTemplateVersion: async () => ({type: 'gitCommit', value: 'same-commit'})},
    stdin: {isTTY: false},
    stdout: {write: value => stdout.push(value)}, stderr: {write: value => stderr.push(value)},
  };
  return {root, template, project, metadata, stdout, stderr, dependencies,
    command: new UpgradeProjectCommand(dependencies),
    read: name => fs.readFile(path.join(project, name), 'utf8')};
}

describe('installed resource instructions', () => {
  it('records the cloned instruction manifest before existing-resource synchronization replaces project metadata', async context => {
    const state = await fixture(context);
    const clone = path.join(state.root, 'clone');
    const checkoutService = new ProjectGitCheckoutService({
      gitExecution: async () => fs.cp(state.template, clone, {recursive: true}),
      templateProjectVersionResolver: {resolveTemplateVersion: async () => ({type: 'gitCommit', value: 'a'.repeat(40)})},
    });
    await checkoutService.clonePublicTemplate({destinationDirectoryPath: clone});
    const templateMetadata = JSON.parse(await fs.readFile(path.join(clone, '.apiease/template.json')));
    assert.ok(templateMetadata.template.manifest[instructionPath]);
    assert.equal(Object.hasOwn(templateMetadata.template.manifest, '.apiease/project.json'), false);
  });

  it('never overwrites operational metadata or customer resources from a legacy template manifest', async context => {
    const state = await fixture(context);
    state.metadata.template.manifest['resources/requests/customer.json'] = 'old-hash';
    state.metadata.template.manifest['.apiease/project-state-v1.json'] = 'old-hash';
    await write(state.project, '.apiease/project.json', JSON.stringify(state.metadata));
    await write(state.project, '.apiease/project-state-v1.json', 'Preserved operational state');
    await write(state.template, 'resources/requests/customer.json', 'Template resource');
    await write(state.template, '.apiease/project-state-v1.json', 'Template state');
    await state.command.run(['upgrade', '--on-conflict', 'overwrite'], {currentWorkingDirectoryPath: state.project});
    assert.equal(await state.read('resources/requests/customer.json'), 'Customer resource edits');
    assert.equal(await state.read('.apiease/project-state-v1.json'), 'Preserved operational state');
  });

  it('adopts an older operational checkout without assuming its instructions are unmodified', async context => {
    const state = await fixture(context);
    const operational = JSON.stringify({formatVersion: 1, projectId: 'keep-project'});
    await write(state.project, '.apiease/project.json', operational);
    assert.equal(await state.command.run(['upgrade'], {currentWorkingDirectoryPath: state.project}), 1);
    assert.equal(await state.read(instructionPath), 'Old shared rules\n');
    assert.equal(await state.read('.apiease/project.json'), operational);
    assert.equal(await state.command.run(['upgrade', '--on-conflict', 'overwrite'], {currentWorkingDirectoryPath: state.project}), 0);
    assert.equal(await state.read(instructionPath), 'New shared rules\n');
    assert.equal(await state.read('.apiease/project.json'), operational);
    assert.equal(JSON.parse(await state.read('.apiease/template.json')).template.version.value, 'same-commit');
  });

  it('init installs instructions without a server or authoritative source checkout', async context => {
    const state = await fixture(context);
    const command = new InitProjectCommand({...state.dependencies, cliVersion: 'test'});
    assert.equal(await command.run(['init', 'new-project'], {currentWorkingDirectoryPath: state.root}), 0);
    assert.equal(await fs.readFile(path.join(state.root, 'new-project', instructionPath), 'utf8'), 'New shared rules\n');
  });

  it('check compares content even when the recorded template commit matches', async context => {
    const state = await fixture(context);
    const before = await state.read('.apiease/project.json');
    assert.equal(await state.command.run(['upgrade', '--check'], {currentWorkingDirectoryPath: state.project}), 1);
    assert.equal(await state.read('.apiease/project.json'), before);
  });

  it('upgrades an unchanged instruction set and preserves resource edits and operational metadata', async context => {
    const state = await fixture(context);
    assert.equal(await state.command.run(['upgrade'], {currentWorkingDirectoryPath: state.project}), 0);
    assert.equal(await state.read(instructionPath), 'New shared rules\n');
    assert.equal(await state.read('resources/requests/customer.json'), 'Customer resource edits');
    assert.deepEqual(JSON.parse(await state.read('.apiease/project.json')).baseline, state.metadata.baseline);
  });

  for (const choice of [undefined, 'ignore']) {
    it(`preserves the coherent instruction set with ${choice ?? 'no noninteractive choice'}`, async context => {
      const state = await fixture(context, {conflict: true});
      const args = choice ? ['upgrade', '--on-conflict', choice] : ['upgrade'];
      assert.equal(await state.command.run(args, {currentWorkingDirectoryPath: state.project}), 1);
      assert.equal(await state.read('AGENTS.md'), 'Read old rules\n');
      assert.equal(await state.read(instructionPath), 'Locally customized rules\n');
      assert.deepEqual(JSON.parse(await state.read('.apiease/project.json')).template.manifest, state.metadata.template.manifest);
      assert.ok(JSON.parse(await state.read('.apiease/project.json')).template.pendingPaths.includes(instructionPath));
      assert.match(state.stdout.join(''), /--on-conflict overwrite/);
    });
  }

  it('explicit overwrite replaces the whole instruction set without touching customer guidance', async context => {
    const state = await fixture(context, {conflict: true});
    assert.equal(await state.command.run(['upgrade', '--on-conflict', 'overwrite'], {currentWorkingDirectoryPath: state.project}), 0);
    assert.equal(await state.read(instructionPath), 'New shared rules\n');
    assert.equal(await state.read('AGENTS.md'), 'Read installed rules\n');
    assert.equal(await state.read('CUSTOM_AGENT_GUIDANCE.md'), 'Customer guidance\n');
    assert.equal(await state.command.run(['upgrade', '--check'], {currentWorkingDirectoryPath: state.project}), 0);
  });

  it('preserves instructions with a known higher protocol version until overwrite is explicit', async context => {
    const state = await fixture(context, {newer: true});
    assert.equal(await state.command.run(['upgrade'], {currentWorkingDirectoryPath: state.project}), 1);
    assert.equal(await state.read(instructionPath), 'Old shared rules\n');
    assert.match(state.stdout.join(''), /newer protocol version/);
  });

  it('reports differing content without inventing version ordering', async context => {
    const state = await fixture(context, {conflict: true});
    await state.command.run(['upgrade'], {currentWorkingDirectoryPath: state.project});
    assert.match(state.stdout.join(''), /conflict/i);
    assert.doesNotMatch(state.stdout.join(''), /newer/);
  });

  it('dry run previews explicit overwrite without writing metadata or files', async context => {
    const state = await fixture(context, {conflict: true});
    const before = await state.read('.apiease/project.json');
    assert.equal(await state.command.run(['upgrade', '--dry-run', '--on-conflict', 'overwrite'], {currentWorkingDirectoryPath: state.project}), 1);
    assert.match(state.stdout.join(''), /Update:[\s\S]*source-authoring.md/);
    assert.equal(await state.read(instructionPath), 'Locally customized rules\n');
    assert.equal(await state.read('.apiease/project.json'), before);
  });

  it('offers overwrite and ignore interactively for the listed conflict set', async context => {
    const state = await fixture(context, {conflict: true});
    const prompts = [];
    const command = new UpgradeProjectCommand({...state.dependencies, stdin: {isTTY: true},
      promptConflictChoice: async prompt => {prompts.push(prompt); return 'overwrite';}});
    assert.equal(await command.run(['upgrade'], {currentWorkingDirectoryPath: state.project}), 0);
    assert.match(prompts[0], /Overwrite.*Ignore/);
    assert.equal(await state.read(instructionPath), 'New shared rules\n');
  });

  it('rejects unsupported conflict choices before inspecting a project', async () => {
    const command = new UpgradeProjectCommand({stderr: {write() {}}});
    assert.equal(await command.run(['upgrade', '--on-conflict', 'force']), 1);
  });
});
