#!/usr/bin/env python3
"""Execute and report the P-001 digital twin."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
import statistics
from typing import Mapping

from p001_model import P001Result, simulate_p001_once


ROOT = Path(__file__).resolve().parent
METRICS = (
    "mean_service", "worst_service", "unserved_need", "time_to_safe",
    "rights_burden", "power_concentration", "rollback_days",
    "dependency_detection_rate", "hidden_dependencies", "decision_delay",
)


def deep_merge(base: dict[str, object], override: Mapping[str, object]) -> dict[str, object]:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_config(path: Path) -> dict[str, object]:
    config = json.loads(path.read_text(encoding="utf-8"))
    inherited = config.pop("inherits", None)
    if inherited is None:
        return config
    return deep_merge(load_config(path.parent / str(inherited)), config)


def percentile(values: list[float], fraction: float) -> float:
    values = sorted(values)
    position = (len(values) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(values) - 1)
    weight = position - lower
    return values[lower] * (1 - weight) + values[upper] * weight


def summarize(results: list[P001Result], config: Mapping[str, object]) -> dict[str, float]:
    row: dict[str, float] = {}
    for metric in METRICS:
        values = [result.metrics[metric] for result in results]
        row[f"{metric}_p10"] = percentile(values, 0.10)
        row[f"{metric}_median"] = statistics.median(values)
        row[f"{metric}_p90"] = percentile(values, 0.90)
    thresholds = config["pass_thresholds"]
    passes = [
        result.metrics["mean_service"] >= float(thresholds["mean_service"])
        and result.metrics["worst_service"] >= float(thresholds["worst_service"])
        and result.metrics["rights_burden"] <= float(thresholds["rights_burden_max"])
        and result.metrics["rollback_days"] <= float(thresholds["rollback_days_max"])
        for result in results
    ]
    row["joint_pass_rate"] = sum(passes) / len(passes)
    return row


def execute(config: Mapping[str, object], runs: int | None = None) -> list[dict[str, object]]:
    count = runs or int(config["runs_per_cell"])
    rows = []
    for protocol in config["protocols"]:
        for mode in config["modes"]:
            results = [simulate_p001_once(config, protocol, mode, run) for run in range(count)]
            rows.append({"protocol": protocol, "mode": mode, **summarize(results, config)})
    return rows


def verdict(rows: list[dict[str, object]], config: Mapping[str, object]) -> dict[str, object]:
    rule = config["reversal_rule"]
    candidate_name = str(config.get("candidate_mode", "capacity_gate"))
    baseline_name = str(config.get("baseline_mode", "calendar_transfer"))
    speed_reference_name = str(config.get("speed_reference_mode", "central_command"))
    by_key = {(row["protocol"], row["mode"]): row for row in rows}
    failures = []
    comparisons = []
    for protocol in config["protocols"]:
        gate = by_key[(protocol, candidate_name)]
        calendar = by_key[(protocol, baseline_name)]
        central = by_key[(protocol, speed_reference_name)]
        improvement = 1 - float(gate["unserved_need_median"]) / float(calendar["unserved_need_median"])
        time_ratio = float(gate["time_to_safe_median"]) / max(0.1, float(central["time_to_safe_median"]))
        rights_gain = float(central["rights_burden_median"]) - float(gate["rights_burden_median"])
        rollback_gain = float(central["rollback_days_median"]) - float(gate["rollback_days_median"])
        rival_rows = [
            row for (row_protocol, row_mode), row in by_key.items()
            if row_protocol == protocol and row_mode != candidate_name
        ]
        best_rival_unserved = min(float(row["unserved_need_median"]) for row in rival_rows)
        unserved_ratio_to_best = float(gate["unserved_need_median"]) / max(0.1, best_rival_unserved)
        if rule.get("type") == "pareto_noninferiority":
            continuity_ok = (
                unserved_ratio_to_best <= float(rule["unserved_ratio_to_best_rival_max"])
                and improvement >= float(rule["unserved_improvement_over_calendar_min"])
            )
        else:
            continuity_ok = improvement >= float(rule["unserved_improvement_over_calendar"])
        speed_ok = time_ratio <= float(rule["time_ratio_to_central_max"])
        justified_delay = (
            rights_gain >= float(rule["rights_gain_required"])
            and rollback_gain >= float(rule["rollback_gain_required"])
        )
        failed = not continuity_ok or (not speed_ok and not justified_delay)
        comparison = {
            "protocol": protocol,
            "unserved_improvement": improvement,
            "unserved_ratio_to_best_rival": unserved_ratio_to_best,
            "time_ratio_to_central": time_ratio,
            "rights_gain_vs_central": rights_gain,
            "rollback_gain_vs_central": rollback_gain,
            "failed": failed,
        }
        comparisons.append(comparison)
        if failed:
            failures.append(protocol)
    status = (
        f"{candidate_name}_rejected"
        if len(failures) >= int(rule["failed_protocols_for_rejection"])
        else f"{candidate_name}_survives_synthetic_twin"
    )
    return {"verdict": status, "candidate": candidate_name, "failed_protocols": failures, "comparisons": comparisons}


def write_report(rows: list[dict[str, object]], outcome: Mapping[str, object], config: Mapping[str, object], path: Path) -> None:
    by_key = {(row["protocol"], row["mode"]): row for row in rows}
    lines = [
        f"# Résultats {config['experiment']}", "", "## Verdict", "",
        f"**{outcome['verdict']}**", "",
        "Ce verdict porte sur le jumeau numérique synthétique, pas sur un service réel.", "",
        "## Résultats par protocole", "",
        "| Protocole | Mode | Service moyen | Pire service | Besoin non servi | Retour sûr | Charge de droits | Restitution | Passage conjoint |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for protocol in config["protocols"]:
        for mode, mode_config in config["modes"].items():
            row = by_key[(protocol, mode)]
            lines.append(
                f"| {protocol} | {mode_config['label']} | {row['mean_service_median']:.1f}% | "
                f"{row['worst_service_median']:.1f}% | {row['unserved_need_median']:.0f} | "
                f"{row['time_to_safe_median']:.1f} j | {row['rights_burden_median']:.1f} | "
                f"{row['rollback_days_median']:.1f} j | {100 * row['joint_pass_rate']:.1f}% |"
            )
    lines.extend(["", "## Conditions de perte", ""])
    for item in outcome["comparisons"]:
        lines.append(
            f"- **{item['protocol']}** — amélioration du besoin non servi : {100 * item['unserved_improvement']:.1f} % ; "
            f"ratio face au meilleur rival : {item['unserved_ratio_to_best_rival']:.2f} ; "
            f"ratio de retour sûr face au centre : {item['time_ratio_to_central']:.2f} ; "
            f"gain droits : {item['rights_gain_vs_central']:.1f} ; gain restitution : {item['rollback_gain_vs_central']:.1f} ; "
            f"échec : {'oui' if item['failed'] else 'non'}."
        )
    lines.extend([
        "", "## Limite", "",
        "Les ressources, chocs et fonctions de restauration sont hypothétiques. Le test peut réfuter une mécanique interne ou révéler une dépendance ; il ne peut établir la performance territoriale sans données d’opérateur.",
    ])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=ROOT / "p001_config.json")
    parser.add_argument("--runs", type=int, default=None)
    parser.add_argument("--output", type=Path, default=ROOT / "results-p001")
    args = parser.parse_args()
    config = load_config(args.config)
    rows = execute(config, args.runs)
    outcome = verdict(rows, config)
    args.output.mkdir(parents=True, exist_ok=True)
    with (args.output / "summary.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    (args.output / "verdict.json").write_text(json.dumps(outcome, indent=2) + "\n", encoding="utf-8")
    write_report(rows, outcome, config, args.output / "report.md")
    print(json.dumps(outcome))


if __name__ == "__main__":
    main()
