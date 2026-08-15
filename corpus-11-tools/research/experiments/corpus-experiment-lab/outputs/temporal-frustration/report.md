# Temporal frustration — second-plugin portability test

Status: **PASS** (18/18 comparisons).

The second scientific domain was implemented without changing any file in `core/`; all five core SHA-256 hashes equal the baseline commit ab5c76f786442b902b5eb9ff1911bb7300f5ae39.

## Re-observed finite result

- all 32,768 labelled tournaments on six vertices were enumerated;
- five matched local keys admit multiple exact frustrations;
- masks 8 and 10 share score sequence (5,3,3,2,1,1) and three cyclic triangles;
- their exact minimum feedback-arc counts remain 1 and 2, hence F_T=1/15 and 2/15.

## Method-effect audit

The directed relations are inputs; the engine's command journal is not read by the optimizer. A supplied candidate order is scored but does not replace minimization. Exact F_T is preserved under vertex relabelling and reversal of every relation.

## Strongest supported conclusion

The current core is portable across two structurally different finite modules without a special execution path. This is evidence for architectural separation, not proof that the contract covers arbitrary future sciences or that F_T is temporal or physical.
