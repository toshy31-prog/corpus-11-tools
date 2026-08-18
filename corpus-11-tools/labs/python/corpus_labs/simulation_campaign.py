"""Domain-neutral primitives for matched simulation campaigns.

This module contains no CCT possibility, political metric, food-access case,
or research conclusion. Research projects provide those through configuration.
"""

from __future__ import annotations

from copy import deepcopy
import math
import random
from statistics import median
from typing import Callable, Mapping, TypeVar, TypedDict


Number = int | float
T = TypeVar("T")
Possibility = TypeVar("Possibility")
Scenario = TypeVar("Scenario")


class PossibilityRunContext(TypedDict):
    """Explicit coordinates available to a research-owned run adapter."""

    seed: object
    possibility_id: str
    scenario_id: str
    repetition: int


class CampaignRunContext(PossibilityRunContext):
    """Compatibility context exposing the former architecture coordinate."""

    architecture_id: str


def common_random(seed: object, *coordinates: object) -> random.Random:
    """Return a deterministic stream shared by possibilities with matched coordinates."""
    key = ":".join(str(value) for value in (seed, *coordinates))
    return random.Random(key)


def validate_budget(
    budget: Mapping[str, Number], *, expected: float = 1.0, tolerance: float = 1e-9
) -> None:
    """Reject a missing, non-numeric, negative, or unmatched resource budget."""
    if not budget:
        raise ValueError("budget must contain at least one allocation")
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in budget.values()):
        raise ValueError("budget allocations must be numeric")
    if any(float(value) < 0 for value in budget.values()):
        raise ValueError("budget allocations cannot be negative")
    total = sum(float(value) for value in budget.values())
    if abs(total - expected) > tolerance:
        raise ValueError(f"budget must sum to {expected}, got {total}")


def pareto_dominates(
    left: Mapping[str, Number],
    right: Mapping[str, Number],
    orientations: Mapping[str, str],
) -> bool:
    """Return strict vector dominance without constructing an aggregate score."""
    if set(left) != set(right) or set(left) != set(orientations):
        raise ValueError("vectors and orientations must declare the same dimensions")
    if any(direction not in {"min", "max"} for direction in orientations.values()):
        raise ValueError("each orientation must be 'min' or 'max'")
    comparisons = [
        (float(left[key]) <= float(right[key]), float(left[key]) < float(right[key]))
        if orientations[key] == "min"
        else (float(left[key]) >= float(right[key]), float(left[key]) > float(right[key]))
        for key in orientations
    ]
    return all(no_worse for no_worse, _ in comparisons) and any(
        strictly_better for _, strictly_better in comparisons
    )


def compare_vectors(
    left: Mapping[str, Number],
    right: Mapping[str, Number],
    orientations: Mapping[str, str],
) -> str:
    """Classify a pair without forcing a total order."""
    if left == right:
        # Preserve the same dimension/orientation validation as every other
        # relation, including when invalid inputs happen to be identical.
        pareto_dominates(left, right, orientations)
        return "equivalent"
    if pareto_dominates(left, right, orientations):
        return "left_bounded_right"
    if pareto_dominates(right, left, orientations):
        return "right_bounded_left"
    return "incomparable"


def pareto_frontier(
    outcomes: Mapping[str, Mapping[str, Number]], orientations: Mapping[str, str]
) -> tuple[list[str], dict[str, list[str]]]:
    """Return the nondominated identifiers and explicit local bounding relations."""
    dominated_by: dict[str, list[str]] = {}
    for candidate_id, candidate in outcomes.items():
        dominators = [
            rival_id
            for rival_id, rival in outcomes.items()
            if rival_id != candidate_id and pareto_dominates(rival, candidate, orientations)
        ]
        if dominators:
            dominated_by[candidate_id] = dominators
    return [candidate_id for candidate_id in outcomes if candidate_id not in dominated_by], dominated_by


def possibility_relations(
    outcomes: Mapping[str, Mapping[str, Number]], orientations: Mapping[str, str]
) -> list[dict[str, str]]:
    """Return every unordered pair and its partial-order relation."""
    identifiers = list(outcomes)
    return [
        {
            "left": left,
            "right": right,
            "relation": compare_vectors(outcomes[left], outcomes[right], orientations),
        }
        for index, left in enumerate(identifiers)
        for right in identifiers[index + 1 :]
    ]


def apply_bounded_changes(
    base: Mapping[str, T], changes: Mapping[str, Number], *, low: float = 0.0, high: float = 1.0
) -> dict[str, T | float]:
    """Copy a parameter map and apply declared additive sensitivity changes."""
    if low > high:
        raise ValueError("low must not exceed high")
    result: dict[str, T | float] = deepcopy(dict(base))
    unknown = set(changes) - set(result)
    if unknown:
        raise ValueError(f"changes cite unknown parameters: {sorted(unknown)}")
    for key, delta in changes.items():
        current = result[key]
        if isinstance(current, bool) or not isinstance(current, (int, float)):
            raise ValueError(f"parameter {key} is not numeric")
        result[key] = max(low, min(high, float(current) + float(delta)))
    return result


def _nearest_rank(values: list[float], percentile: float) -> float:
    """Return an observed percentile using the deterministic nearest-rank rule."""
    if not values:
        raise ValueError("cannot summarize an empty metric series")
    if not 0 < percentile <= 1:
        raise ValueError("percentile must be in (0, 1]")
    ordered = sorted(values)
    return ordered[math.ceil(percentile * len(ordered)) - 1]


def _linear_quantile(values: list[float], fraction: float) -> float:
    if not values:
        raise ValueError("cannot summarize an empty metric series")
    if not 0 <= fraction <= 1:
        raise ValueError("quantile must be in [0, 1]")
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def _quantile(values: list[float], fraction: float, method: str) -> float:
    if method == "nearest_rank":
        return _nearest_rank(values, fraction)
    if method == "linear":
        return _linear_quantile(values, fraction)
    raise ValueError("quantile_method must be 'nearest_rank' or 'linear'")


def _validate_metrics(
    metrics: Mapping[str, Number], expected_dimensions: set[str]
) -> dict[str, float]:
    if set(metrics) != expected_dimensions:
        raise ValueError("every run must return exactly the declared metric dimensions")
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in metrics.values()):
        raise ValueError("run metrics must be numeric")
    normalized = {key: float(value) for key, value in metrics.items()}
    if any(not math.isfinite(value) for value in normalized.values()):
        raise ValueError("run metrics must be finite")
    return normalized


def evaluate_boundary_rules(
    summary: Mapping[str, Mapping[str, Number]],
    boundary_rules: Mapping[str, Mapping[str, object]],
) -> list[str]:
    """Return predeclared boundary identifiers reached by one possibility."""
    reached: list[str] = []
    operators: dict[str, Callable[[float, float], bool]] = {
        ">": lambda value, threshold: value > threshold,
        ">=": lambda value, threshold: value >= threshold,
        "<": lambda value, threshold: value < threshold,
        "<=": lambda value, threshold: value <= threshold,
    }
    for rule_id, rule in boundary_rules.items():
        metric = rule.get("metric")
        statistic = rule.get("statistic")
        operator = rule.get("operator")
        threshold = rule.get("threshold")
        if not isinstance(metric, str) or metric not in summary:
            raise ValueError(f"loss rule {rule_id} cites an unknown metric")
        if not isinstance(statistic, str) or statistic not in summary[metric]:
            raise ValueError(f"loss rule {rule_id} cites an unavailable statistic")
        if operator not in operators:
            raise ValueError(f"loss rule {rule_id} has an unsupported operator")
        if isinstance(threshold, bool) or not isinstance(threshold, (int, float)):
            raise ValueError(f"loss rule {rule_id} threshold must be numeric")
        value = float(summary[metric][statistic])
        if operators[operator](value, float(threshold)):
            reached.append(rule_id)
    return reached


evaluate_loss_rules = evaluate_boundary_rules


def run_possibility_space(
    possibilities: Mapping[str, Possibility],
    scenarios: Mapping[str, Scenario],
    *,
    repetitions: int,
    seed: object,
    orientations: Mapping[str, str],
    run: Callable[[Possibility, Scenario, random.Random, PossibilityRunContext], Mapping[str, Number]],
    boundary_rules: Mapping[str, Mapping[str, object]] | None = None,
    quantiles: Mapping[str, float] | None = None,
    quantile_method: str = "nearest_rank",
) -> dict[str, object]:
    """Explore matched possibilities across scenarios without selecting a winner.

    Each possibility receives a fresh random stream derived from the same
    ``seed/scenario/repetition`` coordinates. Relations remain a partial order:
    equivalent, locally bounded, or incomparable.
    """
    if not possibilities:
        raise ValueError("space must contain at least one possibility")
    if not scenarios:
        raise ValueError("campaign must contain at least one scenario")
    if isinstance(repetitions, bool) or not isinstance(repetitions, int) or repetitions < 1:
        raise ValueError("repetitions must be a positive integer")
    if not orientations:
        raise ValueError("campaign must declare at least one metric orientation")
    if any(direction not in {"min", "max"} for direction in orientations.values()):
        raise ValueError("each orientation must be 'min' or 'max'")
    requested_quantiles = {"p90": 0.9} if quantiles is None else dict(quantiles)
    if not requested_quantiles or "median" in requested_quantiles:
        raise ValueError("quantiles must be non-empty and cannot redefine median")
    if any(not isinstance(name, str) or not name for name in requested_quantiles):
        raise ValueError("quantile names must be non-empty strings")
    if quantile_method not in {"nearest_rank", "linear"}:
        raise ValueError("quantile_method must be 'nearest_rank' or 'linear'")
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in requested_quantiles.values()):
        raise ValueError("quantile fractions must be numeric")
    if quantile_method == "nearest_rank":
        if any(not 0 < float(value) <= 1 for value in requested_quantiles.values()):
            raise ValueError("nearest-rank quantile fractions must be in (0, 1]")
    elif any(not 0 <= float(value) <= 1 for value in requested_quantiles.values()):
        raise ValueError("linear quantile fractions must be in [0, 1]")

    dimensions = set(orientations)
    runs: list[dict[str, object]] = []
    series: dict[str, dict[str, dict[str, list[float]]]] = {
        possibility_id: {
            scenario_id: {metric: [] for metric in orientations}
            for scenario_id in scenarios
        }
        for possibility_id in possibilities
    }
    for scenario_id, scenario in scenarios.items():
        for repetition in range(repetitions):
            for possibility_id, possibility in possibilities.items():
                rng = common_random(seed, scenario_id, repetition)
                context: PossibilityRunContext = {
                    "seed": seed,
                    "possibility_id": possibility_id,
                    "scenario_id": scenario_id,
                    "repetition": repetition,
                }
                metrics = _validate_metrics(run(possibility, scenario, rng, context), dimensions)
                runs.append(
                    {
                        "possibility": possibility_id,
                        "scenario": scenario_id,
                        "repetition": repetition,
                        "metrics": metrics,
                    }
                )
                for metric, value in metrics.items():
                    series[possibility_id][scenario_id][metric].append(value)

    summaries: dict[str, dict[str, dict[str, dict[str, float]]]] = {}
    boundary_events: dict[str, dict[str, list[str]]] = {}
    for possibility_id in possibilities:
        summaries[possibility_id] = {}
        boundary_events[possibility_id] = {}
        for scenario_id in scenarios:
            summary = {}
            for metric, values in series[possibility_id][scenario_id].items():
                summary[metric] = {"median": float(median(values))}
                summary[metric].update({
                    name: _quantile(values, float(fraction), quantile_method)
                    for name, fraction in requested_quantiles.items()
                })
            summaries[possibility_id][scenario_id] = summary
            boundary_events[possibility_id][scenario_id] = evaluate_boundary_rules(
                summary, boundary_rules or {}
            )

    spaces: dict[str, dict[str, object]] = {}
    for scenario_id in scenarios:
        median_vectors = {
            possibility_id: {
                metric: summaries[possibility_id][scenario_id][metric]["median"]
                for metric in orientations
            }
            for possibility_id in possibilities
        }
        frontier, dominated_by = pareto_frontier(median_vectors, orientations)
        spaces[scenario_id] = {
            "statistic": "median",
            "nondominated": frontier,
            "bounded_by": dominated_by,
            "relations": possibility_relations(median_vectors, orientations),
        }

    return {
        "schema_version": 1,
        "seed": str(seed),
        "repetitions": repetitions,
        "orientations": dict(orientations),
        "quantiles": requested_quantiles,
        "quantile_method": quantile_method,
        "runs": runs,
        "summaries": summaries,
        "boundary_events": boundary_events,
        "possibility_spaces": spaces,
    }


def run_campaign(
    architectures: Mapping[str, Possibility],
    scenarios: Mapping[str, Scenario],
    *,
    repetitions: int,
    seed: object,
    orientations: Mapping[str, str],
    run: Callable[[Possibility, Scenario, random.Random, CampaignRunContext], Mapping[str, Number]],
    loss_rules: Mapping[str, Mapping[str, object]] | None = None,
    quantiles: Mapping[str, float] | None = None,
    quantile_method: str = "nearest_rank",
) -> dict[str, object]:
    """Compatibility adapter for the earlier campaign vocabulary."""
    def legacy_run(possibility, scenario, rng, context: PossibilityRunContext):
        legacy_context: CampaignRunContext = {
            **context,
            "architecture_id": context["possibility_id"],
        }
        return run(possibility, scenario, rng, legacy_context)

    neutral = run_possibility_space(
        architectures, scenarios, repetitions=repetitions, seed=seed,
        orientations=orientations, run=legacy_run, boundary_rules=loss_rules,
        quantiles=quantiles, quantile_method=quantile_method,
    )
    return {
        **neutral,
        "runs": [{**item, "architecture": item["possibility"]} for item in neutral["runs"]],
        "losses": neutral["boundary_events"],
        "frontiers": {
            scenario: {
                "statistic": space["statistic"],
                "members": space["nondominated"],
                "dominated_by": space["bounded_by"],
            }
            for scenario, space in neutral["possibility_spaces"].items()
        },
    }
