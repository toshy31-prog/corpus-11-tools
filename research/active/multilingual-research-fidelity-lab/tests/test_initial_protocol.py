#!/usr/bin/env python3
"""Detect declared semantic-slot drift across synthetic language packets."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "initial_cases.json"


def divergences(case: dict[str, object], reference_language: str, required_slots: list[str]) -> list[str]:
    packets = case["packets"]
    assert len(packets) == 3, "the initial protocol requires exactly three language packets"
    assert {packet["language"] for packet in packets} == {"fr", "en", "de"}
    reference = next(packet for packet in packets if packet["language"] == reference_language)["slots"]
    mismatches: set[str] = set()
    for packet in packets:
        slots = packet["slots"]
        assert set(required_slots).issubset(slots), f"missing slot in {packet['language']}"
        for slot in required_slots:
            if slots[slot] != reference[slot]:
                mismatches.add(slot)
    return sorted(mismatches)


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    observed = {}
    for case in fixture["cases"]:
        result = divergences(case, fixture["reference_language"], fixture["required_slots"])
        assert result == case["expected_divergences"], f"{case['id']}: {result}"
        observed[case["id"]] = result
    assert observed["aligned_triplet"] == []
    assert observed["scope_drift_triplet"] == ["scope"]
    print("PASS multilingual-research-fidelity-lab initial synthetic protocol: aligned and scope-drift cases")


if __name__ == "__main__":
    main()
