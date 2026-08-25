#!/usr/bin/env python3
"""Deterministic, model-internal trace persistence checks."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "initial_cases.json"


def copy_state(state: dict[str, bool]) -> dict[str, bool]:
    return {"payload": state["payload"], "tombstone": state["tombstone"]}


def run_scenario(nodes: list[str], scenario: dict[str, object]) -> dict[str, object]:
    states = {node: {"payload": False, "tombstone": False} for node in nodes}
    partitioned: set[str] = set()
    tombstoned_once: set[str] = set()
    channels: list[str] = []
    repair_events = 0

    for operation in scenario["operations"]:
        kind = operation["kind"]
        if kind == "write":
            node = operation["node"]
            states[node] = {"payload": True, "tombstone": False}
        elif kind == "replicate":
            source = operation["source"]
            for target in operation["targets"]:
                states[target] = copy_state(states[source])
        elif kind == "partition":
            partitioned.update(operation["nodes"])
        elif kind == "reconnect":
            partitioned.difference_update(operation["nodes"])
        elif kind == "delete":
            for node in operation["nodes"]:
                states[node] = {"payload": False, "tombstone": True}
                tombstoned_once.add(node)
        elif kind == "sync":
            source = operation["source"]
            policy = operation["policy"]
            for target in operation["targets"]:
                if source in partitioned or target in partitioned:
                    raise AssertionError(f"sync across active partition: {source}->{target}")
                before = copy_state(states[target])
                if policy == "payload_wins":
                    states[target] = copy_state(states[source])
                elif policy == "tombstone_wins":
                    if states[source]["tombstone"] or states[target]["tombstone"]:
                        states[source] = {"payload": False, "tombstone": True}
                        states[target] = {"payload": False, "tombstone": True}
                    else:
                        states[target] = copy_state(states[source])
                else:
                    raise AssertionError(f"unknown sync policy: {policy}")
                if before["tombstone"] and states[target]["payload"]:
                    channels.append(f"{source}->{target}")
                    repair_events += 1
        else:
            raise AssertionError(f"unknown operation: {kind}")

        for node, state in states.items():
            assert not (state["payload"] and state["tombstone"]), f"invalid state at {node}"

    present = [node for node in nodes if states[node]["payload"]]
    return {
        "physically_present_nodes": present,
        "normally_accessible": any(states[node]["payload"] for node in nodes if node not in partitioned),
        "reactivated": bool(channels),
        "recovery_channels": channels,
        "repair_events": repair_events,
    }


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["schema_version"] == 1
    results = {}
    for scenario in fixture["scenarios"]:
        observed = run_scenario(fixture["nodes"], scenario)
        assert observed == scenario["expected"], f"{scenario['id']}: {observed}"
        results[scenario["id"]] = observed
    assert results["stale_replica_reactivates_with_payload_priority"]["reactivated"]
    assert not results["tombstone_propagation_prevents_reactivation"]["reactivated"]
    print("PASS material-trace-lab initial synthetic protocol: 3/3 scenarios")


if __name__ == "__main__":
    main()
