# Recovery / erasure — generic-core non-regression

Status: **PASS** (45/45 comparisons).

The generic engine re-observed the closed specialized results without containing recovery, erasure, graph, or time semantics. The plugin owns those meanings and the declared observer class.

## Re-observed results

- localized: C_info=1 and C_erase=1 for N=2..8;
- broadcast: C_info=1 and C_erase=N for N=2..8;
- matched rooted trees: erasure depths 2 and 3 at equal Hamming distance, work, degrees, and root degree;
- matched eccentricity: one-edge residual means 9/5 and 10/5;
- no two-edge remainder under the preregistered matching after exhaustive searches of 7^5 and 8^6 labelled rooted trees.

## Hidden conventions exposed by migration

1. Historical C_info minimizes over any subset of terminal cells. The interactive lab's read cost instead counts a breadth-first traversal from a fixed read port. They are distinct observables.
2. Historical erasure depth starts after actuator root 0 has been reset. The interactive wave depth includes that reset and is therefore one larger on a connected all-one tree.

## Scope

This validates a written and tested abstraction and re-observes prior model results. It does not validate hardware, physical universality, or the other planned hypothesis plugins.
