# pstack in Codex

Read this adapter and `shared-memory.md` in this directory once per session before following a bundled skill or agent. These are harness mappings, not permission grants. User instructions, the actual tool schema, sandbox restrictions, and confirmation requirements always win. `<pstack>` is this generated package's root, two directories above this file. Never infer capability from a model name.

## Tools and agents

- `Task`: use the session's actual subagent tool (for example `spawn_agent`) if available. Pass only supported fields. Otherwise do the work sequentially and disclose that independent/parallel verification was unavailable.
- `poteto-agent` and `comment-sicko`: these are instruction files, not assumed registered Codex agent types. Read `<pstack>/agents/<name>.md` and include the relevant instructions plus the absolute path to `<pstack>/skills/poteto-mode/SKILL.md` in the worker brief. Every worker reads this adapter and the shared-memory adapter too. Never search another product's plugin cache.
- `generalPurpose`: use the normal worker supported by this session. `readonly: true` means a read-only brief and available read-only enforcement, not a made-up tool argument. Inspect the resulting diff; a brief is not an OS sandbox.
- `AskQuestion`: use the session's question tool when present and appropriate; otherwise plain text. `todolist`: use the plan tool when offered, otherwise a short maintained checklist.
- `environment: "cloud"` / `"local"`, `cloud_base_branch`, `run_in_background`, `file_attachments`, and `resume`: do not pass Cursor-only fields. Use actual supported isolation/continuation facilities, or clearly report the missing capability. A subagent does not imply a separate machine or worktree. Never switch an existing working tree's branch under another writer.
- `/name` means read and follow `<pstack>/skills/<name>/SKILL.md`, first checking the project override described in the shared-memory adapter. When telling a user to invoke a discovered Codex skill, use `$name` or its name in plain text, not `/pstack:name`.
- Resolve bundled relative references from the original skill's location inside `<pstack>`. `Read`, `Grep`, `Glob`, `Bash`, and `Shell` mean the actual available file/search/command tools. Shell scripts need an installed compatible shell. On Windows, do not pretend a Bash command is PowerShell.

## Models and setup-pstack

Read project `.pstack/models/codex.md` if it exists before using role defaults. `pstack-models.mdc` and `~/.cursor/rules/pstack-models.mdc` map to that file in Codex. Do not read or overwrite Claude's model preferences. For `/setup-pstack`, keep the upstream role names and budget workflow, write plain Markdown without MDC frontmatter, and use only model/effort values actually exposed by the current session. If model selection is unavailable, use `inherit-parent`; never invent a GPT replacement for a `grok-*` or `claude-*` slug. `auto` and `inherit-parent` omit overrides. Do not assume a model is available because a skill names it. Never modify global Codex configuration to make a role work.

Keep the fan-out size when several reviewers can run on the same model, but label that as same-model review. If a step requires a different-family judge and none is available, mark that check unperformed rather than claiming cross-model verification. Fallback reasoning does not authorize an extra paid provider.

## Paths and history

- `.cursor/skills/` maps to project `.claude/skills/`. Follow `shared-memory.md` for edits/overrides and user-scoped choices.
- `.cursor/rules/*.mdc` and always-applied project rules use Claude's existing project rule file (`CLAUDE.md`, with the `AGENTS.md` fallback described in `shared-memory.md`); model preferences are the exception above. Never turn a rule into a permission grant.
- `~/.cursor/plugins/` and `.cursor-plugin/plugin.json` refer to this installed package and its `.codex-plugin/plugin.json`, not another product's cache.
- A repository GitHub URL for a file included in this bundle maps to the local file. Do not fetch the upstream version over a project override.
- `agent-transcripts` and `~/.cursor/projects/` do not map to a guessed Codex session directory. Use only the active conversation and history explicitly exposed/authorized by the host for this workspace. If inaccessible, use a labeled digest and report transcript-based audits as unverified. Never scan all projects or bypass a denied path. Native Claude and Codex chat histories are not shared by this adapter.

## Features outside Codex

Cursor Automations, `/loop`, Bugbot startup/configuration, `SendToUser`, `update_state`, Cursor cloud-agent dashboards, and Cursor's built-in PR tools are not assumed available. Use a genuine equivalent only when exposed and authorized; otherwise report the step unavailable. Do not claim a background timer, resumed session, secret request, or hosted agent exists. Read ordinary Bugbot GitHub comments with an available forge tool. Use `gh` for a PR operation only if installed, authenticated, and authorized.

The optional `deslop`, `control-cli`, and `control-ui` skills come from `cursor-team-kit` and are bundled when this package is built. They are instructions, not a Cursor SDK. Browser, terminal, GUI and screenshot access still depend on the host. Missing tooling is a verification limit, not a successful check. `/create-skill` maps to a discovered skill-creator or explicit skill authoring, not an invented built-in command.
