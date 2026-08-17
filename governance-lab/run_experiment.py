#!/usr/bin/env python3
"""Run the preregistered synthetic CCT comparison and write reproducible outputs."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
import statistics
from typing import Iterable, Mapping

from model import CORE_METRICS, DIAGNOSTICS, RunResult, simulate_once


ROOT = Path(__file__).resolve().parent


def deep_merge(base: dict[str, object], override: Mapping[str, object]) -> dict[str, object]:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def load_config(path: Path) -> dict[str, object]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    parent = payload.pop("extends", None)
    if parent is None:
        return payload
    parent_path = (path.parent / str(parent)).resolve()
    return deep_merge(load_config(parent_path), payload)


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def cell_summary(results: list[RunResult], floors: Mapping[str, float]) -> dict[str, float]:
    summary: dict[str, float] = {}
    for metric in (*CORE_METRICS, *DIAGNOSTICS):
        values = [result.metrics[metric] for result in results]
        summary[f"{metric}_p10"] = percentile(values, 0.10)
        summary[f"{metric}_median"] = statistics.median(values)
        summary[f"{metric}_p90"] = percentile(values, 0.90)
    passes = [all(result.metrics[key] >= floor for key, floor in floors.items()) for result in results]
    summary["joint_pass_rate"] = sum(passes) / len(passes)
    catastrophic = [any(result.metrics[key] < 40.0 for key in CORE_METRICS) for result in results]
    summary["catastrophic_rate"] = sum(catastrophic) / len(catastrophic)
    return summary


def run_all(config: Mapping[str, object], run_override: int | None = None) -> list[dict[str, object]]:
    runs = run_override or int(config["runs_per_cell"])
    seed = int(config["seed"])
    floors = config["core_metrics"]
    grouped: list[dict[str, object]] = []
    for protocol, protocol_config in config["protocols"].items():
        for scenario, scenario_config in config["scenarios"].items():
            for architecture, architecture_config in config["architectures"].items():
                results = [
                    simulate_once(
                        architecture,
                        architecture_config["traits"],
                        scenario,
                        float(scenario_config["severity"]),
                        protocol,
                        protocol_config,
                        run,
                        seed,
                    )
                    for run in range(runs)
                ]
                grouped.append(
                    {
                        "protocol": protocol,
                        "scenario": scenario,
                        "architecture": architecture,
                        **cell_summary(results, floors),
                    }
                )
    return grouped


def reversal_verdict(rows: list[dict[str, object]], config: Mapping[str, object]) -> dict[str, object]:
    rule = config["reversal_rule"]
    margin = float(rule["rival_margin"])
    by_key = {(row["protocol"], row["scenario"], row["architecture"]): row for row in rows}
    losing: dict[str, list[dict[str, object]]] = {}
    catastrophic: dict[str, list[str]] = {}
    for protocol in config["protocols"]:
        losses: list[dict[str, object]] = []
        cats: list[str] = []
        for scenario in config["scenarios"]:
            cct = by_key[(protocol, scenario, "cct_v08")]
            rivals = [
                by_key[(protocol, scenario, architecture)]
                for architecture in config["architectures"]
                if architecture != "cct_v08"
            ]
            best = max(rivals, key=lambda row: float(row["joint_pass_rate"]))
            gap = float(best["joint_pass_rate"]) - float(cct["joint_pass_rate"])
            if gap >= margin:
                losses.append({"scenario": scenario, "rival": best["architecture"], "gap": gap})
            if float(cct["catastrophic_rate"]) >= float(rule["catastrophic_rate"]):
                cats.append(scenario)
        losing[protocol] = losses
        catastrophic[protocol] = cats

    base_loss_count = len(losing["base"])
    protocols_rejecting = sum(
        len(losses) >= int(rule["rejected_scenarios"]) for losses in losing.values()
    )
    protocols_weakening = sum(
        len(losses) >= int(rule["weakened_scenarios"]) for losses in losing.values()
    )
    catastrophic_protocols = sum(
        len(scenarios) >= int(rule["catastrophic_scenarios"])
        for scenarios in catastrophic.values()
    )

    if base_loss_count >= int(rule["rejected_scenarios"]) or protocols_rejecting >= 2:
        verdict = "rejected_by_synthetic_model"
    elif (
        base_loss_count >= int(rule["weakened_scenarios"])
        or protocols_weakening >= 2
        or catastrophic_protocols >= 2
    ):
        verdict = "weakened_by_synthetic_model"
    else:
        verdict = "not_rejected_by_synthetic_model"
    return {"verdict": verdict, "losses": losing, "catastrophic": catastrophic}


def write_csv(rows: Iterable[dict[str, object]], destination: Path) -> None:
    rows = list(rows)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def format_rate(value: object) -> str:
    return f"{100 * float(value):.1f}%"


def write_report(
    rows: list[dict[str, object]],
    verdict: Mapping[str, object],
    config: Mapping[str, object],
    destination: Path,
) -> None:
    by_key = {(row["protocol"], row["scenario"], row["architecture"]): row for row in rows}
    verdict_explanations = {
        "not_rejected_by_synthetic_model": "La CCT n’a pas rempli sa condition de perte dans ces équations.",
        "weakened_by_synthetic_model": "La CCT a rempli la condition d’affaiblissement : au moins un rival la dépasse sur plusieurs comparaisons préspécifiées.",
        "rejected_by_synthetic_model": "La CCT a rempli la condition de rejet interne de cette version du modèle synthétique.",
    }
    lines = [
        f"# Résultats synthétiques {config['experiment']}",
        "",
        "## Statut",
        "",
        f"Verdict préenregistré : **{verdict['verdict']}**.",
        "",
        "Ces résultats testent les équations et hypothèses déclarées dans le laboratoire. Ils ne sont ni une observation historique, ni une estimation causale, ni une validation de la CCT.",
        "",
        "## Taux de passage conjoint — protocole de base",
        "",
        "Un passage conjoint exige simultanément les planchers de besoins, écologie, droits, démocratie et récupération.",
        "",
        "| Scénario | CCT v0.8 | CCT v0.1 | État central | Fédération de marché |",
        "|---|---:|---:|---:|---:|",
    ]
    for scenario, scenario_config in config["scenarios"].items():
        cells = [
            format_rate(by_key[("base", scenario, architecture)]["joint_pass_rate"])
            for architecture in ("cct_v08", "cct_v01", "central_state", "market_federation")
        ]
        lines.append(f"| {scenario_config['label']} | " + " | ".join(cells) + " |")

    lines.extend(["", "## Robustesse de la CCT v0.8", "", "| Protocole | Passages moyens | Scénarios perdus | Scénarios catastrophiques |", "|---|---:|---:|---:|"])
    for protocol in config["protocols"]:
        cct_rows = [row for row in rows if row["protocol"] == protocol and row["architecture"] == "cct_v08"]
        average = statistics.mean(float(row["joint_pass_rate"]) for row in cct_rows)
        losses = len(verdict["losses"][protocol])
        cats = len(verdict["catastrophic"][protocol])
        lines.append(f"| {protocol} | {100 * average:.1f}% | {losses} | {cats} |")

    lines.extend([
        "",
        "## Lecture autorisée",
        "",
        f"- `{verdict['verdict']}` : {verdict_explanations[verdict['verdict']]}",
        "- Une architecture peut exceller dans un scénario et échouer dans un autre ; aucune moyenne ne doit effacer ces divergences.",
        "- Les profils de traits sont des hypothèses explicites. Une calibration indépendante peut inverser le classement.",
        "- Le protocole `hostile_to_cct` pénalise tous les traits de la CCT et bonifie ceux des rivaux pour tester la dépendance au cadrage favorable.",
        "",
        "## Prochaine preuve pertinente",
        "",
        "Remplacer progressivement les centres de traits par des mesures issues de prototypes territoriaux préenregistrés, en conservant les résultats qui contredisent le modèle.",
    ])
    destination.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=ROOT / "experiment.json")
    parser.add_argument("--runs", type=int, default=None, help="Override runs per cell for smoke tests")
    parser.add_argument("--output", type=Path, default=ROOT / "results")
    args = parser.parse_args()

    config = load_config(args.config)
    rows = run_all(config, args.runs)
    verdict = reversal_verdict(rows, config)
    args.output.mkdir(parents=True, exist_ok=True)
    write_csv(rows, args.output / "summary.csv")
    (args.output / "verdict.json").write_text(
        json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_report(rows, verdict, config, args.output / "report.md")
    print(json.dumps({"cells": len(rows), **verdict}, ensure_ascii=False))


if __name__ == "__main__":
    main()
