---
name: principle-subtract-before-you-add
description: "Apply when sequencing an addition, refactor, or rewrite. Remove dead code, redundant validators, and stub references first, then build on the simpler base."
disable-model-invocation: true
---

In Codex, first read [the harness adapter](../../docs/harness/codex.md) and [shared project records](../../docs/harness/shared-memory.md). Follow these mappings before the platform-specific names below. Resolve resources inside this installed package. Shared project overrides take precedence.

# Subtract Before You Add

When evolving a system, remove complexity first, then build. Default to subtraction.

Make simplification a continual investment. Leave the design slightly simpler and more capable behind the same or smaller surface than you found it.

- Sequence removal before construction
- Cut before you polish (get to the minimum before investing in quality)
- Design for observed usage, not speculative edge cases
- No speculative validators, parsers, or guards beyond what the spec demands
- Simplify prompts (remove redundant instructions, excessive templates)
- When a reference has no novel content, delete it rather than leaving a stub
