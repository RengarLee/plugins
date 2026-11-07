#!/usr/bin/env node
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, generate } from './generate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const releaseOutput = join(here, 'build-release');
export function releaseTree({ repository, sourceCommit, releaseId }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repository)) throw new Error('Invalid repository');
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('Invalid source commit');
  if (!/^[1-9][0-9]*\.[1-9][0-9]*$/.test(releaseId)) throw new Error('Expected run-number.run-attempt');
  const files = render();
  const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
  for (const harness of ['codex']) {
    const buildPath = `${harness}/BUILD.json`;
    const build = JSON.parse(files.get(buildPath));
    const version = `${build.upstreamVersion.split(/[+-]/)[0]}-pstack.${releaseId}`;
    files.set(buildPath, json({ ...build, version, repository, sourceCommit, releaseId }));
    const manifests = harness === 'codex' ? ['.codex-plugin/plugin.json'] : ['.claude-plugin/plugin.json', 'plugin.json'];
    for (const path of manifests) {
      const key = `${harness}/${path}`;
      files.set(key, json({ ...JSON.parse(files.get(key)), version }));
    }
  }
  for (const path of ['.agents/plugins/marketplace.json']) {
    const catalog = JSON.parse(files.get(path));
    catalog.name = 'pstack-shared';
    if (catalog.owner) catalog.owner.name = repository.split('/')[0];
    files.set(path, json(catalog));
  }
  files.set('PSTACK-RELEASE.json', json({ managedBy: 'pstack-adapter-release-v1', repository, sourceCommit, releaseId }));
  files.set('README.md', Buffer.from(`# Generated pstack for Codex\n\nSource: https://github.com/${repository}/commit/${sourceCommit}\n\nDo not edit this generated branch. Submit source changes to main.\n\nInstall: codex plugin marketplace add ${repository} --ref pstack-release\nThen install pstack from pstack-shared in the supported desktop client.\nUpdate: codex plugin marketplace upgrade pstack-shared\nRefresh/restart the client and verify BUILD.json.\n\nClaude Code stays on the official cursor/plugins marketplace (pstack@cursor-plugins), not this branch. Shared project files are not a shared plugin installation.\n\nPublication occurs only after source changes reach main and checks pass. Client updates do not sync the upstream fork.\n`));
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [repository, sourceCommit, releaseId, ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error('Usage: node release.mjs owner/repo commit run-number.run-attempt');
  generate(releaseTree({ repository, sourceCommit, releaseId }), releaseOutput);
  console.log(`Prepared release tree at ${releaseOutput}; no publication performed.`);
}
