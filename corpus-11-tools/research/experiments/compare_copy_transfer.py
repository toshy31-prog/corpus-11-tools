#!/usr/bin/env python3
"""Compare persistent-copy and destructive-transfer circuits exactly."""

from __future__ import annotations

import argparse
import json
from itertools import combinations


State = tuple[int, ...]


def initial_state(bit: int, size: int) -> State:
    return (bit,) + (0,) * (size - 1)


def run_copy(bit: int, size: int) -> State:
    state = list(initial_state(bit, size))
    for source in range(size - 1):
        state[source + 1] = state[source]
    return tuple(state)


def run_move(bit: int, size: int) -> State:
    state = list(initial_state(bit, size))
    for source in range(size - 1):
        state[source + 1] = state[source]
        state[source] = 0
    return tuple(state)


def reset_subset(state: State, positions: tuple[int, ...]) -> State:
    result = list(state)
    for position in positions:
        result[position] = 0
    return tuple(result)


def subsets(size: int):
    for count in range(size + 1):
        yield from combinations(range(size), count)


def terminal_read_cost(run, size: int) -> int | None:
    output_zero = run(0, size)[-1]
    output_one = run(1, size)[-1]
    return 1 if output_zero != output_one else None


def minimal_erasure(run, size: int) -> tuple[int | None, int]:
    counterfactual = run(0, size)
    recorded = run(1, size)
    witnesses = [
        positions
        for positions in subsets(size)
        if reset_subset(recorded, positions) == counterfactual
    ]
    if not witnesses:
        return None, 0
    minimum = min(map(len, witnesses))
    return minimum, sum(len(witness) == minimum for witness in witnesses)


def enumerate_size(size: int) -> dict[str, object]:
    copy_erasure, copy_witnesses = minimal_erasure(run_copy, size)
    move_erasure, move_witnesses = minimal_erasure(run_move, size)
    copy_read = terminal_read_cost(run_copy, size)
    move_read = terminal_read_cost(run_move, size)
    return {
        "cells": size,
        "copy_terminal_state_for_1": list(run_copy(1, size)),
        "move_terminal_state_for_1": list(run_move(1, size)),
        "copy_read_cost": copy_read,
        "move_read_cost": move_read,
        "copy_erasure_cost": copy_erasure,
        "move_erasure_cost": move_erasure,
        "erasure_cost_difference": copy_erasure - move_erasure,
        "copy_minimal_erasure_witness_count": copy_witnesses,
        "move_minimal_erasure_witness_count": move_witnesses,
    }


def verify(rows: list[dict[str, object]]) -> None:
    for row in rows:
        size = row["cells"]
        assert row["copy_terminal_state_for_1"] == [1] * size
        assert row["move_terminal_state_for_1"] == [0] * (size - 1) + [1]
        assert row["copy_read_cost"] == row["move_read_cost"] == 1
        assert row["copy_erasure_cost"] == size
        assert row["move_erasure_cost"] == 1
        assert row["erasure_cost_difference"] == size - 1
        assert row["copy_minimal_erasure_witness_count"] == 1
        assert row["move_minimal_erasure_witness_count"] == 1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-cells", type=int, default=8)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.max_cells < 2:
        parser.error("--max-cells must be at least 2")
    rows = [enumerate_size(size) for size in range(2, args.max_cells + 1)]
    if args.verify:
        verify(rows)
    result = {
        "scope": "finite classical circuit toy; no physical inference",
        "read_interface": "terminal cell only, unit cost",
        "shared_intervention": "reset any one terminal-state cell to zero, unit cost",
        "erasure_target": "global state produced by input bit zero",
        "results": rows,
        "verification": "PASS" if args.verify else "not requested",
    }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
