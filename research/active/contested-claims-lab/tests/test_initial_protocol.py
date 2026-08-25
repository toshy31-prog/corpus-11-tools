#!/usr/bin/env python3
"""Preserve formal underdetermination without treating it as a consensus."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "initial_cases.json"


def evaluate(case: dict[str, object]) -> tuple[dict[str, str], bool]:
    possible = set(case["possible_worlds"])
    statuses: dict[str, str] = {}
    compatible = []
    for claim in case["claims"]:
        survives = possible.intersection(claim["worlds_where_true"])
        status = "compatible_not_established" if survives else "contradicted"
        statuses[claim["id"]] = status
        if survives:
            compatible.append(claim["id"])
    return statuses, len(compatible) >= 2


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    outcomes = {}
    for case in fixture["cases"]:
        statuses, plurality = evaluate(case)
        assert statuses == case["expected_statuses"], f"{case['id']}: {statuses}"
        assert plurality is case["expected_plurality"], f"{case['id']}: {plurality}"
        assert case["reversal_trace"], f"{case['id']} lacks a revision condition"
        outcomes[case["id"]] = plurality
    assert outcomes == {"underdetermined_origin": True, "correctable_contradiction": False}
    print("PASS contested-claims-lab initial synthetic protocol: plurality and contradiction separated")


if __name__ == "__main__":
    main()
