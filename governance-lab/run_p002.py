#!/usr/bin/env python3
"""Run P-002 and mechanically apply its preregistered reversal rule."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
import statistics
from typing import Mapping

from p002_model import simulate_p002_once
from run_p001 import load_config

ROOT = Path(__file__).resolve().parent
METRICS = ("essential_unmet", "low_income_unmet", "overall_unmet", "eco_overshoot", "imported_harm", "rent", "admin_hours", "gaming_capture", "recovery_weeks")


def percentile(values: list[float], fraction: float) -> float:
    values = sorted(values)
    position = (len(values) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(values) - 1)
    weight = position - lower
    return values[lower] * (1 - weight) + values[upper] * weight


def execute(config: Mapping[str, object], runs: int | None = None) -> list[dict[str, object]]:
    count = runs or int(config["runs_per_cell"])
    rows = []
    for protocol in config["protocols"]:
        for mode in config["modes"]:
            results = [simulate_p002_once(config, protocol, mode, run) for run in range(count)]
            row: dict[str, object] = {"protocol": protocol, "mode": mode}
            for metric in METRICS:
                values = [result[metric] for result in results]
                row[f"{metric}_p10"] = percentile(values, 0.10)
                row[f"{metric}_median"] = statistics.median(values)
                row[f"{metric}_p90"] = percentile(values, 0.90)
            rows.append(row)
    return rows


def make_verdict(rows: list[dict[str, object]], config: Mapping[str, object]) -> dict[str, object]:
    rule = config["reversal_rule"]
    by_key = {(row["protocol"], row["mode"]): row for row in rows}
    dominated = []
    hard_failures = []
    comparisons = []
    for protocol in config["protocols"]:
        corridor = by_key[(protocol, "corridor")]
        corridor_hard = (
            float(corridor["essential_unmet_median"]) > float(rule["absolute_essential_unmet_max"])
            or float(corridor["eco_overshoot_median"]) > float(rule["absolute_eco_overshoot_max"])
        )
        if corridor_hard:
            hard_failures.append(protocol)
        winning_rivals = []
        for rival_name in ("annual_plan", "eco_market"):
            rival = by_key[(protocol, rival_name)]
            protects = (
                float(rival["essential_unmet_median"]) <= float(corridor["essential_unmet_median"]) + float(rule["essential_noninferiority_points"])
                and float(rival["low_income_unmet_median"]) <= float(corridor["low_income_unmet_median"]) + float(rule["low_income_noninferiority_points"])
                and float(rival["eco_overshoot_median"]) <= float(corridor["eco_overshoot_median"]) + float(rule["eco_overshoot_tolerance"])
                and float(rival["imported_harm_median"]) <= float(corridor["imported_harm_median"]) * float(rule["imported_harm_ratio_max"]) + float(rule["imported_harm_slack"])
            )
            cheaper = float(rival["admin_hours_median"]) <= float(corridor["admin_hours_median"]) * (1 - float(rule["admin_reduction_required"]))
            if protects and cheaper:
                winning_rivals.append(rival_name)
        if winning_rivals:
            dominated.append(protocol)
        comparisons.append({"protocol": protocol, "dominating_rivals": winning_rivals, "hard_failure": corridor_hard})
    rejected = len(dominated) >= int(rule["dominated_protocols_for_rejection"]) or len(hard_failures) >= 2
    return {"verdict": "corridor_rejected" if rejected else "corridor_survives_synthetic_twin", "dominated_protocols": dominated, "hard_failures": hard_failures, "comparisons": comparisons}


def write_report(rows: list[dict[str, object]], outcome: Mapping[str, object], config: Mapping[str, object], path: Path) -> None:
    by_key = {(row["protocol"], row["mode"]): row for row in rows}
    lines = [f"# Résultats {config['experiment']}", "", "## Verdict", "", f"**{outcome['verdict']}**", "", "Verdict interne au jumeau synthétique ; aucune efficacité territoriale n'est établie.", "", "## Médianes", "", "| Protocole | Mode | Besoins vitaux non servis | Bas revenus non servis | Dépassement écologique | Dommage importé | Rente | Administration | Capture par jeu | Récupération |", "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for protocol in config["protocols"]:
        for mode, spec in config["modes"].items():
            row = by_key[(protocol, mode)]
            lines.append(f"| {protocol} | {spec['label']} | {row['essential_unmet_median']:.1f}% | {row['low_income_unmet_median']:.1f}% | {row['eco_overshoot_median']:.1f} | {row['imported_harm_median']:.1f} | {row['rent_median']:.1f} | {row['admin_hours_median']:.1f} h | {row['gaming_capture_median']:.2f} | {row['recovery_weeks_median']:.1f} sem. |")
    lines.extend(["", "## Application de la perte", ""])
    for item in outcome["comparisons"]:
        rivals = ", ".join(item["dominating_rivals"]) or "aucun"
        lines.append(f"- **{item['protocol']}** — rival dominant : {rivals} ; seuil absolu franchi : {'oui' if item['hard_failure'] else 'non'}.")
    lines.extend(["", "## Limite", "", "Les demandes, comportements, prix implicites et fonctions d'allocation sont hypothétiques. Le test discrimine des mécanismes déclarés, non des institutions réelles."])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=ROOT / "p002_config.json")
    parser.add_argument("--runs", type=int, default=None)
    parser.add_argument("--output", type=Path, default=ROOT / "results-p002")
    args = parser.parse_args()
    config = load_config(args.config)
    rows = execute(config, args.runs)
    outcome = make_verdict(rows, config)
    args.output.mkdir(parents=True, exist_ok=True)
    with (args.output / "summary.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader(); writer.writerows(rows)
    (args.output / "verdict.json").write_text(json.dumps(outcome, indent=2) + "\n", encoding="utf-8")
    write_report(rows, outcome, config, args.output / "report.md")
    print(json.dumps(outcome))


if __name__ == "__main__":
    main()
