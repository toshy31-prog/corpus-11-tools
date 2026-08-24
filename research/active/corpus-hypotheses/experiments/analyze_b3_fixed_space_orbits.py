#!/usr/bin/env python3
"""Independent orbit certificate for common fixed spaces in the natural B3 action."""

import json
from collections import Counter, defaultdict, deque
from fractions import Fraction
from functools import lru_cache
from itertools import combinations, permutations, product


N = 3


def matrices():
    result = []
    for permutation in permutations(range(N)):
        for signs in product((-1, 1), repeat=N):
            matrix = [[0] * N for _ in range(N)]
            for column, row in enumerate(permutation):
                matrix[row][column] = signs[column]
            result.append(tuple(tuple(row) for row in matrix))
    return tuple(result)


MATRICES = matrices()
INDEX = {matrix: index for index, matrix in enumerate(MATRICES)}


def multiply(left, right):
    return tuple(
        tuple(sum(left[row][inner] * right[inner][column] for inner in range(N)) for column in range(N))
        for row in range(N)
    )


def transpose(matrix):
    return tuple(tuple(matrix[column][row] for column in range(N)) for row in range(N))


def rank(rows):
    work = [[Fraction(value) for value in row] for row in rows if any(row)]
    pivot_row = 0
    for column in range(N):
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


@lru_cache(maxsize=None)
def fixed_dimension(indices):
    equations = []
    for index in indices:
        matrix = MATRICES[index]
        for row in range(N):
            equations.append(
                tuple(matrix[row][column] - (row == column) for column in range(N))
            )
    return N - rank(equations)


def signed_graph_dimension(indices):
    adjacency = [[] for _ in range(N)]
    for index in indices:
        matrix = MATRICES[index]
        for source in range(N):
            target = next(row for row in range(N) if matrix[row][source])
            sign = matrix[target][source]
            adjacency[source].append((target, sign))
            adjacency[target].append((source, sign))

    assigned = {}
    balanced_components = 0
    for start in range(N):
        if start in assigned:
            continue
        assigned[start] = 1
        balanced = True
        queue = deque((start,))
        while queue:
            source = queue.popleft()
            for target, sign in adjacency[source]:
                required = assigned[source] * sign
                if target not in assigned:
                    assigned[target] = required
                    queue.append(target)
                elif assigned[target] != required:
                    balanced = False
        balanced_components += int(balanced)
    return balanced_components


def lower_order_key(triple):
    return (
        tuple(sorted((fixed_dimension((index,)) for index in triple), reverse=True)),
        tuple(sorted((fixed_dimension(pair) for pair in combinations(triple, 2)), reverse=True)),
    )


def control_key(triple, fourth):
    return (
        fixed_dimension((fourth,)),
        tuple(
            sorted(
                (fixed_dimension(tuple(sorted((member, fourth)))) for member in triple),
                reverse=True,
            )
        ),
    )


def signed_window(index):
    matrix = MATRICES[index]
    return tuple(
        matrix[target][source] * (target + 1)
        for source in range(N)
        for target in range(N)
        if matrix[target][source]
    )


assert len(MATRICES) == 48 == len(INDEX)
identity = tuple(tuple(int(row == column) for column in range(N)) for row in range(N))
identity_index = INDEX[identity]

conjugation = []
for group_element in MATRICES:
    inverse = transpose(group_element)
    conjugation.append(
        tuple(INDEX[multiply(multiply(inverse, matrix), group_element)] for matrix in MATRICES)
    )

qualifying = tuple(
    triple
    for triple in combinations(range(48), 3)
    if lower_order_key(triple) == ((2, 2, 2), (1, 1, 1))
)
assert len(qualifying) == 84
assert Counter(fixed_dimension(triple) for triple in qualifying) == Counter({0: 68, 1: 16})

subsets_to_check = set((index,) for index in range(48))
subsets_to_check.update(combinations(range(48), 2))
subsets_to_check.update(qualifying)
subsets_to_check.update(
    tuple(sorted(triple + (fourth,)))
    for triple in qualifying
    for fourth in range(48)
    if fourth not in triple
)
for subset in subsets_to_check:
    assert fixed_dimension(subset) == signed_graph_dimension(subset)


def triple_orbit(triple):
    return frozenset(tuple(sorted(action[index] for index in triple)) for action in conjugation)


remaining = set(qualifying)
triple_orbits = []
while remaining:
    representative = min(remaining)
    orbit = triple_orbit(representative)
    assert orbit <= set(qualifying)
    triple_orbits.append((representative, len(orbit), fixed_dimension(representative)))
    remaining -= orbit


extensions = tuple(
    (triple, fourth)
    for triple in qualifying
    for fourth in range(48)
    if fourth not in triple
)


def extension_orbit(extension):
    triple, fourth = extension
    return frozenset(
        (tuple(sorted(action[index] for index in triple)), action[fourth])
        for action in conjugation
    )


remaining_extensions = set(extensions)
extension_orbits = []
while remaining_extensions:
    representative = min(remaining_extensions)
    orbit = extension_orbit(representative)
    assert orbit <= set(extensions)
    triple, fourth = representative
    extension_orbits.append(
        (
            triple,
            fourth,
            len(orbit),
            fixed_dimension(triple),
            fixed_dimension(tuple(sorted(triple + (fourth,)))),
            control_key(triple, fourth),
        )
    )
    remaining_extensions -= orbit

strata = defaultdict(Counter)
for triple, fourth in extensions:
    d3 = fixed_dimension(triple)
    d4 = fixed_dimension(tuple(sorted(triple + (fourth,))))
    strata[control_key(triple, fourth)][(d3, d4, fourth == identity_index)] += 1

assert sorted((size, d3) for _, size, d3 in triple_orbits) == [
    (1, 0),
    (3, 0),
    (4, 0),
    (4, 1),
    (6, 1),
    (6, 1),
    (12, 0),
    (12, 0),
    (12, 0),
    (24, 0),
]
expected_matched_strata = {
    (0, (0, 0, 0)): Counter({(0, 0, False): 1020, (1, 0, False): 240}),
    (1, (0, 0, 0)): Counter({(0, 0, False): 388, (1, 0, False): 72}),
    (1, (1, 0, 0)): Counter({(0, 0, False): 720, (1, 0, False): 252}),
    (2, (1, 1, 1)): Counter(
        {(0, 0, False): 408, (1, 0, False): 84, (1, 1, False): 12}
    ),
    (3, (2, 2, 2)): Counter({(0, 0, True): 68, (1, 1, True): 16}),
}
actual_matched_strata = {
    key: cells
    for key, cells in strata.items()
    if any(cell[0] == 0 for cell in cells) and any(cell[0] == 1 for cell in cells)
}
assert actual_matched_strata == expected_matched_strata

certificate = {
    "group_order": len(MATRICES),
    "identity_index": identity_index,
    "all_starting_triples": 17296,
    "qualifying_triples": len(qualifying),
    "qualifying_d3_counts": dict(sorted(Counter(fixed_dimension(t) for t in qualifying).items())),
    "signed_graph_checks": len(subsets_to_check),
    "triple_orbit_count": len(triple_orbits),
    "triple_orbits": [
        {
            "representative_indices": representative,
            "representative_windows": [signed_window(index) for index in representative],
            "size": size,
            "d3": d3,
        }
        for representative, size, d3 in sorted(triple_orbits)
    ],
    "extension_count": len(extensions),
    "extension_orbit_count": len(extension_orbits),
    "matched_strata": [
        {
            "key": key,
            "cells": [
                {"d3": cell[0], "d4": cell[1], "identity": cell[2], "count": count}
                for cell, count in sorted(cells.items())
            ],
        }
        for key, cells in sorted(strata.items())
        if any(cell[0] == 0 for cell in cells) and any(cell[0] == 1 for cell in cells)
    ],
}

assert sum(orbit["size"] for orbit in certificate["triple_orbits"]) == 84
assert certificate["extension_count"] == 3780
assert certificate["extension_orbit_count"] == 219
assert len(certificate["matched_strata"]) == 5
print(json.dumps(certificate, indent=2, sort_keys=True))
