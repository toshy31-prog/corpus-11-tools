"""Domain-neutral primitives for matched simulation campaigns.

This module contains no CCT architecture, political metric, food-access case,
or research conclusion. Research projects provide those through configuration.
"""

from __future__ import annotations

from copy import deepcopy
import random
from typing import Mapping, TypeVar


Number = int | float
T = TypeVar("T")


def common_random(seed: object, *coordinates: object) -> random.Random:
    """Return a deterministic stream shared by rivals with matched coordinates."""
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


def pareto_frontier(
    outcomes: Mapping[str, Mapping[str, Number]], orientations: Mapping[str, str]
) -> tuple[list[str], dict[str, list[str]]]:
    """Return frontier identifiers and the explicit dominators of every loser."""
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
