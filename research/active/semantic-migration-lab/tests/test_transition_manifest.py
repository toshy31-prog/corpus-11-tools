#!/usr/bin/env python3
"""Require exact migration transitions rather than allowed field names."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "transition_manifest_v0.2.json"


def environment_v1(case_input: dict[str, str]) -> dict[str, str]:
    return {
        "claim_id": case_input["claim_id"],
        "scope": "model_internal",
        "attribution": case_input["attribution"],
        "decision": "retain",
    }


def matching_rules(case_input: dict[str, str], manifest: list[dict[str, object]]) -> list[dict[str, str]]:
    return [rule for rule in manifest if all(case_input.get(key) == value for key, value in rule["when"].items())]


def environment_v2(
    case: dict[str, object], manifest: list[dict[str, object]]
) -> tuple[dict[str, str], list[dict[str, str]]]:
    output = environment_v1(case["input"])
    rules = matching_rules(case["input"], manifest)
    for rule in rules:
        assert output[rule["field"]] == rule["from"]
        output[rule["field"]] = rule["to"]
    output.update(case.get("injected_unexplained_override", {}))
    return output, rules


def classify(
    before: dict[str, str], after: dict[str, str], rules: list[dict[str, str]], fields: list[str]
) -> tuple[str, list[str]]:
    changes = sorted(field for field in fields if before[field] != after[field])
    if not changes:
        return "stable", changes
    allowed = {(rule["field"], rule["from"], rule["to"]) for rule in rules}
    observed = {(field, before[field], after[field]) for field in changes}
    if observed.issubset(allowed):
        return "declared_exact_transition", changes
    return "unexplained_drift", changes


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["protocol_fixed_before_execution"] is True
    outcomes = {}
    for case in fixture["cases"]:
        before = environment_v1(case["input"])
        after, rules = environment_v2(case, fixture["transition_manifest"])
        result = classify(before, after, rules, fixture["critical_fields"])
        assert result == (case["expected_classification"], case["expected_changed_fields"]), (case["id"], result)
        outcomes[case["id"]] = result[0]
    assert outcomes["illegal_value_on_declared_field"] == "unexplained_drift"
    assert outcomes["exact_scope_transition"] == "declared_exact_transition"
    print("PASS semantic migration manifest v0.2: 4/4 exact transition cases")


if __name__ == "__main__":
    main()
