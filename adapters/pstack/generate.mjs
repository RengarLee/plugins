#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
export const root = resolve(here, '../..');
export const output = join(here, 'build');
const kitSkills = ['deslop', 'control-cli', 'control-ui'];

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
  const adapterDigest = createHash('sha256');
  for (const name of ['generate.mjs', 'codex.md', 'shared-memory.md']) adapterDigest.update(name).update('\0').update(readFileSync(join(adapterRoot, name)));
  const license = readFileSync(join(sourceRoot, 'cursor-team-kit/LICENSE'));
  const contentDigest = createHash('sha256').update(digest.copy().digest()).update(adapterDigest.copy().digest()).update(license).digest('hex');
  const baseVersion = manifest.version.split('+')[0];
  const packageVersion = `${baseVersion}${baseVersion.includes('-') ? '.' : '-'}pstack.h${contentDigest.slice(0, 20)}`;
  const out = new Map();
  for (const harness of ['codex']) {
    const files = new Map([...sourceFiles, ...kitFiles]);
    for (const adapter of ['codex.md', 'shared-memory.md']) {
      files.set(`docs/harness/${adapter}`, readFileSync(join(adapterRoot, adapter)));
    }
    files.set('LICENSE.cursor-team-kit', license);
    const name = 'Codex';
    const adapter = 'codex.md';
    for (const [path, bytes] of files) {
      if (!/^skills\/[^/]+\/SKILL\.md$/.test(path) && !/^agents\/[^/]+\.md$/.test(path)) continue;
      const prefix = path.startsWith('agents/') ? '../' : '../../';
      const instruction = `In ${name}, first read [the harness adapter](${prefix}docs/harness/${adapter}) and [shared project records](${prefix}docs/harness/shared-memory.md). Follow these mappings before the platform-specific names below. Resolve resources inside this installed package. Shared project overrides take precedence.`;
      files.set(path, Buffer.from(preface(bytes.toString('utf8'), instruction, path)));
    }
    files.set('.codex-plugin/plugin.json', Buffer.from(JSON.stringify({
      name: 'pstack', version: packageVersion,
      description: `${manifest.description} Codex adapter using official Claude project records.`,
      skills: './skills/',
    }, null, 2) + '\n'));
    // Codex agent types are host-provided; no Claude variant is generated.
    files.delete('.claude-plugin/plugin.json');
    files.delete('.cursor-plugin/plugin.json');
    files.delete('plugin.json');
    files.set('BUILD.json', Buffer.from(JSON.stringify({
      source: 'pstack/', upstreamVersion: manifest.version, version: packageVersion, contentDigest, harness,
      sourceDigest: digest.copy().digest('hex'), adapterDigest: adapterDigest.copy().digest('hex'), kitSkills,
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
    console.log('pstack Codex package is up to date.');
  } else {
    generate(files);
    console.log(`Generated ${files.size} files in ${output}`);
  }
}
