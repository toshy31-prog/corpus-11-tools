#!/usr/bin/env python3
"""Check a bounded, local provenance round trip with two declared profiles."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "initial_cases.json"


def core(receipt: dict[str, object]) -> dict[str, object]:
    claim = receipt["claim"]
    return {
        "claim": {"id": claim["id"], "text": claim["text"], "scope": claim["scope"]},
        "sources": sorted(
            [{"id": source["id"], "digest": source["digest"]} for source in receipt["sources"]],
            key=lambda source: source["id"],
        ),
        "transformations": sorted(
            [{"id": step["id"], "kind": step["kind"]} for step in receipt["transformations"]],
            key=lambda step: step["id"],
        ),
        "reversal_condition": {
            "id": receipt["reversal_condition"]["id"],
            "observable": receipt["reversal_condition"]["observable"],
        },
    }


def to_prov_shaped(receipt: dict[str, object]) -> dict[str, object]:
    return {
        "profile": "prov-shaped-profile-v1",
        "entity": {"id": receipt["claim"]["id"], "text": receipt["claim"]["text"], "scope": receipt["claim"]["scope"]},
        "used": receipt["sources"],
        "activities": receipt["transformations"],
        "reversal": receipt["reversal_condition"],
    }


def from_prov_shaped(document: dict[str, object]) -> dict[str, object]:
    return {
        "claim": document["entity"],
        "sources": document["used"],
        "transformations": document["activities"],
        "reversal_condition": document["reversal"],
    }


def to_ro_crate_shaped(receipt: dict[str, object]) -> dict[str, object]:
    return {
        "profile": "ro-crate-shaped-profile-v1",
        "@graph": [
            {"@id": receipt["claim"]["id"], "type": "Conclusion", "text": receipt["claim"]["text"], "scope": receipt["claim"]["scope"]},
            *[{"@id": source["id"], "type": "Source", "digest": source["digest"]} for source in receipt["sources"]],
            *[{"@id": step["id"], "type": "Transformation", "kind": step["kind"]} for step in receipt["transformations"]],
            {"@id": receipt["reversal_condition"]["id"], "type": "Reversal", "observable": receipt["reversal_condition"]["observable"]},
        ],
    }


def from_ro_crate_shaped(document: dict[str, object]) -> dict[str, object]:
    graph = document["@graph"]
    claim = next(node for node in graph if node["type"] == "Conclusion")
    return {
        "claim": {"id": claim["@id"], "text": claim["text"], "scope": claim["scope"]},
        "sources": [{"id": node["@id"], "digest": node["digest"]} for node in graph if node["type"] == "Source"],
        "transformations": [{"id": node["@id"], "kind": node["kind"]} for node in graph if node["type"] == "Transformation"],
        "reversal_condition": next(
            {"id": node["@id"], "observable": node["observable"]} for node in graph if node["type"] == "Reversal"
        ),
    }


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    receipt = fixture["receipt"]
    expected = core(receipt)
    profiles = {
        "prov-shaped-profile-v1": (to_prov_shaped, from_prov_shaped),
        "ro-crate-shaped-profile-v1": (to_ro_crate_shaped, from_ro_crate_shaped),
    }
    for profile in fixture["expected_profiles"]:
        encode, decode = profiles[profile]
        encoded = encode(receipt)
        restored = decode(encoded)
        assert encoded["profile"] == profile
        assert core(restored) == expected, profile
        assert "display_note" not in restored, "the non-core display note must not be silently retained"
    print("PASS provenance-interoperability-lab initial synthetic protocol: 2/2 bounded round trips")


if __name__ == "__main__":
    main()
