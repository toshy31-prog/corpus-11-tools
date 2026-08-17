# Executable contract

The candidate implementation lives under `research/experiments/corpus-experiment-lab/arena/`.

## Entry points

- `cli.mjs`: developer demonstration surface for `list`, `demo <fixture>`, `status`, and `test`; fixture aliases are not user cases
- `runner.mjs`: `runBlindArena({ arenaId, scenario, contenders, seed, blindKey, claimExternal })`
- `contracts.mjs`: scenario and contender validation
- `fixtures/thermal-mosaic.mjs`: internal synthetic fixture; never external evidence
- `fixtures/braess-network.mjs`: mixed adaptation of an independently published network mechanism
- `run-demo.mjs`: deterministic example
- `run-braess.mjs`: deterministic mixed-provenance example
- `declarative/adapter.mjs`: code-free frozen-world adapter
- `declarative/freeze-scenario.mjs`: SHA-256 freeze tool; input and output must differ
- `declarative/author-template.json`: unsealed author intake template
- `fixtures/declarative-pulse.json`: frozen internal witness
- `run-declarative.mjs`: declarative execution example
- `tests/open-arena.test.mjs`: matching, blinding, order invariance, false-externality, and view-isolation controls

## Scenario surface

A scenario declares `manifest.id`, `version`, `title`, `rounds`, at least two outcome `dimensions`, `reversalConditions`, and a `source` record. It implements:

- `createTrial({ seed }) -> { world, exogenous }`
- `project({ world, round, history }) -> view`
- `admissibleActions({ view, round }) -> string[]`
- `act({ world, action, round, exogenous })`
- `observe({ world, round }) -> observation`
- `scorePredictions({ predictions, view, observation, round }) -> assessment`
- `close({ world, history }) -> outcome vector`

`close` must not return `winner` or `aggregateScore`.

## Contender surface

A contender declares `manifest.id`, `version`, `title`, and `family`, then implements:

`decide({ view, allowedActions, history, round }) -> { action, predictions }`

The contender never receives world truth or the exogenous sequence.

`blindKey` must remain outside the public report. The runner returns the public report and the identity map separately; callers must store them separately for a genuinely blind review.

## Declarative admission

Use the declarative adapter when scenario semantics must remain under an external author's vocabulary. The document supplies its own state names, events, views, actions, transitions, observations, prediction targets, outcomes, and reversal conditions. Only finite scalar arithmetic and state-local `set`/`add` mutations are executable.

Freeze a completed draft before showing contenders:

`node arena/declarative/freeze-scenario.mjs draft.json frozen.json`

Never edit the frozen copy. Any change invalidates its SHA-256 hash. A verified hash establishes frozen bytes, not independent authorship; the public report states that boundary.

## Status

The runner is a tested procedure candidate. Internal, mixed-provenance, and code-free frozen witnesses establish execution safeguards only. No independently authored submitted bundle, human field use, transportability, or capability improvement is established yet.
