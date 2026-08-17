"""Discrete-day synthetic twin for prototype P-001.

All governance modes receive the same unit budget and allocate it differently.
Outputs separate continuity, speed, rights burden, concentration, and rollback.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from pathlib import Path
import random
import sys
from typing import Mapping


for _parent in Path(__file__).resolve().parents:
    _labs = _parent / "corpus-11-tools" / "labs" / "python"
    if _labs.is_dir():
        sys.path.insert(0, str(_labs))
        break
else:  # pragma: no cover - repository layout failure
    raise RuntimeError("Corpus generic labs are unavailable")

from corpus_labs import common_random, validate_budget as validate_matched_budget


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def capability(allocation: float, penalty: float = 0.0) -> float:
    """Diminishing-return conversion from budget share to usable capacity."""
    return max(0.02, min(0.98, 1.0 - math.exp(-4.0 * max(0.0, allocation - penalty))))


@dataclass(frozen=True)
class Shock:
    resource: str
    day: int
    severity: float


@dataclass(frozen=True)
class P001Result:
    protocol: str
    mode: str
    run: int
    metrics: Mapping[str, float]


def generate_shocks(
    rng: random.Random,
    resources: Mapping[str, Mapping[str, float]],
    count: int,
    severity_delta: float,
) -> list[Shock]:
    names = list(resources)
    shocks = []
    for index in range(count):
        resource = rng.choice(names)
        # Some shocks overlap; later ones can strike during recovery.
        day = rng.randint(4, 10 + 3 * index)
        severity = max(0.30, min(0.98, rng.triangular(0.45, 0.92, 0.70) + severity_delta))
        shocks.append(Shock(resource, day, severity))
    return sorted(shocks, key=lambda item: item.day)


def validate_budget(mode: Mapping[str, object]) -> None:
    validate_matched_budget(mode["budget"])


def simulate_p001_once(
    config: Mapping[str, object], protocol: str, mode_name: str, run: int
) -> P001Result:
    protocol_config = config["protocols"][protocol]
    mode = config["modes"][mode_name]
    validate_budget(mode)
    # Common random numbers: rival modes in the same protocol/run face the
    # same exogenous scenario. Governance changes only the response.
    rng = common_random(config["seed"], protocol, run)
    resources = config["service"]["resources"]
    horizon = int(config["horizon_days"])
    gate_exposure = float(mode.get("gate_exposure", 1.0 if mode_name == "capacity_gate" else 0.0))
    gate_penalty = float(protocol_config["gate_penalty"]) * gate_exposure

    budget = mode["budget"]
    mapping = capability(float(budget["mapping"]), gate_penalty)
    stocks = capability(float(budget["stocks"]), gate_penalty * 0.5)
    substitution = capability(float(budget["substitution"]), gate_penalty)
    speed = capability(float(budget["speed"]), gate_penalty * 0.5)
    rights = capability(float(budget["rights"]), gate_penalty * 0.5)
    rollback = capability(float(budget["rollback"]), gate_penalty)
    coordination = float(mode["coordination_bonus"])
    concentration = float(mode["concentration"])

    shocks = generate_shocks(
        rng,
        resources,
        int(protocol_config["shock_count"]),
        float(protocol_config["severity_delta"]),
    )

    # Each event becomes a degradation interval after detection and action delays.
    intervals: dict[str, list[tuple[int, int, float]]] = {name: [] for name in resources}
    detected = 0
    hidden = 0
    decision_delays: list[float] = []
    last_recovery = 0
    for shock in shocks:
        spec = resources[shock.resource]
        detection_noise = rng.uniform(0.75, 1.25)
        detection_delay = max(0.0, 4.5 * shock.severity * (1 - mapping) * detection_noise)
        if rng.random() < mapping:
            detected += 1
        else:
            hidden += 1
            detection_delay += rng.uniform(1.5, 4.0)

        simultaneous = sum(1 for other in shocks if abs(other.day - shock.day) <= 2)
        decision_delay = max(
            0.15,
            3.8 * (1 - speed) * (1 - coordination * min(1.0, simultaneous / 3.0))
            * rng.uniform(0.8, 1.2),
        )
        decision_delays.append(decision_delay)

        base_lead = float(spec["base_restore_days"]) * float(protocol_config["lead_multiplier"])
        restore_duration = base_lead * (1 - 0.72 * substitution) * rng.uniform(0.82, 1.22)
        stock_cover = 0.0
        if bool(spec["stockable"]):
            stock_cover = 8.0 * stocks * rng.uniform(0.75, 1.25)

        start = shock.day + int(round(max(0.0, stock_cover - detection_delay)))
        end = int(math.ceil(shock.day + detection_delay + decision_delay + restore_duration))
        end = max(start + 1, end)
        residual = shock.severity * (1 - 0.22 * substitution)
        intervals[shock.resource].append((start, end, residual))
        last_recovery = max(last_recovery, end)

    daily_service: list[float] = []
    daily_rights: list[float] = []
    for day in range(horizon):
        loss = 0.0
        active_events = 0
        for name, spec in resources.items():
            resource_loss = 0.0
            for start, end, residual in intervals[name]:
                if start <= day < end:
                    resource_loss = max(resource_loss, residual)
                    active_events += 1
            loss += 100 * float(spec["weight"]) * resource_loss
        # Coordination helps under concurrency but never removes the underlying loss.
        loss *= 1 - coordination * min(0.30, active_events * 0.05)
        service = clamp(100 - loss)
        daily_service.append(service)
        extraordinary = min(1.0, active_events / 3.0)
        daily_rights.append(100 * extraordinary * concentration * (1 - rights))

    first_shock = min(shock.day for shock in shocks)
    time_to_safe = float(horizon - first_shock)
    for day in range(first_shock, horizon - 2):
        if min(daily_service[day : day + 3]) >= 90.0:
            time_to_safe = float(day - first_shock)
            break

    rollback_days = max(0.0, 12.0 * concentration * (1 - rollback) * rng.uniform(0.8, 1.2))
    # If recovery extends beyond the horizon, rollback cannot yet be called complete.
    if last_recovery >= horizon:
        rollback_days += last_recovery - horizon + 1

    metrics = {
        "mean_service": sum(daily_service) / len(daily_service),
        "worst_service": min(daily_service),
        "unserved_need": sum(100 - value for value in daily_service),
        "time_to_safe": time_to_safe,
        "rights_burden": sum(daily_rights) / len(daily_rights),
        "power_concentration": 100 * concentration,
        "rollback_days": rollback_days,
        "dependency_detection_rate": detected / len(shocks),
        "hidden_dependencies": float(hidden),
        "decision_delay": sum(decision_delays) / len(decision_delays),
    }
    return P001Result(protocol, mode_name, run, metrics)
