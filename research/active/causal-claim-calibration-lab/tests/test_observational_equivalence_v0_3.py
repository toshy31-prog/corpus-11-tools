#!/usr/bin/env python3
"""Check a sealed synthetic pair with equal observations and unequal do effects."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path


LAB = Path(__file__).resolve().parents[1]
ROOT = Path(__file__).resolve().parents[4]
FIXTURE = LAB / "fixtures" / "observational_equivalence_v0.3.json"
MANIFEST = LAB / "pre_execution_manifest_v0.3.json"
SEAL = LAB / "pre_execution_seal_v0.3.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def show(value: Fraction) -> str:
    return str(value.numerator) if value.denominator == 1 else f"{value.numerator}/{value.denominator}"


def model_summary(model: dict[str, object]) -> dict[str, object]:
    units = model["units"]
    total = sum(unit["count"] for unit in units)
    observational = {(x, y): Fraction(0) for x in (0, 1) for y in (0, 1)}
    for unit in units:
        x = unit["X_observed"]
        y = unit["Y1"] if x else unit["Y0"]
        observational[(x, y)] += Fraction(unit["count"], total)
    y0 = sum(Fraction(unit["count"] * unit["Y0"], total) for unit in units)
    y1 = sum(Fraction(unit["count"] * unit["Y1"], total) for unit in units)
    return {
        "observational": observational,
        "prediction": {"E_Y_do_X_0": show(y0), "E_Y_do_X_1": show(y1), "ATE": show(y1 - y0)},
    }


def observational_bounds(distribution: list[dict[str, object]]) -> dict[str, list[str]]:
    mass = {(row["X"], row["Y"]): Fraction(row["probability"]) for row in distribution}
    y1_lower = mass[(1, 1)]
    y1_upper = mass[(1, 1)] + mass[(0, 0)] + mass[(0, 1)]
    y0_lower = mass[(0, 1)]
    y0_upper = mass[(0, 1)] + mass[(1, 0)] + mass[(1, 1)]
    return {
        "E_Y1": [show(y1_lower), show(y1_upper)],
        "E_Y0": [show(y0_lower), show(y0_upper)],
        "ATE": [show(y1_lower - y0_upper), show(y1_upper - y0_lower)],
    }


def intervention_summary(held_out: dict[str, object]) -> dict[str, str]:
    means: dict[int, Fraction] = {}
    for arm in held_out["arms"]:
        total = sum(row["count"] for row in arm["outcomes"])
        means[arm["do_X"]] = sum(Fraction(row["Y"] * row["count"], total) for row in arm["outcomes"])
    return {
        "E_Y_do_X_0": show(means[0]),
        "E_Y_do_X_1": show(means[1]),
        "ATE": show(means[1] - means[0]),
    }


def verify_freeze() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    seal = json.loads(SEAL.read_text(encoding="utf-8"))
    assert manifest["status"] == "sealed_before_execution"
    assert manifest["execution_limit"] == 1
    assert seal["sealed_before_execution"] is True
    assert seal["manifest_sha256"] == digest(MANIFEST)
    assert set(manifest["sealed_files"]) == {
        "research/active/causal-claim-calibration-lab/protocols/observational_equivalence_v0.3.md",
        "research/active/causal-claim-calibration-lab/fixtures/observational_equivalence_v0.3.json",
        "research/active/causal-claim-calibration-lab/tests/test_observational_equivalence_v0_3.py",
    }
    for relative, expected in manifest["sealed_files"].items():
        assert digest(ROOT / relative) == expected, relative


def main() -> None:
    verify_freeze()
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["synthetic_scope"] == "model_internal"
    assert fixture["external_validity"] is False
    assert len(fixture["models"]) == 2

    declared_observational = {
        (row["X"], row["Y"]): Fraction(row["probability"])
        for row in fixture["observational_distribution"]
    }
    summaries = {model["conclusion_id"]: model_summary(model) for model in fixture["models"]}
    for model in fixture["models"]:
        summary = summaries[model["conclusion_id"]]
        assert summary["observational"] == declared_observational
        assert summary["prediction"] == model["frozen_prediction"]

    predictions = [summary["prediction"] for summary in summaries.values()]
    assert predictions[0]["ATE"] != predictions[1]["ATE"]
    assert observational_bounds(fixture["observational_distribution"]) == fixture["partial_identification"]["bounds"]
    lower, upper = map(Fraction, fixture["partial_identification"]["bounds"]["ATE"])
    assert all(lower <= Fraction(item["ATE"]) <= upper for item in predictions)

    observed = intervention_summary(fixture["held_out_intervention"])
    rejected = sorted(conclusion for conclusion, summary in summaries.items() if summary["prediction"] != observed)
    compatible = sorted(conclusion for conclusion, summary in summaries.items() if summary["prediction"] == observed)
    assert observed["ATE"] == fixture["held_out_intervention"]["expected_observed_effect"]
    assert rejected == sorted(fixture["held_out_intervention"]["expected_rejected_conclusions"])
    assert compatible == sorted(fixture["held_out_intervention"]["expected_compatible_conclusions"])
    assert rejected and compatible
    print(
        "PASS causal observational equivalence v0.3: "
        "2 observationally identical models, ATE bound [0,1], "
        "1 rejected conclusion, 1 compatible survivor"
    )


if __name__ == "__main__":
    main()
