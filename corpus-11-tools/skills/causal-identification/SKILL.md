---
name: causal-identification
description: Determine whether a causal claim is identified, partially identified, or unsupported by the available observations, assumptions, and interventions. Use for cause-and-effect claims, confounding, reverse causality, mediation, selection, causal graphs, natural experiments, or intervention design.
---

Treat this skill as an invocation wrapper for the design candidate described in `references/capability.md`; its presence does not establish causal identification or universal robustness.

1. Preserve the user's causal question and define cause, outcome, population, time, intervention, and counterfactual contrast.
2. Read `references/capability.md` completely.
3. Load critical dependencies named there; load contextual dependencies only when they can change the verdict.
4. Separate construct definition, causal structure, identification assumptions, estimation, and transport. Do not let success at one level establish the next.
5. Report one of `identified_under_assumptions`, `partially_identified`, `not_identified`, or `causal_question_underspecified`.
6. State the smallest evidence or intervention that could change the verdict and stop when further analysis cannot change it.
