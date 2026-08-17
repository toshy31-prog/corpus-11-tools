# Corpus 11 Product Rules

## Operational architecture

Use Corpus 11.x as the operational architecture.

10.x material is provenance, audit, ambiguity resolution and non-regression only.

## Research discipline

Preserve:

observation != attribution
correlation != causality
absence of trace without established detectability => unknown

A hypothesis that absorbs every possible result is non-discriminating.

Do not infer:

declared capability => established capability
test passed => deployment
deployment => robustness
source exists => independent source

## Exploration

Use explore-first only when:
- multiple plausible mechanisms exist;
- a structuring variable is underspecified;
- corpus framing may preempt the problem;
- an unknown/external alternative is requested;
- premature selection may erase a real difference.

Candidate generation must precede audit.

Audit must not seed candidates.

## Product/research boundary

The installable product contains `skills/`, `tools/`, `evals/`, `labs/`, `docs/` and provenance archives.

Project-specific hypotheses, parameters, results and conclusions belong under `../research/` and must not be imported by product code.

Reusable mechanisms extracted from a project require an entry under `../transfers/` and tests that do not depend on the source project.

## Stop rule

Stop adding analysis when additional mediation cannot change:
conclusion,
attribution,
confidence,
test,
trajectory,
or reversal.
