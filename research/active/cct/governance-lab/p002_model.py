"""Synthetic allocation twin for P-002, with common worlds across rivals."""

from __future__ import annotations

import math
import random
from typing import Mapping

from p001_model import capability, validate_budget


def weighted_allocate(demand: list[float], weights: list[float], available: float) -> list[float]:
    allocation = [0.0] * len(demand)
    remaining = max(0.0, available)
    active = set(range(len(demand)))
    for _ in range(len(demand) + 1):
        if not active or remaining <= 1e-9:
            break
        denominator = sum(weights[i] * max(demand[i] - allocation[i], 0.0) for i in active)
        if denominator <= 1e-12:
            break
        saturated = []
        for i in active:
            room = demand[i] - allocation[i]
            share = remaining * weights[i] * room / denominator
            used = min(room, share)
            allocation[i] += used
            if room - used <= 1e-9:
                saturated.append(i)
        used_total = sum(allocation)
        remaining = max(0.0, available - used_total)
        if not saturated:
            break
        active.difference_update(saturated)
    return allocation


def generate_world(config: Mapping[str, object], protocol: str, run: int) -> list[dict[str, object]]:
    rng = random.Random(f"{config['seed']}:{protocol}:{run}")
    p = config["protocols"][protocol]
    groups = config["groups"]
    shock_start = rng.randint(7, 11)
    shock_length = rng.randint(4, 7)
    world = []
    for week in range(int(config["horizon_weeks"])):
        seasonal = 1.0 + 0.08 * math.sin(2 * math.pi * week / 13)
        demands = []
        report_noise = []
        for group in groups.values():
            noise = rng.gauss(0.0, float(p["volatility"]))
            demands.append(max(2.0, float(group["demand"]) * seasonal * (1 + noise)))
            report_noise.append(rng.gauss(0.0, 0.04))
        shock = float(p["supply_shock"]) if shock_start <= week < shock_start + shock_length else 0.0
        supply = max(42.0, 104.0 * (1 - shock) * (1 + rng.gauss(0.0, 0.035)))
        world.append({"demands": demands, "report_noise": report_noise, "supply": supply, "shock_start": shock_start})
    return world


def recovery_weeks(unmet: list[float], shock_start: int) -> float:
    baseline = sum(unmet[max(0, shock_start - 4):shock_start]) / max(1, min(4, shock_start))
    for week in range(shock_start, len(unmet) - 1):
        if max(unmet[week:week + 2]) <= baseline + 5.0:
            return float(week - shock_start)
    return float(len(unmet) - shock_start)


def simulate_p002_once(config: Mapping[str, object], protocol: str, mode_name: str, run: int) -> dict[str, float]:
    mode = config["modes"][mode_name]
    validate_budget(mode)
    p = config["protocols"][protocol]
    groups = list(config["groups"].values())
    world = generate_world(config, protocol, run)
    budget = mode["budget"]
    forecast = capability(float(budget["forecast"]))
    adaptation = capability(float(budget["adaptation"]))
    audit = capability(float(budget["audit"]))
    reserve_skill = capability(float(budget["reserve"]))
    equity = capability(float(budget["equity"]))
    simplicity = capability(float(budget["simplicity"]))
    reserve = 2.0 + 12.0 * reserve_skill
    cap = float(config["ecological_cap"])
    fixed_shares: list[float] | None = None
    unmet_series: list[float] = []
    totals = {key: 0.0 for key in ("essential_need", "essential_unmet", "low_need", "low_unmet", "need", "unmet", "overshoot", "imports", "rent", "admin", "gaming")}

    for week, state in enumerate(world):
        true = [float(x) for x in state["demands"]]
        reported = []
        claimed_essential = []
        learning = 1.0 + float(p.get("learning_rate", 0.0)) * week / max(1, len(world) - 1)
        audit_effective = audit / learning
        for index, group in enumerate(groups):
            inflation = float(p["gaming"]) * learning * float(group["strategic"]) * float(mode["rule_visibility"]) * (1 - audit_effective)
            noisy = true[index] * (1 + inflation + (1 - forecast) * float(state["report_noise"][index]))
            reported.append(max(0.0, noisy))
            category_boost = inflation if bool(config.get("classification_gaming", False)) else 0.0
            claimed_essential.append(min(1.0, float(group["essential"]) + category_boost))

        if fixed_shares is None:
            total_reported = sum(reported)
            fixed_shares = [value / total_reported for value in reported]
        inertia = float(mode["quota_inertia"])
        if inertia > 0:
            total_reported = sum(reported)
            current = [value / total_reported for value in reported]
            fixed_shares = [inertia * old + (1 - inertia) * adaptation * new + (1 - inertia) * (1 - adaptation) * old for old, new in zip(fixed_shares, current)]
            requested = [share * sum(reported) for share in fixed_shares]
        else:
            requested = reported

        supply = float(state["supply"])
        if supply < cap:
            release = min(reserve, (cap - supply) * reserve_skill)
            reserve -= release
            local_available = supply + release
        else:
            stored = min(max(0.0, supply - cap), 2.5 * reserve_skill)
            reserve += stored
            local_available = supply - stored
        import_gap = max(0.0, sum(true) - local_available)
        imports = import_gap * float(mode["import_flexibility"])
        allowed_footprint = cap * (1 + (1 - float(mode["cap_enforcement"])) * 0.30)
        available = min(local_available + imports, allowed_footprint)

        weights = []
        for index, group in enumerate(groups):
            priority = float(mode["priority_strength"]) * (1.35 * claimed_essential[index] + 0.85 * equity * float(group["low_income"]))
            purchasing = float(group["purchasing_power"]) ** float(mode["price_weight"])
            weights.append(max(0.05, (1 + priority) * purchasing))
        allocation = weighted_allocate(requested, weights, available)

        essential_need = sum(true[i] * float(group["essential"]) for i, group in enumerate(groups))
        essential_served = sum(min(true[i], allocation[i]) * float(group["essential"]) for i, group in enumerate(groups))
        low_need = sum(true[i] for i, group in enumerate(groups) if float(group["low_income"]) > 0)
        low_served = sum(min(true[i], allocation[i]) for i, group in enumerate(groups) if float(group["low_income"]) > 0)
        need = sum(true)
        served = sum(min(true[i], allocation[i]) for i in range(len(groups)))
        weekly_unmet = 100 * (need - served) / need
        unmet_series.append(weekly_unmet)
        allocated_total = sum(allocation)
        imported_used = max(0.0, allocated_total - local_available)
        local_used = min(allocated_total, local_available)
        footprint = local_used + imported_used * float(p["import_impact"])
        scarcity = max(0.0, need / max(1.0, available) - 1)
        gaming_waste = sum(max(0.0, allocation[i] - true[i]) * float(groups[i]["strategic"]) for i in range(len(groups)))

        totals["essential_need"] += essential_need
        totals["essential_unmet"] += essential_need - essential_served
        totals["low_need"] += low_need
        totals["low_unmet"] += low_need - low_served
        totals["need"] += need
        totals["unmet"] += need - served
        totals["overshoot"] += max(0.0, footprint - cap)
        totals["imports"] += imported_used * float(p["import_impact"])
        totals["rent"] += sum(allocation) * float(mode["rent_factor"]) * (1 + 2.5 * scarcity)
        totals["admin"] += 16.0 * (1 - simplicity) + 9.0 * audit + 5.0 * adaptation
        totals["gaming"] += gaming_waste

    horizon = len(world)
    return {
        "essential_unmet": 100 * totals["essential_unmet"] / totals["essential_need"],
        "low_income_unmet": 100 * totals["low_unmet"] / totals["low_need"],
        "overall_unmet": 100 * totals["unmet"] / totals["need"],
        "eco_overshoot": totals["overshoot"] / horizon,
        "imported_harm": totals["imports"] / horizon,
        "rent": totals["rent"] / horizon,
        "admin_hours": totals["admin"] / horizon,
        "gaming_capture": totals["gaming"] / horizon,
        "recovery_weeks": recovery_weeks(unmet_series, int(world[0]["shock_start"])),
    }
