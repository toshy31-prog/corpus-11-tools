#!/usr/bin/env python3
"""Run P-005 and apply its preregistered non-compensable gates."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
import statistics
from typing import Mapping

from p005_model import CORE_METRICS, simulate_p005_once
from run_p001 import load_config, percentile

ROOT = Path(__file__).resolve().parent
METRICS = CORE_METRICS + (
    "administrative_load", "displaced_loss", "power_concentration",
    "common_failure_rate", "gate_failures",
)


def execute(config: Mapping[str, object], runs: int | None = None) -> list[dict[str, object]]:
    count = runs or int(config["runs_per_cell"])
    rows = []
    for protocol in config["protocols"]:
        for mode in config["modes"]:
            results = [simulate_p005_once(config, protocol, mode, run) for run in range(count)]
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
    candidate_name = str(rule["candidate"])
    rival_name = str(rule["simple_rival"])
    predecessor_name = rule.get("predecessor")
    by_key = {(row["protocol"], row["mode"]): row for row in rows}
    gate_failures = []
    dominated = []
    comparisons = []
    predecessor_improvements = []
    for protocol in config["protocols"]:
        candidate = by_key[(protocol, candidate_name)]
        rival = by_key[(protocol, rival_name)]
        failed = float(candidate["gate_failures_median"]) > 0
        if failed:
            gate_failures.append(protocol)
        protects_as_well = all(
            float(rival[f"{metric}_median"]) <= float(candidate[f"{metric}_median"])
            for metric in CORE_METRICS
        )
        cheaper = float(rival["administrative_load_median"]) <= (
            float(candidate["administrative_load_median"])
            * (1 - float(rule["admin_reduction_required"]))
        )
        rival_dominates = protects_as_well and cheaper
        if rival_dominates:
            dominated.append(protocol)
        predecessor_comparison = None
        if predecessor_name is not None:
            predecessor = by_key[(protocol, str(predecessor_name))]
            core_noninferior = all(
                float(candidate[f"{metric}_median"]) <= float(predecessor[f"{metric}_median"]) + 0.25
                for metric in CORE_METRICS
            )
            load_reduction = 1 - float(candidate["administrative_load_median"]) / max(
                0.1, float(predecessor["administrative_load_median"])
            )
            predecessor_comparison = {
                "core_noninferior": core_noninferior,
                "load_reduction": load_reduction,
            }
            if core_noninferior and load_reduction >= float(rule.get("predecessor_load_reduction_min", 0.10)):
                predecessor_improvements.append(protocol)
        comparisons.append({
            "protocol": protocol,
            "candidate_gate_failure": failed,
            "simple_protects_as_well": protects_as_well,
            "simple_is_15pct_cheaper": cheaper,
            "simple_dominates": rival_dominates,
            "predecessor_comparison": predecessor_comparison,
        })
    rejected = (
        len(dominated) >= int(rule["dominated_protocols_for_rejection"])
        or len(gate_failures) >= int(rule["gate_failures_for_rejection"])
    )
    return {
        "verdict": f"{candidate_name}_rejected" if rejected else f"{candidate_name}_survives_{str(config['experiment']).lower().replace('-', '_')}",
        "gate_failure_protocols": gate_failures,
        "simple_dominance_protocols": dominated,
        "predecessor_improvement_protocols": predecessor_improvements,
        "comparisons": comparisons,
    }


def write_report(rows: list[dict[str, object]], outcome: Mapping[str, object], config: Mapping[str, object], path: Path) -> None:
    by_key = {(row["protocol"], row["mode"]): row for row in rows}
    lines = [
        f"# Résultats {config['experiment']}", "", "## Verdict", "",
        f"**{outcome['verdict']}**", "",
        "Verdict interne au jumeau synthétique. Il ne valide ni paramètres, ni causalité, ni transport territorial.", "",
        "## Médianes par protocole", "",
        "| Protocole | Mode | Besoins non servis | Dépassement éco | Droits suspendus | Décisions sans trace | Récupération | Charge | Cause commune | Portes perdues |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for protocol in config["protocols"]:
        for mode, spec in config["modes"].items():
            row = by_key[(protocol, mode)]
            lines.append(
                f"| {protocol} | {spec['label']} | {row['vital_unmet_median']:.1f}% | "
                f"{row['eco_overshoot_median']:.1f}% | {row['rights_suspended_median']:.1f}% | "
                f"{row['untraced_decisions_median']:.1f}% | {row['recovery_days_median']:.1f} j | "
                f"{row['administrative_load_median']:.1f} | {100*row['common_failure_rate_median']:.1f}% | "
                f"{row['gate_failures_median']:.0f} |"
            )
    lines.extend(["", "## Test de perte", ""])
    for item in outcome["comparisons"]:
        lines.append(
            f"- **{item['protocol']}** — porte CCT perdue : {'oui' if item['candidate_gate_failure'] else 'non'} ; "
            f"rival simple protège autant : {'oui' if item['simple_protects_as_well'] else 'non'} ; "
            f"rival au moins 15 % moins chargé : {'oui' if item['simple_is_15pct_cheaper'] else 'non'} ; "
            f"domination : {'oui' if item['simple_dominates'] else 'non'}."
        )
        if item["predecessor_comparison"] is not None:
            predecessor = item["predecessor_comparison"]
            lines.append(
                f"  - Face à la version précédente : noyaux non inférieurs : "
                f"{'oui' if predecessor['core_noninferior'] else 'non'} ; réduction de charge : "
                f"{100 * predecessor['load_reduction']:.1f} %."
            )
    lines.extend([
        "", "## Conclusion bornée", "",
        f"{config['experiment']} mesure l'interférence entre protections sous ressources partagées. Un succès indique seulement que les équations préspécifiées ne réfutent pas la candidate. Les seuils restent conventionnels jusqu'à calibration indépendante.",
    ])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=ROOT / "p005_config.json")
    parser.add_argument("--runs", type=int, default=None)
    parser.add_argument("--output", type=Path, default=ROOT / "results-p005")
    args = parser.parse_args()
    config = load_config(args.config)
    rows = execute(config, args.runs)
    outcome = make_verdict(rows, config)
    args.output.mkdir(parents=True, exist_ok=True)
    with (args.output / "summary.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader(); writer.writerows(rows)
    (args.output / "verdict.json").write_text(json.dumps(outcome, indent=2) + "\n", encoding="utf-8")
    write_report(rows, outcome, config, args.output / "report.md")
    print(json.dumps(outcome))


if __name__ == "__main__":
    main()
