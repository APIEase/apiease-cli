import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {ProjectLocalStateService} from './ProjectLocalStateService.js';

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const CACHE_FILE_PATTERN = /^[a-f0-9]{64}\.md$/u;
const MAXIMUM_MODULE_BYTES = 1_000_000;
const CURRENT_MODULES_FILE = 'current-modules.json';

class ProjectDesignReferenceCacheService {
  constructor({projectLocalStateService = new ProjectLocalStateService()} = {}) {
    this.projectLocalStateService = projectLocalStateService;
  }

  async prepare({projectDirectoryPath, projectIdentity, apiBaseUrl}) {
    const location = await this.projectLocalStateService.resolveLocalStateLocation(projectDirectoryPath);
    const key = digest(JSON.stringify([apiBaseUrl, projectIdentity.normalizedShopDomain, projectIdentity.projectId])).slice(7);
    const parent = path.join(path.dirname(location.localStateFilePath), 'design-context-v2');
    const directory = path.join(parent, key);
    await requireDirectoryOrAbsent(parent);
    const exists = await requireDirectoryOrAbsent(directory);
    const contents = exists ? await this.readVerifiedModules(directory) : new Map();
    const current = exists ? await this.readCurrentDigests(directory, contents) : [];
    return {parent, directory, contents,
      knownModuleDigests: [...new Set([...current, ...contents.keys()])].slice(0, 128)};
  }

  async readCurrentDigests(directory, contents) {
    const filePath = path.join(directory, CURRENT_MODULES_FILE);
    const status = await requireRegularFileOrAbsent(filePath);
    if (!status || status.size > 16_384) return [];
    try {
      const value = JSON.parse(await fs.readFile(filePath, 'utf8'));
      return Array.isArray(value) && value.length <= 128
        ? value.filter(identity => contents.has(identity)) : [];
    } catch (error) {
      if (error instanceof SyntaxError) return [];
      throw error;
    }
  }

  async readVerifiedModules(directory) {
    const contents = new Map();
    for (const name of await fs.readdir(directory)) {
      if (!CACHE_FILE_PATTERN.test(name)) continue;
      const filePath = path.join(directory, name);
      const status = await requireRegularFile(filePath);
      if (status.size > MAXIMUM_MODULE_BYTES) continue;
      const bytes = await fs.readFile(filePath);
      const identity = `sha256:${name.slice(0, -3)}`;
      if (digest(bytes) === identity) contents.set(identity, decode(bytes));
    }
    return contents;
  }

  async publishProtocol({cache, protocol}) {
    const verified = verifyProtocol(protocol, cache.contents);
    await createPrivateDirectory(cache.parent);
    await createPrivateDirectory(cache.directory);
    const references = [];
    for (const entry of verified) {
      const filePath = path.join(cache.directory, `${entry.digest.slice(7)}.md`);
      if (!cache.contents.has(entry.digest)) await this.writeReferenceFile(cache, path.basename(filePath), entry.content);
      const {content, ...metadata} = entry;
      references.push({...metadata, path: filePath});
    }
    await this.writeReferenceFile(cache, CURRENT_MODULES_FILE, `${JSON.stringify(verified.map(entry => entry.digest))}\n`);
    return {
      protocolVersion: protocol.protocolVersion, manifestIdentity: protocol.manifestIdentity,
      moduleSetIdentity: protocol.moduleSetIdentity, modules: references.slice(0, -1),
      envelope: references.at(-1),
      downloadedBytes: verified.filter(entry => !cache.contents.has(entry.digest)).reduce((sum, entry) => sum + entry.bytes, 0),
      reusedModules: verified.filter(entry => cache.contents.has(entry.digest)).length,
    };
  }

  async writeReferenceFile(cache, name, content) {
    if (!/^[a-zA-Z0-9.-]+$/u.test(name)) throw cacheError('PATH');
    await requireDirectoryOrAbsent(cache.parent);
    await requireDirectoryOrAbsent(cache.directory);
    const destination = path.join(cache.directory, name);
    await requireRegularFileOrAbsent(destination);
    const temporary = path.join(cache.directory, `.${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temporary, content, {flag: 'wx', mode: 0o600});
      await fs.rename(temporary, destination);
    } finally {
      await fs.rm(temporary, {force: true});
    }
    return {path: destination, bytes: Buffer.byteLength(content), digest: digest(content)};
  }
}

function verifyProtocol(protocol, cached) {
  const modules = protocol.modules;
  if (!Array.isArray(modules) || modules.length === 0 || modules.length > 127
    || new Set(modules.map(entry => entry.id)).size !== modules.length) throw cacheError('INTEGRITY');
  const verified = [...modules, protocol.envelope].map(entry => verifyContent(entry, cached));
  if (digest(verified.slice(0, -1).map(entry => entry.content).join('\n')) !== protocol.moduleSetIdentity) {
    throw cacheError('INTEGRITY');
  }
  return verified;
}

function verifyContent(entry, cached) {
  const content = entry.content ?? cached.get(entry.digest);
  if (!DIGEST_PATTERN.test(entry.digest) || typeof content !== 'string'
    || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > MAXIMUM_MODULE_BYTES
    || Buffer.byteLength(content) !== entry.bytes || digest(content) !== entry.digest
    || content.includes('\r') || !content.endsWith('\n')) throw cacheError('INTEGRITY');
  return {...entry, content};
}

async function createPrivateDirectory(directory) {
  if (await requireDirectoryOrAbsent(directory)) return;
  try { await fs.mkdir(directory, {mode: 0o700}); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  await requireDirectoryOrAbsent(directory);
}

async function requireDirectoryOrAbsent(directory) {
  const status = await optionalStatus(directory);
  if (status && (!status.isDirectory() || status.isSymbolicLink())) throw cacheError('PATH');
  return Boolean(status);
}

async function requireRegularFileOrAbsent(filePath) {
  const status = await optionalStatus(filePath);
  if (status && (!status.isFile() || status.isSymbolicLink())) throw cacheError('PATH');
  return status;
}

async function requireRegularFile(filePath) {
  const status = await requireRegularFileOrAbsent(filePath);
  if (!status) throw cacheError('PATH');
  return status;
}

async function optionalStatus(filePath) {
  try { return await fs.lstat(filePath); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function decode(bytes) {
  try { return new TextDecoder('utf-8', {fatal: true}).decode(bytes); }
  catch { throw cacheError('INTEGRITY'); }
}

function digest(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function cacheError(kind) {
  const code = `PROJECT_DESIGN_REFERENCE_${kind}_INVALID`;
  return Object.assign(new Error(code), {code, failureType: kind === 'PATH' ? 'local-integrity' : 'contract'});
}

export {ProjectDesignReferenceCacheService};
