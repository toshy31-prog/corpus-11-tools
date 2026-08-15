#!/usr/bin/env python3
"""Exact matched comparison of the two-loop S3 toy with an abelian C6 control."""

from collections import Counter
from itertools import permutations, product


S3_IDENTITY = (0, 1, 2)
S3 = tuple(permutations(range(3)))
C6 = tuple(range(6))


def parity(permutation: tuple[int, ...]) -> int:
    inversions = sum(
        permutation[i] > permutation[j]
        for i in range(len(permutation))
        for j in range(i + 1, len(permutation))
    )
    return inversions % 2


def weighted_counts(elements, identity, predicate) -> Counter[int]:
    """Return coefficients indexed by the power of the identity weight q."""
    counts: Counter[int] = Counter()
    for first, second in product(elements, repeat=2):
        if predicate(first, second):
            counts[(first == identity) + (second == identity)] += 1
    return counts


def s3_common_fixed_vector(first: tuple[int, ...], second: tuple[int, ...]) -> bool:
    """Common fixed vector in the faithful real standard plane representation."""
    if first == S3_IDENTITY and second == S3_IDENTITY:
        return True
    if first == S3_IDENTITY:
        return parity(second) == 1
    if second == S3_IDENTITY:
        return parity(first) == 1
    return parity(first) == 1 and first == second


def c6_common_fixed_vector(first: int, second: int) -> bool:
    """Common fixed vector in the faithful real plane rotation representation."""
    return first == 0 and second == 0


s3_total = weighted_counts(S3, S3_IDENTITY, lambda _a, _b: True)
c6_total = weighted_counts(C6, 0, lambda _a, _b: True)
s3_temporal = weighted_counts(
    S3, S3_IDENTITY, lambda first, second: parity(first) == parity(second) == 0
)
c6_temporal = weighted_counts(
    C6, 0, lambda first, second: first % 2 == second % 2 == 0
)
s3_invariant = weighted_counts(S3, S3_IDENTITY, s3_common_fixed_vector)
c6_invariant = weighted_counts(C6, 0, c6_common_fixed_vector)

assert s3_total == c6_total == Counter({0: 25, 1: 10, 2: 1})
assert s3_temporal == c6_temporal == Counter({0: 4, 1: 4, 2: 1})
assert s3_invariant == Counter({0: 3, 1: 6, 2: 1})
assert c6_invariant == Counter({2: 1})

print("PASS: matched S3/C6 controls enumerate 36 ordered pairs each")
print("both: P_T = (q^2 + 4q + 4)/(q^2 + 10q + 25)")
print("S3:   P_I = (q^2 + 6q + 3)/(q^2 + 10q + 25)")
print("C6:   P_I = q^2/(q^2 + 10q + 25)")
print("RESULT: identity weighting raises both observables in the abelian control")
print("BOUND: the qualitative co-increase is not specific to non-commutativity")
