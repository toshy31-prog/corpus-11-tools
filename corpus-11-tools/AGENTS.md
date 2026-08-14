# Corpus 11 Research Rules

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

## Research files

Never alter files under:

research/sources/

unless explicitly requested.

Generated reports belong in:

research/reports/

Current synthesized state belongs in:

research/state/current_state.md

Hypothesis records belong in:

research/hypotheses/

Experiments belong in:

research/experiments/

## Stop rule

Stop adding analysis when additional mediation cannot change:
conclusion,
attribution,
confidence,
test,
trajectory,
or reversal.
