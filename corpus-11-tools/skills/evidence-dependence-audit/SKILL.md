---
name: evidence-dependence-audit
description: Determine whether multiple studies, reports, experiments, benchmarks, or observations provide independent support or reuse common data, sources, code, generators, assumptions, or failure modes. Use for evidence synthesis, replication claims, citation cascades, and repeated experiments.
---

Treat this skill as an invocation wrapper for the design candidate in `references/capability.md`; counting artifacts does not count independent evidence.

1. Preserve the claim whose support is being accumulated.
2. Read `references/capability.md` completely and load its critical dependencies.
3. Trace lineage across raw data, sampling frame, source, code, generator, model, assumptions, investigators, funding, protocol, and measurement.
4. Cluster evidence units by shared failure modes; keep unknown lineage unknown.
5. Report `materially_independent`, `partially_dependent`, `substantially_dependent`, or `independence_unknown`.
6. Do not convert the qualitative audit into an effective sample size without a specified statistical model.
