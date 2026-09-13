# Codex / Corpus handoff — Compression Integrity Lab

This file is an explicit handoff to a future Codex/Corpus task.

## Do not assume promotion

Treat this directory as `design_candidate_unvalidated` research. Do not copy these rules into the installed plugin, capability graph, invariants, or release contract merely because the files exist or tests pass locally.

## Candidate invariants to evaluate

Evaluate whether Corpus should eventually support the following concepts:

- `residual_irreducibility`
- `explanatory_ceiling`
- `compression_ledger`
- `compression_reversibility`

Hard candidate rule:

```text
A verdict whose audit declares evidentiary compression reversible
MUST NOT be promoted if the required source material cannot be resolved.
```

Expected failure state:

```text
INVALID_EPISTEMIC_STATE
```

## Questions for Corpus

1. Where in the current architecture does synthesis or adjudication already compress continuous, plural, uncertain, or contextual material into a discrete state?
2. Which of those compressions already preserve resolvable raw material, and which preserve only hashes or summaries?
3. Where would adding a mandatory compression audit create unacceptable complexity or recursive bureaucracy?
4. Which parts belong in a generic Corpus lab, which belong in capability contracts, and which should remain research-only?
5. Can a simpler rival design preserve the same epistemic guarantees with less state and fewer mandatory fields?
6. Does the candidate accidentally convert all unresolved provenance into paralysis? Identify bounded exceptions if necessary.
7. Can adversarial fixtures demonstrate that a live hash with semantically insufficient material is still inadequate for replay?
8. Can the system distinguish source availability, source integrity, semantic completeness, and replayability instead of collapsing them into one boolean?

## Required adversarial work before any promotion

At minimum add or evaluate fixtures for:

- hash exists but artifact bytes are unavailable;
- artifact bytes exist but schema/decoder is unavailable;
- bytes and schema exist but the original transformation discarded uncertainty or dissent;
- replay under a different threshold succeeds;
- replay under a different metric definition is impossible and must be declared so;
- conflicting observers whose disagreement is lost by the executable verdict;
- a `PASS` whose provenance becomes unavailable after initial promotion;
- an intentionally irreversible compression whose scope is explicitly bounded and therefore should not falsely claim reversibility.

## Promotion ceiling

Passing local Node tests can establish only local implementation coherence of this candidate. It does not establish:

- external validity;
- independence of design or generation;
- scientific necessity of these four concepts;
- applicability to all synthesis tasks;
- suitability for political or institutional deployment.

Keep `independence_unknown` unless separate evidence changes it.

## Origin note

The concepts arose during an adversarial reconstruction exercise concerning over-coherence in AI synthesis. The motivating case should be treated only as an origin fixture, not as proof of generality. The candidate must survive independently of that case.

## Suggested next step

Run the local tests in this directory, compare this design against a simpler baseline, then map existing Corpus locations where compression already occurs before proposing any transfer into the product.
