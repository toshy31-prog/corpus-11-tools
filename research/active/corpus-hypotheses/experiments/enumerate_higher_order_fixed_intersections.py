#!/usr/bin/env python3
"""Search signed permutation actions for a genuinely third-order fixed-space remainder."""

from itertools import combinations, permutations, product
from fractions import Fraction


DIMENSION = 3


def matrices():
    result = []
    for permutation in permutations(range(DIMENSION)):
        for signs in product((-1, 1), repeat=DIMENSION):
            matrix = [[0] * DIMENSION for _ in range(DIMENSION)]
            for column, row in enumerate(permutation):
                matrix[row][column] = signs[column]
            result.append(tuple(tuple(row) for row in matrix))
    return tuple(result)


def rank(rows) -> int:
    work = [[Fraction(value) for value in row] for row in rows if any(row)]
    pivot_row = 0
    for column in range(DIMENSION):
        pivot = next((row for row in range(pivot_row, len(work)) if work[row][column]), None)
        if pivot is None:
            continue
        work[pivot_row], work[pivot] = work[pivot], work[pivot_row]
        scale = work[pivot_row][column]
        work[pivot_row] = [value / scale for value in work[pivot_row]]
        for row in range(len(work)):
            if row != pivot_row and work[row][column]:
                factor = work[row][column]
                work[row] = [
                    value - factor * pivot_value
                    for value, pivot_value in zip(work[row], work[pivot_row])
                ]
        pivot_row += 1
    return pivot_row


def fixed_dimension(selected) -> int:
    equations = []
    for matrix in selected:
        for row in range(DIMENSION):
            equations.append(
                tuple(matrix[row][column] - (row == column) for column in range(DIMENSION))
            )
    return DIMENSION - rank(equations)


all_matrices = matrices()
seen = {}
selected_pair = None
discriminating_keys = set()
for indices in combinations(range(len(all_matrices)), 3):
    selected = tuple(all_matrices[index] for index in indices)
    marginal = tuple(sorted((fixed_dimension((matrix,)) for matrix in selected), reverse=True))
    pairwise = tuple(
        sorted((fixed_dimension(pair) for pair in combinations(selected, 2)), reverse=True)
    )
    triple = fixed_dimension(selected)
    key = marginal, pairwise
    previous = seen.get(key)
    if previous is not None and previous[1] != triple:
        discriminating_keys.add(key)
        if selected_pair is None:
            selected_pair = (previous, (indices, triple), key)
    else:
        seen[key] = (indices, triple)

assert selected_pair is not None
(first_indices, first_triple), (second_indices, second_triple), key = selected_pair
assert first_triple != second_triple

print(f"PASS: all triplets among {len(all_matrices)} signed permutation matrices searched")
print(f"matched lower-order keys with multiple triple dimensions: {len(discriminating_keys)}")
print(f"matched marginal and pairwise fixed dimensions: {key}")
print(f"matrix indices A: {first_indices}; triple fixed dimension={first_triple}")
print(f"matrix indices B: {second_indices}; triple fixed dimension={second_triple}")
print("RESULT: first- and second-order fixed data do not determine the triple intersection")
print("BOUND: this is finite linear algebra, not evidence for physical objects")
