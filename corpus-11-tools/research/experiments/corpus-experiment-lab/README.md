# Corpus Experiment Lab

Minimal hypothesis-neutral execution infrastructure for Corpus 11 experiments.

The core knows only opaque state, named transformations, perturbations, observers, criteria, controls, and classifiers. It executes and records; scientific meaning, matching conditions, adversary access, success thresholds, and reversal conditions belong to plugins.

## Contract

Each plugin supplies:

- `createState(configuration)`;
- registries for `operations`, `perturbations`, `observers`, `criteria`, `controls`, and `classifiers`;
- an explicit default observer/adversary class (`allowedOperations`, `maxSteps`, `successThreshold`), replaceable by each experiment;
- hypothesis-specific conventions and reversal conditions.

Observers and criteria receive cloned state and a cloned random stream. They cannot silently alter subsequent execution. Operations and perturbations mutate live state and every call is journalled with before/after hashes.

## Implemented plugins

`plugins/recovery-erasure.mjs` migrates the closed recovery/erasure experiments. Run:

```bash
node --test tests/*.test.mjs
node runners/recovery-nonregression.mjs
```

The non-regression runner writes deterministic artifacts to `outputs/recovery-erasure/`. It exhaustively replays the N=7 and N=8 two-edge searches, so it normally takes about 30 seconds.

The migration intentionally exposes two formerly implicit choices: historical recovery permits any terminal subset, while the interactive UI traverses from a fixed port; historical wave depth excludes initialization of the actuator root, while the UI includes it.

`plugins/temporal-frustration.mjs` is the portability test: it models directed local constraints, scalar candidate orders and exact minimum feedback arcs without using recovery/erasure concepts. Its addition changes no file in `core/`; the runner verifies all core hashes against the first-plugin commit.

```bash
node runners/temporal-frustration-nonregression.mjs
```

`plugins/factorization-invariants.mjs` is the third-domain test. It uses exact finite linear algebra, fixed-subspace intersections, factorization relabelling and basis changes without trace or temporal-sequence semantics. See `contract-audit.md` for the core's remaining generic dependencies.

```bash
node runners/factorization-invariants-nonregression.mjs
```

## Status boundary

This establishes a written, tested core and re-observes three finite modules with different semantics and no special core path. It is neither a hardware validation nor evidence that the abstraction is universal. Compositional orientation remains a prospective plugin rather than empty scaffolding.
