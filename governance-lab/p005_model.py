"""Synthetic compound-crisis twin for P-005.

The model is deliberately small.  It tests interaction between shared degraded
resources and five non-compensable constitutional outcomes; it does not predict
territorial behaviour.
"""

from __future__ import annotations

import math
import random
from typing import Mapping

from p001_model import capability, clamp, validate_budget


CORE_METRICS = (
    "vital_unmet",
    "eco_overshoot",
    "rights_suspended",
    "untraced_decisions",
    "recovery_days",
)


def generate_polycrisis(config: Mapping[str, object], protocol: str, run: int) -> dict[str, float]:
    """Generate one exogenous world shared by all governance rivals."""
    rng = random.Random(f"{config['seed']}:{protocol}:{run}")
    spec = config["protocols"][protocol]
    return {
        key: clamp(float(value) * rng.triangular(0.82, 1.18, 1.0), 0.0, 0.98)
        for key, value in spec.items()
    }


def simulate_p005_once(
    config: Mapping[str, object], protocol: str, mode_name: str, run: int
) -> dict[str, float]:
    mode = config["modes"][mode_name]
    validate_budget(mode)
    world = generate_polycrisis(config, protocol, run)
    rng = random.Random(f"{config['seed']}:{protocol}:{run}:response:{mode_name}")
    budget = mode["budget"]

    continuity = capability(float(budget["continuity"]))
    rights = capability(float(budget["rights"]))
    trace = capability(float(budget["trace"]))
    recovery = capability(float(budget["recovery"]))
    coordination = capability(float(budget["coordination"]))
    independence = capability(float(budget["independence"]))
    complexity = float(mode["complexity"])
    load_shedding = float(mode["load_shedding"])
    protected_core = float(mode["protected_core"])
    concentration = float(mode["concentration"])
    cross_map = float(mode["cross_sector_map"])

    compound = (
        world["energy_loss"] * world["communications_loss"]
        + world["appeal_surge"] * world["security_pressure"]
        + world["transition_collision"] * world["energy_loss"]
    ) / 3.0
    raw_load = (
        0.26 * world["energy_loss"]
        + 0.18 * world["communications_loss"]
        + 0.18 * world["appeal_surge"]
        + 0.18 * world["security_pressure"]
        + 0.20 * world["transition_collision"]
        + 0.42 * compound
    )
    institutional_capacity = 0.38 + 0.44 * coordination + 0.24 * load_shedding
    overload = max(0.0, raw_load * (0.72 + complexity) - institutional_capacity)
    shared_cause = compound * (1 - 0.55 * independence - 0.35 * cross_map)
    common_failure_rate = clamp(shared_cause + 0.24 * overload, 0.0, 1.0)

    core_preservation = protected_core * (0.68 + 0.32 * load_shedding)
    vital_unmet = 100 * clamp(
        0.46 * world["energy_loss"] + 0.20 * world["communications_loss"]
        + 0.24 * world["transition_collision"] + 0.52 * overload
        + 0.36 * common_failure_rate - 0.50 * continuity - 0.12 * coordination
        - 0.10 * core_preservation + rng.gauss(0, 0.018),
        0.0, 1.0,
    )
    eco_overshoot = 100 * clamp(
        0.23 * world["transition_collision"] + 0.14 * world["energy_loss"]
        + 0.22 * overload - 0.26 * trace - 0.13 * coordination
        - 0.08 * core_preservation + rng.gauss(0, 0.012),
        0.0, 1.0,
    )
    rights_suspended = 100 * clamp(
        0.34 * world["security_pressure"] * concentration
        + 0.18 * world["appeal_surge"] + 0.34 * overload
        - 0.42 * rights - 0.12 * core_preservation + rng.gauss(0, 0.014),
        0.0, 1.0,
    )
    untraced_decisions = 100 * clamp(
        0.28 * world["communications_loss"] + 0.22 * world["security_pressure"]
        + 0.31 * overload - 0.44 * trace - 0.10 * cross_map
        - 0.08 * core_preservation + rng.gauss(0, 0.014),
        0.0, 1.0,
    )
    recovery_days = max(
        0.0,
        5.0 + 34 * raw_load + 24 * common_failure_rate + 20 * overload
        - 24 * recovery - 9 * independence - 7 * cross_map + rng.gauss(0, 1.2),
    )
    administrative_load = max(
        0.0,
        38 + 82 * complexity + 72 * raw_load + 105 * overload
        - 50 * load_shedding + rng.gauss(0, 3.0),
    )
    displaced_loss = 100 * clamp(
        0.18 * world["transition_collision"] + 0.14 * overload
        + 0.12 * concentration - 0.16 * trace - 0.12 * rights,
        0.0, 1.0,
    )
    power_concentration = 100 * concentration * (1 + 0.35 * world["security_pressure"])

    gates = config["gates"]
    gate_failures = sum((
        vital_unmet > float(gates["vital_unmet_max"]),
        eco_overshoot > float(gates["eco_overshoot_max"]),
        rights_suspended > float(gates["rights_suspended_max"]),
        untraced_decisions > float(gates["untraced_decisions_max"]),
        recovery_days > float(gates["recovery_days_max"]),
        common_failure_rate > float(gates["common_failure_max"]),
    ))
    return {
        "vital_unmet": vital_unmet,
        "eco_overshoot": eco_overshoot,
        "rights_suspended": rights_suspended,
        "untraced_decisions": untraced_decisions,
        "recovery_days": recovery_days,
        "administrative_load": administrative_load,
        "displaced_loss": displaced_loss,
        "power_concentration": power_concentration,
        "common_failure_rate": common_failure_rate,
        "gate_failures": float(gate_failures),
    }
