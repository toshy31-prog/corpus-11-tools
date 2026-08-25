#!/usr/bin/env python3
"""Separate individual survival, plurality and joint compatibility."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "joint_compatibility_v0.2.json"


def evaluate(case: dict[str, object], possible_worlds: set[str] | None = None) -> dict[str, object]:
    claim_ids = [claim["id"] for claim in case["claims"]]
    duplicates = sorted({claim_id for claim_id in claim_ids if claim_ids.count(claim_id) > 1})
    if duplicates:
        raise ValueError(f"duplicate_claim_ids:{','.join(duplicates)}")
    possible = set(case["possible_worlds"]) if possible_worlds is None else possible_worlds
    statuses = {}
    survivors = []
    truth_sets = []
    covered: set[str] = set()
    for claim in case["claims"]:
        truth = possible.intersection(claim["worlds_where_true"])
        covered.update(truth)
        statuses[claim["id"]] = "individually_compatible" if truth else "contradicted"
        if truth:
            survivors.append(claim["id"])
            truth_sets.append(truth)
    joint_worlds = set.intersection(*truth_sets) if len(truth_sets) >= 2 else set()
    return {
        "statuses": statuses,
        "individual_survivors": survivors,
        "plurality": len(survivors) >= 2,
        "joint_compatibility": bool(joint_worlds),
        "joint_worlds": sorted(joint_worlds),
        "claims_cover_possible_worlds": covered == possible,
    }


def apply_revision(possible: set[str], revision: dict[str, object]) -> set[str]:
    worlds = set(revision["worlds"])
    if revision["operation"] == "intersect":
        return possible.intersection(worlds)
    if revision["operation"] == "union":
        return possible.union(worlds)
    raise AssertionError(f"unknown revision operation: {revision['operation']}")


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["protocol_fixed_before_execution"] is True
    outcomes = {}
    for case in fixture["cases"]:
        before = evaluate(case)
        assert before == case["expected_before"], (case["id"], before)
        revised_worlds = apply_revision(set(case["possible_worlds"]), case["revision"])
        assert revised_worlds != set(case["possible_worlds"]), case["id"]
        after = evaluate(case, revised_worlds)
        assert after == case["revision"]["expected_after"], (case["id"], after)
        outcomes[case["id"]] = before
    assert outcomes["exclusive_individual_survivors"]["plurality"] is True
    assert outcomes["exclusive_individual_survivors"]["joint_compatibility"] is False
    assert outcomes["overlapping_survivors"]["joint_compatibility"] is True
    rejected = {}
    for mutation in fixture["input_mutations"]:
        try:
            evaluate(mutation)
        except ValueError as error:
            rejected[mutation["id"]] = str(error)
        else:
            raise AssertionError(f"invalid input accepted: {mutation['id']}")
        assert rejected[mutation["id"]] == mutation["expected_error"]
    assert rejected["duplicate_claim_identifiers"] == "duplicate_claim_ids:duplicated"
    print("PASS contested claims v0.2: individual/joint/revision separated; duplicate ids rejected")


if __name__ == "__main__":
    main()
