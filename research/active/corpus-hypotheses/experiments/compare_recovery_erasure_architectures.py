#!/usr/bin/env python3
"""Exact matched comparison of localized and broadcast bit architectures."""

from itertools import combinations


def subsets(width: int, size: int):
    return combinations(range(width), size)


def read(state: tuple[int, ...], positions: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(state[position] for position in positions)


def reset(state: tuple[int, ...], positions: tuple[int, ...]) -> tuple[int, ...]:
    output = list(state)
    for position in positions:
        output[position] = 0
    return tuple(output)


def minimum_recovery_cost(zero: tuple[int, ...], one: tuple[int, ...]) -> int:
    for cost in range(len(zero) + 1):
        if any(read(zero, positions) != read(one, positions) for positions in subsets(len(zero), cost)):
            return cost
    raise AssertionError("input families are not distinguishable")


def minimum_erasure_cost(zero: tuple[int, ...], one: tuple[int, ...]) -> int:
    for cost in range(len(zero) + 1):
        if any(reset(zero, positions) == reset(one, positions) for positions in subsets(len(zero), cost)):
            return cost
    raise AssertionError("input families cannot be erased")


for width in range(2, 9):
    zero = (0,) * width
    localized_one = (1,) + (0,) * (width - 1)
    broadcast_one = (1,) * width

    localized = (
        minimum_recovery_cost(zero, localized_one),
        minimum_erasure_cost(zero, localized_one),
    )
    broadcast = (
        minimum_recovery_cost(zero, broadcast_one),
        minimum_erasure_cost(zero, broadcast_one),
    )

    assert localized == (1, 1)
    assert broadcast == (1, width)

print("PASS: widths N=2..8, identical terminal read/reset controls")
print("localized: C_info=1, C_erase=1")
print("broadcast: C_info=1, C_erase=N")
print("RESULT: equal recovery cost does not determine erasure cost")
print("BOUND: under local zero-resets, erasure cost equals terminal Hamming distance")
