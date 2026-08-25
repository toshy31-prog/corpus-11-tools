#!/usr/bin/env python3
"""Classify declared versus unexplained migration differences in a toy model."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "initial_cases.json"


def environment_v1(case_input: dict[str, str]) -> dict[str, str]:
    return {
        "claim_id": case_input["claim_id"],
        "scope": "model_internal",
        "attribution": case_input["attribution"],
        "decision": "retain",
    }


def environment_v2(case: dict[str, object]) -> tuple[dict[str, str], set[str]]:
    case_input = case["input"]
    output = environment_v1(case_input)
    declared_fields: set[str] = set()
    if case_input["evidence_tier"] == "verified_pipeline":
        output["scope"] = "pipeline_verified"
        declared_fields.add("scope")
    for field, value in case.get("injected_unexplained_override", {}).items():
        output[field] = value
    return output, declared_fields


def classify(v1: dict[str, str], v2: dict[str, str], declared_fields: set[str], fields: list[str]) -> tuple[str, list[str]]:
    changed = sorted(field for field in fields if v1[field] != v2[field])
    if not changed:
        return "stable", changed
    if set(changed).issubset(declared_fields):
        return "declared_rule_change", changed
    return "unexplained_drift", changed


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    outcomes = {}
    for case in fixture["cases"]:
        v1 = environment_v1(case["input"])
        v2, declared_fields = environment_v2(case)
        verdict, changed = classify(v1, v2, declared_fields, fixture["critical_fields"])
        assert verdict == case["expected_classification"], f"{case['id']}: {verdict}"
        assert changed == case["expected_changed_fields"], f"{case['id']}: {changed}"
        outcomes[case["id"]] = verdict
    assert outcomes == {
        "stable_model_case": "stable",
        "declared_scope_rule_change": "declared_rule_change",
        "unexplained_attribution_drift": "unexplained_drift",
    }
    print("PASS semantic-migration-lab initial synthetic protocol: 3/3 classified migrations")


if __name__ == "__main__":
    main()
