"""FOE-001 adapter: local, loss-visible provenance profiles."""

from __future__ import annotations

from copy import deepcopy


def encode_entity(receipt: dict[str, object]) -> dict[str, object]:
    return {"profile": "foe-entity", "receipt": deepcopy(receipt)}


def decode_entity(document: dict[str, object]) -> dict[str, object]:
    return deepcopy(document["receipt"])


def encode_graph(receipt: dict[str, object]) -> dict[str, object]:
    return {
        "profile": "foe-graph",
        "receipt_id": receipt["receipt_id"],
        "nodes": [{"field": field, "value": deepcopy(receipt[field])} for field in sorted(receipt)],
    }


def decode_graph(document: dict[str, object]) -> dict[str, object]:
    receipt: dict[str, object] = {}
    for node in document["nodes"]:
        field = node["field"]
        if field in receipt:
            raise ValueError(f"duplicate graph field: {field}")
        receipt[field] = deepcopy(node["value"])
    if receipt.get("receipt_id") != document["receipt_id"]:
        raise ValueError("graph receipt identifier mismatch")
    return receipt
