# Generated pstack for Codex and Antigravity

Source: https://github.com/RengarLee/plugins/commit/a06057fc75700a12fdb12ac12992d226967fd278

Do not edit this generated branch. Submit source changes to main.

## Codex

Install: codex plugin marketplace add RengarLee/plugins --ref pstack-release
Then install pstack from pstack-shared in the supported desktop client.
Update: codex plugin marketplace upgrade pstack-shared
Refresh/restart the client and verify codex/BUILD.json.

## Antigravity

Install from this release branch: agy plugin install https://github.com/RengarLee/plugins/tree/pstack-release/antigravity
Or install from a local checkout: agy plugin install ./antigravity
Update: re-run agy plugin install with the same target, or refresh the local plugin directory and verify antigravity/BUILD.json.

Claude Code stays on the official cursor/plugins marketplace (pstack@cursor-plugins), not this branch. Shared project files are not a shared plugin installation.

Publication occurs only after source changes reach main and checks pass. Client updates do not sync the upstream fork.
