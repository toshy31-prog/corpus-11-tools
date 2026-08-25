#!/usr/bin/env python3
"""Exhaustive order-confluence audit of the three-node logical model."""

from __future__ import annotations

from itertools import permutations, product
from pathlib import Path
import runpy


MODEL = runpy.run_path(str(Path(__file__).with_name("test_initial_protocol.py")))
run_scenario = MODEL["run_scenario"]
NODES = ("A", "B", "C")
VALUES = ("empty", "payload", "tombstone")
POLICIES = ("payload_wins", "tombstone_wins")


def setup_operations(state: tuple[str, str, str]) -> list[dict[str, object]]:
    operations: list[dict[str, object]] = []
    for node, value in zip(NODES, state):
        if value == "payload":
            operations.append({"kind": "write", "node": node})
        elif value == "tombstone":
            operations.append({"kind": "delete", "nodes": [node]})
    return operations


def observed_payloads(
    state: tuple[str, str, str], source: str, targets: tuple[str, str], policy: str
) -> tuple[str, ...]:
    operations = setup_operations(state)
    operations.append(
        {"kind": "sync", "source": source, "targets": list(targets), "policy": policy}
    )
    observed = run_scenario(list(NODES), {"operations": operations})
    return tuple(observed["payload_present_nodes"])


def simultaneous_payload_oracle(
    state: tuple[str, str, str], source: str, policy: str
) -> tuple[str, ...]:
    """Apply one atomic broadcast to the snapshot shared by all three nodes."""
    initial = dict(zip(NODES, state))
    if policy == "tombstone_wins" and "tombstone" in initial.values():
        return ()
    return NODES if initial[source] == "payload" else ()


def main() -> None:
    order_dependent: list[tuple[object, ...]] = []
    oracle_mismatches: list[tuple[object, ...]] = []
    ordered_runs = 0

    for state in product(VALUES, repeat=3):
        for source in NODES:
            target_orders = tuple(permutations(node for node in NODES if node != source))
            for policy in POLICIES:
                outputs = []
                for targets in target_orders:
                    output = observed_payloads(state, source, targets, policy)
                    outputs.append(output)
                    ordered_runs += 1
                    oracle = simultaneous_payload_oracle(state, source, policy)
                    if output != oracle:
                        oracle_mismatches.append((state, source, policy, targets, output, oracle))
                if outputs[0] != outputs[1]:
                    order_dependent.append((state, source, policy, target_orders, tuple(outputs)))

    assert ordered_runs == 27 * 3 * 2 * 2 == 324
    assert len(order_dependent) == 12
    assert len(oracle_mismatches) == 12
    assert all(row[2] == "tombstone_wins" for row in order_dependent)
    assert all(row[2] == "tombstone_wins" for row in oracle_mismatches)
    assert not any(row[2] == "payload_wins" for row in order_dependent)
    assert (
        ("empty", "payload", "tombstone"),
        "B",
        "tombstone_wins",
        (("A", "C"), ("C", "A")),
        (("A",), ()),
    ) in order_dependent

    print(
        "PASS material trace confluence audit: "
        "324 runs, 12 order-dependent pairs, 12 simultaneous-oracle mismatches"
    )


if __name__ == "__main__":
    main()
