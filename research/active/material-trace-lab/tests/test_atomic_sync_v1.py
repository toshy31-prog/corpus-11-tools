"""Matched finite comparison, retaining the historical sequential model."""

from itertools import permutations, product
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
atomic_sync = runpy.run_path(str(ROOT / "models/atomic_sync_v1.py"))["atomic_sync"]
BASE = runpy.run_path(str(ROOT / "tests/test_order_confluence.py"))
NODES, VALUES, POLICIES = BASE["NODES"], BASE["VALUES"], BASE["POLICIES"]


def payloads(state):
    return tuple(n for n in NODES if state[n] == "payload")


def main():
    counts = {"full_runs": 0, "partial_runs": 0, "full_differences": 0,
              "partial_differences": 0, "order_dependent_pairs": 0}
    for values in product(VALUES, repeat=3):
        initial = dict(zip(NODES, values))
        for source in NODES:
            others = tuple(n for n in NODES if n != source)
            for policy in POLICIES:
                full_outputs = []
                for targets in (*permutations(others), *((n,) for n in others)):
                    result = atomic_sync(initial, source, targets, policy)
                    assert initial == dict(zip(NODES, values)), "input mutated"
                    assert atomic_sync(result, source, targets, policy) == result
                    assert all(result[n] == initial[n] for n in NODES
                               if n not in {source, *targets})
                    sequential = BASE["observed_payloads"](values, source, targets, policy)
                    full = len(targets) == 2
                    key = "full" if full else "partial"
                    counts[key + "_runs"] += 1
                    if payloads(result) != sequential:
                        counts[key + "_differences"] += 1
                        assert full and policy == "tombstone_wins"
                    if full:
                        full_outputs.append(result)
                        assert payloads(result) == BASE["simultaneous_payload_oracle"](
                            values, source, policy)
                counts["order_dependent_pairs"] += full_outputs[0] != full_outputs[1]
    assert counts == {"full_runs": 324, "partial_runs": 324, "full_differences": 12,
                      "partial_differences": 0, "order_dependent_pairs": 0}, counts

    initial = {"A": "payload", "B": "tombstone", "C": "payload"}
    assert atomic_sync(initial, "A", ("B",), "tombstone_wins") == {
        "A": "tombstone", "B": "tombstone", "C": "payload"}
    for source, targets, policy, partitioned in (
        ("A", ("B", "C"), "tombstone_wins", frozenset({"B"})),
        ("A", ("B",), "unknown", frozenset()),
        ("A", ("B", "B"), "tombstone_wins", frozenset()),
        ("A", ("A",), "tombstone_wins", frozenset()),
        ("A", ("D",), "tombstone_wins", frozenset()),
        ("A", (), "tombstone_wins", frozenset()),
    ):
        try:
            atomic_sync(initial, source, targets, policy, partitioned)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid operation accepted")
        assert initial == {"A": "payload", "B": "tombstone", "C": "payload"}
    assert atomic_sync(initial, "A", ("B",), "tombstone_wins", frozenset({"C"}))["C"] == "payload"
    print("PASS atomic-sync-v1:", counts)
    print("PASS input preservation, idempotence, partial-contact counterexample and refusal checks")


if __name__ == "__main__":
    main()
