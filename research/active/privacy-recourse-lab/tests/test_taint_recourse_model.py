#!/usr/bin/env python3
"""Check semantic disclosure taints and a minimal recourse state machine."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "taint_recourse_v0.2.json"


def materialize(case: dict[str, str], profile: dict[str, object]) -> dict[str, dict[str, str]]:
    return {
        audience: {field: case[field] for field in view["fields"]}
        for audience, view in profile["views"].items()
    }


def propagate_taints(
    case: dict[str, str],
    declared_taints: dict[str, list[str]],
    minimum_token_length: int,
) -> dict[str, list[str]]:
    """Propagate declared source taints through exact synthetic value flow.

    This is deliberately not a free-text sensitivity classifier. A target field
    inherits the taints of another field only when the source value is copied or
    embedded verbatim with the fixed minimum length.
    """
    propagated = {field: set(taints) for field, taints in declared_taints.items()}
    for target_field, target_value in case.items():
        propagated.setdefault(target_field, set())
        if not isinstance(target_value, str) or not target_value:
            continue
        for source_field, source_value in case.items():
            if source_field == target_field or not isinstance(source_value, str):
                continue
            if len(source_value) < minimum_token_length:
                continue
            if source_value == target_value or source_value in target_value:
                propagated[target_field].update(declared_taints.get(source_field, []))
    return {field: sorted(taints) for field, taints in propagated.items()}


def path_complete(path: list[str], allowed_transitions: list[list[str]]) -> bool:
    allowed = {tuple(pair) for pair in allowed_transitions}
    return bool(path) and path[0] == "submitted" and path[-1] == "remedied" and all(
        pair in allowed for pair in zip(path, path[1:])
    )


def assess(
    case: dict[str, str],
    taints: dict[str, list[str]],
    profile: dict[str, object],
    contract: dict[str, object],
    recourse_path: list[str] | None = None,
) -> dict[str, bool]:
    materialized = materialize(case, profile)
    propagated_taints = propagate_taints(case, taints, contract["minimum_token_length"])
    disclosure_bounded = True
    for audience, fields in materialized.items():
        forbidden = set(contract["forbidden_taints"][audience])
        if any(forbidden.intersection(propagated_taints.get(field, [])) for field in fields):
            disclosure_bounded = False
        if profile["views"][audience]["retention_days"] > contract["max_retention_days"][audience]:
            disclosure_bounded = False
    required_present = all(
        all(field in materialized[audience] and bool(materialized[audience][field]) for field in required)
        for audience, required in contract["recourse_required"].items()
    )
    path = recourse_path if recourse_path is not None else profile["recourse_path"]
    recourse_complete = required_present and path_complete(path, contract["allowed_recourse_transitions"])
    return {
        "semantic_disclosure_bounded": disclosure_bounded,
        "recourse_path_complete": recourse_complete,
    }


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["protocol_fixed_before_execution"] is True
    profiles = {profile["id"]: profile for profile in fixture["profiles"]}
    for profile in profiles.values():
        observed = assess(fixture["synthetic_case"], fixture["field_taints"], profile, fixture["contract"])
        assert observed == profile["expected"], (profile["id"], observed)
    outcomes = {}
    for case in fixture["adversarial_cases"]:
        values = deepcopy(fixture["synthetic_case"])
        values.update(case.get("value_overrides", {}))
        taints = deepcopy(fixture["field_taints"])
        taints.update(case.get("taint_overrides", {}))
        observed = assess(values, taints, profiles[case["profile"]], fixture["contract"], case.get("recourse_path"))
        assert observed == case["expected"], (case["id"], observed)
        outcomes[case["id"]] = observed
    hidden_identity = next(case for case in fixture["adversarial_cases"] if case["id"] == "identity_hidden_under_safe_field")
    assert "taint_overrides" not in hidden_identity
    hidden_values = deepcopy(fixture["synthetic_case"])
    hidden_values.update(hidden_identity["value_overrides"])
    derived = propagate_taints(
        hidden_values,
        fixture["field_taints"],
        fixture["contract"]["minimum_token_length"],
    )
    assert "direct_identity" in derived["aggregate_category"]
    assert outcomes["identity_hidden_under_safe_field"]["semantic_disclosure_bounded"] is False
    assert outcomes["empty_recourse_artifacts"]["recourse_path_complete"] is False
    assert outcomes["stalled_recourse_path"]["recourse_path_complete"] is False
    print("PASS privacy-recourse taint/state model v0.2: 3 profiles, 3 adversarial cases, derived taint flow")


if __name__ == "__main__":
    main()
