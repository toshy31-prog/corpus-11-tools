#!/usr/bin/env python3
"""Validate bounded initial synthetic fixtures for autonomous research labs.

These checks establish only the formal, model-internal, or pipeline property
declared by each fixture. They deliberately reject promotion to a claim about
people, institutions, hardware, or independent external evaluation.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Callable


ROOT = Path(__file__).resolve().parents[2]
ACTIVE = ROOT / "research" / "active"

LABS = {
    "independent-evidence-arena",
    "relation-loss-observatory",
    "research-footprint-and-yield-lab",
    "user-capacity-and-dependence-lab",
    "accessibility-and-modal-equivalence-lab",
    "forecast-calibration-lab",
    "contributor-ecosystem-governance-lab",
    "epistemic-diversity-and-common-mode-failure-lab",
    "research-interruptibility-and-recovery-lab",
    "portfolio-option-value-lab",
}


def fixture(lab: str) -> dict[str, Any]:
    path = ACTIVE / lab / "fixtures" / "initial_cases.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("lab_id") != lab:
        raise AssertionError(f"{lab}: fixture lab_id mismatch")
    if not data.get("synthetic_scope"):
        raise AssertionError(f"{lab}: synthetic scope absent")
    return data


def check_independent(data: dict[str, Any]) -> None:
    case, expected = data["case"], data["expected"]
    reasons = []
    if case["origin"] != "external" or case["linked_to_method_creator"]:
        reasons.append("origin_not_external")
    if case["evaluator"] == case["executor"]:
        reasons.append("evaluator_not_independent")
    admissible = case["frozen_before_execution"] and not reasons
    assert admissible is expected["admissible"]
    assert reasons == expected["reasons"]
    assert expected["external_effect_claim_allowed"] is False


def check_relation_loss(data: dict[str, Any]) -> None:
    case, expected = data["case"], data["expected"]
    probes = [
        ("is_real_case", "not_real_case"),
        ("prior_access_evidence", "no_prior_access_trace"),
        ("current_break_observed", "no_current_break_trace"),
        ("comparable_control", "no_comparable_control"),
    ]
    reasons = [reason for key, reason in probes if not case[key]]
    if case["collection_basis"] == "none":
        reasons.append("no_collection_basis")
    assert reasons == expected["reasons"]
    assert expected["admissible_for_real_conclusion"] is False


def check_footprint(data: dict[str, Any]) -> None:
    protocols, expected = data["protocols"], data["expected"]
    assert [key for key in expected["dimension_order"]] == [
        "simulated_tokens", "simulated_minutes", "simulated_calls", "decisions_changed"
    ]
    assert sum(row["simulated_tokens"] for row in protocols) == expected["aggregate_tokens"]
    assert sum(row["decisions_changed"] for row in protocols) == expected["aggregate_decisions_changed"]
    assert all(row["decisions_changed"] > 0 for row in protocols)
    assert expected["external_efficiency_claim_allowed"] is False


def check_user_capacity(data: dict[str, Any]) -> None:
    trace, expected = data["trace"], data["expected"]
    assisted = next(row for row in trace if row["phase"] == "assisted")
    autonomous = next(row for row in trace if row["phase"] == "autonomous")
    recovery = next(row for row in trace if row["phase"] == "recovery")
    assert assisted["help_available"] and assisted["task_completed"]
    assert not autonomous["help_available"]
    assert recovery["used_recorded_procedure"]
    assert expected["autonomy_is_not_inferred_from_assisted_success"] is True
    assert expected["real_user_claim_allowed"] is False


def check_accessibility(data: dict[str, Any]) -> None:
    channels, expected = data["channels"], data["expected"]
    for field in ("action", "evidence", "recourse"):
        assert len({channel[field] for channel in channels}) == 1, field
    assert {channel["action"] for channel in channels} == {data["critical_task"]}
    assert expected["structural_equivalence"] is True
    assert expected["real_accessibility_claim_allowed"] is False


def check_forecast(data: dict[str, Any]) -> None:
    forecasts, expected = data["forecasts"], data["expected"]
    assert all(0 <= row["probability"] <= 1 and row["outcome"] in (0, 1) for row in forecasts)
    score = sum((row["probability"] - row["outcome"]) ** 2 for row in forecasts) / len(forecasts)
    assert abs(score - expected["brier_score"]) < 1e-12
    assert expected["external_calibration_claim_allowed"] is False


def check_governance(data: dict[str, Any]) -> None:
    events, expected = data["events"], data["expected"]
    assert [event["state"] for event in events] == [
        "proposed", "reviewed", "contested", "amended", "accepted", "withdrawn"
    ]
    assert events[0]["actor"] == "proposer"
    assert events[2]["actor"] != events[0]["actor"]
    assert events[-1]["state"] == "withdrawn"
    assert expected["trace_complete"] is True
    assert expected["contestation_closed_by_proposer"] is False
    assert expected["real_governance_claim_allowed"] is False


def check_diversity(data: dict[str, Any]) -> None:
    paths, expected = data["paths"], data["expected"]
    by_id = {row["id"]: set(row["sources"]) for row in paths}
    shared = sorted(by_id["a"] & by_id["b"])
    assert shared == expected["a_b_shared_sources"]
    assert expected["a_b_independent"] is False
    assert expected["path_count_is_not_independence"] is True


def check_interruptibility(data: dict[str, Any]) -> None:
    assert data["interruption"]["journaled"] is True
    assert data["snapshot"] == data["restored"]
    assert data["expected"]["lossless_for_declared_fields"] is True
    assert data["expected"]["universal_recovery_claim_allowed"] is False


def check_option_value(data: dict[str, Any]) -> None:
    allocations, expected = data["allocations"], data["expected"]
    delta = allocations["option_preserving"]["expected_information"] - allocations["uniform"]["expected_information"]
    assert abs(delta - expected["option_preserving_information_delta"]) < 1e-12
    assert expected["real_portfolio_recommendation_allowed"] is False


CHECKS: dict[str, Callable[[dict[str, Any]], None]] = {
    "independent-evidence-arena": check_independent,
    "relation-loss-observatory": check_relation_loss,
    "research-footprint-and-yield-lab": check_footprint,
    "user-capacity-and-dependence-lab": check_user_capacity,
    "accessibility-and-modal-equivalence-lab": check_accessibility,
    "forecast-calibration-lab": check_forecast,
    "contributor-ecosystem-governance-lab": check_governance,
    "epistemic-diversity-and-common-mode-failure-lab": check_diversity,
    "research-interruptibility-and-recovery-lab": check_interruptibility,
    "portfolio-option-value-lab": check_option_value,
}


def check_lab(lab: str) -> None:
    if lab not in CHECKS:
        raise ValueError(f"unknown initial protocol lab: {lab}")
    CHECKS[lab](fixture(lab))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lab", action="append", choices=sorted(LABS))
    args = parser.parse_args()
    labs = args.lab or sorted(LABS)
    for lab in labs:
        check_lab(lab)
        print(f"PASS {lab}: bounded initial protocol")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
