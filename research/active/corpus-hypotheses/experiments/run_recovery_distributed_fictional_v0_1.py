#!/usr/bin/env python3
"""Exact endogenous identity in a four-replica fictional generator.

Transition enumeration and causal signatures are two implementations of the
same declared semantics, not independent evidence. No external data is used.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


HERE = Path(__file__).resolve().parent
DEFAULT_CONFIG = HERE / "recovery-distributed-fictional-v0.2.json"
DEFAULT_PROTOCOL = HERE / "recovery-distributed-fictional-v0.2.md"
DEFAULT_OUTPUT_DIR = HERE.parent / "reports" / "recovery-distributed-fictional-v0.2"
CRASH_EVENT = "crash"
QUOTIENT_KEY_FIELDS = (
    "profile",
    "partition",
    "crash_replica",
    "crash_mode",
    "reference_cost",
    "reference_minimal_sets",
    "graph_only_set",
    "schedule_artifact_set",
    "causal_frontier_set",
    "cut_control_costs",
    "no_reset_dirty_replicas",
    "no_reset_event_statuses",
)


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_json(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_config(path: Path = DEFAULT_CONFIG) -> dict[str, Any]:
    config = json.loads(path.read_text(encoding="utf-8"))
    validate_config(config)
    return config


def _clock_le(left: Iterable[int], right: Iterable[int]) -> bool:
    return all(a <= b for a, b in zip(left, right, strict=True))


def validate_config(config: dict[str, Any]) -> None:
    replicas = config["replicas"]
    if replicas != [0, 1, 2, 3]:
        raise ValueError("the exact universe requires replicas [0,1,2,3]")
    if config["protocol_status"] != "fixed_before_execution":
        raise ValueError("protocol must be fixed before execution")
    if config["protocol_status_basis"] != "self_declared_in_config_no_independent_temporal_lock":
        raise ValueError("protocol status must remain explicitly self-declared")
    if set(config["scope"]) != {"formal_exact", "pipeline_verified"}:
        raise ValueError("scope must remain internally bounded")
    if config["reset_semantics"] != "clear_and_clamp_through_deadline":
        raise ValueError("unsupported reset semantics")
    if config["network_buffer_semantics"] != "immutable_envelope_independent_of_sender_reset":
        raise ValueError("unsupported network-buffer semantics")

    clocks = config["clocks"]
    if set(clocks) != {"A", "B", "AB"}:
        raise ValueError("exactly A, B and AB clocks are required")
    if any(len(clock) != len(replicas) for clock in clocks.values()):
        raise ValueError("all vector clocks must match replica count")
    if _clock_le(clocks["A"], clocks["B"]) or _clock_le(clocks["B"], clocks["A"]):
        raise ValueError("A and B must be concurrent")
    if not _clock_le(clocks["A"], clocks["AB"]) or not _clock_le(clocks["B"], clocks["AB"]):
        raise ValueError("AB must descend from A and B")
    target = config["target_component"]
    if clocks["A"][target] <= 0 or clocks["B"][target] != 0 or clocks["AB"][target] <= 0:
        raise ValueError("target ancestry convention is inconsistent")

    envelope_ids = set(config["envelopes"])
    if envelope_ids != {"m02", "m12", "m03", "m13"}:
        raise ValueError("the fixed four-envelope universe changed")
    for envelope in config["envelopes"].values():
        if envelope["source"] not in replicas or envelope["destination"] not in replicas:
            raise ValueError("envelope endpoint outside replica universe")
        if envelope["destination"] not in config["crash_replicas"]:
            raise ValueError("envelope destination must be a crashable replica")
    for profile in config["payload_profiles"].values():
        if set(profile) != envelope_ids or not set(profile.values()) <= set(clocks):
            raise ValueError("payload profile does not cover the fixed envelopes")
    for blocked in config["partitions"].values():
        if not set(blocked) <= envelope_ids:
            raise ValueError("partition names an unknown envelope")
    if config["crash_replicas"] != [2, 3]:
        raise ValueError("fixed crash replicas changed")
    if set(config["crash_modes"]) != {"durable_recovery", "volatile_loss"}:
        raise ValueError("fixed crash modes changed")
    if config["cut_position"] not in config["cut_position_controls"]:
        raise ValueError("main cut must be one of the method controls")
    if config["comparison_kind"] != "nested_information_ablations":
        raise ValueError("comparisons must remain nested information ablations")
    if set(config["information_budgets"]) != {"graph_only", "schedule_artifact", "causal_frontier"}:
        raise ValueError("ablation set changed")
    budgets = {name: set(fields) for name, fields in config["information_budgets"].items()}
    if not budgets["graph_only"] < budgets["schedule_artifact"] < budgets["causal_frontier"]:
        raise ValueError("information budgets must remain strictly nested")
    if set(config["unsupported_claims"]) != {
        "independent_oracle",
        "measured_information_recovery_cost",
        "external_equivalence",
        "physical_or_subjective_memory",
    }:
        raise ValueError("unsupported claims must remain explicit")
    if tuple(config["quotient_key_fields"]) != QUOTIENT_KEY_FIELDS:
        raise ValueError("quotient key fields changed")


def all_schedules(config: dict[str, Any]) -> list[tuple[str, ...]]:
    events = tuple(config["envelopes"]) + (CRASH_EVENT,)
    schedules = list(itertools.permutations(events))
    if len(schedules) != 120 or len(set(schedules)) != 120:
        raise AssertionError("schedule enumeration is not the exact 5! universe")
    return schedules


def join_clock(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(max(a, b) for a, b in zip(left, right, strict=True))


def has_target(clock: Iterable[int], target_component: int) -> bool:
    return tuple(clock)[target_component] > 0


def _mask_to_set(mask: int, replicas: list[int]) -> set[int]:
    return {replica for bit, replica in enumerate(replicas) if mask & (1 << bit)}


def _set_to_mask(replicas_set: Iterable[int], replicas: list[int]) -> int:
    positions = {replica: bit for bit, replica in enumerate(replicas)}
    mask = 0
    for replica in replicas_set:
        mask |= 1 << positions[replica]
    return mask


def simulate_concrete(
    config: dict[str, Any],
    *,
    profile_name: str,
    partition_name: str,
    crash_replica: int,
    crash_mode: str,
    schedule: tuple[str, ...],
    reset_mask: int,
    cut_position: int | None = None,
    payload_override: dict[str, str] | None = None,
    include_trace: bool = False,
) -> dict[str, Any]:
    """Concrete transition simulation inside the declared generator."""

    replicas = config["replicas"]
    clock_size = len(replicas)
    zero = (0,) * clock_size
    clocks = {name: tuple(value) for name, value in config["clocks"].items()}
    states = {replica: zero for replica in replicas}
    states[0] = clocks["A"]
    states[1] = clocks["B"]
    payloads = payload_override or config["payload_profiles"][profile_name]
    blocked = set(config["partitions"][partition_name])
    cut = config["cut_position"] if cut_position is None else cut_position
    resets = _mask_to_set(reset_mask, replicas)
    clamped: set[int] = set()
    crashed = False
    recovery_clock = zero
    trace: list[dict[str, Any]] = []

    def apply_reset() -> None:
        nonlocal recovery_clock
        clamped.update(resets)
        for replica in resets:
            states[replica] = zero
        if crash_replica in resets:
            recovery_clock = zero

    reset_applied = False
    for event_index, event in enumerate(schedule):
        if event_index == cut:
            apply_reset()
            reset_applied = True

        if event == CRASH_EVENT:
            if crash_replica in clamped:
                recovery_clock = zero
                status = "crash_clamped"
            elif crash_mode == "durable_recovery":
                recovery_clock = states[crash_replica]
                status = "crash_durable_snapshot"
            else:
                recovery_clock = zero
                status = "crash_volatile_loss"
            states[crash_replica] = zero
            crashed = True
            if include_trace:
                trace.append({"event": event, "status": status})
            continue

        envelope = config["envelopes"][event]
        destination = envelope["destination"]
        if event in blocked:
            status = "blocked_partition"
        elif destination in clamped:
            status = "rejected_clamp"
        elif destination == crash_replica and crashed:
            status = "dropped_crash"
        else:
            payload_clock = clocks[payloads[event]]
            states[destination] = join_clock(states[destination], payload_clock)
            status = "delivered"
        if include_trace:
            trace.append({"event": event, "status": status})

    if not reset_applied:
        apply_reset()
    if crashed and crash_mode == "durable_recovery" and crash_replica not in clamped:
        states[crash_replica] = join_clock(states[crash_replica], recovery_clock)

    dirty = sorted(
        replica
        for replica, clock in states.items()
        if has_target(clock, config["target_component"])
    )
    result = {
        "clean": not dirty,
        "dirty_replicas": dirty,
        "final_clocks": {str(replica): list(states[replica]) for replica in replicas},
    }
    if include_trace:
        result["trace"] = trace
    return result


def enumerate_minimum_resets(
    config: dict[str, Any],
    *,
    profile_name: str,
    partition_name: str,
    crash_replica: int,
    crash_mode: str,
    schedule: tuple[str, ...],
    cut_position: int | None = None,
) -> dict[str, Any]:
    replicas = config["replicas"]
    successful: list[int] = []
    minimum_cost: int | None = None
    for mask in range(1 << len(replicas)):
        cost = mask.bit_count()
        if minimum_cost is not None and cost > minimum_cost:
            continue
        outcome = simulate_concrete(
            config,
            profile_name=profile_name,
            partition_name=partition_name,
            crash_replica=crash_replica,
            crash_mode=crash_mode,
            schedule=schedule,
            reset_mask=mask,
            cut_position=cut_position,
        )
        if outcome["clean"]:
            if minimum_cost is None or cost < minimum_cost:
                minimum_cost = cost
                successful = [mask]
            elif cost == minimum_cost:
                successful.append(mask)
    if minimum_cost is None:
        raise AssertionError("full reset must always clean the finite universe")
    return {
        "cost": minimum_cost,
        "masks": successful,
        "sets": [sorted(_mask_to_set(mask, replicas)) for mask in successful],
    }


def _event_before_crash(schedule: tuple[str, ...], event: str) -> bool:
    return schedule.index(event) < schedule.index(CRASH_EVENT)


def predict_graph_only(
    config: dict[str, Any], *, partition_name: str
) -> set[int]:
    required = {0}
    blocked = set(config["partitions"][partition_name])
    for event, envelope in config["envelopes"].items():
        if event not in blocked:
            required.add(envelope["destination"])
    return required


def predict_schedule_artifact(
    config: dict[str, Any],
    *,
    partition_name: str,
    crash_replica: int,
    crash_mode: str,
    schedule: tuple[str, ...],
) -> set[int]:
    """Schedule-aware but clock-blind rival."""

    required = {0}
    blocked = set(config["partitions"][partition_name])
    for event, envelope in config["envelopes"].items():
        if event in blocked:
            continue
        destination = envelope["destination"]
        if destination != crash_replica:
            required.add(destination)
        elif crash_mode == "durable_recovery" and _event_before_crash(schedule, event):
            required.add(destination)
    return required


def predict_causal_frontier(
    config: dict[str, Any],
    *,
    profile_name: str,
    partition_name: str,
    crash_replica: int,
    crash_mode: str,
    schedule: tuple[str, ...],
) -> set[int]:
    """Symbolic target-ancestry frontier from the declared generator semantics."""

    required = {0}
    blocked = set(config["partitions"][partition_name])
    profile = config["payload_profiles"][profile_name]
    target = config["target_component"]
    for event, envelope in config["envelopes"].items():
        if event in blocked or config["clocks"][profile[event]][target] <= 0:
            continue
        destination = envelope["destination"]
        if destination != crash_replica:
            required.add(destination)
        elif crash_mode == "durable_recovery" and _event_before_crash(schedule, event):
            required.add(destination)
    return required


def _model_score(rows: list[dict[str, Any]], field: str) -> dict[str, Any]:
    errors = [abs(row[field] - row["reference_cost"]) for row in rows]
    signed = [row[field] - row["reference_cost"] for row in rows]
    return {
        "exact": sum(error == 0 for error in errors),
        "total": len(rows),
        "mean_absolute_error": sum(errors) / len(errors),
        "maximum_absolute_error": max(errors),
        "overestimates": sum(value > 0 for value in signed),
        "underestimates": sum(value < 0 for value in signed),
    }


def _sufficiency_audit(
    rows: list[dict[str, Any]], key_fn
) -> dict[str, int]:
    groups: dict[Any, set[int]] = defaultdict(set)
    for row in rows:
        groups[key_fn(row)].add(row["reference_cost"])
    ambiguous = [values for values in groups.values() if len(values) > 1]
    return {
        "strata": len(groups),
        "ambiguous_strata": len(ambiguous),
        "maximum_cost_range": max((max(values) - min(values) for values in groups.values()), default=0),
    }


def _count_discriminating_groups(rows: list[dict[str, Any]], key_fields: tuple[str, ...]) -> int:
    groups: dict[tuple[Any, ...], set[int]] = defaultdict(set)
    for row in rows:
        groups[tuple(row[field] for field in key_fields)].add(row["reference_cost"])
    return sum(len(values) > 1 for values in groups.values())


def _robust_scenario_audit(
    config: dict[str, Any],
    rows: list[dict[str, Any]],
    schedules: list[tuple[str, ...]],
) -> tuple[list[dict[str, Any]], int]:
    grouped: dict[tuple[str, str, int, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        key = (row["profile"], row["partition"], row["crash_replica"], row["crash_mode"])
        grouped[key].append(row)

    summaries: list[dict[str, Any]] = []
    mismatches = 0
    for key in sorted(grouped):
        profile, partition, crash_replica, crash_mode = key
        scenario_rows = grouped[key]
        successful: list[int] = []
        minimum_cost: int | None = None
        for mask in range(1 << len(config["replicas"])):
            cost = mask.bit_count()
            if minimum_cost is not None and cost > minimum_cost:
                continue
            if all(
                simulate_concrete(
                    config,
                    profile_name=profile,
                    partition_name=partition,
                    crash_replica=crash_replica,
                    crash_mode=crash_mode,
                    schedule=schedule,
                    reset_mask=mask,
                )["clean"]
                for schedule in schedules
            ):
                if minimum_cost is None or cost < minimum_cost:
                    minimum_cost = cost
                    successful = [mask]
                elif cost == minimum_cost:
                    successful.append(mask)

        causal_union: set[int] = set()
        for row in scenario_rows:
            causal_union.update(row["causal_frontier_set"])
        predicted_mask = _set_to_mask(causal_union, config["replicas"])
        if minimum_cost != len(causal_union) or predicted_mask not in successful:
            mismatches += 1
        costs = sorted({row["reference_cost"] for row in scenario_rows})
        summaries.append(
            {
                "profile": profile,
                "partition": partition,
                "crash_replica": crash_replica,
                "crash_mode": crash_mode,
                "schedule_costs": costs,
                "robust_reference_cost": minimum_cost,
                "robust_reference_sets": [
                    sorted(_mask_to_set(mask, config["replicas"])) for mask in successful
                ],
                "causal_frontier_union": sorted(causal_union),
            }
        )
    return summaries, mismatches


def quotient_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Quotient exhaustive cells by every recorded decision-relevant value."""

    groups: dict[str, dict[str, Any]] = {}
    for row in rows:
        signature = {field: row[field] for field in QUOTIENT_KEY_FIELDS}
        key = canonical_json(signature)
        if key not in groups:
            groups[key] = {
                "signature": signature,
                "multiplicity": 0,
                "representative_world_id": row["world_id"],
            }
        groups[key]["multiplicity"] += 1

    quotient: list[dict[str, Any]] = []
    for index, key in enumerate(sorted(groups)):
        item = groups[key]
        quotient.append(
            {
                "signature_id": f"q{index:04d}",
                "signature_sha256": hashlib.sha256(key.encode("utf-8")).hexdigest(),
                **item,
            }
        )
    return quotient


def validate_quotient(
    quotient: list[dict[str, Any]], rows: list[dict[str, Any]]
) -> bool:
    """Require exact equality with the quotient recomputed from exhaustive rows."""

    return canonical_json(quotient) == canonical_json(quotient_rows(rows))


def enumerate_cells(
    config: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[tuple[str, ...]], int, set[str]]:
    schedules = all_schedules(config)
    rows: list[dict[str, Any]] = []
    cut_mismatches = 0
    seen_ids: set[str] = set()

    for profile, partition, crash_replica, crash_mode in itertools.product(
        config["payload_profiles"],
        config["partitions"],
        config["crash_replicas"],
        config["crash_modes"],
    ):
        for schedule_index, schedule in enumerate(schedules):
            world_id = (
                f"{profile}|{partition}|r{crash_replica}|{crash_mode}|"
                f"s{schedule_index:03d}"
            )
            if world_id in seen_ids:
                raise AssertionError("duplicate world id")
            seen_ids.add(world_id)

            reference = enumerate_minimum_resets(
                config,
                profile_name=profile,
                partition_name=partition,
                crash_replica=crash_replica,
                crash_mode=crash_mode,
                schedule=schedule,
            )
            cut_costs: dict[str, int] = {}
            for cut in config["cut_position_controls"]:
                cut_reference = enumerate_minimum_resets(
                    config,
                    profile_name=profile,
                    partition_name=partition,
                    crash_replica=crash_replica,
                    crash_mode=crash_mode,
                    schedule=schedule,
                    cut_position=cut,
                )
                cut_costs[str(cut)] = cut_reference["cost"]
            if len(set(cut_costs.values())) != 1:
                cut_mismatches += 1

            graph_set = predict_graph_only(config, partition_name=partition)
            schedule_set = predict_schedule_artifact(
                config,
                partition_name=partition,
                crash_replica=crash_replica,
                crash_mode=crash_mode,
                schedule=schedule,
            )
            causal_set = predict_causal_frontier(
                config,
                profile_name=profile,
                partition_name=partition,
                crash_replica=crash_replica,
                crash_mode=crash_mode,
                schedule=schedule,
            )
            no_reset = simulate_concrete(
                config,
                profile_name=profile,
                partition_name=partition,
                crash_replica=crash_replica,
                crash_mode=crash_mode,
                schedule=schedule,
                reset_mask=0,
                include_trace=True,
            )
            rows.append(
                {
                    "world_id": world_id,
                    "profile": profile,
                    "partition": partition,
                    "crash_replica": crash_replica,
                    "crash_mode": crash_mode,
                    "schedule_index": schedule_index,
                    "schedule": list(schedule),
                    "cut_position": config["cut_position"],
                    "reference_cost": reference["cost"],
                    "reference_minimal_sets": reference["sets"],
                    "graph_only_cost": len(graph_set),
                    "graph_only_set": sorted(graph_set),
                    "schedule_artifact_cost": len(schedule_set),
                    "schedule_artifact_set": sorted(schedule_set),
                    "causal_frontier_cost": len(causal_set),
                    "causal_frontier_set": sorted(causal_set),
                    "cut_control_costs": cut_costs,
                    "no_reset_dirty_replicas": no_reset["dirty_replicas"],
                    "no_reset_event_statuses": [item["status"] for item in no_reset["trace"]],
                }
            )

    expected_worlds = (
        len(config["payload_profiles"])
        * len(config["partitions"])
        * len(config["crash_replicas"])
        * len(config["crash_modes"])
        * len(schedules)
    )
    if len(rows) != expected_worlds:
        raise AssertionError("world enumeration is incomplete")
    return rows, schedules, cut_mismatches, seen_ids


def evaluate(config: dict[str, Any], protocol_path: Path = DEFAULT_PROTOCOL) -> dict[str, Any]:
    rows, schedules, cut_mismatches, seen_ids = enumerate_cells(config)

    model_scores = {
        "graph_only": _model_score(rows, "graph_only_cost"),
        "schedule_artifact": _model_score(rows, "schedule_artifact_cost"),
        "causal_frontier": _model_score(rows, "causal_frontier_cost"),
    }
    sufficiency = {
        "graph_only": _sufficiency_audit(rows, lambda row: row["partition"]),
        "schedule_artifact": _sufficiency_audit(
            rows,
            lambda row: (
                row["partition"],
                row["crash_replica"],
                row["crash_mode"],
                row["schedule_index"],
            ),
        ),
        "causal_frontier": _sufficiency_audit(
            rows, lambda row: tuple(row["causal_frontier_set"])
        ),
    }

    version_discriminating = _count_discriminating_groups(
        rows, ("partition", "crash_replica", "crash_mode", "schedule_index")
    )
    schedule_discriminating = _count_discriminating_groups(
        rows, ("profile", "partition", "crash_replica", "crash_mode")
    )
    recovery_discriminating = _count_discriminating_groups(
        rows, ("profile", "partition", "crash_replica", "schedule_index")
    )

    descendant_pairs: dict[tuple[Any, ...], dict[str, int]] = defaultdict(dict)
    for row in rows:
        if row["profile"] not in {"a_both", "ab_both"}:
            continue
        key = (
            row["partition"],
            row["crash_replica"],
            row["crash_mode"],
            row["schedule_index"],
        )
        descendant_pairs[key][row["profile"]] = row["reference_cost"]
    descendant_mismatches = sum(
        values.get("a_both") != values.get("ab_both") for values in descendant_pairs.values()
    )

    all_b_payloads = {event: "B" for event in config["envelopes"]}
    negative_control_failures = 0
    for partition, crash_replica, crash_mode, schedule in itertools.product(
        config["partitions"],
        config["crash_replicas"],
        config["crash_modes"],
        schedules,
    ):
        reset_source = _set_to_mask({0}, config["replicas"])
        negative = simulate_concrete(
            config,
            profile_name="a_r2",
            partition_name=partition,
            crash_replica=crash_replica,
            crash_mode=crash_mode,
            schedule=schedule,
            reset_mask=reset_source,
            payload_override=all_b_payloads,
        )
        if not negative["clean"]:
            negative_control_failures += 1

    robust_scenarios, robust_mismatches = _robust_scenario_audit(config, rows, schedules)
    outcome_distribution = {
        str(cost): count
        for cost, count in sorted(Counter(row["reference_cost"] for row in rows).items())
    }
    invalid_reasons: list[str] = []
    if len(rows) != 7680 or len(seen_ids) != len(rows):
        invalid_reasons.append("world_count_or_identity")
    if len(outcome_distribution) < 2:
        invalid_reasons.append("constant_outcome")
    if version_discriminating == 0:
        invalid_reasons.append("no_version_discrimination")
    if schedule_discriminating == 0:
        invalid_reasons.append("no_schedule_discrimination")
    if recovery_discriminating == 0:
        invalid_reasons.append("no_recovery_mode_discrimination")
    if descendant_mismatches:
        invalid_reasons.append("descendant_control_failed")
    if negative_control_failures:
        invalid_reasons.append("negative_version_control_failed")
    if cut_mismatches:
        invalid_reasons.append("cut_position_control_failed")

    causal_mismatches = len(rows) - model_scores["causal_frontier"]["exact"]
    if invalid_reasons:
        verdict = "protocol_invalid"
    elif causal_mismatches or robust_mismatches:
        verdict = "generator_identity_failed"
    elif (
        model_scores["graph_only"]["exact"] == len(rows)
        and sufficiency["graph_only"]["ambiguous_strata"] == 0
    ):
        verdict = "graph_ablation_sufficient"
    elif (
        model_scores["schedule_artifact"]["exact"] == len(rows)
        and sufficiency["schedule_artifact"]["ambiguous_strata"] == 0
    ):
        verdict = "schedule_ablation_sufficient"
    else:
        verdict = "endogenous_causal_signature_identity"

    method_effects = {}
    for crash_mode in config["crash_modes"]:
        mode_rows = [row for row in rows if row["crash_mode"] == crash_mode]
        method_effects[crash_mode] = {
            "worlds": len(mode_rows),
            "cost_distribution": {
                str(cost): count
                for cost, count in sorted(
                    Counter(row["reference_cost"] for row in mode_rows).items()
                )
            },
            "causal_frontier_exact": sum(
                row["causal_frontier_cost"] == row["reference_cost"] for row in mode_rows
            ),
        }

    compact_rows_hash = sha256_json(rows)
    quotient = quotient_rows(rows)
    multiplicity_sum = sum(item["multiplicity"] for item in quotient)
    quotient_valid = validate_quotient(quotient, rows)
    if not quotient_valid:
        raise AssertionError("quotient multiplicities do not reconstruct the exact population")
    result = {
        "protocol_id": config["protocol_id"],
        "protocol_status": config["protocol_status"],
        "protocol_status_basis": config["protocol_status_basis"],
        "executed_at": "2026-08-25",
        "scope": config["scope"],
        "unsupported_claims": config["unsupported_claims"],
        "verdict": verdict,
        "theorem": {
            "status": "formal_exact",
            "qualification": "endogenous_generator_identity",
            "reference_enumerator": config["reference_enumerator"],
        },
        "comparison": {
            "kind": config["comparison_kind"],
            "information_budgets": config["information_budgets"],
            "matched_budgets": False,
        },
        "generator": {
            "kind": "exhaustive_fictional_finite_universe",
            "parameters": {
                "replicas": config["replicas"],
                "payload_profiles": list(config["payload_profiles"]),
                "partitions": list(config["partitions"]),
                "crash_replicas": config["crash_replicas"],
                "crash_modes": config["crash_modes"],
                "schedule_count": len(schedules),
                "cut_position": config["cut_position"],
                "cut_position_controls": config["cut_position_controls"],
                "reset_semantics": config["reset_semantics"],
                "network_buffer_semantics": config["network_buffer_semantics"],
            },
            "config_sha256": sha256_json(config),
            "protocol_sha256": sha256_file(protocol_path),
            "runner_sha256": sha256_file(Path(__file__).resolve()),
            "rows_sha256": compact_rows_hash,
        },
        "population": {
            "worlds": len(rows),
            "unique_world_ids": len(seen_ids),
            "schedules_per_scenario": len(schedules),
            "scenarios": len(robust_scenarios),
            "reference_reset_subsets_per_world": 16,
            "monte_carlo_draws": 0,
        },
        "outcomes": {
            "C_erase_deadline_distribution": outcome_distribution,
            "schedule_sensitive_scenarios": schedule_discriminating,
            "version_discriminating_strata": version_discriminating,
            "recovery_mode_discriminating_pairs": recovery_discriminating,
        },
        "model_scores": model_scores,
        "sufficiency": sufficiency,
        "controls": {
            "invalid_reasons": invalid_reasons,
            "world_count_pass": len(rows) == 7680,
            "nonconstant_outcome_pass": len(outcome_distribution) >= 2,
            "version_discrimination_pass": version_discriminating > 0,
            "schedule_discrimination_pass": schedule_discriminating > 0,
            "recovery_mode_discrimination_pass": recovery_discriminating > 0,
            "descendant_invariance_pairs": len(descendant_pairs),
            "descendant_invariance_mismatches": descendant_mismatches,
            "negative_version_control_failures": negative_control_failures,
            "cut_position_mismatches": cut_mismatches,
            "causal_signature_reference_mismatches": causal_mismatches,
            "robust_causal_signature_mismatches": robust_mismatches,
            "quotient_exact_reconstruction_pass": quotient_valid,
        },
        "method_effects": method_effects,
        "robust_scenarios": robust_scenarios,
        "limitations": [
            "fictional four-replica finite universe",
            "target trace is vector-clock ancestry only",
            "network envelopes survive sender reset by declared model rule",
            "reset is a clamp through the deadline",
            "no external, behavioral, material, or physical equivalence",
        ],
        "withdrawal_condition": config["withdrawal_condition"],
        "next_action": (
            "stop_same_family_local_expansion"
            if verdict == "endogenous_causal_signature_identity"
            else "audit_generator_identity_failure_before_any_extension"
        ),
        "quotient": {
            "cell_count": len(rows),
            "signature_count": len(quotient),
            "multiplicity_sum": multiplicity_sum,
            "key_fields": list(QUOTIENT_KEY_FIELDS),
            "signatures": quotient,
        },
    }
    return result


def render_report(result: dict[str, Any]) -> str:
    scores = result["model_scores"]
    sufficiency = result["sufficiency"]
    controls = result["controls"]
    outcomes = result["outcomes"]
    method = result["method_effects"]
    quotient = result["quotient"]
    lines = [
        "# Résultat — récupération distribuée fictive v0.2",
        "",
        "Date : 2026-08-25",
        "",
        f"Verdict : **`{result['verdict']}`** (`formal_exact`).",
        "",
        "Le statut du protocole est auto-déclaré dans la configuration, sans",
        "verrou temporel indépendant.",
        "",
        "## Population et énumération endogène",
        "",
        f"- `{result['population']['worlds']}` cellules fictives exactes et distinctes ;",
        f"- `{result['population']['schedules_per_scenario']}` horaires par scénario ;",
        f"- `{result['population']['reference_reset_subsets_per_world']}` ensembles de reset examinés par cellule ;",
        "- zéro tirage Monte-Carlo ;",
        f"- distribution `C_erase_deadline` : `{outcomes['C_erase_deadline_distribution']}` ;",
        f"- quotient : `{quotient['signature_count']}` signatures, somme des multiplicités `{quotient['multiplicity_sum']}`.",
        "",
        "L'énumération de référence et la signature causale dérivent du même",
        "générateur déclaré. Leur égalité est un théorème endogène, pas une",
        "confirmation par un oracle indépendant. L'axe `C_info` non mesuré est retiré.",
        "",
        "## Ablations à budgets d'information imbriqués",
        "",
        "| ablation | exact / total | erreur absolue moyenne | sur | sous | strates ambiguës |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for model in ("graph_only", "schedule_artifact", "causal_frontier"):
        score = scores[model]
        audit = sufficiency[model]
        lines.append(
            f"| `{model}` | {score['exact']} / {score['total']} | "
            f"{score['mean_absolute_error']:.6f} | {score['overestimates']} | "
            f"{score['underestimates']} | {audit['ambiguous_strata']} |"
        )
    lines.extend(
        [
            "",
            "Les budgets ne sont pas appariés : `schedule_artifact` reçoit horaire",
            "et crash en plus de `graph_only`, puis `causal_frontier` reçoit aussi",
            "l'ascendance vectorielle. Le classement isole une information nécessaire",
            "dans ce générateur; il ne mesure pas une supériorité équitable de méthode.",
            "",
            "## Non-vacuité, variations et contrôles",
            "",
            f"- strates discriminées par versions : `{outcomes['version_discriminating_strata']}` ;",
            f"- scénarios sensibles à l'ordre : `{outcomes['schedule_sensitive_scenarios']}` ;",
            f"- paires discriminées par le mode de récupération : `{outcomes['recovery_mode_discriminating_pairs']}` ;",
            f"- invariance `A` / descendant `AB` : `{controls['descendant_invariance_pairs']}` paires, `{controls['descendant_invariance_mismatches']}` mismatch ;",
            f"- contrôle négatif `B` : `{controls['negative_version_control_failures']}` échec ;",
            f"- variation de la position de coupure : `{controls['cut_position_mismatches']}` mismatch ;",
            f"- signature causale / énumération de référence : `{controls['causal_signature_reference_mismatches']}` mismatch ;",
            f"- signature robuste / énumération tous horaires : `{controls['robust_causal_signature_mismatches']}` mismatch ;",
            f"- égalité avec le quotient recalculé depuis les 7680 cellules : `{controls['quotient_exact_reconstruction_pass']}`.",
            "",
            "Effet de méthode observé :",
            "",
            f"- durable : `{method['durable_recovery']['cost_distribution']}` ;",
            f"- volatile : `{method['volatile_loss']['cost_distribution']}`.",
            "",
            "Le mode de crash change donc les coûts absolus. En revanche, le reset",
            "maintenu rend la position de coupure inerte à horaire complet fixé, et",
            "l'identité endogène de signature survit aux deux modes.",
            "",
            "## Conclusion et portée",
            "",
            "La séparation récupération/désinscription reste opérationnelle, mais ce",
            "nouvel univers distribué fictif établit seulement que versions, partitions,",
            "crash et ordre se compilent exactement dans la signature causale déclarée.",
            "",
            "Portées : `formal_exact`, `pipeline_verified`. Revendications non soutenues :",
            "oracle indépendant, coût de récupération d'information mesuré, équivalence",
            "externe, mémoire physique ou subjective. Le buffer et le clamp jusqu'à la",
            "deadline sont des règles du générateur, non des faits généraux.",
            "",
            "Condition de retrait : tout mismatch futur entre énumération de transition et",
            "signature causale, après contrôles valides, retire l'identité. Pour cette",
            "passe, agrandir la même famille locale ne peut plus changer la conclusion ;",
            "la prochaine action est `stop_same_family_local_expansion`.",
            "",
        ]
    )
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--protocol", type=Path, default=DEFAULT_PROTOCOL)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--record", action="store_true", help="write deterministic JSON and Markdown artifacts")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = load_config(args.config)
    result = evaluate(config, args.protocol)
    if args.record:
        args.output_dir.mkdir(parents=True, exist_ok=True)
        (args.output_dir / "result.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        (args.output_dir / "report.md").write_text(render_report(result), encoding="utf-8")
    print(
        json.dumps(
            {
                "verdict": result["verdict"],
                "worlds": result["population"]["worlds"],
                "distribution": result["outcomes"]["C_erase_deadline_distribution"],
                "model_scores": result["model_scores"],
                "controls": result["controls"],
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
    )
    return 0 if result["verdict"] != "protocol_invalid" else 2


if __name__ == "__main__":
    raise SystemExit(main())
