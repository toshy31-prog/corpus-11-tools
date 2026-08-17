---
name: capability-interference-audit
description: Audit whether adding, removing, ordering, or composing analytical capabilities changes routing or conclusions without new task evidence. Use for skill proliferation, overlapping tools, semantic shadowing, conflicting verdicts, composition-order effects, and plugin non-regression.
---

Treat this skill as an invocation wrapper for the design candidate in `references/capability.md`; a clean static graph does not establish non-interference.

1. Preserve the baseline task set, router, capability set, and expected material conclusions.
2. Read `references/capability.md` completely and load its critical dependencies.
3. Compare baseline with addition, removal, and meaningful order permutations using identical task evidence.
4. Distinguish justified specialization from redundancy, shadowing, conflict, invocation inflation, and conclusion drift.
5. Report `non_interfering_on_tested_scope`, `bounded_interaction`, `redundant`, `shadowing`, `conflicting`, or `not_tested`.
6. Never infer population robustness from package validation or a finite evaluation set.
