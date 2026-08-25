#!/usr/bin/env python3
"""Calculate exact causal contrasts in fully declared synthetic worlds."""

from __future__ import annotations

from fractions import Fraction
import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "initial_cases.json"


def observed_y(row: dict[str, int]) -> int:
    return row["Y1"] if row["X"] else row["Y0"]


def mean(rows: list[dict[str, int]], value) -> Fraction:
    total = sum(row["count"] for row in rows)
    assert total > 0
    return sum(Fraction(row["count"] * value(row), total) for row in rows)


def effect_summary(rows: list[dict[str, int]]) -> tuple[Fraction, Fraction, Fraction]:
    treated = [row for row in rows if row["X"] == 1]
    control = [row for row in rows if row["X"] == 0]
    association = mean(treated, observed_y) - mean(control, observed_y)
    do_effect = mean(rows, lambda row: row["Y1"] - row["Y0"])
    total = sum(row["count"] for row in rows)
    adjusted = Fraction(0)
    for c_value in sorted({row["C"] for row in rows}):
        stratum = [row for row in rows if row["C"] == c_value]
        treated_stratum = [row for row in stratum if row["X"] == 1]
        control_stratum = [row for row in stratum if row["X"] == 0]
        assert treated_stratum and control_stratum, "positivity fails in a declared stratum"
        adjusted += Fraction(sum(row["count"] for row in stratum), total) * (
            mean(treated_stratum, observed_y) - mean(control_stratum, observed_y)
        )
    return association, do_effect, adjusted


def verdicts(design: str) -> tuple[str, str]:
    if design == "randomized":
        return "identified_under_assumptions", "identified_under_assumptions"
    if design == "observational_confounding":
        return "not_identified", "identified_under_assumptions"
    raise AssertionError(f"unknown design: {design}")


def show(value: Fraction) -> str:
    return str(value.numerator) if value.denominator == 1 else f"{value.numerator}/{value.denominator}"


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    observed = {}
    for world in fixture["worlds"]:
        association, do_effect, adjusted = effect_summary(world["rows"])
        naive, adjusted_verdict = verdicts(world["design"])
        result = {
            "association": show(association),
            "do_effect": show(do_effect),
            "adjusted_effect": show(adjusted),
            "naive_verdict": naive,
            "adjusted_verdict": adjusted_verdict,
        }
        assert result == world["expected"], f"{world['id']}: {result}"
        observed[world["id"]] = result
    assert observed["confounded_association_without_direct_effect"]["association"] != observed["confounded_association_without_direct_effect"]["do_effect"]
    assert observed["randomized_direct_effect"]["association"] == observed["randomized_direct_effect"]["do_effect"]
    print("PASS causal-claim-calibration-lab initial synthetic protocol: 2/2 causal worlds")


if __name__ == "__main__":
    main()
