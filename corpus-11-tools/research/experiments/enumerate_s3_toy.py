#!/usr/bin/env python3
"""Exact enumeration of the two-loop S3 toy and an order-six abelian control."""

from __future__ import annotations

import argparse
import json
from itertools import product


Permutation = tuple[int, int, int]
S3: tuple[Permutation, ...] = tuple(product(range(3), repeat=3))
S3 = tuple(permutation for permutation in S3 if len(set(permutation)) == 3)
IDENTITY: Permutation = (0, 1, 2)


def parity(permutation: Permutation) -> int:
    inversions = sum(
        permutation[left] > permutation[right]
        for left in range(3)
        for right in range(left + 1, 3)
    )
    return inversions % 2


def common_fixed_dimension(first: Permutation, second: Permutation) -> int:
    """Dimension fixed by both permutations in the standard plane representation.

    The common fixed vectors are constant on the orbits of the subgroup generated
    by both permutations. Removing the all-ones direction gives orbits - 1.
    """

    unseen = set(range(3))
    orbit_count = 0
    while unseen:
        orbit_count += 1
        frontier = [unseen.pop()]
        while frontier:
            point = frontier.pop()
            for permutation in (first, second):
                image = permutation[point]
                if image in unseen:
                    unseen.remove(image)
                    frontier.append(image)
    return orbit_count - 1


def polynomial_counts(predicate) -> tuple[int, int, int]:
    """Return coefficients of 1, q, q^2 under identity weight q."""

    coefficients = [0, 0, 0]
    for first, second in product(S3, repeat=2):
        if predicate(first, second):
            identity_count = (first == IDENTITY) + (second == IDENTITY)
            coefficients[identity_count] += 1
    return tuple(coefficients)


def enumerate_s3() -> dict[str, object]:
    temporal = polynomial_counts(
        lambda first, second: parity(first) == 0 and parity(second) == 0
    )
    invariant = polynomial_counts(
        lambda first, second: common_fixed_dimension(first, second) > 0
    )
    fixed_dimension_histogram = {str(dimension): 0 for dimension in range(3)}
    for first, second in product(S3, repeat=2):
        dimension = common_fixed_dimension(first, second)
        fixed_dimension_histogram[str(dimension)] += 1
    return {
        "group": "S3",
        "order": len(S3),
        "pair_count": len(S3) ** 2,
        "denominator_coefficients_1_q_q2": [25, 10, 1],
        "temporal_numerator_coefficients_1_q_q2": list(temporal),
        "invariant_numerator_coefficients_1_q_q2": list(invariant),
        "common_fixed_dimension_histogram_at_q_1": fixed_dimension_histogram,
    }


def enumerate_c6_control() -> dict[str, object]:
    """C6 control in its faithful two-dimensional rotation representation."""

    elements = range(6)
    coefficients_temporal = [0, 0, 0]
    coefficients_invariant = [0, 0, 0]
    for first, second in product(elements, repeat=2):
        identity_count = (first == 0) + (second == 0)
        if first % 2 == 0 and second % 2 == 0:
            coefficients_temporal[identity_count] += 1
        if first == 0 and second == 0:
            coefficients_invariant[identity_count] += 1
    return {
        "group": "C6",
        "order": 6,
        "pair_count": 36,
        "representation": "faithful planar rotations",
        "denominator_coefficients_1_q_q2": [25, 10, 1],
        "temporal_numerator_coefficients_1_q_q2": coefficients_temporal,
        "invariant_numerator_coefficients_1_q_q2": coefficients_invariant,
    }


def verify(result: dict[str, object]) -> None:
    s3 = result["s3"]
    c6 = result["c6_control"]
    assert s3["pair_count"] == 36
    assert s3["temporal_numerator_coefficients_1_q_q2"] == [4, 4, 1]
    assert s3["invariant_numerator_coefficients_1_q_q2"] == [3, 6, 1]
    assert sum(s3["common_fixed_dimension_histogram_at_q_1"].values()) == 36
    assert c6["temporal_numerator_coefficients_1_q_q2"] == [4, 4, 1]
    assert c6["invariant_numerator_coefficients_1_q_q2"] == [0, 0, 1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    result = {
        "scope": "finite toy model only; no physical inference",
        "coefficient_order": "constant, q, q^2",
        "s3": enumerate_s3(),
        "c6_control": enumerate_c6_control(),
    }
    if args.verify:
        verify(result)
        result["verification"] = "PASS"
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
