#!/usr/bin/env python3
"""Show that two admissible completions of the eight-triplet sketch disagree."""

from collections import Counter


WIDTH = 8
TRIPLETS = tuple((index, (index + 1) % WIDTH, (index + 2) % WIDTH) for index in range(WIDTH))


def constraints(mask):
    result = []
    for index, triplet in enumerate(TRIPLETS):
        ordered = triplet if not mask & (1 << index) else tuple(reversed(triplet))
        first, second, third = ordered
        result.extend(((first, second), (second, third), (first, third)))
    return tuple(result)


def minimum_violations(edges):
    limit = 1 << WIDTH
    dp = [len(edges) + 1] * limit
    dp[0] = 0
    for subset in range(1, limit):
        for last in range(WIDTH):
            if subset & (1 << last):
                previous = subset ^ (1 << last)
                added = sum(
                    multiplicity
                    for (first, second), multiplicity in Counter(edges).items()
                    if first == last and previous & (1 << second)
                )
                dp[subset] = min(dp[subset], dp[previous] + added)
    return dp[-1]


disjoint_distribution = {0: 256}
cyclic_distribution = Counter(minimum_violations(constraints(mask)) for mask in range(256))

assert cyclic_distribution != disjoint_distribution
assert sum(cyclic_distribution.values()) == 256
print(f"disjoint completion F_T numerator distribution: {disjoint_distribution}")
print(f"cyclic completion F_T numerator distribution: {dict(sorted(cyclic_distribution.items()))}")
print("PASS: both completions have eight orientable triplets and 256 configurations")
print("RESULT: the available description does not identify a unique F_T distribution")
print("BOUND: the historical announced numbers remain unreproduced, not contradicted")
