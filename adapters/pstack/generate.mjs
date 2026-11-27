#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
export const root = resolve(here, '../..');
export const output = join(here, 'build');
const kitSkills = ['deslop', 'control-cli', 'control-ui'];
const antigravityModelTiers = new Set(['inherit', 'flash_lite', 'flash', 'pro']);
export const harnesses = [
  { id: 'codex', name: 'Codex', adapter: 'codex.md', manifestPath: '.codex-plugin/plugin.json' },
  { id: 'antigravity', name: 'Antigravity', adapter: 'antigravity.md', manifestPath: 'plugin.json' },
];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => {
    const path = join(dir, e.name);
    if (e.isSymbolicLink()) throw new Error(`Source symlink is not supported: ${path}`);
    return e.isDirectory() ? walk(path) : [path];
  });
}

function filesBelow(dir) {
  return walk(dir).map(path => {
    const bytes = readFileSync(path);
    bytes.executable = (statSync(path).mode & 0o111) !== 0;
    return [path.slice(dir.length + 1).replaceAll('\\', '/'), bytes];
  });
}

function preface(text, instruction, path) {
  const frontmatter = text.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) throw new Error(`Missing frontmatter in entry point: ${path}`);
  return frontmatter[0] + `\n${instruction}\n\n` + text.slice(frontmatter[0].length).trimStart();
}

function adaptAntigravityAgent(text, path) {
  const match = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/);
  if (!match) throw new Error(`Missing frontmatter in agent: ${path}`);
  const eol = match[1].includes('\r\n') ? '\r\n' : '\n';
  let hasSubagent = false;
  let hasMainAgent = false;
  const lines = [];
  for (const line of match[2].split(/\r?\n/)) {
    if (/^is_background\s*:/.test(line)) continue;
    const modelMatch = line.match(/^model\s*:\s*(.+?)\s*$/);
    if (modelMatch) {
      const value = modelMatch[1].replace(/^(["'])(.*)\1$/, '$2');
      lines.push(`model: ${antigravityModelTiers.has(value) ? value : 'inherit'}`);
      continue;
    }
    if (/^subagent\s*:/.test(line)) hasSubagent = true;
    if (/^mainAgent\s*:/.test(line)) hasMainAgent = true;
    lines.push(line);
  }
  if (!hasSubagent) lines.push('subagent: true');
  if (!hasMainAgent) lines.push('mainAgent: false');
  return match[1] + lines.join(eol) + match[3] + text.slice(match[0].length);
}

export function render(sourceRoot = root, adapterRoot = here) {
  const source = join(sourceRoot, 'pstack');
  const manifest = JSON.parse(readFileSync(join(source, 'plugin.json'), 'utf8'));
  const sourceFiles = filesBelow(source);
  const kitFiles = kitSkills.flatMap(name => filesBelow(join(sourceRoot, 'cursor-team-kit/skills', name))
    .map(([path, bytes]) => [`skills/${name}/${path}`, bytes]));
  for (const name of kitSkills) {
    if (existsSync(join(source, 'skills', name))) throw new Error(`Upstream now owns ${name}; review kit integration`);
  }
  const digest = createHash('sha256');
  for (const [path, bytes] of [...sourceFiles, ...kitFiles]) digest.update(path).update('\0').update(bytes).update(bytes.executable ? 'x' : '-');
  const sourceDigest = digest.copy().digest('hex');
  const license = readFileSync(join(sourceRoot, 'cursor-team-kit/LICENSE'));
  const baseVersion = manifest.version.split('+')[0];
  const out = new Map();
  for (const { id: harness, name, adapter } of harnesses) {
    const adapterHasher = createHash('sha256');
    for (const file of ['generate.mjs', adapter, 'shared-memory.md']) {
      adapterHasher.update(file).update('\0').update(readFileSync(join(adapterRoot, file)));
    }
    const adapterDigest = adapterHasher.copy().digest('hex');
    const contentDigest = createHash('sha256').update(digest.copy().digest()).update(adapterHasher.copy().digest()).update(license).digest('hex');
    const packageVersion = `${baseVersion}${baseVersion.includes('-') ? '.' : '-'}pstack.h${contentDigest.slice(0, 20)}`;
    const files = new Map([...sourceFiles, ...kitFiles]);
    for (const doc of [adapter, 'shared-memory.md']) {
      files.set(`docs/harness/${doc}`, readFileSync(join(adapterRoot, doc)));
    }
    files.set('LICENSE.cursor-team-kit', license);
    for (const [path, bytes] of files) {
      if (!/^skills\/[^/]+\/SKILL\.md$/.test(path) && !/^agents\/[^/]+\.md$/.test(path)) continue;
      const prefix = path.startsWith('agents/') ? '../' : '../../';
      const instruction = `In ${name}, first read [the harness adapter](${prefix}docs/harness/${adapter}) and [shared project records](${prefix}docs/harness/shared-memory.md). Follow these mappings before the platform-specific names below. Resolve resources inside this installed package. Shared project overrides take precedence.`;
      let text = bytes.toString('utf8');
      if (harness === 'antigravity' && path.startsWith('agents/')) text = adaptAntigravityAgent(text, path);
      files.set(path, Buffer.from(preface(text, instruction, path)));
    }
    if (harness === 'codex') {
      files.set('.codex-plugin/plugin.json', Buffer.from(JSON.stringify({
        name: 'pstack', version: packageVersion,
        description: `${manifest.description} Codex adapter using official Claude project records.`,
        skills: './skills/',
      }, null, 2) + '\n'));
      files.delete('plugin.json');
    } else if (harness === 'antigravity') {
      files.set('plugin.json', Buffer.from(JSON.stringify({
        $schema: 'https://antigravity.google/schemas/v1/plugin.json',
        name: 'pstack',
        displayName: 'pstack',
        version: packageVersion,
        description: `${manifest.description} Antigravity adapter using official Claude project records.`,
        logo: 'assets/logo.png',
        author: manifest.author,
        homepage: manifest.homepage,
        repository: manifest.repository,
        license: manifest.license,
        keywords: manifest.keywords,
        suggestedPrompts: ['/setup-pstack', '/poteto-help', '/poteto-mode'],
      }, null, 2) + '\n'));
    }
    // No Claude or Cursor variant is generated.
    files.delete('.claude-plugin/plugin.json');
    files.delete('.cursor-plugin/plugin.json');
    files.set('BUILD.json', Buffer.from(JSON.stringify({
      source: 'pstack/', upstreamVersion: manifest.version, version: packageVersion, contentDigest, harness,
      sourceDigest, adapterDigest, kitSkills,
    }, null, 2) + '\n'));
    for (const [path, bytes] of files) out.set(`${harness}/${path}`, bytes);
  }
  out.set('.agents/plugins/marketplace.json', Buffer.from(JSON.stringify({
    name: 'pstack-local', plugins: [{ name: 'pstack', source: { source: 'local', path: './codex' },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity' }],
  }, null, 2) + '\n'));
  return out;
}

export function check(files, directory = output) {
  const actual = existsSync(directory) ? new Map(filesBelow(directory)) : new Map();
  return [...new Set([...files.keys(), ...actual.keys()])].filter(path =>
    !files.has(path) || !actual.has(path) || !files.get(path).equals(actual.get(path)) || !!files.get(path)?.executable !== !!actual.get(path)?.executable);
}

export function generate(files, directory = output) {
  // This function is only called with the fixed disposable build directory by the CLI.
  rmSync(directory, { recursive: true, force: true });
  for (const [path, bytes] of files) {
    const dest = join(directory, path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, bytes);
    chmodSync(dest, bytes.executable ? 0o755 : 0o644);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw new Error('Usage: node adapters/pstack/generate.mjs [--check]');
  const files = render();
  if (args.includes('--check')) {
    const drift = check(files);
    if (drift.length) throw new Error(`Generated packages are stale. Run node adapters/pstack/generate.mjs\n${drift.slice(0, 10).join('\n')}`);
    console.log('pstack adapter packages are up to date.');
  } else {
    generate(files);
    console.log(`Generated ${files.size} files in ${output}`);
  }
}
