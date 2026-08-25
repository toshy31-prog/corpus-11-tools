#!/usr/bin/env python3
"""Exercise every declared provenance-core field through two local profiles."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "core_mutations_v0.2.json"


def core(receipt: dict[str, object]) -> dict[str, object]:
    claim = receipt["claim"]
    return {
        "receipt_id": receipt["receipt_id"],
        "claim": {key: claim[key] for key in ("id", "text", "scope", "attribution")},
        "sources": sorted(
            [{"id": source["id"], "digest": source["digest"]} for source in receipt["sources"]],
            key=lambda item: item["id"],
        ),
        "transformations": sorted(
            [{"id": step["id"], "kind": step["kind"]} for step in receipt["transformations"]],
            key=lambda item: item["id"],
        ),
        "reversal_condition": {
            "id": receipt["reversal_condition"]["id"],
            "observable": receipt["reversal_condition"]["observable"],
        },
    }


def to_entity_profile(receipt: dict[str, object]) -> dict[str, object]:
    return {
        "profile": "entity-shaped-v0.2",
        "receipt_id": receipt["receipt_id"],
        "entity": receipt["claim"],
        "used": receipt["sources"],
        "activities": receipt["transformations"],
        "reversal": receipt["reversal_condition"],
        "loss_ledger": ["display_note"],
    }


def from_entity_profile(document: dict[str, object]) -> dict[str, object]:
    return {
        "receipt_id": document["receipt_id"],
        "claim": document["entity"],
        "sources": document["used"],
        "transformations": document["activities"],
        "reversal_condition": document["reversal"],
        "loss_ledger": document["loss_ledger"],
    }


def to_graph_profile(receipt: dict[str, object]) -> dict[str, object]:
    return {
        "profile": "graph-shaped-v0.2",
        "receipt_id": receipt["receipt_id"],
        "nodes": [
            {"id": receipt["claim"]["id"], "type": "Claim", **{key: receipt["claim"][key] for key in ("text", "scope", "attribution")}},
            *[{"id": source["id"], "type": "Source", "digest": source["digest"]} for source in receipt["sources"]],
            *[{"id": step["id"], "type": "Transformation", "kind": step["kind"]} for step in receipt["transformations"]],
            {"id": receipt["reversal_condition"]["id"], "type": "Reversal", "observable": receipt["reversal_condition"]["observable"]},
        ],
        "loss_ledger": ["display_note"],
    }


def from_graph_profile(document: dict[str, object]) -> dict[str, object]:
    nodes = document["nodes"]
    claim = next(node for node in nodes if node["type"] == "Claim")
    reversal = next(node for node in nodes if node["type"] == "Reversal")
    return {
        "receipt_id": document["receipt_id"],
        "claim": {"id": claim["id"], "text": claim["text"], "scope": claim["scope"], "attribution": claim["attribution"]},
        "sources": [{"id": node["id"], "digest": node["digest"]} for node in nodes if node["type"] == "Source"],
        "transformations": [{"id": node["id"], "kind": node["kind"]} for node in nodes if node["type"] == "Transformation"],
        "reversal_condition": {"id": reversal["id"], "observable": reversal["observable"]},
        "loss_ledger": document["loss_ledger"],
    }


def scalar_paths(value: object, prefix: tuple[object, ...] = ()) -> list[tuple[object, ...]]:
    if isinstance(value, dict):
        return [path for key, child in value.items() for path in scalar_paths(child, (*prefix, key))]
    if isinstance(value, list):
        return [path for index, child in enumerate(value) for path in scalar_paths(child, (*prefix, index))]
    return [prefix]


def mutate(value: dict[str, object], path: tuple[object, ...]) -> dict[str, object]:
    changed = deepcopy(value)
    cursor: object = changed
    for key in path[:-1]:
        cursor = cursor[key]
    final = path[-1]
    cursor[final] = f"{cursor[final]}__mutated"
    return changed


def round_trip(receipt: dict[str, object], encode, decode) -> dict[str, object]:
    serialized = json.dumps(encode(receipt), sort_keys=True)
    return decode(json.loads(serialized))


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["protocol_fixed_before_execution"] is True
    receipt = fixture["receipt"]
    baseline = core(receipt)
    paths = scalar_paths(baseline)
    assert len(paths) == fixture["expected_core_scalar_count"]
    profiles = [(to_entity_profile, from_entity_profile), (to_graph_profile, from_graph_profile)]
    for encode, decode in profiles:
        restored = round_trip(receipt, encode, decode)
        assert core(restored) == baseline
        assert restored["loss_ledger"] == ["display_note"]
        for path in paths:
            changed_core = mutate(baseline, path)
            changed_receipt = deepcopy(receipt)
            changed_receipt.update(changed_core)
            restored = round_trip(changed_receipt, encode, decode)
            assert core(restored) == changed_core, path
            assert core(restored) != baseline, path
    assert baseline["claim"]["attribution"] == "local_adapter"
    assert baseline["receipt_id"] == "receipt-synthetic-002"
    print(f"PASS provenance core mutations v0.2: 2 profiles x {len(paths)} scalar mutations")


if __name__ == "__main__":
    main()
