#!/usr/bin/env python3
"""Exact quotient audit for the S4 fixed-space experiment.

This is a formal, exploratory check.  It removes the line fixed by every
permutation before asking whether the previously observed triple remainder
predicts a non-trivial fourth-order remainder.  It does not test objecthood,
time, or any physical system.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from fractions import Fraction
from itertools import combinations, permutations
from statistics import median


DIMENSION = 4
PERMUTATIONS = tuple(permutations(range(DIMENSION)))


def permutation_matrix(permutation: tuple[int, ...]) -> tuple[tuple[int, ...], ...]:
    rows = [[0] * DIMENSION for _ in range(DIMENSION)]
    for column, row in enumerate(permutation):
        rows[row][column] = 1
    return tuple(tuple(row) for row in rows)


MATRICES = tuple(permutation_matrix(permutation) for permutation in PERMUTATIONS)


def rank(rows: list[tuple[int, ...]]) -> int:
    work = [[Fraction(value) for value in row] for row in rows if any(row)]
    pivot = 0
    for column in range(DIMENSION):
        pivot_row = next(
            (index for index in range(pivot, len(work)) if work[index][column]),
            None,
        )
        if pivot_row is None:
            continue
        work[pivot], work[pivot_row] = work[pivot_row], work[pivot]
        scale = work[pivot][column]
        work[pivot] = [value / scale for value in work[pivot]]
        for row_index in range(len(work)):
            if row_index == pivot or not work[row_index][column]:
                continue
            factor = work[row_index][column]
            work[row_index] = [
                value - factor * pivot_value
                for value, pivot_value in zip(work[row_index], work[pivot])
            ]
        pivot += 1
    return pivot


def full_fixed_dimension(indices: tuple[int, ...]) -> int:
    equations: list[tuple[int, ...]] = []
    for index in indices:
        matrix = MATRICES[index]
        for row in range(DIMENSION):
            equations.append(
                tuple(matrix[row][column] - int(row == column) for column in range(DIMENSION))
            )
    return DIMENSION - rank(equations)


def quotient_fixed_dimension(indices: tuple[int, ...]) -> int:
    """Dimension after quotienting Q^4 by the constant fixed line.

    Every permutation matrix fixes (1, 1, 1, 1), so that line lies in each
    common fixed space.  The quotient dimension is therefore exact dimension
    minus one; no floating projection or basis choice is introduced.
    """

    dimension = full_fixed_dimension(indices) - 1
    if dimension < 0:
        raise AssertionError("the declared common fixed line was not present")
    return dimension


def fixed_profile(indices: tuple[int, ...]) -> tuple[tuple[int, ...], tuple[int, ...], int]:
    marginal = tuple(
        sorted((quotient_fixed_dimension((index,)) for index in indices), reverse=True)
    )
    pairwise = tuple(
        sorted(
            (quotient_fixed_dimension(pair) for pair in combinations(indices, 2)),
            reverse=True,
        )
    )
    return marginal, pairwise, quotient_fixed_dimension(indices)


def is_identity(index: int) -> bool:
    return MATRICES[index] == permutation_matrix(tuple(range(DIMENSION)))


def exact_mean(values: list[int]) -> Fraction:
    return sum(values, Fraction(0)) / len(values)


def analyse() -> dict[str, object]:
    if len(MATRICES) != 24:
        raise AssertionError("the S4 permutation catalogue must contain 24 matrices")
    if not all(quotient_fixed_dimension((index,)) >= 0 for index in range(len(MATRICES))):
        raise AssertionError("quotient dimensions must be non-negative")

    triples: list[tuple[tuple[int, int, int], tuple[tuple[int, ...], tuple[int, ...]], int]] = []
    by_lower_order: dict[tuple[tuple[int, ...], tuple[int, ...]], Counter[int]] = defaultdict(Counter)
    for triple in combinations(range(len(MATRICES)), 3):
        marginal, pairwise, triple_dimension = fixed_profile(triple)
        key = (marginal, pairwise)
        triples.append((triple, key, triple_dimension))
        by_lower_order[key][triple_dimension] += 1

    target_key = ((2, 2, 2), (1, 1, 1))
    qualifying = [
        (triple, triple_dimension)
        for triple, key, triple_dimension in triples
        if key == target_key
    ]
    qualifying_counts = Counter(dimension for _, dimension in qualifying)

    # The identity is retained as an explicit algebraic control but cannot be
    # a non-trivial prospective fourth factorization because it adds no
    # constraint.  The verdict uses only non-identity additions.
    extensions: list[dict[str, object]] = []
    for triple, triple_dimension in qualifying:
        for added in range(len(MATRICES)):
            if added in triple:
                continue
            extension_key = (
                quotient_fixed_dimension((added,)),
                tuple(
                    sorted(
                        (quotient_fixed_dimension((base, added)) for base in triple),
                        reverse=True,
                    )
                ),
            )
            extensions.append(
                {
                    "triple_dimension": triple_dimension,
                    "added": added,
                    "identity_control": is_identity(added),
                    "extension_key": extension_key,
                    "fourth_dimension": quotient_fixed_dimension(triple + (added,)),
                }
            )

    strata: dict[tuple[int, tuple[int, ...]], dict[int, list[int]]] = defaultdict(
        lambda: {0: [], 1: []}
    )
    for extension in extensions:
        if extension["identity_control"]:
            continue
        triple_dimension = int(extension["triple_dimension"])
        if triple_dimension not in (0, 1):
            continue
        strata[extension["extension_key"]][triple_dimension].append(
            int(extension["fourth_dimension"])
        )

    contrasts = []
    for key, grouped in sorted(strata.items()):
        if not grouped[0] or not grouped[1]:
            continue
        mean_zero = exact_mean(grouped[0])
        mean_one = exact_mean(grouped[1])
        contrasts.append(
            {
                "extension_key": key,
                "count_d3_0": len(grouped[0]),
                "count_d3_1": len(grouped[1]),
                "mean_d4_d3_0": str(mean_zero),
                "mean_d4_d3_1": str(mean_one),
                "delta_d4": str(mean_one - mean_zero),
            }
        )

    deltas = [Fraction(item["delta_d4"]) for item in contrasts]
    if not deltas:
        outcome = "unidentified"
        median_delta = None
    elif sum(delta > 0 for delta in deltas) * 3 >= 2 * len(deltas) and median(deltas) > 0:
        outcome = "residual_survival"
        median_delta = str(median(deltas))
    elif sum(delta < 0 for delta in deltas) * 3 >= 2 * len(deltas) and median(deltas) < 0:
        outcome = "reversed"
        median_delta = str(median(deltas))
    else:
        outcome = "not_supported"
        median_delta = str(median(deltas))

    identity_extensions = [item for item in extensions if item["identity_control"]]
    return {
        "scope": "formal_exact_exploratory_quotient_audit",
        "catalogue_matrices": len(MATRICES),
        "triples_audited": len(triples),
        "lower_order_keys_with_multiple_triple_dimensions": sum(
            len(counts) > 1 for counts in by_lower_order.values()
        ),
        "target_key": {
            "marginal": list(target_key[0]),
            "pairwise": list(target_key[1]),
            "qualifying_triples": len(qualifying),
            "triple_dimension_counts": dict(sorted(qualifying_counts.items())),
        },
        "nontrivial_extension_count": sum(not item["identity_control"] for item in extensions),
        "identity_control_count": len(identity_extensions),
        "matched_nontrivial_strata": contrasts,
        "outcome": outcome,
        "median_delta_d4": median_delta,
        "boundary": (
            "Exact finite linear algebra only.  The quotient removes a known common "
            "fixed line; it establishes neither objecthood, physical transport, nor "
            "prospective stability outside this S4 representation."
        ),
    }


if __name__ == "__main__":
    import json

    print(json.dumps(analyse(), indent=2, sort_keys=True))
