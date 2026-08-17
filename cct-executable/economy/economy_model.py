"""Jumeau économique minimal pour comparer quatre régimes CCT.

Ce module simule des conséquences *internes aux équations déclarées*. Il ne
prévoit pas une économie réelle et n'identifie aucun effet causal.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path
from typing import Any, Mapping


METRICS = (
    "vital_unmet_pct",
    "eco_overshoot_pct",
    "inequality_gini",
    "admin_load_hours_per_1000",
    "rent_capture_pct",
    "recovery_days",
)

PARAMETERS = (
    "need_priority",
    "eco_enforcement",
    "redistribution",
    "coordination_capacity",
    "decentralization",
    "price_signal",
    "public_ownership",
    "anti_rent",
    "reserve_depth",
    "adaptive_slack",
    "admin_complexity",
    "participation_intensity",
)


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def load_config(path: str | Path) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as handle:
        config = json.load(handle)
    validate_config(config)
    return config


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_config(config: Mapping[str, Any]) -> None:
    """Refuse les comparaisons non appariées ou incomplètes."""
    regimes = config.get("regimes", {})
    scenarios = config.get("scenarios", {})
    budget = config.get("information_budget", {})
    metrics = config.get("metrics", {})
    gates = config.get("gates", {})

    if not 3 <= len(regimes) <= 4:
        raise ValueError("la comparaison doit contenir trois ou quatre régimes")
    if len(scenarios) < 3:
        raise ValueError("au moins trois scènes sont requises")
    if tuple(metrics) != METRICS or tuple(gates) != METRICS:
        raise ValueError("les six métriques et portes doivent être ordonnées et complètes")

    declared_parameters = tuple(budget.get("free_parameter_names", ()))
    if declared_parameters != PARAMETERS:
        raise ValueError("le budget de paramètres déclaré ne correspond pas au modèle")
    if budget.get("free_parameters_per_regime") != len(PARAMETERS):
        raise ValueError("le nombre de paramètres libres n'est pas apparié")
    if not budget.get("common_random_numbers"):
        raise ValueError("les candidats doivent recevoir les mêmes tirages")

    observed = tuple(budget.get("shared_observed_inputs", ()))
    if len(observed) != len(set(observed)) or not observed:
        raise ValueError("les entrées observées doivent être explicites et uniques")
    for scenario_id, scenario in scenarios.items():
        inputs = scenario.get("inputs", {})
        if tuple(inputs) != observed:
            raise ValueError(f"budget d'information non apparié dans {scenario_id}")
        if any(not _is_number(value) or not 0 <= value <= 1 for value in inputs.values()):
            raise ValueError(f"entrée hors domaine dans {scenario_id}")

    for regime_id, regime in regimes.items():
        parameters = regime.get("parameters", {})
        if tuple(parameters) != PARAMETERS:
            raise ValueError(f"paramètres non appariés dans {regime_id}")
        if any(not _is_number(value) or not 0 <= value <= 1 for value in parameters.values()):
            raise ValueError(f"paramètre hors domaine dans {regime_id}")
        for required in ("claim", "mechanism", "prediction", "failure_outcome"):
            if not regime.get(required):
                raise ValueError(f"{regime_id} n'a pas de champ {required}")
        prediction = regime["prediction"]
        if not prediction.get("scenarios") or not prediction.get("limits"):
            raise ValueError(f"{regime_id} n'a pas de prédiction falsifiable")
        if not set(prediction["scenarios"]).issubset(scenarios):
            raise ValueError(f"{regime_id} cite une scène absente")
        if not set(prediction["limits"]).issubset(METRICS):
            raise ValueError(f"{regime_id} cite une métrique absente")

    if config.get("runs_per_scenario", 0) < 20:
        raise ValueError("au moins vingt répétitions sont requises")
    if set(config.get("loss_rules", {})) != {
        "constitutional_gate_loss",
        "pareto_loss",
        "claim_loss",
    }:
        raise ValueError("les trois règles de perte doivent être préspécifiées")


def generate_world(config: Mapping[str, Any], scenario_id: str, run: int) -> dict[str, float]:
    """Produit le monde exogène commun à tous les régimes d'une répétition."""
    base = config["scenarios"][scenario_id]["inputs"]
    rng = random.Random(f"{config['seed']}:{scenario_id}:{run}:world")
    world: dict[str, float] = {}
    for key, value in base.items():
        centre = float(value)
        spread = 0.025 + 0.025 * centre
        world[key] = rng.triangular(
            max(0.0, centre - spread), min(1.0, centre + spread), centre
        )
    return world


def generate_common_noise(
    config: Mapping[str, Any], scenario_id: str, run: int
) -> dict[str, float]:
    """Perturbations non observées, identiques pour chaque candidat."""
    rng = random.Random(f"{config['seed']}:{scenario_id}:{run}:outcome")
    return {
        "vital": rng.gauss(0.0, 0.010),
        "eco": rng.gauss(0.0, 0.009),
        "inequality": rng.gauss(0.0, 0.0025),
        "admin": rng.gauss(0.0, 3.2),
        "rent": rng.gauss(0.0, 0.004),
        "recovery": rng.gauss(0.0, 1.1),
    }


def gini(values: list[float]) -> float:
    """Coefficient de Gini non pondéré pour cinq groupes de taille égale."""
    if not values or any(value < 0 for value in values):
        raise ValueError("le Gini exige des ressources positives")
    total = sum(values)
    if total == 0:
        return 0.0
    ordered = sorted(values)
    weighted = sum((index + 1) * value for index, value in enumerate(ordered))
    count = len(ordered)
    return clamp((2 * weighted) / (count * total) - (count + 1) / count)


def simulate_once(
    config: Mapping[str, Any], scenario_id: str, regime_id: str, run: int
) -> dict[str, float]:
    """Exécute un régime sur un monde partagé, sans accès aux résultats rivaux."""
    world = generate_world(config, scenario_id, run)
    noise = generate_common_noise(config, scenario_id, run)
    p = config["regimes"][regime_id]["parameters"]

    production = world["production_capacity"]
    eco_pressure = world["ecological_pressure"]
    demand = world["essential_demand"]
    logistics = world["logistics_loss"]
    coordination_noise = world["coordination_noise"]
    market_power = world["market_power"]
    damage = world["recovery_damage"]
    civic = world["civic_capacity"]

    effective_supply = (
        production * (1.0 - 0.46 * logistics)
        + 0.16 * p["reserve_depth"] * (1.0 - 0.45 * logistics)
        + 0.10 * p["adaptive_slack"] * civic
        + 0.07 * p["decentralization"] * civic * (1.0 - coordination_noise)
        + 0.04 * p["public_ownership"]
    )
    required_supply = demand * (0.90 + 0.10 * damage)
    allocation_to_vital = clamp(
        0.72
        + 0.16 * p["need_priority"]
        + 0.07 * p["redistribution"]
        - 0.05 * coordination_noise * (1.0 - p["coordination_capacity"]),
        0.0,
        1.0,
    )
    raw_shortfall = max(0.0, required_supply - effective_supply * allocation_to_vital)
    mitigation = clamp(
        0.22 * p["need_priority"]
        + 0.10 * p["redistribution"]
        + 0.08 * p["coordination_capacity"] * (1.0 - coordination_noise),
        0.0,
        0.65,
    )
    vital_unmet = 100.0 * clamp(raw_shortfall * (1.0 - mitigation) + noise["vital"])

    churn = 0.05 * p["price_signal"] * (1.0 - p["eco_enforcement"])
    material_pressure = (
        eco_pressure
        + 0.20 * demand
        + 0.11 * damage
        + 0.08 * logistics
        + churn
    )
    ecological_control = (
        0.34 * p["eco_enforcement"]
        + 0.09 * p["coordination_capacity"] * (1.0 - coordination_noise)
        + 0.07 * p["public_ownership"]
        + 0.08 * p["price_signal"] * p["eco_enforcement"]
        + 0.04 * p["decentralization"] * civic
    )
    eco_overshoot = 100.0 * clamp(
        material_pressure - 0.60 - ecological_control + noise["eco"]
    )

    scarcity = clamp(
        demand - production * (1.0 - 0.35 * logistics) + 0.10 * logistics
    )
    raw_rent = 0.05 + 0.28 * market_power + 0.18 * scarcity + 0.08 * p["price_signal"]
    rent_fraction = clamp(
        raw_rent
        * (1.0 - 0.82 * p["anti_rent"])
        * (1.0 - 0.50 * p["public_ownership"])
        + 0.04 * coordination_noise * (1.0 - p["public_ownership"])
        + noise["rent"]
    )
    rent_capture = 100.0 * rent_fraction

    base_resources = [0.35, 0.55, 0.80, 1.15, 2.15]
    equalization = clamp(
        0.48 * p["redistribution"]
        + 0.22 * p["public_ownership"]
        + 0.12 * p["need_priority"],
        0.0,
        0.90,
    )
    resources = [
        1.0 + (value - 1.0) * (1.0 - 0.72 * equalization)
        for value in base_resources
    ]
    resources[-1] += 2.0 * rent_fraction
    for index in range(4):
        resources[index] = max(0.01, resources[index] - 0.5 * rent_fraction)
    burden = 0.10 * scarcity * (1.0 - p["need_priority"])
    resources[0] = max(0.01, resources[0] - burden)
    resources[-1] += burden
    inequality = clamp(gini(resources) + noise["inequality"])

    shock_load = 0.45 * logistics + 0.40 * coordination_noise + 0.25 * damage
    admin_load = max(
        0.0,
        28.0
        + 78.0 * p["admin_complexity"]
        + 48.0 * p["participation_intensity"]
        + 32.0 * p["coordination_capacity"]
        + 70.0 * shock_load * (0.55 + 0.45 * p["decentralization"])
        + 25.0 * p["eco_enforcement"]
        - 45.0 * p["price_signal"]
        - 18.0 * p["adaptive_slack"]
        + noise["admin"],
    )

    recovery = max(
        0.0,
        4.0
        + 74.0 * damage
        + 32.0 * logistics
        + 22.0 * coordination_noise
        + 12.0 * market_power * (1.0 - p["anti_rent"])
        - 28.0 * p["reserve_depth"]
        - 20.0 * p["adaptive_slack"]
        - 15.0 * p["decentralization"] * civic
        - 12.0 * p["coordination_capacity"] * (1.0 - coordination_noise)
        - 8.0 * p["public_ownership"]
        + noise["recovery"],
    )

    result = {
        "vital_unmet_pct": vital_unmet,
        "eco_overshoot_pct": eco_overshoot,
        "inequality_gini": inequality,
        "admin_load_hours_per_1000": admin_load,
        "rent_capture_pct": rent_capture,
        "recovery_days": recovery,
    }
    if not all(math.isfinite(value) for value in result.values()):
        raise ValueError("le simulateur a produit une valeur non finie")
    return result


def dominates(left: Mapping[str, float], right: Mapping[str, float]) -> bool:
    """Dominance de Pareto stricte sur le vecteur brut, sans agrégation."""
    return all(left[key] <= right[key] for key in METRICS) and any(
        left[key] < right[key] for key in METRICS
    )

