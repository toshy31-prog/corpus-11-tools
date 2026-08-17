---
name: corpus-11-routing
description: Route analytical requests through the Corpus 11.x operational architecture while preserving the user's scene and loading only capabilities that can change conclusion, attribution, confidence, protection, recourse, form, trajectory, or reversal. Use for broad or mixed analytical requests where several Corpus 11 tools may be relevant.
---

Use Architecture 11.x as the operational source of truth. Treat 10.x only as provenance, audit, ambiguity resolution, and non-regression material.

1. Preserve the user's scene, question, terms, point of departure, unresolved tension, and freedom of choice.
2. Identify what could materially change the conclusion, attribution, confidence, protection, recourse, capacity, trajectory, form, or reversal.
3. Consult `references/capability-index.md` and activate only relevant capability skills.
4. Include every critical dependency of an activated capability. Include contextual dependencies only when the scene requires them.
5. Load the rules, procedures, and schemas referenced by those capabilities. Never turn a capability into an invented algorithm.
6. For model, law, compression, invariance, robustness, or internality claims, read `references/epistemic-governance.md` and keep selection criteria distinct from properties attributed to the system.
7. If multiple plausible mechanisms exist, a structuring variable is underspecified, the corpus may preempt framing, the user requests an unknown/external alternative, or premature selection would erase a real difference, use the `explore-first` skill.
8. If the request compares establishing a capacity with undoing, erasing, restoring, neutralizing, or removing its effects, route through `FAM.REVERSAL_ASYMMETRY`: compile direct and inverse profiles separately, match or declare differences in scope and intervention class, and never infer inverse capacity from direct capacity.
9. If ambiguity remains about a migrated node or relation, use `provenance-audit`.
10. Route command-to-effect claims through `command-effect-verification`; availability claims through `effective-presence-assessment`; stop/rollback claims through `terminal-recovery-assessment`.
11. Route secrecy-versus-control through `defense-accountability-boundary`; timing as allocated loss through `temporal-power-assessment`; surviving objects with broken access or reconnection through `relation-loss-assessment`.
12. Route distributed maintenance authority through `co-maintenance-governance`; testimony or identity used for recourse through `privacy-recourse-boundary`; global keep/stop choices over separable functions through `functional-decoupling-assessment`.
13. Use `confidence-convention` for precision-looking confidence and `conclusion-discipline` when an answer risks not concluding. Use `expand-then-audit` only explicitly or when its separate two-pass form is itself discriminating.
14. Stop when another mediation cannot change a material take.
15. Route cause-and-effect claims through `causal-identification`; rival explanations or missing baselines through `rival-model-discrimination`; metric-to-phenomenon claims through `construct-validity-assessment`.
16. Route source-to-target generalization through `transportability-assessment`; micro-to-macro or emergence claims through `scale-transition-assessment`; apparent evidence accumulation through `evidence-dependence-audit`.
17. Route gaming or response to consequential metrics through `strategic-adaptation-assessment`; next-test selection through `value-of-information`.
18. Route skill overlap, order effects, semantic shadowing, or conclusion drift through `capability-interference-audit`.

Never infer:
- rule existence => recognizable condition;
- procedure existence => executable procedure;
- procedure success => robust capability;
- declared capability => established capability;
- available schema => producible instance;
- existing instance => supported claim;
- existing trace => effective memory;
- existing source => independent source;
- declared transfer => established transfer;
- passed test => deployment;
- deployment => robustness;
- simple, compressed, broad, invariant, predictive, or robust model => corresponding property of the system;
- primitive declared in a model => law internal to the system;
- shorter code => structural compression when decoder, parameters, exceptions, domain, or shared information are uncounted;
- reversible representation choice => evidence selecting one completion;
- source order => execution order;
- source block => capability;
- established direct capacity => established inverse capacity.
- packaged resource => executable resource.
- command received => command executed.
- object persistence => relation persistence.
- permission for bounded recourse => permission to disclose.
- association => identified causal effect.
- indicator => valid construct.
- local robustness => target transport.
- macro pattern => uninjected emergence.
- artifact count => independent evidence count.
- improved target metric => improved underlying construct.
- valid graph => non-interfering capability composition.

Public answers should use ordinary, explicit vocabulary. Do not expose internal IDs unless the user is explicitly working on the architecture.
