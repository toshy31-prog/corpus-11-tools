---
name: transportability-assessment
description: Assess whether a result, effect, capability, or model can transfer from a source setting to a target population, environment, protocol, or domain. Use for external validity, generalization, simulation-to-world transfer, cross-domain claims, and deployment beyond tested conditions.
---

Treat this skill as an invocation wrapper for the design candidate in `references/capability.md`; local robustness and repeated deployment do not establish transport.

1. Define source and target scenes before comparing them.
2. Read `references/capability.md` completely and load its critical dependencies.
3. Compare population, mechanism, intervention, measurement, selection, environment, support, and interference.
4. Identify which differences are bridged by evidence, which are assumed invariant, and which block transport.
5. Report `transported_for_scope`, `conditionally_transportable`, `not_transportable`, or `transport_not_established`.
6. Keep source validity, target validity, and the bridge between them separate.
