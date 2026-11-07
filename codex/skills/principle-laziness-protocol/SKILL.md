---
name: principle-laziness-protocol
description: "Apply when refactoring, evaluating diff size, or tempted to add abstractions, layers, or signal threading. Bias toward deletion and the smallest change that solves the problem."
disable-model-invocation: true
---

In Codex, first read [the harness adapter](../../docs/harness/codex.md) and [shared project records](../../docs/harness/shared-memory.md). Follow these mappings before the platform-specific names below. Resolve resources inside this installed package. Shared project overrides take precedence.

# Laziness Protocol

- **Consolidate decisions.** Do not repeat the same choice in several places. Put it behind one source of truth and pass the result as a simple flag.
- **Minimize the diff.** Make the smallest change that solves the problem. Fewer lines beat "elegant" boilerplate.
