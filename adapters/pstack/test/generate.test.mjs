import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render, generate, check, root, harnesses } from '../generate.mjs';
const files = render();

test('every skill and agent preserves/adapts frontmatter and loads both adapters', () => {
  const entries = [...files].filter(([path]) => /^(codex|antigravity|claude-code)\/(skills\/[^/]+\/SKILL|agents\/[^/]+)\.md$/.test(path));
  assert.ok(entries.length > 100);
  for (const [path, bytes] of entries) {
    const text = bytes.toString();
    const [harness] = path.split('/');
    assert.match(text, /^---\r?\nname:/, path);
    assert.match(text, /shared-memory\.md/, path);
    assert.match(text, new RegExp(`harness/${harness}\\.md`), path);
    const original = path.replace(/^(codex|antigravity|claude-code)\//, '');
    const sourcePath = /skills\/(deslop|control-cli|control-ui)\//.test(original)
      ? join(root, 'cursor-team-kit', original) : join(root, 'pstack', original);
    const source = readFileSync(sourcePath, 'utf8');
    if (harness === 'antigravity' && original.startsWith('agents/')) {
      const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
      const sourceFm = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
      assert.equal(fm.match(/^name:.*$/m)[0], sourceFm.match(/^name:.*$/m)[0], path);
      assert.equal(fm.match(/^description:.*$/m)[0], sourceFm.match(/^description:.*$/m)[0], path);
      assert.doesNotMatch(fm, /^is_background:/m, path);
      assert.match(fm, /^subagent:\s*true$/m, path);
      assert.match(fm, /^mainAgent:\s*false$/m, path);
      const modelMatch = fm.match(/^model:\s*(.+)$/m);
      if (modelMatch) assert.match(modelMatch[1].trim(), /^(inherit|flash_lite|flash|pro)$/, path);
    } else {
      assert.equal(text.match(/^---\r?\n[\s\S]*?\r?\n---/)[0], source.match(/^---\r?\n[\s\S]*?\r?\n---/)[0], path);
    }
  }
});

test('packages carry native manifests, skill resources, adapters and optional kit', () => {
  for (const { id: harness, manifestPath } of harnesses) {
    const manifest = JSON.parse(files.get(`${harness}/${manifestPath}`));
    assert.equal(manifest.name, 'pstack');
    assert.ok(files.has(`${harness}/skills/show-me-your-work/scripts/log.sh`));
    assert.ok(files.has(`${harness}/docs/harness/shared-memory.md`));
    assert.ok(files.has(`${harness}/docs/harness/${harness}.md`));
    for (const name of ['deslop', 'control-cli', 'control-ui']) assert.ok(files.has(`${harness}/skills/${name}/SKILL.md`));
    assert.equal(files.has(`${harness}/.cursor-plugin/plugin.json`), false);
    assert.equal(files.has(`${harness}/.claude-plugin/plugin.json`), false);
  }
  const catalog = JSON.parse(files.get('.agents/plugins/marketplace.json'));
  assert.equal(catalog.plugins[0].source.path, './codex');
  assert.ok(files.has('codex/.codex-plugin/plugin.json'));
  assert.equal(files.has('codex/plugin.json'), false);

  const agyManifest = JSON.parse(files.get('antigravity/plugin.json'));
  assert.equal(agyManifest.$schema, 'https://antigravity.google/schemas/v1/plugin.json');
  assert.equal(agyManifest.displayName, 'pstack');
  assert.equal(agyManifest.logo, 'assets/logo.png');
  assert.ok(files.has('antigravity/assets/logo.png'));
  assert.equal(files.has('antigravity/.codex-plugin/plugin.json'), false);

  assert.equal(files.has('.claude-plugin/marketplace.json'), false);
  assert.equal([...files.keys()].some(path => path.startsWith('claude-code/')), false);
});

test('all injected adapter links resolve inside each package', () => {
  for (const [path, bytes] of files) {
    if (!/\/(SKILL|[^/]+)\.md$/.test(path)) continue;
    for (const [, target] of bytes.toString().matchAll(/\[(?:the harness adapter|shared project records)\]\(([^)]+)\)/g)) {
      const resolved = join(path, '..', target).replaceAll('\\', '/');
      assert.ok(files.has(resolved), `${path} -> ${target}`);
    }
  }
});

test('generation is deterministic, flags stale/deleted/extra files and preserves executable scripts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pstack-generated-'));
  try {
    generate(files, dir);
    assert.deepEqual(check(render(), dir), []);
    writeFileSync(join(dir, 'extra'), 'extra');
    assert.ok(check(files, dir).includes('extra'));
    writeFileSync(join(dir, 'codex/README.md'), 'stale');
    assert.ok(check(files, dir).includes('codex/README.md'));
    writeFileSync(join(dir, 'antigravity/README.md'), 'stale');
    assert.ok(check(files, dir).includes('antigravity/README.md'));
    rmSync(join(dir, 'codex/skills/how/SKILL.md'));
    assert.ok(check(files, dir).includes('codex/skills/how/SKILL.md'));
    rmSync(join(dir, 'antigravity/skills/how/SKILL.md'));
    assert.ok(check(files, dir).includes('antigravity/skills/how/SKILL.md'));
    generate(files, dir);
    assert.deepEqual(check(files, dir), []);
  } finally { rmSync(dir, { recursive: true }); }
});

test('new upstream skills and edits flow through without editing the adapter', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pstack-source-'));
  try {
    cpSync(join(root, 'pstack'), join(dir, 'pstack'), { recursive: true });
    cpSync(join(root, 'cursor-team-kit'), join(dir, 'cursor-team-kit'), { recursive: true });
    mkdirSync(join(dir, 'pstack/skills/new-upstream'));
    writeFileSync(join(dir, 'pstack/skills/new-upstream/SKILL.md'), '---\nname: new-upstream\ndescription: Test new upstream entry\n---\nNew source without a heading.\n');
    const updated = render(dir);
    for (const { id: harness } of harnesses) {
      assert.match(updated.get(`${harness}/skills/new-upstream/SKILL.md`).toString(), /New source without a heading/);
      assert.notEqual(updated.get(`${harness}/BUILD.json`).toString(), files.get(`${harness}/BUILD.json`).toString());
    }
  } finally { rmSync(dir, { recursive: true }); }
});

test('kit-only and adapter-only changes each create a distinct consistent plugin version', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pstack-version-'));
  const version = (result, harness) => JSON.parse(result.get(`${harness}/BUILD.json`)).version;
  const verify = result => {
    for (const { id: harness, manifestPath } of harnesses) {
      const expected = version(result, harness);
      assert.match(expected, /^\d+\.\d+\.\d+-pstack\.h[0-9a-f]{20}$/);
      assert.equal(JSON.parse(result.get(`${harness}/${manifestPath}`)).version, expected, `${harness}/${manifestPath}`);
    }
  };
  try {
    cpSync(join(root, 'pstack'), join(dir, 'pstack'), { recursive: true });
    cpSync(join(root, 'cursor-team-kit'), join(dir, 'cursor-team-kit'), { recursive: true });
    const adapters = join(dir, 'adapter');
    mkdirSync(adapters);
    for (const file of ['generate.mjs', 'codex.md', 'antigravity.md', 'shared-memory.md']) {
      cpSync(join(root, 'adapters/pstack', file), join(adapters, file));
    }
    const baseline = render(dir, adapters);
    for (const { id: harness } of harnesses) assert.equal(version(baseline, harness), version(files, harness));

    const kitFile = join(dir, 'cursor-team-kit/skills/deslop/SKILL.md');
    writeFileSync(kitFile, readFileSync(kitFile, 'utf8') + '\nNew kit instruction.\n');
    const kitChanged = render(dir, adapters);
    for (const { id: harness } of harnesses) assert.notEqual(version(kitChanged, harness), version(baseline, harness));

    const codexFile = join(adapters, 'codex.md');
    writeFileSync(codexFile, readFileSync(codexFile, 'utf8') + '\nNew Codex mapping.\n');
    const codexChanged = render(dir, adapters);
    assert.notEqual(version(codexChanged, 'codex'), version(kitChanged, 'codex'));
    assert.equal(version(codexChanged, 'antigravity'), version(kitChanged, 'antigravity'));

    const agyFile = join(adapters, 'antigravity.md');
    writeFileSync(agyFile, readFileSync(agyFile, 'utf8') + '\nNew Antigravity mapping.\n');
    const agyChanged = render(dir, adapters);
    assert.notEqual(version(agyChanged, 'antigravity'), version(codexChanged, 'antigravity'));
    assert.equal(version(agyChanged, 'codex'), version(codexChanged, 'codex'));

    for (const result of [baseline, kitChanged, codexChanged, agyChanged]) verify(result);
    for (const { id: harness } of harnesses) {
      assert.equal(JSON.parse(agyChanged.get(`${harness}/BUILD.json`)).upstreamVersion, JSON.parse(baseline.get(`${harness}/BUILD.json`)).upstreamVersion);
    }
  } finally { rmSync(dir, { recursive: true }); }
});

test('Codex and Antigravity follow official Claude project records without broad home-directory access', () => {
  const mapping = readFileSync(join(root, 'adapters/pstack/shared-memory.md'), 'utf8');
  for (const { id: harness } of harnesses) {
    const text = files.get(`${harness}/docs/harness/shared-memory.md`).toString();
    assert.equal(text, mapping);
    for (const required of [
      'existing `CLAUDE.md`',
      '`AGENTS.md` exists',
      '.claude/skills/<skill>/',
      'decisions.tsv',
      '.audit/<task-slug>.tsv',
      '.pstack/models/codex.md',
      '.pstack/models/antigravity.md',
      'Keep `/reflect`\'s approval step',
      'Do not recursively scan `~/.claude` or `~/.gemini`',
      'credentials',
      'one writer per log',
      'Native auto-memory',
      'not make every ordinary',
      'official upstream plugin unchanged',
      'do not persist the generated Codex-only or Antigravity-only harness preface',
      'cannot change that precedence from Codex or Antigravity',
    ]) assert.ok(text.includes(required), required);
    assert.match(text, /Do not create another mutable copy in `\.agents\/skills\//);
    assert.match(text, /only when the user has explicitly selected that scope/);
  }
  const codex = files.get('codex/docs/harness/codex.md').toString();
  assert.match(codex, /maps to project `\.claude\/skills\//);
  assert.doesNotMatch(codex, /maps to project `\.agents\/skills\//);

  const antigravity = files.get('antigravity/docs/harness/antigravity.md').toString();
  assert.match(antigravity, /maps to project `\.claude\/skills\//);
  assert.doesNotMatch(antigravity, /maps to project `\.agents\/skills\//);
  for (const required of ['invoke_subagent', 'ask_question', '.pstack/models/antigravity.md', 'flash_lite', 'Workspace: "share"', 'transcript.jsonl']) {
    assert.ok(antigravity.includes(required), required);
  }
});
