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

## First plugin and milestone

`plugins/recovery-erasure.mjs` migrates the closed recovery/erasure experiments. Run:

```bash
node --test tests/*.test.mjs
node runners/recovery-nonregression.mjs
```

The non-regression runner writes deterministic artifacts to `outputs/recovery-erasure/`. It exhaustively replays the N=7 and N=8 two-edge searches, so it normally takes about 30 seconds.

The migration intentionally exposes two formerly implicit choices: historical recovery permits any terminal subset, while the interactive UI traverses from a fixed port; historical wave depth excludes initialization of the actuator root, while the UI includes it.

## Status boundary

This milestone establishes a written, tested core and re-observes the first plugin's historical model results. It is neither a hardware validation nor evidence that the abstraction is universal. Temporal frustration, factorization invariants, and compositional orientation remain prospective plugins rather than empty scaffolds.
