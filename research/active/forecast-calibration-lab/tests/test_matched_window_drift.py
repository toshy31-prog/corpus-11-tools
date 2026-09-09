#!/usr/bin/env python3
"""Test one fixed outcome drift across two date-built matched windows."""

from __future__ import annotations

from copy import deepcopy
from fractions import Fraction
import json
from pathlib import Path

from test_fictional_forecast_registry import RIVALS, decomposition, generated_registry


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "fixtures" / "matched_window_drift_v0.3.json"
RIVAL_NAMES = ("stratified", "base_rate")
EXPECTED_CHANGES = [
    {"id": "fictional-f10", "from": 0, "to": 1},
    {"id": "fictional-f11", "from": 1, "to": 0},
]
EXPECTED_FREQUENCIES = {
    "A": {"low": Fraction(1, 5), "high": Fraction(4, 5)},
    "B": {"low": Fraction(2, 5), "high": Fraction(3, 5)},
}
EXPECTED_RESULTS = {
    "A": {
        "stratified": {
            "brier": Fraction(4, 25),
            "reliability": Fraction(0),
            "resolution": Fraction(9, 100),
            "uncertainty": Fraction(1, 4),
        },
        "base_rate": {
            "brier": Fraction(1, 4),
            "reliability": Fraction(0),
            "resolution": Fraction(0),
            "uncertainty": Fraction(1, 4),
        },
    },
    "B": {
        "stratified": {
            "brier": Fraction(7, 25),
            "reliability": Fraction(1, 25),
            "resolution": Fraction(1, 100),
            "uncertainty": Fraction(1, 4),
        },
        "base_rate": {
            "brier": Fraction(1, 4),
            "reliability": Fraction(0),
            "resolution": Fraction(0),
            "uncertainty": Fraction(1, 4),
        },
    },
}
EXPECTED_LOSERS = {"A": "base_rate", "B": "stratified"}


class AccessTrackedRow:
    """Record which input fields a forecast execution reads."""

    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload
        self.accessed: set[str] = set()

    def __getitem__(self, key: str) -> object:
        self.accessed.add(key)
        return self.payload[key]


def execute_probability(
    forecasts: dict[str, Fraction], row: AccessTrackedRow
) -> Fraction:
    return forecasts[row["stratum"]]


def validate_outcome_changes(changes: object) -> list[dict[str, object]]:
    if changes != EXPECTED_CHANGES:
        raise ValueError("outcome_change_set_mismatch")
    return changes


def validate_probability_tables(
    candidate: dict[str, dict[str, Fraction]],
    source: dict[str, dict[str, Fraction]],
) -> None:
    if candidate != source:
        raise ValueError("probability_table_changed")


def expect_value_error(callable_object: object, message: str) -> None:
    try:
        callable_object()
    except ValueError as error:
        assert str(error) == message
    else:
        raise AssertionError(f"expected ValueError({message!r})")


def apply_changes(
    registry: list[dict[str, object]], changes: list[dict[str, object]]
) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    changed = deepcopy(registry)
    rows = {row["id"]: row for row in changed}
    for change in changes:
        row = rows[change["id"]]
        assert row["outcome"] == change["from"]
        row["outcome"] = change["to"]

    observed_changes: list[dict[str, object]] = []
    for before, after in zip(registry, changed, strict=True):
        assert before.keys() == after.keys()
        for field in before:
            if before[field] != after[field]:
                observed_changes.append({
                    "id": before["id"],
                    "field": field,
                    "from": before[field],
                    "to": after[field],
                })
    return changed, observed_changes


def build_windows(registry: list[dict[str, object]]) -> dict[str, list[dict[str, object]]]:
    assert all("window" not in row for row in registry)
    ordered = sorted(registry, key=lambda row: row["issued"])
    assert len(ordered) == 20
    midpoint = len(ordered) // 2
    windows = {"A": ordered[:midpoint], "B": ordered[midpoint:]}
    assert max(row["issued"] for row in windows["A"]) < min(
        row["issued"] for row in windows["B"]
    )
    return windows


def stratum_counts(rows: list[dict[str, object]]) -> dict[str, int]:
    return {
        stratum: sum(row["stratum"] == stratum for row in rows)
        for stratum in ("low", "high")
    }


def frequencies(rows: list[dict[str, object]]) -> dict[str, Fraction]:
    return {
        stratum: Fraction(
            sum(row["outcome"] for row in rows if row["stratum"] == stratum),
            sum(row["stratum"] == stratum for row in rows),
        )
        for stratum in ("low", "high")
    }


def losing_rule(results: dict[str, dict[str, Fraction]]) -> str:
    ordered = sorted(results, key=lambda name: results[name]["brier"], reverse=True)
    assert results[ordered[0]]["brier"] != results[ordered[1]]["brier"]
    return ordered[0]


def classify(
    observed_frequencies: dict[str, dict[str, Fraction]],
    results: dict[str, dict[str, dict[str, Fraction]]],
    losers: dict[str, str],
) -> str:
    if (
        observed_frequencies == EXPECTED_FREQUENCIES
        and results == EXPECTED_RESULTS
        and losers == EXPECTED_LOSERS
    ):
        return "matched_window_rank_reversal"
    return "candidate_set_incomplete"


def json_ready(value: object) -> object:
    if isinstance(value, Fraction):
        return str(value)
    if isinstance(value, dict):
        return {key: json_ready(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_ready(item) for item in value]
    return value


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert set(fixture) == {"outcome_changes"}
    changes = validate_outcome_changes(fixture["outcome_changes"])

    source_registry = generated_registry()
    source_probabilities = {
        name: deepcopy(RIVALS[name])
        for name in RIVAL_NAMES
    }
    probabilities = deepcopy(source_probabilities)
    validate_probability_tables(probabilities, source_probabilities)

    registry, observed_changes = apply_changes(source_registry, changes)
    assert observed_changes == [
        {"id": "fictional-f10", "field": "outcome", "from": 0, "to": 1},
        {"id": "fictional-f11", "field": "outcome", "from": 1, "to": 0},
    ]

    windows = build_windows(registry)
    assert {name: len(rows) for name, rows in windows.items()} == {"A": 10, "B": 10}
    assert {
        name: stratum_counts(rows)
        for name, rows in windows.items()
    } == {
        "A": {"low": 5, "high": 5},
        "B": {"low": 5, "high": 5},
    }
    horizons = {
        name: {row["outcome_date"] - row["issued"] for row in rows}
        for name, rows in windows.items()
    }
    assert horizons["A"] == horizons["B"]
    assert {horizon.days for horizon in horizons["A"]} == {30}

    execution_accesses: dict[str, dict[str, list[str]]] = {}
    for window_name, rows in windows.items():
        execution_accesses[window_name] = {}
        for rival_name, probability_table in probabilities.items():
            accesses: set[str] = set()
            for row in rows:
                tracked = AccessTrackedRow(row)
                predicted = execute_probability(probability_table, tracked)
                assert predicted == source_probabilities[rival_name][row["stratum"]]
                accesses.update(tracked.accessed)
            assert "outcome" not in accesses
            execution_accesses[window_name][rival_name] = sorted(accesses)

    observed_frequencies = {
        name: frequencies(rows)
        for name, rows in windows.items()
    }
    results = {
        window_name: {
            rival_name: decomposition(rows, probability_table)
            for rival_name, probability_table in probabilities.items()
        }
        for window_name, rows in windows.items()
    }
    losers = {
        window_name: losing_rule(window_results)
        for window_name, window_results in results.items()
    }
    classification = classify(observed_frequencies, results, losers)
    assert classification != "candidate_set_incomplete", classification

    third_change = changes + [
        {"id": "fictional-f12", "from": 0, "to": 1},
    ]
    expect_value_error(
        lambda: validate_outcome_changes(third_change),
        "outcome_change_set_mismatch",
    )
    changed_probabilities = deepcopy(probabilities)
    changed_probabilities["base_rate"]["low"] = Fraction(2, 5)
    expect_value_error(
        lambda: validate_probability_tables(
            changed_probabilities,
            source_probabilities,
        ),
        "probability_table_changed",
    )

    print(json.dumps(json_ready({
        "valid": True,
        "classification": classification,
        "outcome_changes": observed_changes,
        "window_sizes": {name: len(rows) for name, rows in windows.items()},
        "stratum_counts": {
            name: stratum_counts(rows)
            for name, rows in windows.items()
        },
        "horizon_days": 30,
        "probabilities_unchanged": probabilities == source_probabilities,
        "execution_accesses": execution_accesses,
        "frequencies": observed_frequencies,
        "results": results,
        "losers": losers,
        "scope": "formal_exact",
        "external_stability": "not_claimed",
        "behavioral_adaptation": "strategic_effect_unknown",
        "pre_registration_demonstrated": False,
        "general_robustness": "not_claimed",
        "independence_status": "independence_unknown",
        "registry_design": "co_designed",
    }), sort_keys=True))


if __name__ == "__main__":
    main()
