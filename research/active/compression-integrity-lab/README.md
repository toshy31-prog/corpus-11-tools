# Compression Integrity Lab

Status: `design_candidate_unvalidated`

This research package explores four candidate invariants for Corpus synthesis and adjudication:

1. `residual_irreducibility` — preserve what remains legitimately unmodelled instead of forcing it into an explanatory schema.
2. `explanatory_ceiling` — declare the maximum legitimate resolution supported by the available evidence.
3. `compression_ledger` — record what explanatory compression gains and what it discards or merges.
4. `compression_reversibility` — require executable simplifications to remain traceable to resolvable source material whenever the system claims they are reversible.

The package does **not** promote these concepts into the installed Corpus plugin. It is a bounded active-research candidate.

## Hard invariant under test

A promoted verdict whose audit declares its evidentiary compression reversible MUST NOT remain valid if the underlying source material cannot be resolved.

In symbolic form:

```text
PASS + declared_reversible + unresolved_source
=> INVALID_EPISTEMIC_STATE
```

A provenance hash alone is insufficient. It can establish artifact identity or integrity, but not artifact availability, semantic completeness, or replayability.

## Candidate synthesis contract

A high-level synthesis should expose three distinct layers:

- what the model explains;
- what was compressed, discarded, or merged to produce that explanation;
- what remains irreducible or outside the legitimate explanatory resolution.

Suggested shape:

```yaml
explanatory_ceiling:
  maximum_legitimate_resolution: "..."
  forbidden_zones: []
  justification: "..."

residual_irreducibility:
  status: present | suspected | not_observed
  observed_residuals: []
  reducibility_status:
    known_unmodelled: true
    theoretically_reducible: unknown
    should_be_reduced: unknown

compression_ledger:
  gained: []
  discarded_or_merged: []
  cost:
    overcoherence_risk: low | medium | high

compression_reversibility:
  raw_material_preserved: true | false
  raw_material_resolvable: true | false
  integrity_verifiable: true | false
  alternative_adjudication_supported: true | false
  destructive_transformations: []
```

## Audit questions

For every decision function that compresses a complex input into a smaller executable state, ask:

1. What is compressed?
2. Why is that compression necessary?
3. Is its domain of validity explicitly bounded?
4. Can an independent evaluator recover enough of the original material to replay the adjudication under a different rule?

## Scope limits

This lab does not claim that all residuals are intrinsically irreducible, nor that all compression must be reversible. It distinguishes at least:

- provisional residuals caused by missing information;
- structural residuals created by representation;
- residuals that should not automatically be absorbed into a model merely to increase apparent coherence.

The tests in this directory are local executable checks of the proposed contract. They are not evidence of external validity, organizational independence, or scientific establishment.
