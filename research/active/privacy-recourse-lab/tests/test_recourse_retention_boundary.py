#!/usr/bin/env python3
"""Test one declared retention boundary with the unchanged v0.2 functions."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path

from test_taint_recourse_model import assess, materialize, propagate_taints


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "fixtures" / "recourse_retention_boundary_v0.3.json"


def differing_paths(left: object, right: object, prefix: str = "") -> set[str]:
    if isinstance(left, dict) and isinstance(right, dict):
        assert set(left) == set(right)
        differences: set[str] = set()
        for key in left:
            path = f"{prefix}.{key}" if prefix else key
            differences.update(differing_paths(left[key], right[key], path))
        return differences
    if left != right:
        return {prefix}
    return set()


def forbidden_taint_hits(
    materialized: dict[str, dict[str, str]],
    propagated: dict[str, list[str]],
    forbidden_taints: dict[str, list[str]],
) -> dict[str, list[str]]:
    return {
        audience: sorted(
            f"{field}:{taint}"
            for field in fields
            for taint in propagated.get(field, [])
            if taint in set(forbidden_taints[audience])
        )
        for audience, fields in materialized.items()
    }


def retention_excesses(
    profile: dict[str, object],
    maximums: dict[str, int],
) -> dict[str, dict[str, int]]:
    return {
        audience: {
            "retention_days": view["retention_days"],
            "max_retention_days": maximums[audience],
        }
        for audience, view in profile["views"].items()
        if view["retention_days"] > maximums[audience]
    }


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["scope"] == "pipeline_verified"
    assert fixture["evidence_regime"] == "internal_synthetic_only"
    assert fixture["external_validity"] == "not_claimed"
    assert fixture["pre_registration_demonstrated"] is False
    assert fixture["independence_status"] == "independence_unknown"
    assert fixture["reused_functions"] == [
        "assess",
        "materialize",
        "propagate_taints",
    ]
    assert fixture["composite_verdict_semantics"] == {
        "field": "semantic_disclosure_bounded",
        "meaning": "implementation_composite_protection_verdict",
        "disclosure_event_status": "not_observed_by_this_protocol",
    }

    source = json.loads(
        (ROOT / "fixtures" / fixture["source_fixture"]).read_text(encoding="utf-8")
    )
    source_profile = next(
        profile
        for profile in source["profiles"]
        if profile["id"] == fixture["source_profile"]
    )
    cases = fixture["profiles"]
    assert [case["retention_days"] for case in cases] == [30, 31]
    assert fixture["varied_path"] == "views.adjudication.retention_days"
    assert fixture["declared_maximum"] == 30
    assert source["contract"]["max_retention_days"]["adjudication"] == 30

    profiles: dict[int, dict[str, object]] = {}
    for case in cases:
        retention_days = case["retention_days"]
        profile = deepcopy(source_profile)
        profile["views"]["adjudication"]["retention_days"] = retention_days
        profiles[retention_days] = profile

    profile_differences = differing_paths(profiles[30], profiles[31])
    assert profile_differences == {fixture["varied_path"]}

    synthetic_case = source["synthetic_case"]
    declared_taints = source["field_taints"]
    contract = source["contract"]
    materialized = {
        value: materialize(synthetic_case, profile)
        for value, profile in profiles.items()
    }
    propagated = {
        value: propagate_taints(
            synthetic_case,
            declared_taints,
            contract["minimum_token_length"],
        )
        for value in profiles
    }
    recourse_paths = {
        value: deepcopy(profile["recourse_path"])
        for value, profile in profiles.items()
    }
    forbidden_taints = {
        value: deepcopy(contract["forbidden_taints"])
        for value in profiles
    }

    assert materialized[30] == materialized[31]
    assert propagated[30] == propagated[31]
    assert recourse_paths[30] == recourse_paths[31]
    assert forbidden_taints[30] == forbidden_taints[31]
    forbidden_taint_variation = sorted(
        differing_paths(forbidden_taints[30], forbidden_taints[31])
    )
    assert forbidden_taint_variation == []

    hits = {
        value: forbidden_taint_hits(
            materialized[value],
            propagated[value],
            forbidden_taints[value],
        )
        for value in profiles
    }
    assert hits[30] == hits[31]
    assert all(not audience_hits for audience_hits in hits[30].values())

    excesses = {
        value: retention_excesses(profile, contract["max_retention_days"])
        for value, profile in profiles.items()
    }
    assert excesses[30] == {}
    assert excesses[31] == {
        "adjudication": {
            "retention_days": 31,
            "max_retention_days": 30,
        }
    }

    observations = {
        value: assess(
            synthetic_case,
            declared_taints,
            profile,
            contract,
        )
        for value, profile in profiles.items()
    }
    expected = {
        case["retention_days"]: case["expected"]
        for case in cases
    }

    local_cause_is_only_retention_excess = (
        profile_differences == {fixture["varied_path"]}
        and materialized[30] == materialized[31]
        and propagated[30] == propagated[31]
        and recourse_paths[30] == recourse_paths[31]
        and forbidden_taints[30] == forbidden_taints[31]
        and all(not audience_hits for audience_hits in hits[30].values())
        and excesses[30] == {}
        and excesses[31] == {
            "adjudication": {
                "retention_days": 31,
                "max_retention_days": 30,
            }
        }
    )

    if observations == expected and local_cause_is_only_retention_excess:
        classification = fixture["admissible_classification"]["name"]
    else:
        classification = fixture["fallback_classification"]

    assert classification != "candidate_set_incomplete", classification
    assert set(fixture["rivals"]) == {
        "purpose_scoped_retention",
        "recourse_authorization_spillover",
    }
    assert fixture["admissible_classification"]["loser"] == (
        "recourse_authorization_spillover"
    )

    print(json.dumps({
        "valid": True,
        "classification": classification,
        "losing_rival": fixture["admissible_classification"]["loser"],
        "observations": observations,
        "profile_differences": sorted(profile_differences),
        "materialized_views_identical": materialized[30] == materialized[31],
        "propagated_taints_identical": propagated[30] == propagated[31],
        "recourse_paths_identical": recourse_paths[30] == recourse_paths[31],
        "forbidden_taint_variation": forbidden_taint_variation,
        "forbidden_taint_hits": hits,
        "retention_excesses": excesses,
        "composite_verdict": "implementation_composite_protection_verdict",
        "disclosure_event_status": "not_observed_by_this_protocol",
        "scope": fixture["scope"],
        "evidence_regime": fixture["evidence_regime"],
        "external_validity": fixture["external_validity"],
        "independence_status": fixture["independence_status"],
    }, sort_keys=True))


if __name__ == "__main__":
    main()
