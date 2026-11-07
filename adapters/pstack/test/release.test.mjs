import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseTree } from '../release.mjs';
const input = { repository: 'RengarLee/plugins', sourceCommit: 'a'.repeat(40), releaseId: '12.1' };
test('release branch exposes both packages through a stable marketplace', () => {
  const files = releaseTree(input);
  for (const path of ['.agents/plugins/marketplace.json', '.claude-plugin/marketplace.json']) {
    assert.equal(JSON.parse(files.get(path)).name, 'pstack-shared');
  }
  for (const platform of ['codex', 'claude-code']) {
    const build = JSON.parse(files.get(`${platform}/BUILD.json`));
    const manifest = JSON.parse(files.get(`${platform}/.${platform === 'codex' ? 'codex' : 'claude'}-plugin/plugin.json`));
    assert.equal(build.sourceCommit, input.sourceCommit);
    assert.match(build.version, /^\d+\.\d+\.\d+-pstack\.12\.1$/);
    assert.equal(manifest.version, build.version);
    assert.ok(files.has(`${platform}/skills/reflect/SKILL.md`));
  }
  assert.equal(JSON.parse(files.get('PSTACK-RELEASE.json')).managedBy, 'pstack-adapter-release-v1');
  const next = releaseTree({ ...input, releaseId: '13.1' });
  assert.notEqual(next.get('codex/BUILD.json').toString(), files.get('codex/BUILD.json').toString());
});
test('release metadata rejects ambiguous refs and malformed version input', () => {
  for (const bad of [{ repository: '../secret' }, { sourceCommit: 'main' }, { releaseId: '0.1' }, { releaseId: '1;echo bad' }]) {
    assert.throws(() => releaseTree({ ...input, ...bad }));
  }
});

test('publication is main-only, marked, serialized and never force-pushed', async () => {
  const { readFileSync } = await import('node:fs');
  const workflow = readFileSync(new URL('../../../.github/workflows/pstack-release.yml', import.meta.url), 'utf8');
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /github\.repository == 'RengarLee\/plugins'/);
  assert.doesNotMatch(workflow, /pull_request|schedule:|--force/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /Refusing to replace an unmanaged release branch/);
  assert.match(workflow, /push origin HEAD:refs\/heads\/pstack-release/);
});
