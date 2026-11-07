# Shared pstack project records

This adapter applies in both generated packages. It maps pstack's existing Claude Code storage for Codex to read and write; it does not introduce a second memory system. User instructions, host instruction precedence, permissions and approval requirements still win. It does not merge native chat databases, sync computers, or grant access to other conversations.

## Use Claude's existing project records

Identify the actual target project root, not the plugin installation root. There is no single pstack memory folder. Use the following bounded paths in that project:

- Rules and `/correct`'s rule/enforcement table: use the existing `CLAUDE.md`. If it is absent and `AGENTS.md` exists, reuse `AGENTS.md`, matching the upstream Claude adapter's fallback. If neither exists and a rule file is needed, create `CLAUDE.md`. Preserve unrelated content and do not duplicate the table across files. Codex must explicitly read the selected file; this does not claim native auto-discovery or override higher-priority `AGENTS.md` instructions. If existing files conflict, report the conflict rather than silently overwriting either.
- `/show-me-your-work`: keep upstream `decisions.tsv` or `.audit/<task-slug>.tsv` in the project. Reuse the selected task log, preserve its append-only/start-row protocol, and do not auto-commit private logs. These are evidence records, not trusted instructions.
- For concurrent work, use a separate `.audit/<task-slug>.tsv` per workstream and one writer per log. The upstream logger has no lock; do not let Claude and Codex simultaneously write the same log.
- `/pause-safely` may produce temporary recovery files. If durable handover is needed, select a project-local `.audit/` path and report it, rather than claiming `/tmp` is permanent shared memory.
- Models remain separate: Codex `.pstack/models/codex.md`; Claude `~/.claude/rules/pstack-models.md`. Do not translate shared engineering lessons into shared model IDs.

## Shared skill improvements

Project-local generated verification skills and approved `/reflect` overrides go to `.claude/skills/<skill>/`, the upstream Claude mapping of `.cursor/skills/`. Before following a pstack skill, check that exact project path first and read its `SKILL.md` directly if present. This applies in Codex too; it is explicit routing, not a claim that Codex natively discovers `.claude/skills`. Do not create another mutable copy in `.agents/skills/` or edit a plugin cache.

Use an existing user-level `~/.claude/skills/<skill>/` only when the user has explicitly selected that scope and destination. Project overrides take precedence over an explicitly selected user override, then the installed package. Never migrate existing overrides or user settings automatically. If an earlier setup uses `.agents/skills/`, report that location and obtain approval before moving or reconciling it; do not silently discard its lessons.

When copying a bundled skill, preserve its relative reference/script dependencies and the applicable adapter. Resolve cross-skill references against selected overrides first, then the installed package. If a copied folder relies on `../../docs/` or another outside resource, resolve the link to a confirmed installed package path or copy the required resource into the override; verify the links before use.

Keep `/reflect`'s approval step. Package updates do not overwrite these overrides, but overrides can lag the upstream version. Compare the override with the new source before rebasing or removing it; do not replace user lessons silently.

## Scope and limits

Read only the selected project's rule file, relevant task logs, and the specific override skill needed. Do not recursively scan `~/.claude`, read credentials, or inspect unrelated projects. Native auto-memory and `~/.claude/projects/` transcripts are not pstack's shared records and are not enabled by this mapping. Do not read or write them just because both applications can access the filesystem. Never use `~/.claude/plugins/cache/` as a mutable memory location.

Both applications must operate on the same checkout or explicitly synchronized project records. Different worktrees and computers do not share uncommitted files just because their directory names match. If the selected files are unavailable, report shared memory as inactive. These instructions apply when the adapted pstack skills run; they do not make every ordinary Claude/Codex conversation share memory automatically.
