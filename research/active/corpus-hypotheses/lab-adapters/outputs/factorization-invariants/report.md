# Factorization invariants — third-module generality test

Status: **PASS** (17/17 comparisons).

## Declared experiment

- system: a three-dimensional vector space with signed-permutation transports attached to factorization labels;
- state: a presented family of transport matrices;
- operation: load a preregistered family;
- observer: inspect transports and compute exact fixed-space intersections;
- observables: marginal, pairwise and total fixed dimensions;
- controls: exhaustive lower-order matching, label reordering and invertible basis change;
- reversal: loss of the 0/1 remainder or failure of representation invariance.

## Re-observed result

All 17,296 triplets among 48 signed permutation matrices were searched. Triplets (3,5,15) and (3,5,17) retain identical marginal dimensions (2,2,2) and pairwise dimensions (1,1,1), while total intersection dimensions remain 0 and 1. Integer-minor rank calculations avoid floating tolerances.

## Contract audit

No core file changed: all five SHA-256 hashes and the file set equal baseline ab5c76f786442b902b5eb9ff1911bb7300f5ae39. The module uses neither recovery/trace semantics nor temporal sequences. Hidden generic dependencies are documented in `contract-audit.md`; notably, access budgets are declared but not centrally enforced, and numerical exactness belongs to the module.

## Classification

- architecture: **supported** for this third finite domain;
- historical result: **reproduced**;
- hypothesis: **unknown** — neither strengthened nor weakened scientifically by architectural migration.
