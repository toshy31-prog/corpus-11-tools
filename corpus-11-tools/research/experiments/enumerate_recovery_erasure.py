#!/usr/bin/env python3
"""Exhaustive finite copy toy for recovery versus erasure costs."""

from __future__ import annotations

import argparse
import json
from itertools import combinations


def subsets(size: int):
    for count in range(size + 1):
        yield from combinations(range(size), count)


def project(state: tuple[int, ...], positions: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(state[position] for position in positions)


def reset_locally(state: tuple[int, ...], positions: tuple[int, ...]) -> tuple[int, ...]:
    result = list(state)
    for position in positions:
        result[position] = 0
    return tuple(result)


def enumerate_size(size: int) -> dict[str, object]:
    counterfactual = (0,) * size
    recorded = (1,) * size
    read_witnesses = [
        positions
        for positions in subsets(size)
        if project(counterfactual, positions) != project(recorded, positions)
    ]
    erase_witnesses = [
        positions
        for positions in subsets(size)
        if reset_locally(recorded, positions) == counterfactual
    ]
    local_read_cost = min(map(len, read_witnesses))
    local_erase_cost = min(map(len, erase_witnesses))
    return {
        "copies": size,
        "local_read_cost": local_read_cost,
        "local_erase_cost": local_erase_cost,
        "local_cost_gap": local_erase_cost - local_read_cost,
        "read_witness_count": sum(
            len(witness) == local_read_cost for witness in read_witnesses
        ),
        "erase_witness_count": sum(
            len(witness) == local_erase_cost for witness in erase_witnesses
        ),
        "global_reset_control_cost": 1,
        "perfect_local_erasure_requires_all_copies_accessible": True,
    }


def verify(rows: list[dict[str, object]]) -> None:
    for row in rows:
        size = row["copies"]
        assert row["local_read_cost"] == 1
        assert row["local_erase_cost"] == size
        assert row["local_cost_gap"] == size - 1
        assert row["read_witness_count"] == size
        assert row["erase_witness_count"] == 1
        assert row["global_reset_control_cost"] == 1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-copies", type=int, default=8)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.max_copies < 1:
        parser.error("--max-copies must be positive")
    rows = [enumerate_size(size) for size in range(1, args.max_copies + 1)]
    if args.verify:
        verify(rows)
    result = {
        "scope": "finite copy toy only; intervention-class dependent",
        "local_intervention": "read or reset one terminal copy at unit cost",
        "global_control": "reset all terminal copies at unit cost",
        "results": rows,
        "verification": "PASS" if args.verify else "not requested",
    }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
