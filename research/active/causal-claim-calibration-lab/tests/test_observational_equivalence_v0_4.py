#!/usr/bin/env python3
"""Sealed contract and one-shot execution for CCCL-OE-004."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from fractions import Fraction
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "fixtures/observational_equivalence_models_v0.4.json"
HELD_OUT = ROOT / "fixtures/held_out_intervention_v0.4.json"
MANIFEST = ROOT / "pre_execution_manifest_v0.4.json"
SEAL = ROOT / "pre_execution_seal_v0.4.json"
RECEIPT = ROOT / "reports/synthetic/execution_receipt_v0.4.json"
CAMPAIGN = "CCCL-OE-004"
INDEPENDENCE = "independence_unknown"

CLOSED_SET = [
    "protocols/observational_equivalence_v0.4.md",
    "fixtures/observational_equivalence_models_v0.4.json",
    "fixtures/held_out_intervention_v0.4.json",
    "tests/test_observational_equivalence_v0_4.py",
    "pre_execution_manifest_v0.4.json",
    "pre_execution_seal_v0.4.json",
    "reports/synthetic/execution_receipt_v0.4.json",
]
SEALED_INPUTS = CLOSED_SET[:5]
EXPECTED_FAILURES = {
    "C01": ("contract", "closed_set_or_digest_mismatch"),
    "C02": ("contract", "graph_or_equation_mismatch"),
    "C03": ("contract", "observational_distributions_differ"),
    "C04": ("contract", "rival_intervention_predictions_do_not_diverge"),
    "C05": ("contract", "declared_partial_bounds_mismatch_or_exclude_a_rival"),
    "C06": ("contract", "independence_status_is_not_independence_unknown"),
    "E01": ("execution", "held_out_schema_or_campaign_mismatch"),
    "E02": ("execution", "no_rival_prediction_is_rejected"),
    "E03": ("execution", "no_rival_prediction_survives"),
    "E04": ("execution", "execution_receipt_already_exists"),
}
EXPECTED_CLAIMS = {
    "the_models_are_observationally_identical_for_the_declared_joint_distribution",
    "the_models_have_divergent_intervention_effects",
    "observational_data_alone_partially_identifies_but_does_not_select_either_model",
    "one_held_out_intervention_result_must_reject_at_least_one_rival_prediction",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def exact_keys(value: dict[str, Any], expected: set[str], label: str) -> None:
    require(set(value) == expected, f"{label}: keys {sorted(value)} != {sorted(expected)}")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path, *, permit_held_out_parse: bool = False) -> dict[str, Any]:
    if path == HELD_OUT and not permit_held_out_parse:
        raise AssertionError("held-out semantic parsing forbidden in contract mode")
    return json.loads(path.read_text(encoding="utf-8"))


def q(value: str) -> Fraction:
    return Fraction(value)


def iso(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    require(parsed.tzinfo is not None, "timestamp must include timezone")
    return parsed.astimezone(timezone.utc)


def evaluate_equation(equation: dict[str, Any], environment: dict[str, int]) -> int:
    exact_keys(equation, {"target", "expression", "parents", "table"}, "equation")
    require(equation["expression"].startswith(equation["target"] + " :="), "equation expression/target mismatch")
    matches = []
    for row in equation["table"]:
        exact_keys(row, {"when", "value"}, "equation row")
        require(set(row["when"]) == set(equation["parents"]), "equation row/parents mismatch")
        if all(environment[parent] == value for parent, value in row["when"].items()):
            matches.append(row["value"])
    require(len(matches) == 1, f"equation {equation['target']} has {len(matches)} matching rows")
    require(matches[0] in (0, 1), "non-binary equation value")
    return matches[0]


def validate_graph_and_equations(model: dict[str, Any]) -> None:
    equations = model["equations"]
    targets = [equation["target"] for equation in equations]
    require(targets == ["X", "Y"], f"{model['model_id']}: equation order must be X then Y")
    derived_edges = {
        (parent, equation["target"])
        for equation in equations
        for parent in equation["parents"]
    }
    declared_edges = {tuple(edge) for edge in model["graph_edges"]}
    require(derived_edges == declared_edges, f"{model['model_id']}: graph/equation mismatch")
    nodes = {node for edge in declared_edges for node in edge}
    incoming = {node: set() for node in nodes}
    for source, target in declared_edges:
        incoming[target].add(source)
    remaining = set(nodes)
    while remaining:
        roots = {node for node in remaining if not (incoming[node] & remaining)}
        require(bool(roots), f"{model['model_id']}: graph is cyclic")
        remaining -= roots


def compute_model(model: dict[str, Any]) -> tuple[dict[str, Fraction], dict[str, Fraction]]:
    exact_keys(
        model,
        {"model_id", "graph_edges", "exogenous_states", "equations", "declared_observational_distribution", "frozen_rival_prediction"},
        "model",
    )
    validate_graph_and_equations(model)
    observational = {"0,0": Fraction(0), "0,1": Fraction(0), "1,0": Fraction(0), "1,1": Fraction(0)}
    intervention_sums = {0: Fraction(0), 1: Fraction(0)}
    probability_sum = Fraction(0)
    state_ids: set[str] = set()
    for state in model["exogenous_states"]:
        exact_keys(state, {"state_id", "probability", "values"}, "exogenous state")
        require(state["state_id"] not in state_ids, "duplicate exogenous state")
        state_ids.add(state["state_id"])
        probability = q(state["probability"])
        require(probability > 0, "state probability must be positive")
        probability_sum += probability
        environment = dict(state["values"])
        for equation in model["equations"]:
            environment[equation["target"]] = evaluate_equation(equation, environment)
        observational[f"{environment['X']},{environment['Y']}"] += probability
        outcome_equation = model["equations"][1]
        for arm in (0, 1):
            intervened = dict(state["values"])
            intervened["X"] = arm
            intervention_sums[arm] += probability * evaluate_equation(outcome_equation, intervened)
    require(probability_sum == 1, f"{model['model_id']}: probabilities do not sum to one")
    effects = {
        "do_x_0_mean": intervention_sums[0],
        "do_x_1_mean": intervention_sums[1],
        "ate": intervention_sums[1] - intervention_sums[0],
    }
    declared_distribution = {key: q(value) for key, value in model["declared_observational_distribution"].items()}
    declared_prediction = {key: q(value) for key, value in model["frozen_rival_prediction"].items()}
    require(observational == declared_distribution, f"{model['model_id']}: computed observational distribution mismatch")
    require(effects == declared_prediction, f"{model['model_id']}: computed intervention prediction mismatch")
    return observational, effects


def derive_partial_bounds(distribution: dict[str, Fraction]) -> dict[str, tuple[Fraction, Fraction]]:
    p_x0 = distribution["0,0"] + distribution["0,1"]
    p_x1 = distribution["1,0"] + distribution["1,1"]
    e1 = (distribution["1,1"], distribution["1,1"] + p_x0)
    e0 = (distribution["0,1"], distribution["0,1"] + p_x1)
    return {"e_y_do_1": e1, "e_y_do_0": e0, "ate": (e1[0] - e0[1], e1[1] - e0[0])}


def validate_seal() -> tuple[dict[str, Any], dict[str, Any]]:
    manifest = load_json(MANIFEST)
    seal = load_json(SEAL)
    exact_keys(
        manifest,
        {"schema_version", "campaign_id", "prepared_at_utc", "scope", "independence_status", "closed_change_set", "sealed_inputs", "post_execution_artifact", "execution_policy"},
        "manifest",
    )
    exact_keys(seal, {"schema_version", "campaign_id", "sealed_at_utc", "scope", "independence_status", "manifest_sha256", "sealed_input_sha256"}, "seal")
    require(manifest["campaign_id"] == seal["campaign_id"] == CAMPAIGN, "campaign mismatch in seal")
    require(manifest["scope"] == seal["scope"] == "internal_synthetic_only", "scope mismatch in seal")
    require(manifest["independence_status"] == seal["independence_status"] == INDEPENDENCE, "independence status mismatch in seal")
    require(manifest["closed_change_set"] == CLOSED_SET, "closed change set mismatch")
    require(manifest["sealed_inputs"] == SEALED_INPUTS, "sealed inputs mismatch")
    require(manifest["post_execution_artifact"] == {"path": CLOSED_SET[-1], "must_be_absent_at_seal": True}, "post-execution artifact declaration mismatch")
    require(manifest["execution_policy"] == {"contract_must_pass_first": True, "maximum_executions": 1, "receipt_creation": "exclusive"}, "execution policy mismatch")
    require(seal["manifest_sha256"] == digest(MANIFEST), "manifest digest mismatch")
    expected_digests = {path: digest(ROOT / path) for path in SEALED_INPUTS}
    require(seal["sealed_input_sha256"] == expected_digests, "sealed input digest mismatch")
    prepared = iso(manifest["prepared_at_utc"])
    sealed = iso(seal["sealed_at_utc"])
    manifest_mtime = datetime.fromtimestamp(MANIFEST.stat().st_mtime_ns / 1_000_000_000, timezone.utc)
    seal_mtime = datetime.fromtimestamp(SEAL.stat().st_mtime_ns / 1_000_000_000, timezone.utc)
    require(prepared <= manifest_mtime <= sealed <= seal_mtime, "manifest/seal chronology is not coherent")
    return manifest, seal


def contract_checks(*, receipt_must_be_absent: bool) -> dict[str, Any]:
    manifest, seal = validate_seal()
    public = load_json(PUBLIC)
    exact_keys(
        public,
        {"schema_version", "campaign_id", "scope", "independence_status", "variables", "queries", "models", "partial_identification", "frozen_claims", "failure_criteria", "held_out_contract"},
        "public fixture",
    )
    require(public["schema_version"] == "causal-observational-equivalence-v0.4", "public schema mismatch")
    require(public["campaign_id"] == CAMPAIGN, "public campaign mismatch")
    require(public["scope"] == "internal_synthetic_only", "public scope mismatch")
    require(public["independence_status"] == INDEPENDENCE, "public independence status mismatch")
    require(public["variables"] == {"treatment": "X", "outcome": "Y", "domains": {"X": [0, 1], "Y": [0, 1]}}, "variable declaration mismatch")
    require(public["queries"] == {"observational": "P(X,Y)", "interventional": ["E[Y|do(X=0)]", "E[Y|do(X=1)]", "ATE"]}, "query declaration mismatch")
    require(len(public["models"]) == 2, "exactly two models required")
    computed = [compute_model(model) for model in public["models"]]
    distributions = [item[0] for item in computed]
    effects = [item[1] for item in computed]
    require(distributions[0] == distributions[1], "observational distributions differ")
    require(effects[0] != effects[1] and effects[0]["ate"] * effects[1]["ate"] < 0, "rival predictions do not diverge with opposite signs")
    partial = public["partial_identification"]
    exact_keys(partial, {"assumptions", "declared_bounds"}, "partial identification")
    require(partial["assumptions"] == ["binary_X", "binary_Y", "consistency", "no_ignorability_assumed"], "partial-identification assumptions mismatch")
    derived_bounds = derive_partial_bounds(distributions[0])
    declared_bounds = {key: tuple(q(value) for value in values) for key, values in partial["declared_bounds"].items()}
    require(derived_bounds == declared_bounds, "partial bounds mismatch")
    for effect in effects:
        require(declared_bounds["e_y_do_0"][0] <= effect["do_x_0_mean"] <= declared_bounds["e_y_do_0"][1], "rival do(X=0) prediction outside bounds")
        require(declared_bounds["e_y_do_1"][0] <= effect["do_x_1_mean"] <= declared_bounds["e_y_do_1"][1], "rival do(X=1) prediction outside bounds")
        require(declared_bounds["ate"][0] <= effect["ate"] <= declared_bounds["ate"][1], "rival ATE outside bounds")
    require(set(public["frozen_claims"]) == EXPECTED_CLAIMS and len(public["frozen_claims"]) == len(EXPECTED_CLAIMS), "frozen claims mismatch")
    criteria = {item["criterion_id"]: (item["phase"], item["condition"]) for item in public["failure_criteria"]}
    require(all(set(item) == {"criterion_id", "phase", "condition"} for item in public["failure_criteria"]), "failure criterion keys mismatch")
    require(criteria == EXPECTED_FAILURES, "failure criteria mismatch")
    held_contract = public["held_out_contract"]
    require(held_contract == {"path": CLOSED_SET[2], "arms": [0, 1], "outcome_domain": [0, 1], "units_per_arm": 4, "contract_mode_access": "sha256_bytes_only_no_parse"}, "held-out contract mismatch")
    require(seal["sealed_input_sha256"][CLOSED_SET[2]] == digest(HELD_OUT), "held-out opaque digest mismatch")
    if receipt_must_be_absent:
        require(not RECEIPT.exists(), "execution receipt already exists")
    return {"manifest": manifest, "public": public, "effects": effects, "bounds": derived_bounds}


def execute_once() -> None:
    checked = contract_checks(receipt_must_be_absent=True)
    held = load_json(HELD_OUT, permit_held_out_parse=True)
    exact_keys(held, {"schema_version", "campaign_id", "scope", "independence_status", "arms"}, "held-out result")
    require(held["schema_version"] == "causal-held-out-intervention-v0.4", "held-out schema mismatch")
    require(held["campaign_id"] == CAMPAIGN, "held-out campaign mismatch")
    require(held["scope"] == "internal_synthetic_only", "held-out scope mismatch")
    require(held["independence_status"] == INDEPENDENCE, "held-out independence status mismatch")
    require(set(held["arms"]) == {"do_x_0", "do_x_1"}, "held-out arm mismatch")
    units = checked["public"]["held_out_contract"]["units_per_arm"]
    domain = set(checked["public"]["held_out_contract"]["outcome_domain"])
    for values in held["arms"].values():
        require(len(values) == units and set(values) <= domain, "held-out outcome shape/domain mismatch")
    observed = {
        "do_x_0_mean": Fraction(sum(held["arms"]["do_x_0"]), units),
        "do_x_1_mean": Fraction(sum(held["arms"]["do_x_1"]), units),
    }
    observed["ate"] = observed["do_x_1_mean"] - observed["do_x_0_mean"]
    model_ids = [model["model_id"] for model in checked["public"]["models"]]
    survivors = [model_id for model_id, prediction in zip(model_ids, checked["effects"]) if prediction == observed]
    rejected = [model_id for model_id in model_ids if model_id not in survivors]
    require(bool(rejected), "no rival prediction rejected")
    require(bool(survivors), "no rival prediction survives")
    receipt = {
        "schema_version": "causal-execution-receipt-v0.4",
        "campaign_id": CAMPAIGN,
        "executed_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "scope": "internal_synthetic_only",
        "independence_status": INDEPENDENCE,
        "execution_count": 1,
        "sealed_manifest_sha256": digest(MANIFEST),
        "sealed_held_out_sha256": digest(HELD_OUT),
        "observed_intervention_result": {key: str(value) for key, value in observed.items()},
        "surviving_models": survivors,
        "rejected_models": rejected,
        "strongest_supported_conclusion": "this_internal_synthetic_intervention_rejects_one_of_two_frozen_rival_models",
        "external_validity": "not_claimed",
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    descriptor = os.open(RECEIPT, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        json.dump(receipt, stream, indent=2, sort_keys=True)
        stream.write("\n")
    print("PASS causal observational equivalence v0.4 execution: 1 survivor, 1 rejected, receipt created")


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--contract", action="store_true")
    mode.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.contract:
        contract_checks(receipt_must_be_absent=True)
        print("PASS causal observational equivalence v0.4 contract: held-out content not parsed")
    else:
        execute_once()


if __name__ == "__main__":
    main()
