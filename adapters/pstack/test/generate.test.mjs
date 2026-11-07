import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render, generate, check, root } from '../generate.mjs';
const files = render();

test('every skill and agent preserves its frontmatter and loads both adapters', () => {
  const entries = [...files].filter(([path]) => /^(codex|claude-code)\/(skills\/[^/]+\/SKILL|agents\/[^/]+)\.md$/.test(path));
  assert.ok(entries.length > 50);
  for (const [path, bytes] of entries) {
    const text = bytes.toString();
    assert.match(text, /^---\r?\nname:/, path);
    assert.match(text, /shared-memory\.md/, path);
    assert.match(text, path.startsWith('codex/') ? /harness\/codex\.md/ : /harness\/claude-code\.md/, path);
    const original = path.replace(/^(codex|claude-code)\//, '');
    const sourcePath = /skills\/(deslop|control-cli|control-ui)\//.test(original)
      ? join(root, 'cursor-team-kit', original) : join(root, 'pstack', original);
    const source = readFileSync(sourcePath, 'utf8');
    assert.equal(text.match(/^---\r?\n[\s\S]*?\r?\n---/)[0], source.match(/^---\r?\n[\s\S]*?\r?\n---/)[0], path);
  }
});

test('packages carry native manifests, skill resources, adapters and optional kit', () => {
  for (const harness of ['codex']) {
    const manifest = JSON.parse(files.get(`${harness}/.${harness === 'codex' ? 'codex' : 'claude'}-plugin/plugin.json`));
    assert.equal(manifest.name, 'pstack');
    assert.ok(files.has(`${harness}/skills/show-me-your-work/scripts/log.sh`));
    assert.ok(files.has(`${harness}/docs/harness/shared-memory.md`));
    for (const name of ['deslop', 'control-cli', 'control-ui']) assert.ok(files.has(`${harness}/skills/${name}/SKILL.md`));
  }
  const catalog = JSON.parse(files.get('.agents/plugins/marketplace.json'));
  assert.equal(catalog.plugins[0].source.path, './codex');
  assert.ok(files.has('codex/.codex-plugin/plugin.json'));
  assert.equal(files.has('.claude-plugin/marketplace.json'), false);
  assert.equal([...files.keys()].some(path => path.startsWith('claude-code/')), false);
  assert.equal(files.has('codex/.cursor-plugin/plugin.json'), false);
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
    rmSync(join(dir, 'codex/skills/how/SKILL.md'));
    assert.ok(check(files, dir).includes('codex/skills/how/SKILL.md'));
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
    for (const harness of ['codex']) {
      assert.match(updated.get(`${harness}/skills/new-upstream/SKILL.md`).toString(), /New source without a heading/);
      assert.notEqual(updated.get(`${harness}/BUILD.json`).toString(), files.get(`${harness}/BUILD.json`).toString());
    }
  } finally { rmSync(dir, { recursive: true }); }
});


test('kit-only and adapter-only changes each create a distinct consistent plugin version', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pstack-version-'));
  const version = (result, harness) => JSON.parse(result.get(`${harness}/BUILD.json`)).version;
  const verify = result => {
    const expected = version(result, 'codex');
    assert.match(expected, /^\d+\.\d+\.\d+-pstack\.h[0-9a-f]{20}$/);

    for (const path of ['codex/.codex-plugin/plugin.json']) {
      assert.equal(JSON.parse(result.get(path)).version, expected, path);
    }
  };
  try {
    cpSync(join(root, 'pstack'), join(dir, 'pstack'), { recursive: true });
    cpSync(join(root, 'cursor-team-kit'), join(dir, 'cursor-team-kit'), { recursive: true });
    const adapters = join(dir, 'adapter');
    mkdirSync(adapters);
    for (const file of ['generate.mjs', 'codex.md', 'shared-memory.md']) cpSync(join(root, 'adapters/pstack', file), join(adapters, file));
    const baseline = render(dir, adapters);
    assert.equal(version(baseline, 'codex'), version(files, 'codex'));
    const kitFile = join(dir, 'cursor-team-kit/skills/deslop/SKILL.md');
    writeFileSync(kitFile, readFileSync(kitFile, 'utf8') + '\nNew kit instruction.\n');
    const kitChanged = render(dir, adapters);
    assert.notEqual(version(kitChanged, 'codex'), version(baseline, 'codex'));
    const adapterFile = join(adapters, 'codex.md');
    writeFileSync(adapterFile, readFileSync(adapterFile, 'utf8') + '\nNew adapter mapping.\n');
    const adapterChanged = render(dir, adapters);
    assert.notEqual(version(adapterChanged, 'codex'), version(kitChanged, 'codex'));
    for (const result of [baseline, kitChanged, adapterChanged]) verify(result);
    assert.equal(JSON.parse(adapterChanged.get('codex/BUILD.json')).upstreamVersion, JSON.parse(baseline.get('codex/BUILD.json')).upstreamVersion);
  } finally { rmSync(dir, { recursive: true }); }
});

test('Codex follows official Claude project records without broad home-directory access', () => {
  const mapping = readFileSync(join(root, 'adapters/pstack/shared-memory.md'), 'utf8');
  for (const harness of ['codex']) {
    const text = files.get(`${harness}/docs/harness/shared-memory.md`).toString();
    assert.equal(text, mapping);
    for (const required of ['existing `CLAUDE.md`', '`AGENTS.md` exists', '.claude/skills/<skill>/', 'decisions.tsv', '.audit/<task-slug>.tsv', 'Keep `/reflect`\'s approval step', 'Do not recursively scan `~/.claude`', 'credentials', 'one writer per log', 'Native auto-memory', 'not make every ordinary', 'official upstream plugin unchanged', 'do not persist the generated Codex-only harness preface', 'cannot change that precedence from Codex']) assert.ok(text.includes(required), required);
    assert.match(text, /Do not create another mutable copy in `\.agents\/skills\//);
    assert.match(text, /only when the user has explicitly selected that scope/);
  }
  const codex = files.get('codex/docs/harness/codex.md').toString();
  assert.match(codex, /maps to project `\.claude\/skills\//);
  assert.doesNotMatch(codex, /maps to project `\.agents\/skills\//);
});
