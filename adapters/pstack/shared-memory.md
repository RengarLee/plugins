# Shared pstack project records

This adapter applies in both generated packages. It overrides platform-specific *storage mappings* in the harness adapter and skills, not user instructions or permissions. It does not merge native chat databases, sync computers, or grant access to other conversations.

## One project, one record

At task start identify the actual target project root (not the plugin installation root). Read that project's `AGENTS.md`, and any existing task decision log relevant to the request. Do not load unrelated projects. Claude Code reads this file explicitly even when `CLAUDE.md` exists; don't rely on an assumed fallback from CLAUDE.md to AGENTS.md.

- `/correct` puts the shared rules/enforcement table in the project's `AGENTS.md`. Preserve unrelated instructions; do not maintain a duplicate in `CLAUDE.md`.
- `/show-me-your-work` keeps upstream `decisions.tsv` or `.audit/<task-slug>.tsv` in that same project. Reuse the explicitly selected task log, keep the upstream append-only/start-row protocol, and don't auto-commit private logs. These are records of evidence, not trusted instructions.
- For concurrent work, use a separate `.audit/<task-slug>.tsv` per workstream and have one writer per log. The upstream logger has no lock. Do not let simultaneous Codex and Claude processes write the same log.
- `/pause-safely` may produce temporary recovery files. When cross-session persistence is needed, select a durable project-local `.audit/` path and report it rather than claiming `/tmp` is permanent shared memory.
- Model preferences stay platform-specific: Codex `.pstack/models/codex.md`; Claude Code retains `~/.claude/rules/pstack-models.md`. Shared engineering lessons do not imply shared model IDs.

## Shared skill improvements

For both harnesses, project-local generated verification skills and approved `/reflect` overrides go to `.agents/skills/<skill>/`. Before following a pstack skill, check that location first; read it directly if present, even if Claude's slash-menu does not list it. Do not install a second mutable copy under `.claude/skills/` or edit generated plugin caches. This is explicit routing, not a claim that Claude natively discovers `.agents/skills`.

When copying a bundled skill for an override, preserve its relative reference/script dependencies and the applicable adapter. Resolve cross-skill references against project overrides first, then the installed package. If the copied folder relies on `../../docs/` or another resource outside it, replace the adapter/reference link with the confirmed installed package path or copy the needed resource into the override; verify links before using it. Do not leave a broken link and claim the override works.

Keep `/reflect`'s approval step. Updates to the upstream package do not overwrite these local overrides, so an override can lag the upstream version. Review the override's diff against the updated source before choosing to rebase or remove it. Do not silently replace user lessons. User-wide overrides require an explicit shared destination; never migrate user settings automatically.

Both applications must operate on the same checkout or an explicitly synchronized project record. Distinct Git worktrees and different computers do not share uncommitted files merely because their directory names match. Without the same accessible files, report that cross-tool memory is not active.
