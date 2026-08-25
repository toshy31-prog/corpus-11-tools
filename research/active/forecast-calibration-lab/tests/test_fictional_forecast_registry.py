#!/usr/bin/env python3
"""Exact dated fictional registry with a code-separated, co-designed outcome schedule."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from fractions import Fraction


RIVALS = {
    "stratified": {"low": Fraction(1, 5), "high": Fraction(4, 5)},
    "base_rate": {"low": Fraction(1, 2), "high": Fraction(1, 2)},
    "overconfident": {"low": Fraction(1, 20), "high": Fraction(19, 20)},
}


def generated_registry() -> list[dict[str, object]]:
    registry = []
    start = date(2026, 1, 1)
    for index in range(20):
        stratum = "low" if index % 2 == 0 else "high"
        within_stratum = index // 2
        outcome = int(within_stratum in {1, 7}) if stratum == "low" else int(within_stratum not in {1, 7})
        issued = start + timedelta(days=index)
        registry.append(
            {
                "id": f"fictional-f{index:02d}",
                "issued": issued,
                "outcome_date": issued + timedelta(days=30),
                "stratum": stratum,
                "outcome": outcome,
            }
        )
    return registry


def decomposition(registry: list[dict[str, object]], forecasts: dict[str, Fraction]) -> dict[str, Fraction]:
    observations = [row["outcome"] for row in registry]
    overall = Fraction(sum(observations), len(observations))
    bins: dict[Fraction, list[int]] = defaultdict(list)
    score = Fraction(0)
    for row in registry:
        probability = forecasts[row["stratum"]]
        bins[probability].append(row["outcome"])
        score += (probability - row["outcome"]) ** 2
    score /= len(registry)
    reliability = Fraction(0)
    resolution = Fraction(0)
    for probability, outcomes in bins.items():
        weight = Fraction(len(outcomes), len(registry))
        observed = Fraction(sum(outcomes), len(outcomes))
        reliability += weight * (probability - observed) ** 2
        resolution += weight * (observed - overall) ** 2
    uncertainty = overall * (1 - overall)
    assert score == reliability - resolution + uncertainty
    return {"brier": score, "reliability": reliability, "resolution": resolution, "uncertainty": uncertainty}


def main() -> None:
    registry = generated_registry()
    assert len(registry) == 20
    assert all(row["issued"] < row["outcome_date"] for row in registry)
    assert [row["issued"] for row in registry] == sorted(row["issued"] for row in registry)
    assert sum(row["outcome"] for row in registry if row["stratum"] == "low") == 2
    assert sum(row["outcome"] for row in registry if row["stratum"] == "high") == 8

    results = {name: decomposition(registry, forecasts) for name, forecasts in RIVALS.items()}
    assert results["stratified"] == {
        "brier": Fraction(4, 25),
        "reliability": 0,
        "resolution": Fraction(9, 100),
        "uncertainty": Fraction(1, 4),
    }
    assert results["base_rate"]["brier"] == Fraction(1, 4)
    assert results["overconfident"]["brier"] == Fraction(73, 400)
    assert results["stratified"]["brier"] < results["overconfident"]["brier"] < results["base_rate"]["brier"]
    print("PASS fictional forecasts: 20 dated cases, exact decomposition, 3 rivals discriminated")


if __name__ == "__main__":
    main()
