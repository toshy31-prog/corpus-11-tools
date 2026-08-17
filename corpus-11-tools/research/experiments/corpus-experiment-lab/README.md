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

## Open experiment arena candidate

`arena/` adds a first executable bridge from analysis to causal consequence. It runs rival methods on matched frozen trials, requires predictions before action, blinds public identities, preserves outcome vectors, and refuses to call the maintainer-authored fixture external evidence.

```bash
node --test arena/tests/*.test.mjs
node arena/run-demo.mjs
node arena/run-braess.mjs
node arena/run-declarative.mjs
```

The thermal fixture is internal. The Braess fixture preserves an independently published causal mechanism but remains `mixed` because Corpus maintainers encoded the world, contenders, and outcome dimensions. Neither is field validation. The next discriminating step remains a scenario supplied and frozen independently before contender inspection.

`arena/declarative/` removes the need for a maintainer-written scenario adapter. An author can name arbitrary state variables, define a bounded expression tree and state mutations in JSON, then freeze the document with SHA-256 before contender inspection:

```bash
node arena/declarative/freeze-scenario.mjs draft.json frozen.json
```

The interpreter permits scalar arithmetic and `set`/`add` mutations on `state.*` only. It executes no imported code or free-form expression. `author-template.json` is an unsealed intake template; the included frozen pulse document is an internal execution witness, not external evidence.

For ordinary use, the arena now has one command surface:

```bash
node arena/cli.mjs list
node arena/cli.mjs run ilyana
node arena/cli.mjs status
node arena/cli.mjs test
```

`run` prints the complete replayable report. `status` lists local lifecycle decisions without promoting them into global capability verdicts.

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
