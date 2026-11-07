# Shared pstack project records

This adapter applies only to the generated Codex package. Claude Code uses the official upstream plugin unchanged. It maps pstack's existing Claude Code storage for Codex to read and write; it does not introduce a second memory system. User instructions, host instruction precedence, permissions and approval requirements still win. It does not merge native chat databases, sync computers, or grant access to other conversations.

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

Both applications must operate on the same checkout or explicitly synchronized project records. Different worktrees and computers do not share uncommitted files just because their directory names match. If the selected files are unavailable, report shared memory as inactive. These instructions apply when the Codex-adapted pstack skills run; they do not make every ordinary Claude/Codex conversation share memory automatically.

## Official Claude compatibility, not a second Claude plugin

Upstream `docs/harness/claude-code.md` maps project `.cursor/skills/` to `.claude/skills/`, user-level skills to `~/.claude/skills/`, and project rules to `CLAUDE.md` (or `AGENTS.md` when absent). `reflect` copies an approved skill before editing and forbids editing plugin caches. `show-me-your-work` keeps its project `decisions.tsv`/`.audit` logs. Follow these existing locations; do not move Claude's files or require our Claude variant.

When Codex creates a shared override, keep its body platform-neutral: do not persist the generated Codex-only harness preface, Codex tool names, or Codex model settings into Claude's override. Preserve original skill resources and portable instructions. Codex must apply its installed harness mapping before reading that shared override. A Claude-origin skill may still refer to Cursor tools; interpret those through the Codex mapping rather than rewriting the shared file for one platform.

The official Claude adapter explicitly reads bundled `<pstack>/skills/<name>/SKILL.md` for internal skill calls. We cannot change that precedence from Codex. Therefore writing `.claude/skills/<name>/` makes the record available but does not guarantee every official Claude internal call uses it; explicitly invoke the local skill or ask Claude to read that exact file when required. Likewise an official Claude rule-write workflow is not controlled by this adapter. Report conflicting or diverged records instead of claiming automatic bidirectional synchronization. Updating the two plugins independently can introduce different upstream versions; compare the relevant files if behavior diverges.
