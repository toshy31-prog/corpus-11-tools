#!/usr/bin/env python3
"""Search signed-permutation actions with equal marginal fixed profiles."""

from collections import Counter, defaultdict, deque
from fractions import Fraction
from itertools import permutations, product


DIMENSION = 3
IDENTITY = tuple(
    1 if row == column else 0
    for row in range(DIMENSION)
    for column in range(DIMENSION)
)


def multiply(first: tuple[int, ...], second: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(
        sum(
            first[row * DIMENSION + pivot] * second[pivot * DIMENSION + column]
            for pivot in range(DIMENSION)
        )
        for row in range(DIMENSION)
        for column in range(DIMENSION)
    )


def closure(generators: tuple[tuple[int, ...], ...]) -> frozenset[tuple[int, ...]]:
    elements = {IDENTITY}
    queue = deque([IDENTITY])
    while queue:
        current = queue.popleft()
        for generator in generators:
            candidate = multiply(current, generator)
            if candidate not in elements:
                elements.add(candidate)
                queue.append(candidate)
    return frozenset(elements)


def rank(rows: list[list[int]]) -> int:
    matrix = [list(map(Fraction, row)) for row in rows if any(row)]
    if not matrix:
        return 0
    row_count = len(matrix)
    column_count = len(matrix[0])
    pivot_row = 0
    for column in range(column_count):
        pivot = next(
            (row for row in range(pivot_row, row_count) if matrix[row][column]), None
        )
        if pivot is None:
            continue
        matrix[pivot_row], matrix[pivot] = matrix[pivot], matrix[pivot_row]
        divisor = matrix[pivot_row][column]
        matrix[pivot_row] = [value / divisor for value in matrix[pivot_row]]
        for row in range(row_count):
            if row != pivot_row and matrix[row][column]:
                scale = matrix[row][column]
                matrix[row] = [
                    value - scale * basis
                    for value, basis in zip(matrix[row], matrix[pivot_row])
                ]
        pivot_row += 1
    return pivot_row


def fixed_rows(matrix: tuple[int, ...]) -> list[list[int]]:
    return [
        [
            matrix[row * DIMENSION + column] - (1 if row == column else 0)
            for column in range(DIMENSION)
        ]
        for row in range(DIMENSION)
    ]


def fixed_dimension(matrix: tuple[int, ...]) -> int:
    return DIMENSION - rank(fixed_rows(matrix))


def common_fixed_dimension(first: tuple[int, ...], second: tuple[int, ...]) -> int:
    return DIMENSION - rank(fixed_rows(first) + fixed_rows(second))


def element_order(matrix: tuple[int, ...]) -> int:
    current = IDENTITY
    for order in range(1, 49):
        current = multiply(current, matrix)
        if current == IDENTITY:
            return order
    raise AssertionError("element order exceeds the signed-permutation group")


signed_permutations = []
for permutation in permutations(range(DIMENSION)):
    for signs in product((-1, 1), repeat=DIMENSION):
        signed_permutations.append(
            tuple(
                signs[row] if column == permutation[row] else 0
                for row in range(DIMENSION)
                for column in range(DIMENSION)
            )
        )
signed_permutations = tuple(signed_permutations)
assert len(signed_permutations) == 48

groups = set()
for index, first in enumerate(signed_permutations):
    for second in signed_permutations[index:]:
        groups.add(closure((first, second)))
assert len(groups) == 91

records = []
for group in groups:
    fixed_profile = tuple(sorted(Counter(fixed_dimension(item) for item in group).items()))
    order_profile = tuple(sorted(Counter(element_order(item) for item in group).items()))
    invariant_polynomial: Counter[int] = Counter()
    for first, second in product(group, repeat=2):
        if common_fixed_dimension(first, second) > 0:
            invariant_polynomial[(first == IDENTITY) + (second == IDENTITY)] += 1
    records.append(
        (
            len(group),
            fixed_profile,
            order_profile,
            tuple(sorted(invariant_polynomial.items())),
        )
    )

buckets = defaultdict(list)
for record in records:
    buckets[(record[0], record[1])].append(record)

selected = None
for key in sorted(buckets):
    for first in buckets[key]:
        for second in buckets[key]:
            if first[2] != second[2] and first[3] != second[3]:
                selected = (first, second, key)
                break
        if selected:
            break
    if selected:
        break

assert selected is not None
first, second, matched_key = selected
polynomials = {first[3], second[3]}
order_profiles = {first[2], second[2]}

assert matched_key == (4, ((1, 3), (3, 1)))
assert order_profiles == {
    ((1, 1), (2, 3)),
    ((1, 1), (2, 1), (4, 2)),
}
assert polynomials == {
    ((0, 3), (1, 6), (2, 1)),
    ((0, 9), (1, 6), (2, 1)),
}

print("PASS: 91 distinct two-generator subgroups of signed 3D permutations searched")
print("matched: faithful V4/C4 actions, order=4, dimension=3")
print("matched fixed profile: one dim-3 identity and three dim-1 elements")
print("V4: P_I numerator=q^2+6q+3")
print("C4: P_I numerator=q^2+6q+9, equal to denominator")
print("RESULT: marginal fixed dimensions do not determine pairwise invariance")
print("BOUND: the discriminator is fixed-subspace incidence, not non-commutativity")
