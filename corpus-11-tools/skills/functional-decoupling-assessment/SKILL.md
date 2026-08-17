---
name: functional-decoupling-assessment
description: Separate observation, memory, recommendation, command, execution, replication, and deletion before a global keep, stop, restore, or remove decision. Use when a system has useful and harmful functions that can be isolated.
---

# Functional Decoupling Assessment

Reject all-or-nothing framing until coupling is established.

## Workflow

1. Enumerate functions, carriers, interfaces, and dependencies.
2. Test which functions can be disabled, retained, sandboxed, or replaced independently.
3. Compare direct and inverse costs for each function.
4. Check residual traces, reactivation, and terminal recovery.
5. Recommend the smallest functional change that achieves the goal.

Read `references/capability.md` for provenance and graph relations.
