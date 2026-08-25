#!/usr/bin/env python3
"""Execute the configured D10 campaign on exhaustive fictional state machines.

The transition oracle receives ground truth and an outcome, never the
mechanism label or a configured score.  Results are model-internal only.
"""

from __future__ import annotations

import argparse
from itertools import product
import json
from pathlib import Path
from typing import Mapping, Sequence


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "d10_semantic_campaign_v0.3.json"
RESULT_PATH = ROOT.parent / "results" / "cct-sc-d10-003"
GATES = ("vital_need", "critical_ceiling", "right", "minimal_trace", "restitution")
UNAVAILABLE = "unavailable"
REQUIRED_PATHS = (
    "gate_states",
    "gate_narratives",
    "hours_by_role",
    "processing_delay",
    "abandonments.before_recourse",
    "abandonments.after_recourse",
    "unplanned_hours",
    "work_logs.visible",
    "work_logs.hidden",
    "work_logs.lost",
    "trace.timestamped_decision",
    "trace.decision_actor",
    "trace.review_actor",
    "trace.reason",
    "trace.saturated_resource",
    "trace.protected_gate",
    "trace.recourse_path",
    "trace.correction",
    "trace.restitution_event",
    "trace.counter_narrative",
    "trace.audit_off_registry_decisions",
    "recovery_log",
    "action_ledger",
    "denied_actions",
    "queue_below_local_threshold",
    "reactivation_verified",
    "remaining_losses",
    "active_repair_paths",
    "simulated_usability_test",
    "actual_state.actions_used",
    "actual_state.actions_remaining",
)


def load_config(path: Path = CONFIG_PATH) -> dict[str, object]:
    config = json.loads(path.read_text(encoding="utf-8"))
    if config["protocol_status"] != "fixed_before_execution":
        raise ValueError("protocol must be declared fixed before execution")
    if config["protocol_status_basis"] != "self_declared_in_config_no_independent_temporal_lock":
        raise ValueError("protocol status must remain explicitly self-declared")
    return config


def has_path(record: Mapping[str, object], path: str) -> bool:
    current: object = record
    for part in path.split("."):
        if not isinstance(current, Mapping) or part not in current:
            return False
        current = current[part]
    return current is not None


def generated_worlds(config: Mapping[str, object]) -> list[dict[str, str]]:
    axes = config["generator"]["axes"]
    names = list(axes)
    return [
        dict(zip(names, levels))
        for levels in product(*(axes[name] for name in names))
    ]


def ground_truth(
    labels: Mapping[str, str], action_costs: Mapping[str, int] | None = None
) -> dict[str, object]:
    severe = labels["load"] == "severe"
    wrong = labels["decision"] == "wrong_gate"
    off_registry = labels["registration"] == "off_registry"
    incident = "__".join(f"{key}-{labels[key]}" for key in labels)
    return {
        "incident_id": incident,
        "activation_time": 4,
        "decision_author": "routing_role",
        "reviewer": "recourse_role",
        "authority_map": {
            "routing_role": ["decision"],
            "fictional_requester": ["challenge"],
            "recourse_role": ["review", "correction", "uphold"],
            "recovery_role": ["restitution", "repair_due"],
        },
        "action_costs": dict(action_costs or {
            "decision": 1,
            "trace_attempt": 1,
            "challenge": 1,
            "review": 1,
            "correction_or_uphold": 1,
            "recovery": 1,
            "usability_probe": 1,
        }),
        "reason": "preserve_right_during_contention",
        "saturated_resource": "coordination_queue" if severe else "routing_capacity",
        "required_gate": "right",
        "selected_gate": "minimal_trace" if wrong else "right",
        "correction_required": wrong,
        "off_registry": off_registry,
        "queue_initial": 7 if severe else 4,
        "queue_threshold": 3,
        "labels": dict(labels),
    }


def _logs(prefix: str, count: int) -> list[str]:
    return [f"{prefix}-{index + 1}" for index in range(count)]


def authorization_contract(
    policy: Mapping[str, object], variation: Mapping[str, object]
) -> dict[str, object]:
    """Return only transition-authorizing bounds, never a mechanism label or score."""

    effective_budget = int(variation.get("action_budget", policy["action_budget"]))
    return {
        "action_budget_ceiling": int(policy["action_budget"]),
        "authorized_effective_budget": effective_budget,
        "authorized_recovery_capacity": int(policy["recovery_capacity"]),
        "recovery_horizon": int(variation["recovery_horizon"]),
        "registered_trace": bool(policy["registered_trace"]),
        "stable_off_registry_audit": bool(policy["stable_off_registry_audit"]),
        "redundant_off_registry_audit": bool(policy["redundant_off_registry_audit"]),
        "redundant_recourse": bool(policy["redundant_recourse"]),
    }


def simulate(
    truth: Mapping[str, object],
    policy: Mapping[str, object],
    variation: Mapping[str, object],
) -> dict[str, object]:
    labels = truth["labels"]
    severe = labels["load"] == "severe"
    stable = labels["channel"] == "stable"
    registered = labels["registration"] == "registered"
    redundant = labels["environment"] == "redundant"
    wrong = bool(truth["correction_required"])

    effective_budget = int(variation.get("action_budget", policy["action_budget"]))
    if effective_budget > int(policy["action_budget"]):
        raise ValueError("variation action budget exceeds mechanism ceiling")
    action_costs = truth["action_costs"]
    action_ledger: list[dict[str, object]] = []
    denied_actions: list[dict[str, object]] = []
    actions_remaining = effective_budget
    attempt_index = 0

    def spend(action: str) -> bool:
        nonlocal actions_remaining, attempt_index
        cost = int(action_costs[action])
        current_index = attempt_index
        attempt_index += 1
        if actions_remaining < cost:
            denied_actions.append(
                {
                    "action": action,
                    "cost": cost,
                    "balance_at_denial": actions_remaining,
                    "attempt_index": current_index,
                }
            )
            return False
        actions_remaining -= cost
        action_ledger.append(
            {
                "action": action,
                "cost": cost,
                "balance_after": actions_remaining,
                "attempt_index": current_index,
            }
        )
        return True

    decision_executed = spend("decision")
    trace_attempt_executed = spend("trace_attempt")
    potential_trace_capture = bool(policy["registered_trace"]) and registered
    if not registered and stable and policy["stable_off_registry_audit"]:
        potential_trace_capture = True
    if not registered and redundant and policy["redundant_off_registry_audit"]:
        potential_trace_capture = True
    trace_capture = decision_executed and trace_attempt_executed and potential_trace_capture
    route_available = stable or (redundant and bool(policy["redundant_recourse"]))

    challenge_executed = review_executed = correction_executed = False
    if trace_capture and route_available:
        challenge_executed = spend("challenge")
        if challenge_executed:
            review_executed = spend("review")
        if review_executed:
            correction_executed = spend("correction_or_uphold")
    recourse_processed = challenge_executed and review_executed and correction_executed

    recovery_executed = spend("recovery")
    recovery_horizon = int(variation["recovery_horizon"])
    horizon_bonus = int(recovery_horizon >= 7) if recovery_executed else 0
    topology_penalty = int(not redundant) if recovery_executed else 0
    capacity_applied = int(policy["recovery_capacity"]) if recovery_executed else 0
    queue_after = max(
        0,
        int(truth["queue_initial"]) - capacity_applied - horizon_bonus + topology_penalty,
    )
    recovered = recovery_executed and queue_after <= int(truth["queue_threshold"])
    usability_probe_executed = spend("usability_probe")
    reactivation_verified = recovered and usability_probe_executed

    gates = {gate: True for gate in GATES}
    if policy["label"].startswith("Append-only") and severe:
        gates["critical_ceiling"] = False
    if not trace_capture:
        gates["minimal_trace"] = False
    if wrong and not recourse_processed:
        gates["right"] = False
    gates["restitution"] = reactivation_verified

    observer_work = int(variation["observer_visible_work"])
    visible = int(policy["visible_work_base"]) + 2 * int(severe) + int(not registered) + observer_work
    hidden = int(policy["hidden_work_base"]) + int(not redundant) + int(not stable)
    lost = int(policy["lost_work_base"]) + int(not trace_capture) + int(not reactivation_verified)
    before_abandonment = int(not stable) + int(not registered)
    after_abandonment = 0 if recourse_processed else before_abandonment
    delay = 2 + 2 * int(severe) + int(not stable) + int(policy["label"].startswith("D10"))

    narratives = {
        gate: f"{gate}:{'usable' if state else 'unusable'}"
        for gate, state in gates.items()
    }
    expected_counter = (
        f"selected={truth['selected_gate']};required={truth['required_gate']}"
        if wrong
        else "decision_consistent_with_required_gate"
    )
    if trace_capture:
        correction = (
            f"corrected_to:{truth['required_gate']}"
            if wrong and recourse_processed
            else "not_corrected" if wrong else "upheld" if recourse_processed else "unreviewed"
        )
        trace = {
            "timestamped_decision": f"t={truth['activation_time']}:{truth['incident_id']}",
            "decision_actor": truth["decision_author"],
            "review_actor": truth["reviewer"] if review_executed else UNAVAILABLE,
            "reason": truth["reason"],
            "saturated_resource": truth["saturated_resource"],
            "protected_gate": truth["selected_gate"],
            "recourse_path": (
                "independent_reviewer"
                if review_executed
                else "not_reached_budget" if route_available else UNAVAILABLE
            ),
            "correction": correction,
            "restitution_event": "reactivated" if reactivation_verified else "repair_open",
            "counter_narrative": expected_counter,
            "audit_off_registry_decisions": bool(truth["off_registry"]),
        }
    else:
        trace = {
            "timestamped_decision": UNAVAILABLE,
            "decision_actor": UNAVAILABLE,
            "review_actor": UNAVAILABLE,
            "reason": UNAVAILABLE,
            "saturated_resource": UNAVAILABLE,
            "protected_gate": UNAVAILABLE,
            "recourse_path": UNAVAILABLE,
            "correction": UNAVAILABLE,
            "restitution_event": UNAVAILABLE,
            "counter_narrative": UNAVAILABLE,
            "audit_off_registry_decisions": False,
        }

    transitions = []
    if decision_executed:
        transitions.append({
            "event": "decision",
            "actor": truth["decision_author"],
            "selected_gate": truth["selected_gate"],
        })
    if challenge_executed:
        transitions.append({"event": "challenge", "actor": "fictional_requester"})
    if review_executed:
        transitions.append({"event": "review", "actor": truth["reviewer"]})
    if correction_executed:
        transitions.append({
            "event": "correction" if wrong else "uphold",
            "actor": truth["reviewer"],
            "gate": truth["required_gate"],
        })
    recovery_event = "restitution" if reactivation_verified else "repair_due"
    if recovery_executed:
        transitions.append({
            "event": recovery_event,
            "actor": "recovery_role",
            "queue_after": queue_after,
        })

    remaining_losses = [] if reactivation_verified else ["restitution_capacity"]
    recovery_log = [{
        "event": recovery_event,
        "actor": "recovery_role" if recovery_executed else UNAVAILABLE,
        "executed": recovery_executed,
        "queue_before": int(truth["queue_initial"]),
        "capacity_applied": capacity_applied,
        "horizon_bonus": horizon_bonus,
        "topology_penalty": topology_penalty,
        "queue_after": queue_after,
        "threshold": int(truth["queue_threshold"]),
        "usability_probe_performed": usability_probe_executed,
        "reactivation_verified": reactivation_verified,
        "remaining_losses": list(remaining_losses),
    }]

    return {
        "gate_states": gates,
        "gate_narratives": narratives,
        "hours_by_role": {
            "operations_role": visible - observer_work,
            "observer_role": observer_work,
        },
        "processing_delay": delay,
        "abandonments": {
            "before_recourse": before_abandonment,
            "after_recourse": after_abandonment,
        },
        "unplanned_hours": hidden,
        "work_logs": {
            "visible": _logs("visible", visible),
            "hidden": _logs("hidden", hidden),
            "lost": _logs("lost", lost),
        },
        "trace": trace,
        "recovery_log": recovery_log,
        "action_ledger": action_ledger,
        "denied_actions": denied_actions,
        "queue_below_local_threshold": recovered,
        "reactivation_verified": reactivation_verified,
        "remaining_losses": remaining_losses,
        "active_repair_paths": [] if reactivation_verified else ["bounded_queue_repair"],
        "simulated_usability_test": {
            "performed": usability_probe_executed,
            "five_gate_attempts": dict(gates) if usability_probe_executed else {gate: False for gate in GATES},
            "recourse_attempted": trace_capture and route_available,
            "recourse_processed": recourse_processed,
        },
        "transition_log": transitions,
        "actual_state": {
            "gate_capabilities": dict(gates),
            "queue_after": queue_after,
            "trace_captured": trace_capture,
            "action_budget_ceiling": int(policy["action_budget"]),
            "action_budget": effective_budget,
            "actions_used": effective_budget - actions_remaining,
            "actions_remaining": actions_remaining,
        },
    }


def transition_oracle(
    truth: Mapping[str, object],
    outcome: Mapping[str, object],
    contract: Mapping[str, object],
) -> dict[str, object]:
    """Check semantics with authorization bounds, never a mechanism label or score."""

    missing = [path for path in REQUIRED_PATHS if not has_path(outcome, path)]
    gates = outcome.get("gate_states", {})
    actual = outcome.get("actual_state", {})
    actual_gates = actual.get("gate_capabilities", {})
    narratives = outcome.get("gate_narratives", {})
    o1_consistent = gates == actual_gates and all(
        narratives.get(gate) == f"{gate}:{'usable' if gates.get(gate) else 'unusable'}"
        for gate in GATES
    )

    logs = outcome.get("work_logs", {})
    hours = outcome.get("hours_by_role", {})
    o2_consistent = (
        sum(hours.values()) == len(logs.get("visible", []))
        and outcome.get("unplanned_hours") == len(logs.get("hidden", []))
        and outcome.get("abandonments", {}).get("after_recourse", 0)
        <= outcome.get("abandonments", {}).get("before_recourse", 0)
    )

    ledger = outcome.get("action_ledger", [])
    denied = outcome.get("denied_actions", [])
    costs = truth["action_costs"]
    budget = actual.get("action_budget", -1)
    ceiling = contract["action_budget_ceiling"]
    running = budget
    budget_bounds_valid = (
        isinstance(budget, int)
        and 0 <= budget <= ceiling
        and budget == contract["authorized_effective_budget"]
        and actual.get("action_budget_ceiling") == ceiling
    )
    combined_attempts = [dict(item, disposition="executed") for item in ledger]
    combined_attempts.extend(dict(item, disposition="denied") for item in denied)
    combined_attempts.sort(key=lambda item: item.get("attempt_index", -1))
    executed_actions = [item.get("action") for item in ledger]
    potential_trace_capture = bool(contract["registered_trace"]) and truth["labels"]["registration"] == "registered"
    if truth["labels"]["registration"] == "off_registry" and truth["labels"]["channel"] == "stable":
        potential_trace_capture = potential_trace_capture or bool(contract["stable_off_registry_audit"])
    if truth["labels"]["registration"] == "off_registry" and truth["labels"]["environment"] == "redundant":
        potential_trace_capture = potential_trace_capture or bool(contract["redundant_off_registry_audit"])
    trace_capture_expected = (
        "decision" in executed_actions
        and "trace_attempt" in executed_actions
        and potential_trace_capture
    )
    route_available = (
        truth["labels"]["channel"] == "stable"
        or (
            truth["labels"]["environment"] == "redundant"
            and bool(contract["redundant_recourse"])
        )
    )
    expected_attempts = ["decision", "trace_attempt"]
    if trace_capture_expected and route_available:
        expected_attempts.append("challenge")
        if "challenge" in executed_actions:
            expected_attempts.append("review")
        if "review" in executed_actions:
            expected_attempts.append("correction_or_uphold")
    expected_attempts.extend(["recovery", "usability_probe"])
    attempt_sequence_valid = (
        [item.get("attempt_index") for item in combined_attempts]
        == list(range(len(combined_attempts)))
        and [item.get("action") for item in combined_attempts] == expected_attempts
    )
    ledger_valid = budget_bounds_valid and attempt_sequence_valid
    if ledger_valid:
        running = budget
        for item in combined_attempts:
            action = item.get("action")
            cost = item.get("cost")
            if action not in costs or cost != costs[action]:
                ledger_valid = False
                break
            if item["disposition"] == "executed":
                if running < cost:
                    ledger_valid = False
                    break
                running -= cost
                if item.get("balance_after") != running:
                    ledger_valid = False
                    break
            elif running >= cost or item.get("balance_at_denial") != running:
                ledger_valid = False
                break
    budget_consistent = (
        ledger_valid
        and len(executed_actions) == len(set(executed_actions))
        and actual.get("actions_used") == budget - running
        and actual.get("actions_remaining") == running
        and actual.get("trace_captured") == trace_capture_expected
    )

    transitions = outcome.get("transition_log", [])
    authority = truth["authority_map"]
    authority_valid = all(
        event.get("actor") in authority
        and event.get("event") in authority[event.get("actor")]
        for event in transitions
    )
    decisions = [event for event in transitions if event.get("event") == "decision"]
    challenges = [event for event in transitions if event.get("event") == "challenge"]
    reviewers = [event for event in transitions if event.get("event") == "review"]
    corrections = [
        event for event in transitions if event.get("event") in {"correction", "uphold"}
    ]
    actor_contract = (
        len(decisions) == 1
        and decisions[0].get("actor") == truth["decision_author"]
        and all(event.get("actor") == "fictional_requester" for event in challenges)
        and all(event.get("actor") == truth["reviewer"] for event in reviewers + corrections)
    )
    transition_action_contract = (
        ("decision" in executed_actions) == bool(decisions)
        and ("challenge" in executed_actions) == bool(challenges)
        and ("review" in executed_actions) == bool(reviewers)
        and ("correction_or_uphold" in executed_actions) == bool(corrections)
        and ("recovery" in executed_actions)
        == any(event.get("event") in {"restitution", "repair_due"} for event in transitions)
    )
    authority_valid = authority_valid and actor_contract and transition_action_contract
    independent_review = bool(reviewers) and all(
        event.get("actor") == truth["reviewer"]
        and event.get("actor") != truth["decision_author"]
        for event in reviewers
    )

    trace = outcome.get("trace", {})
    expected_counter = (
        f"selected={truth['selected_gate']};required={truth['required_gate']}"
        if truth["correction_required"]
        else "decision_consistent_with_required_gate"
    )
    trace_captured = bool(actual.get("trace_captured"))
    trace_truthful = trace_captured and (
        trace.get("timestamped_decision")
        == f"t={truth['activation_time']}:{truth['incident_id']}"
        and trace.get("decision_actor") == truth["decision_author"]
        and trace.get("reason") == truth["reason"]
        and trace.get("saturated_resource") == truth["saturated_resource"]
        and trace.get("protected_gate") == truth["selected_gate"]
        and trace.get("counter_narrative") == expected_counter
        and trace.get("audit_off_registry_decisions") == truth["off_registry"]
    )
    if corrections:
        expected_correction = (
            f"corrected_to:{truth['required_gate']}"
            if truth["correction_required"] else "upheld"
        )
    else:
        expected_correction = "not_corrected" if truth["correction_required"] else "unreviewed"
    if trace_captured:
        trace_semantic_consistent = (
            trace_truthful
            and trace.get("review_actor")
            == (truth["reviewer"] if reviewers else UNAVAILABLE)
            and trace.get("correction") == expected_correction
            and (
                trace.get("recourse_path") == "independent_reviewer"
                if reviewers else trace.get("recourse_path") in {UNAVAILABLE, "not_reached_budget"}
            )
        )
    else:
        unavailable_fields = (
            "timestamped_decision", "decision_actor", "review_actor", "reason",
            "saturated_resource", "protected_gate", "recourse_path", "correction",
            "restitution_event", "counter_narrative",
        )
        trace_semantic_consistent = all(trace.get(field) == UNAVAILABLE for field in unavailable_fields)
        trace_semantic_consistent = trace_semantic_consistent and not reviewers and not corrections

    correct_transition = bool(corrections) and all(
        event.get("gate") == truth["required_gate"]
        and event.get("event")
        == ("correction" if truth["correction_required"] else "uphold")
        for event in corrections
    )
    recourse_usable = (
        trace_truthful
        and trace.get("recourse_path") == "independent_reviewer"
        and independent_review
        and authority_valid
        and correct_transition
        and trace.get("correction") == expected_correction
    )
    if truth["correction_required"] and recourse_usable:
        recourse_usable = bool(gates.get(truth["required_gate"]))

    recovery_entries = outcome.get("recovery_log", [])
    recovery_log_consistent = isinstance(recovery_entries, list) and len(recovery_entries) == 1
    if recovery_log_consistent:
        recovery = recovery_entries[0]
        recovery_executed = "recovery" in executed_actions
        probe_executed = "usability_probe" in executed_actions
        authorized_capacity = int(contract["authorized_recovery_capacity"])
        expected_capacity = authorized_capacity if recovery_executed else 0
        expected_horizon_bonus = (
            int(int(contract["recovery_horizon"]) >= 7) if recovery_executed else 0
        )
        expected_topology_penalty = (
            int(truth["labels"]["environment"] != "redundant")
            if recovery_executed else 0
        )
        expected_queue = (
            max(
                0,
                recovery.get("queue_before", 0)
                - expected_capacity
                - expected_horizon_bonus
                + expected_topology_penalty,
            )
            if recovery_executed else recovery.get("queue_before")
        )
        expected_recovered = recovery_executed and expected_queue <= truth["queue_threshold"]
        expected_reactivation = expected_recovered and probe_executed
        expected_losses = [] if expected_reactivation else ["restitution_capacity"]
        expected_event = "restitution" if expected_reactivation else "repair_due"
        recovery_log_consistent = (
            recovery.get("queue_before") == truth["queue_initial"]
            and recovery.get("threshold") == truth["queue_threshold"]
            and recovery.get("executed") == recovery_executed
            and recovery.get("actor") == ("recovery_role" if recovery_executed else UNAVAILABLE)
            and recovery.get("capacity_applied") == expected_capacity
            and recovery.get("horizon_bonus") == expected_horizon_bonus
            and recovery.get("topology_penalty") == expected_topology_penalty
            and recovery.get("queue_after") == expected_queue == actual.get("queue_after")
            and recovery.get("usability_probe_performed") == probe_executed
            and recovery.get("reactivation_verified") == expected_reactivation
            and recovery.get("remaining_losses") == expected_losses
            and recovery.get("event") == expected_event
            and outcome.get("queue_below_local_threshold") == expected_recovered
            and outcome.get("reactivation_verified") == expected_reactivation
            and outcome.get("remaining_losses") == expected_losses
        )
    restoration_usable = (
        recovery_log_consistent
        and bool(outcome.get("reactivation_verified"))
        and bool(outcome.get("simulated_usability_test", {}).get("performed"))
        and bool(outcome.get("simulated_usability_test", {}).get("five_gate_attempts", {}).get("restitution"))
        and not outcome.get("remaining_losses")
    )
    contract_valid = (
        not missing
        and o1_consistent
        and o2_consistent
        and trace_semantic_consistent
        and authority_valid
        and budget_consistent
        and recovery_log_consistent
    )
    return {
        "assessment_scope": "model_internal",
        "missing_fields": missing,
        "contract_valid": contract_valid,
        "o1_gate_state_consistent": o1_consistent,
        "o2_work_ledger_consistent": o2_consistent,
        "o3_trace_truthful": trace_truthful,
        "o3_trace_semantic_consistent": trace_semantic_consistent,
        "o3_actor_authority_valid": authority_valid,
        "o3_independent_review": independent_review,
        "o3_recourse_usable": recourse_usable,
        "o4_recovery_log_consistent": recovery_log_consistent,
        "o4_restitution_usable": restoration_usable,
        "action_budget_consistent": budget_consistent,
        "gate_capabilities": {gate: bool(gates.get(gate)) for gate in GATES},
    }


def _signature(outcome: Mapping[str, object], assessment: Mapping[str, object]) -> str:
    value = {
        "gates": assessment["gate_capabilities"],
        "trace": assessment["o3_trace_truthful"],
        "recourse": assessment["o3_recourse_usable"],
        "restitution": assessment["o4_restitution_usable"],
        "visible": len(outcome["work_logs"]["visible"]),
        "hidden": len(outcome["work_logs"]["hidden"]),
        "lost": len(outcome["work_logs"]["lost"]),
        "delay": outcome["processing_delay"],
    }
    return json.dumps(value, sort_keys=True)


def functional_axes(
    rows: Sequence[Mapping[str, object]], axes: Sequence[str]
) -> dict[str, bool]:
    effects = {axis: False for axis in axes}
    for axis in axes:
        other_axes = [name for name in axes if name != axis]
        buckets: dict[tuple[object, ...], set[str]] = {}
        for row in rows:
            labels = row["ground_truth"]["labels"]
            for mechanism in ("d10", "baseline"):
                key = (row["variation"], mechanism, *(labels[name] for name in other_axes))
                buckets.setdefault(key, set()).add(
                    _signature(row["outcomes"][mechanism], row["assessments"][mechanism])
                )
        effects[axis] = any(len(signatures) > 1 for signatures in buckets.values())
    return effects


def dominates(
    left_outcome: Mapping[str, object], left: Mapping[str, object],
    right_outcome: Mapping[str, object], right: Mapping[str, object],
) -> bool:
    left_bool = [*left["gate_capabilities"].values(), left["o3_recourse_usable"], left["o4_restitution_usable"]]
    right_bool = [*right["gate_capabilities"].values(), right["o3_recourse_usable"], right["o4_restitution_usable"]]
    left_work = [len(left_outcome["work_logs"][name]) for name in ("visible", "hidden", "lost")]
    right_work = [len(right_outcome["work_logs"][name]) for name in ("visible", "hidden", "lost")]
    no_worse = all(a >= b for a, b in zip(left_bool, right_bool)) and all(
        a <= b for a, b in zip(left_work, right_work)
    )
    strict = any(a > b for a, b in zip(left_bool, right_bool)) or any(
        a < b for a, b in zip(left_work, right_work)
    )
    return no_worse and strict


def execute(config: Mapping[str, object]) -> dict[str, object]:
    worlds = generated_worlds(config)
    rows = []
    for variation_name, variation in config["protocol_variations"].items():
        for labels in worlds:
            truth = ground_truth(labels, config["action_costs"])
            contracts = {
                name: authorization_contract(policy, variation)
                for name, policy in config["mechanisms"].items()
            }
            outcomes = {
                name: simulate(truth, policy, variation)
                for name, policy in config["mechanisms"].items()
            }
            assessments = {
                name: transition_oracle(truth, outcome, contracts[name])
                for name, outcome in outcomes.items()
            }
            rows.append({
                "variation": variation_name,
                "world_id": truth["incident_id"],
                "ground_truth": truth,
                "authorization_contracts": contracts,
                "outcomes": outcomes,
                "assessments": assessments,
            })

    axes = list(config["generator"]["axes"])
    axis_effects = functional_axes(rows, axes)
    invalid_reasons = []
    expected_rows = len(worlds) * len(config["protocol_variations"])
    if len(rows) != expected_rows:
        invalid_reasons.append("incomplete_factorial")
    if not all(axis_effects.values()):
        invalid_reasons.append("inactive_generator_axis")
    if len({policy["action_budget"] for policy in config["mechanisms"].values()}) != 1:
        invalid_reasons.append("unmatched_action_budget")
    if any(
        row["outcomes"]["d10"]["actual_state"]["action_budget"]
        != row["outcomes"]["baseline"]["actual_state"]["action_budget"]
        for row in rows
    ):
        invalid_reasons.append("unmatched_effective_action_budget")
    if any(
        not assessment["contract_valid"]
        for row in rows for assessment in row["assessments"].values()
    ):
        invalid_reasons.append("semantic_contract_failure")

    by_key = {
        (row["variation"], row["world_id"]): row
        for row in rows
    }
    action_budget_active = any(
        _signature(by_key[("base", world_id)]["outcomes"][mechanism], by_key[("base", world_id)]["assessments"][mechanism])
        != _signature(by_key[("matched_low_action_budget", world_id)]["outcomes"][mechanism], by_key[("matched_low_action_budget", world_id)]["assessments"][mechanism])
        for world_id in {row["world_id"] for row in rows}
        for mechanism in ("d10", "baseline")
    )
    if not action_budget_active:
        invalid_reasons.append("inactive_action_budget")

    d10_wins = baseline_wins = 0
    protection_d10 = protection_baseline = 0
    ties_or_tradeoffs = 0
    for row in rows:
        d10_o, base_o = row["outcomes"]["d10"], row["outcomes"]["baseline"]
        d10_a, base_a = row["assessments"]["d10"], row["assessments"]["baseline"]
        d10_dom = dominates(d10_o, d10_a, base_o, base_a)
        base_dom = dominates(base_o, base_a, d10_o, d10_a)
        d10_wins += int(d10_dom)
        baseline_wins += int(base_dom)
        ties_or_tradeoffs += int(not d10_dom and not base_dom)
        d10_protection = sum(d10_a["gate_capabilities"].values()) + int(d10_a["o3_recourse_usable"]) + int(d10_a["o4_restitution_usable"])
        base_protection = sum(base_a["gate_capabilities"].values()) + int(base_a["o3_recourse_usable"]) + int(base_a["o4_restitution_usable"])
        protection_d10 += int(d10_protection > base_protection)
        protection_baseline += int(base_protection > d10_protection)

    if invalid_reasons:
        verdict = "protocol_invalid"
    elif d10_wins and not baseline_wins:
        verdict = "d10_advantage"
    elif baseline_wins and not d10_wins:
        verdict = "baseline_advantage"
    else:
        verdict = "compatible_survivors"
    return {
        "protocol": config["id"],
        "scope": {
            "state_machine_result": "model_internal",
            "deterministic_reconstruction": "pipeline_verified",
        },
        "unsupported_claims": ["institutional_effect", "external_transport"],
        "protocol_status": config["protocol_status"],
        "protocol_status_basis": config["protocol_status_basis"],
        "generator": config["generator"],
        "world_count": len(worlds),
        "variation_count": len(config["protocol_variations"]),
        "row_count": len(rows),
        "declared_invariants": config["declared_invariants"],
        "audited_invariants": {
            "complete_factorial": len(rows) == expected_rows,
            "matched_action_budget": not any(
                reason in invalid_reasons
                for reason in ("unmatched_action_budget", "unmatched_effective_action_budget")
            ),
            "action_budget_active": action_budget_active,
            "functional_axes": axis_effects,
            "semantic_contract_valid": "semantic_contract_failure" not in invalid_reasons,
            "no_composite_score": True,
        },
        "semantic_checker": {
            "inputs": "ground truth, transition authorization bounds and outcome; no mechanism label or configured score",
            "construct": "truthful trace, actor authority, authorized active action ledger, bounded recovery-log reconstruction and restored capability",
        },
        "classification": {
            "verdict": verdict,
            "invalid_reasons": invalid_reasons,
            "d10_pareto_wins": d10_wins,
            "baseline_pareto_wins": baseline_wins,
            "ties_or_tradeoffs": ties_or_tradeoffs,
            "d10_protection_vector_wins": protection_d10,
            "baseline_protection_vector_wins": protection_baseline,
        },
        "protocol_effect": config["protocol_effect"],
        "withdrawal_condition": config["withdrawal_condition"],
        "rows": rows,
    }


def write_report(result: Mapping[str, object], path: Path) -> None:
    classification = result["classification"]
    axes = result["audited_invariants"]["functional_axes"]
    lines = [
        f"# {result['protocol']} — campagne sémantique fictive", "",
        "## Conclusion", "",
        f"Verdict : `{classification['verdict']}`. Les {result['world_count']} mondes "
        f"et {result['variation_count']} variations produisent {result['row_count']} paires "
        "évaluées par un checker sémantique qui ne reçoit pas le nom du mécanisme.", "",
        "La campagne mesure des capacités et transitions dans les machines d’état déclarées. "
        "Elle ne mesure aucune institution réelle. Le statut du protocole est "
        "auto-déclaré dans la configuration, sans verrou temporel indépendant.", "",
        "## Comparaison vectorielle", "",
        f"- Dominances de Pareto D10 : `{classification['d10_pareto_wins']}` ;",
        f"- dominances du rival : `{classification['baseline_pareto_wins']}` ;",
        f"- égalités ou compromis : `{classification['ties_or_tradeoffs']}` ;",
        f"- avantages D10 sur le seul vecteur de protection : `{classification['d10_protection_vector_wins']}` ;",
        f"- avantages du rival sur ce vecteur : `{classification['baseline_protection_vector_wins']}`.", "",
        "Aucun score global ne compense une porte, un recours ou une restitution perdue. "
        "Une charge visible plus basse et une meilleure protection restent donc un compromis, "
        "pas un vainqueur fabriqué.", "",
        "## Checker et construit", "",
        "Le checker compare la trace à l’état vrai, vérifie acteur et autorité, recalcule "
        "le ledger d’actions avec ordre de tentative et plafonds autorisés, puis reconstruit "
        "la file depuis le contenu du journal O4 et la capacité autorisée. "
        "La présence de champs seule ne suffit pas.", "",
        "## Contrôles", "",
        f"- factoriel complet : `{result['audited_invariants']['complete_factorial']}` ;",
        f"- budgets appariés : `{result['audited_invariants']['matched_action_budget']}` ;",
        f"- budget actif : `{result['audited_invariants']['action_budget_active']}` ;",
        f"- contrat sémantique : `{result['audited_invariants']['semantic_contract_valid']}` ;",
        "- axes fonctionnels : " + ", ".join(f"`{name}={value}`" for name, value in axes.items()) + ";",
        "- reconstruction déterministe : `pipeline_verified`.", "",
        "## Portée et retrait", "",
        "Résultat des machines d’état : `model_internal`. Reconstruction : "
        "`pipeline_verified`. Revendications non soutenues : effet institutionnel et transport externe.", "",
        f"Condition de retrait : {result['withdrawal_condition']}", "",
        f"Effet possible du protocole : {result['protocol_effect']}",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=RESULT_PATH)
    args = parser.parse_args()
    result = execute(load_config())
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "result.json").write_text(
        json.dumps(result, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    write_report(result, args.output / "report.md")
    print(json.dumps(result["classification"], sort_keys=True))


if __name__ == "__main__":
    main()
