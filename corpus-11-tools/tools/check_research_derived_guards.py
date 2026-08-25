#!/usr/bin/env python3
"""Fail closed if shared guardrails learned from research regress."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = Path(os.environ.get("CORPUS_GUARD_CONTRACT", ROOT / "docs" / "research-derived-guard-contract.json"))
EXPECTED = {
    "construct_not_proxy",
    "lineage_before_evidence_count",
    "rival_before_strong_selection",
    "multiplicity_not_independence",
    "negative_result_and_version_preservation",
}


def main() -> None:
    errors: list[str] = []
    try:
        data = json.loads(CONTRACT.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"FAIL: unreadable research-derived guard contract: {exc}")
        raise SystemExit(1)
    if data.get("schema_version") != 1 or data.get("status") != "tested_internal_policy":
        errors.append("contract schema or scope status is invalid")
    guards = {item.get("id"): item for item in data.get("guards", []) if isinstance(item, dict)}
    if set(guards) != EXPECTED:
        errors.append("guard set is incomplete or unexpected")
    cases = data.get("acceptance_cases", [])
    coverage = {guard: set() for guard in EXPECTED}
    for case in cases:
        if not isinstance(case, dict) or case.get("guard") not in guards or not isinstance(case.get("valid"), bool):
            errors.append("invalid acceptance case")
            continue
        guard = guards[case["guard"]]
        fields = set(case.get("fields", []))
        actual = set(guard.get("required_fields", [])).issubset(fields) and case.get("conclusion") != guard.get("forbidden_conclusion")
        if actual != case["valid"]:
            errors.append(f"acceptance case disagrees with guard: {case.get('id')}")
        coverage[case["guard"]].add(case["valid"])
    for guard, outcomes in coverage.items():
        if outcomes != {True, False}:
            errors.append(f"{guard} lacks a passing or failing case")
    if errors:
        print("FAIL")
        for error in errors:
            print(f" - {error}")
        raise SystemExit(1)
    print(f"PASS: {len(EXPECTED)} research-derived guards with positive and negative cases")


if __name__ == "__main__":
    main()
