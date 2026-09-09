#!/usr/bin/env python3
"""Contract test for CCL-NETO-003 using the existing v0.2 functions."""

from copy import deepcopy
from itertools import permutations
import json
from pathlib import Path

from test_joint_compatibility import apply_revision, evaluate


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "fixtures" / "non_exhaustive_trace_order_v0.3.json"

EXPECTED_CLOSED_CHANGE_SET = [
    "protocols/non_exhaustive_trace_order_v0.3.md",
    "fixtures/non_exhaustive_trace_order_v0.3.json",
    "tests/test_non_exhaustive_trace_order.py",
    "reports/synthetic/2026-09-09-non-exhaustive-trace-order-v0.3.md",
    "state/current_state.md",
]
EXPECTED_FAILURE_CRITERIA = {
    "intermediate_state_mismatch",
    "trace_multiset_mismatch",
    "final_world_sets_differ",
    "unexpected_final_worlds",
    "uncovered_residual_mismatch",
    "claim_beta_does_not_reopen",
    "rival_predictions_do_not_diverge",
    "negative_case_not_rejected",
}


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def statuses(evaluation):
    return dict(evaluation["statuses"])


def run_order(case, trace_by_id, order):
    current = set(case["possible_worlds"])
    first_statuses = statuses(evaluate(case, current))
    world_path = [sorted(current)]
    recompute_status_path = [first_statuses]
    absorbing = dict(first_statuses)

    for trace_id in order["trace_ids"]:
        current = apply_revision(current, trace_by_id[trace_id])
        require(current <= set(case["universe"]), "world_outside_universe")
        current_statuses = statuses(evaluate(case, current))
        for claim_id, status in current_statuses.items():
            if absorbing[claim_id] == "contradicted" or status == "contradicted":
                absorbing[claim_id] = "contradicted"
            else:
                absorbing[claim_id] = "individually_compatible"
        world_path.append(sorted(current))
        recompute_status_path.append(current_statuses)

    return {
        "world_path": world_path,
        "recompute_status_path": recompute_status_path,
        "absorbing_final_statuses": absorbing,
    }


def validate_case(case, check_declared_trajectory=True):
    universe = set(case["universe"])
    trace_by_id = {trace["id"]: trace for trace in case["traces"]}
    require(len(trace_by_id) == len(case["traces"]), "duplicate_trace_id")
    require(set(case["possible_worlds"]) <= universe, "initial_world_outside_universe")

    claim_coverage = set()
    for claim in case["claims"]:
        truth_set = set(claim["worlds_where_true"])
        require(truth_set <= universe, "claim_world_outside_universe")
        claim_coverage.update(truth_set)
    uncovered = sorted(universe - claim_coverage)
    require(uncovered == case["expected_uncovered_worlds"], "uncovered_residual_mismatch")
    require(bool(uncovered), "family_is_exhaustive")

    trace_ids = tuple(trace_by_id)
    expected_orders = {tuple(order) for order in permutations(trace_ids)}
    observed_orders = {tuple(order["trace_ids"]) for order in case["orders"]}
    require(observed_orders == expected_orders, "trace_multiset_mismatch")

    results = {}
    for order in case["orders"]:
        result = run_order(case, trace_by_id, order)
        if check_declared_trajectory:
            require(
                result["world_path"] == order["expected_world_path"],
                "intermediate_state_mismatch",
            )
            require(
                result["recompute_status_path"]
                == order["expected_recompute_status_path"],
                "recompute_status_path_mismatch",
            )
            require(
                result["absorbing_final_statuses"]
                == order["expected_absorbing_final_statuses"],
                "absorbing_prediction_mismatch",
            )
        results[order["id"]] = result

    final_world_sets = {
        tuple(result["world_path"][-1]) for result in results.values()
    }
    if len(final_world_sets) != 1:
        raise ValueError("final_world_sets_differ")
    final_worlds = list(next(iter(final_world_sets)))
    require(final_worlds == case["expected_final_worlds"], "unexpected_final_worlds")

    final_evaluation = evaluate(case, set(final_worlds))
    require(
        statuses(final_evaluation) == case["expected_recompute_final_statuses"],
        "recompute_final_prediction_mismatch",
    )
    require(
        final_evaluation["claims_cover_possible_worlds"] is False,
        "uncovered_residual_mismatch",
    )
    final_uncovered = sorted(set(final_worlds) - claim_coverage)
    require(final_uncovered == case["expected_uncovered_worlds"], "uncovered_residual_mismatch")

    beta_path = [
        step["claim-beta"]
        for step in results["restrict_then_add"]["recompute_status_path"]
    ]
    require(
        beta_path
        == ["individually_compatible", "contradicted", "individually_compatible"],
        "claim_beta_does_not_reopen",
    )

    recompute_predictions = {
        tuple(sorted(result["recompute_status_path"][-1].items()))
        for result in results.values()
    }
    require(len(recompute_predictions) == 1, "recompute_is_order_sensitive")
    absorbing_predictions = {
        tuple(sorted(result["absorbing_final_statuses"].items()))
        for result in results.values()
    }
    require(len(absorbing_predictions) == 2, "rival_predictions_do_not_diverge")
    require(
        case["expected_rejected_rival"] == "absorbing_contradiction",
        "unexpected_rejected_rival",
    )
    return results


def main():
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    require(fixture["schema_version"] == "contested-claims-non-exhaustive-order-v0.3", "schema_mismatch")
    require(fixture["campaign_id"] == "CCL-NETO-003", "campaign_mismatch")
    require(fixture["scope"] == "internal_synthetic_only", "scope_mismatch")
    require(fixture["external_validity"] == "not_claimed", "external_validity_mismatch")
    require(fixture["independence_status"] == "independence_unknown", "independence_mismatch")
    require(fixture["preregistration_demonstrated"] is False, "preregistration_overclaim")
    require(fixture["closed_change_set"] == EXPECTED_CLOSED_CHANGE_SET, "closed_change_set_mismatch")
    require(set(fixture["failure_criteria"]) == EXPECTED_FAILURE_CRITERIA, "failure_criteria_mismatch")
    require(
        fixture["scientific_limits"]
        == {
            "scope": "internal_synthetic_only",
            "external_validity": "not_claimed",
            "independence_status": "independence_unknown",
            "preregistration_demonstrated": False,
            "general_robustness_claimed": False,
        },
        "scientific_limits_mismatch",
    )

    validate_case(fixture["case"])

    negative = fixture["negative_case"]
    mutated_case = deepcopy(fixture["case"])
    replacement = negative["replace_trace"]
    mutated_case["traces"] = [
        replacement if trace["id"] == replacement["id"] else trace
        for trace in mutated_case["traces"]
    ]
    try:
        validate_case(mutated_case, check_declared_trajectory=False)
    except ValueError as error:
        require(str(error) == negative["expected_failure"], "unexpected_negative_failure")
    else:
        raise AssertionError("negative_case_not_rejected")

    print(
        json.dumps(
            {
                "valid": True,
                "campaign_id": fixture["campaign_id"],
                "orders_checked": 2,
                "negative_case_rejected": True,
                "scope": fixture["scope"],
                "external_validity": fixture["external_validity"],
                "independence_status": fixture["independence_status"],
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
