---
name: effective-presence-assessment
description: Distinguish a resource being described, present in a package, reachable in context, executable, and verified. Use when files, tools, modules, patches, plugins, models, or capabilities are said to be available or installed.
---

# Effective Presence Assessment

Evaluate presence as separate levels: described, packaged, context-accessible, executable, verified. Never promote a level without direct evidence.

## Workflow

1. Name the exact resource and environment.
2. Test each level independently.
3. Record dependencies, permissions, version, and scope.
4. Exercise the smallest safe operation.
5. State the highest verified level and the first failed or unknown level.

Do not confuse lifecycle state with runtime availability. Read `references/capability.md` for provenance and graph relations.
