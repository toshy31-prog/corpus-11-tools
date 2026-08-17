"""Synthetic institutional stress model for the CCT comparison.

The equations are explicit hypotheses, not empirical estimates. Every trait is
sampled with uncertainty and all output metrics remain independently visible.
"""

from __future__ import annotations

from dataclasses import dataclass
import random
from typing import Callable, Mapping


CORE_METRICS = ("needs", "ecology", "rights", "democracy", "recovery")
DIAGNOSTICS = ("administrative_burden", "capture", "coercive_concentration")


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def mean(*values: float) -> float:
    return sum(values) / len(values)


def sample_probability(rng: random.Random, center: float, concentration: float) -> float:
    """Sample a bounded trait around a declared center with a beta distribution."""
    center = max(0.01, min(0.99, center))
    alpha = center * concentration
    beta = (1.0 - center) * concentration
    return rng.betavariate(alpha, beta)


@dataclass(frozen=True)
class RunResult:
    architecture: str
    scenario: str
    protocol: str
    run: int
    metrics: Mapping[str, float]


def adjusted_centers(
    architecture: str,
    centers: Mapping[str, float],
    cct_penalty: float,
    rival_bonus: float,
) -> dict[str, float]:
    delta = -cct_penalty if architecture == "cct_v08" else rival_bonus
    return {key: max(0.02, min(0.98, value + delta)) for key, value in centers.items()}


def sampled_traits(
    rng: random.Random, centers: Mapping[str, float], concentration: float
) -> dict[str, float]:
    return {
        key: sample_probability(rng, value, concentration)
        for key, value in centers.items()
    }


def jittered_severity(rng: random.Random, center: float, shock_delta: float) -> float:
    shifted = max(0.05, min(0.98, center + shock_delta))
    return max(0.02, min(1.0, rng.triangular(shifted - 0.10, shifted + 0.10, shifted)))


def finalize(
    needs: float,
    ecology: float,
    rights: float,
    democracy: float,
    recovery: float,
    burden: float,
    capture: float,
    coercion: float,
    rng: random.Random,
) -> dict[str, float]:
    # Shared observation noise prevents false precision without changing structure.
    noise = lambda: rng.gauss(0.0, 2.2)
    return {
        "needs": clamp(needs + noise()),
        "ecology": clamp(ecology + noise()),
        "rights": clamp(rights + noise()),
        "democracy": clamp(democracy + noise()),
        "recovery": clamp(recovery + noise()),
        "administrative_burden": clamp(burden + noise()),
        "capture": clamp(capture + noise()),
        "coercive_concentration": clamp(coercion + noise()),
    }


def water_coordination(t: Mapping[str, float], s: float, rng: random.Random) -> dict[str, float]:
    coordination = mean(t["decision_speed"], t["competence_clarity"], t["planning_adaptivity"])
    legitimacy = mean(t["accountability"], t["participation_access"], t["rights_portability"])
    delay = 72 * s * (1 - coordination) * (1.15 - 0.25 * t["interface_simplicity"])
    emergency_abuse = 48 * s * t["decision_speed"] * (1 - t["accountability"])
    return finalize(
        100 - delay + 10 * t["reserve_capacity"],
        100 - 52 * s * (1 - t["ecological_enforcement"]) - 0.18 * delay,
        100 - emergency_abuse - 22 * s * (1 - t["rights_portability"]),
        100 - emergency_abuse - 20 * s * (1 - legitimacy),
        100 - 58 * s * (1 - mean(t["reserve_capacity"], t["rollback_capacity"], coordination)),
        100 * (1 - mean(t["interface_simplicity"], t["competence_clarity"])),
        45 * s * (1 - t["accountability"]),
        emergency_abuse,
        rng,
    )


def administrative_capture(t: Mapping[str, float], s: float, rng: random.Random) -> dict[str, float]:
    contestability = mean(t["counter_expertise"], t["audit_independence"], t["accountability"])
    capture = 86 * s * (1 - contestability) * (1.15 - 0.30 * t["monopoly_controls"])
    obscurity = 62 * s * (1 - mean(t["interface_simplicity"], t["competence_clarity"]))
    return finalize(
        100 - 0.34 * capture - 0.18 * obscurity,
        100 - 0.28 * capture - 34 * s * (1 - t["ecological_enforcement"]),
        100 - 0.55 * capture - 0.20 * obscurity,
        100 - 0.72 * capture - 0.24 * obscurity,
        100 - 0.42 * capture + 22 * t["rollback_capacity"],
        obscurity,
        capture,
        36 * s * (1 - t["accountability"]),
        rng,
    )


def planning_gaming(t: Mapping[str, float], s: float, rng: random.Random) -> dict[str, float]:
    adaptive_capacity = mean(
        t["planning_adaptivity"],
        t["discovery_diversity"],
        t["reserve_capacity"],
        t["audit_independence"],
    )
    gaming = 72 * s * (1 - t["audit_independence"]) * (1.10 - 0.35 * t["planning_adaptivity"])
    shortage = 78 * s * (1 - adaptive_capacity) + 0.34 * gaming
    ecological_leak = 60 * s * (1 - t["ecological_enforcement"]) * (
        1.12 - 0.32 * t["monopoly_controls"]
    )
    rationing_inequality = 36 * s * t["discovery_diversity"] * (1 - t["rights_portability"])
    return finalize(
        100 - shortage - rationing_inequality,
        100 - ecological_leak - 0.18 * gaming,
        100 - rationing_inequality - 0.20 * shortage,
        100 - 0.35 * gaming - 24 * s * (1 - t["accountability"]),
        100 - 68 * s * (1 - mean(t["reserve_capacity"], t["redundancy"], t["planning_adaptivity"])),
        52 * s * (1 - t["interface_simplicity"]) + 0.20 * gaming,
        gaming,
        22 * s * (1 - t["accountability"]),
        rng,
    )


def local_tyranny(t: Mapping[str, float], s: float, rng: random.Random) -> dict[str, float]:
    local_oppression = 92 * s * t["local_autonomy"] * (
        1 - mean(t["rights_portability"], t["accountability"], t["audit_independence"])
    )
    central_intrusion = 44 * s * (1 - t["local_autonomy"]) * (1 - t["accountability"])
    recourse = mean(t["rights_portability"], t["interface_simplicity"], t["rollback_capacity"])
    return finalize(
        100 - 0.24 * local_oppression - 0.18 * central_intrusion,
        100 - 26 * s * (1 - t["ecological_enforcement"]),
        100 - local_oppression - central_intrusion,
        100 - 0.68 * local_oppression - 0.72 * central_intrusion,
        100 - 66 * s * (1 - recourse),
        48 * s * (1 - t["interface_simplicity"]),
        local_oppression,
        central_intrusion,
        rng,
    )


def external_attack(t: Mapping[str, float], s: float, rng: random.Random) -> dict[str, float]:
    defense = mean(t["defense_coordination"], t["redundancy"], t["reserve_capacity"])
    security_loss = 88 * s * (1 - defense)
    authoritarian_drift = 76 * s * t["defense_coordination"] * (1 - t["coercive_checks"])
    recovery_capacity = mean(t["rollback_capacity"], t["redundancy"], t["coercive_checks"])
    return finalize(
        100 - security_loss - 0.24 * authoritarian_drift,
        100 - 0.26 * security_loss - 28 * s * (1 - t["ecological_enforcement"]),
        100 - authoritarian_drift - 0.24 * security_loss,
        100 - 0.92 * authoritarian_drift - 20 * s * (1 - t["accountability"]),
        100 - 74 * s * (1 - recovery_capacity),
        40 * s * (1 - t["competence_clarity"]),
        38 * s * (1 - t["audit_independence"]),
        authoritarian_drift,
        rng,
    )


def transition_sabotage(t: Mapping[str, float], s: float, rng: random.Random) -> dict[str, float]:
    continuity = mean(t["transition_readiness"], t["redundancy"], t["reserve_capacity"])
    capital_shock = 64 * s * (1 - t["capital_flight_control"])
    supply_shock = 82 * s * (1 - continuity)
    control_abuse = 48 * s * t["capital_flight_control"] * (1 - t["accountability"])
    return finalize(
        100 - supply_shock - 0.48 * capital_shock,
        100 - 48 * s * (1 - t["ecological_enforcement"]) - 0.16 * supply_shock,
        100 - control_abuse - 0.22 * supply_shock,
        100 - control_abuse - 26 * s * (1 - t["participation_access"]),
        100 - 78 * s * (1 - mean(continuity, t["rollback_capacity"])),
        52 * s * (1 - t["competence_clarity"]),
        44 * s * (1 - t["monopoly_controls"]) + 0.22 * capital_shock,
        control_abuse,
        rng,
    )


def institutional_complexity(t: Mapping[str, float], s: float, rng: random.Random) -> dict[str, float]:
    usability = mean(t["interface_simplicity"], t["competence_clarity"], t["participation_access"])
    burden = 94 * s * (1 - usability) * (1.16 - 0.22 * t["decision_speed"])
    professional_capture = 64 * s * (1 - mean(t["counter_expertise"], usability))
    return finalize(
        100 - 0.42 * burden,
        100 - 24 * s * (1 - t["ecological_enforcement"]) - 0.14 * burden,
        100 - 0.62 * burden - 0.26 * professional_capture,
        100 - 0.72 * burden - 0.38 * professional_capture,
        100 - 0.46 * burden + 20 * t["rollback_capacity"],
        burden,
        professional_capture,
        26 * s * (1 - t["accountability"]),
        rng,
    )


SCENARIO_FUNCTIONS: Mapping[str, Callable[[Mapping[str, float], float, random.Random], dict[str, float]]] = {
    "water_coordination": water_coordination,
    "administrative_capture": administrative_capture,
    "planning_gaming": planning_gaming,
    "local_tyranny": local_tyranny,
    "external_attack": external_attack,
    "transition_sabotage": transition_sabotage,
    "institutional_complexity": institutional_complexity,
}


def simulate_once(
    architecture: str,
    centers: Mapping[str, float],
    scenario: str,
    severity: float,
    protocol: str,
    protocol_config: Mapping[str, float],
    run: int,
    seed: int,
) -> RunResult:
    rng = random.Random(f"{seed}:{protocol}:{scenario}:{architecture}:{run}")
    adjusted = adjusted_centers(
        architecture,
        centers,
        float(protocol_config["cct_penalty"]),
        float(protocol_config["rival_bonus"]),
    )
    traits = sampled_traits(rng, adjusted, float(protocol_config["trait_concentration"]))
    shock = jittered_severity(rng, severity, float(protocol_config["shock_delta"]))
    metrics = SCENARIO_FUNCTIONS[scenario](traits, shock, rng)
    return RunResult(architecture, scenario, protocol, run, metrics)
