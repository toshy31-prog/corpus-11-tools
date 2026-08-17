---
name: capability-interference-audit
description: Audit whether adding, removing, ordering, or composing analytical capabilities changes routing or conclusions without new task evidence. Use for skill proliferation, overlapping tools, semantic shadowing, conflicting verdicts, composition-order effects, and plugin non-regression.
---

Treat this skill as an invocation wrapper for the design candidate in `references/capability.md`; a clean static graph does not establish non-interference.

1. Preserve the baseline task set, router, capability set, and expected material conclusions.
2. Read `references/capability.md` completely and load its critical dependencies. Load `change-validation` only when an actual or proposed capability addition, removal, patch, test, deployment, or claimed routing fix makes lifecycle state material.
3. For several analyses applied to one unchanged scene, identify their distinct scopes, dependencies, and material recommendations; bound overlap or conflict and preserve plurality when the scene does not discriminate it. Do not require lifecycle validation or formal order permutations without a capability change or an alleged order effect.
4. When a capability change or order effect is actually at issue, compare baseline with addition, removal, and meaningful order permutations using identical task evidence.
5. Distinguish justified specialization from redundancy, shadowing, conflict, invocation inflation, and conclusion drift.
6. Report `non_interfering_on_tested_scope`, `bounded_interaction`, `redundant`, `shadowing`, `conflicting`, or `not_tested`.
7. Never infer population robustness from package validation or a finite evaluation set.
