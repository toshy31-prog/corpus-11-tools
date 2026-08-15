#!/usr/bin/env python3
"""Classify fixed profiles and invariant polynomials for 2D S3/C6 actions."""

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


def polynomial(elements, identity, predicate) -> Counter[int]:
    counts: Counter[int] = Counter()
    for first, second in product(elements, repeat=2):
        if predicate(first, second):
            counts[(first == identity) + (second == identity)] += 1
    return counts


def s3_standard_fixed_dimension(element: tuple[int, ...]) -> int:
    if element == S3_IDENTITY:
        return 2
    return 1 if parity(element) else 0


def s3_standard_common_fixed(first: tuple[int, ...], second: tuple[int, ...]) -> bool:
    if first == S3_IDENTITY and second == S3_IDENTITY:
        return True
    if first == S3_IDENTITY:
        return parity(second) == 1
    if second == S3_IDENTITY:
        return parity(first) == 1
    return parity(first) == 1 and first == second


def c6_rotation_fixed_dimension(element: int, frequency: int) -> int:
    return 2 if (frequency * element) % 6 == 0 else 0


def c6_character_fixed_dimension(element: int, signs: int) -> int:
    """Number of fixed axes in a sum with `signs` sign and 2-signs trivial axes."""
    return 2 if element % 2 == 0 else 2 - signs


def profile(elements, dimension) -> Counter[int]:
    return Counter(dimension(element) for element in elements)


standard_profile = profile(S3, s3_standard_fixed_dimension)
standard_polynomial = polynomial(S3, S3_IDENTITY, s3_standard_common_fixed)

# Every real orthogonal 2D representation of the cyclic group C6 is, up to
# equivalence, either a rotation character (frequency 0..3, with k and 6-k
# equivalent) or a sum of two real 1D characters (trivial/sign).
c6_profiles = {}
c6_polynomials = {}
for frequency in range(4):
    name = f"rotation_{frequency}"
    kernel = frozenset(element for element in C6 if (frequency * element) % 6 == 0)
    c6_profiles[name] = profile(
        C6, lambda element, k=frequency: c6_rotation_fixed_dimension(element, k)
    )
    c6_polynomials[name] = polynomial(
        C6, 0, lambda first, second, fixed=kernel: first in fixed and second in fixed
    )

for signs in range(3):
    name = f"one_dimensional_sum_{signs}_sign"
    c6_profiles[name] = profile(
        C6, lambda element, count=signs: c6_character_fixed_dimension(element, count)
    )
    if signs < 2:
        c6_polynomials[name] = polynomial(C6, 0, lambda _first, _second: True)
    else:
        c6_polynomials[name] = polynomial(
            C6, 0, lambda first, second: first % 2 == second % 2 == 0
        )

assert standard_profile == Counter({1: 3, 0: 2, 2: 1})
assert standard_polynomial == Counter({0: 3, 1: 6, 2: 1})
assert all(candidate != standard_profile for candidate in c6_profiles.values())
assert all(candidate != standard_polynomial for candidate in c6_polynomials.values())

# Holding S3 fixed while changing its 2D representation changes P_I from the
# standard polynomial to either certainty (trivial+trivial, trivial+sign) or
# the temporal polynomial (sign+sign).
s3_total = polynomial(S3, S3_IDENTITY, lambda _first, _second: True)
s3_sign_squared = polynomial(
    S3, S3_IDENTITY, lambda first, second: parity(first) == parity(second) == 0
)
assert s3_total == Counter({0: 25, 1: 10, 2: 1})
assert s3_sign_squared == Counter({0: 4, 1: 4, 2: 1})
assert standard_polynomial not in (s3_total, s3_sign_squared)

print("PASS: all equivalence types of real orthogonal 2D C6 representations checked")
print("S3 standard fixed profile: dim2=1, dim1=3, dim0=2")
print("MATCH: no C6 representation type has this fixed-dimension profile")
print("MATCH: no C6 representation type reproduces q^2+6q+3 for P_I")
print("ABLATION: at fixed S3, other 2D representations give P_I=1 or P_I=P_T")
print("RESULT: exact P_I belongs to the pair (S3, standard action), not S3 alone")
print("BOUND: no abelian action-matched control exists within order 6 and dimension 2")
