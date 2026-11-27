import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseTree } from '../release.mjs';
import { harnesses } from '../generate.mjs';
const input = { repository: 'RengarLee/plugins', sourceCommit: 'a'.repeat(40), releaseId: '12.1' };
test('release branch exposes Codex and Antigravity packages with consistent versions', () => {
  const files = releaseTree(input);
  for (const path of ['.agents/plugins/marketplace.json']) {
    assert.equal(JSON.parse(files.get(path)).name, 'pstack-shared');
  }
  for (const { id: platform, manifestPath } of harnesses) {
    const build = JSON.parse(files.get(`${platform}/BUILD.json`));
    const manifest = JSON.parse(files.get(`${platform}/${manifestPath}`));
    assert.equal(build.sourceCommit, input.sourceCommit);
    assert.match(build.version, /^\d+\.\d+\.\d+-pstack\.12\.1$/);
    assert.equal(manifest.version, build.version);
    assert.ok(files.has(`${platform}/skills/reflect/SKILL.md`));
  }
  assert.equal(JSON.parse(files.get('PSTACK-RELEASE.json')).managedBy, 'pstack-adapter-release-v1');
  assert.equal(files.has('.claude-plugin/marketplace.json'), false);
  assert.equal([...files.keys()].some(path => path.startsWith('claude-code/')), false);
  assert.match(files.get('README.md').toString(), /agy plugin install https:\/\/github\.com\/RengarLee\/plugins\/tree\/pstack-release\/antigravity/);
  const next = releaseTree({ ...input, releaseId: '13.1' });
  for (const { id: platform } of harnesses) {
    assert.notEqual(next.get(`${platform}/BUILD.json`).toString(), files.get(`${platform}/BUILD.json`).toString());
  }
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
  assert.match(workflow, /git -C "\$publish" add -- codex antigravity \.agents PSTACK-RELEASE\.json README\.md/);
  assert.match(workflow, /push origin HEAD:refs\/heads\/pstack-release/);
});
