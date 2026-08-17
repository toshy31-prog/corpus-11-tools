"""Runner reproductible du laboratoire économique CCT-ECO-M4."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import statistics
from pathlib import Path
from typing import Any, Iterable, Mapping

from economy_model import METRICS, dominates, load_config, simulate_once


def percentile(values: Iterable[float], probability: float) -> float:
    ordered = sorted(values)
    if not ordered:
        raise ValueError("percentile sur série vide")
    index = max(0, min(len(ordered) - 1, math.ceil(probability * len(ordered)) - 1))
    return ordered[index]


def summarize_runs(runs: list[Mapping[str, float]]) -> dict[str, dict[str, float]]:
    return {
        metric: {
            "median": statistics.median(run[metric] for run in runs),
            "p90": percentile((run[metric] for run in runs), 0.90),
        }
        for metric in METRICS
    }


def _median_vector(summary: Mapping[str, Mapping[str, float]]) -> dict[str, float]:
    return {metric: float(summary[metric]["median"]) for metric in METRICS}


def _metric_label(metric: str) -> str:
    return {
        "vital_unmet_pct": "Besoins non servis (%)",
        "eco_overshoot_pct": "Dépassement éco. (%)",
        "inequality_gini": "Gini ressources",
        "admin_load_hours_per_1000": "Charge h/1000/mois",
        "rent_capture_pct": "Rente (%)",
        "recovery_days": "Récupération (jours)",
    }[metric]


def _build_report(config: Mapping[str, Any], result: Mapping[str, Any]) -> str:
    verdicts = result["verdicts"]
    survivors = [key for key, value in verdicts.items() if value["status"] != "rejected_model_internal"]
    rejected = [key for key, value in verdicts.items() if value["status"] == "rejected_model_internal"]
    lines = [
        "# CCT-ECO-M4-001 — comparaison économique multi-modèles",
        "",
        "## Conclusion la plus forte soutenue",
        "",
    ]
    if survivors:
        survivor_labels = ", ".join(config["regimes"][key]["label"] for key in survivors)
        lines.append(
            f"Le jumeau conserve **{len(survivors)} survivant(s) compatible(s)** : {survivor_labels}. "
            "Il ne sélectionne pas à lui seul un régime réel."
        )
    else:
        lines.append(
            "Aucun régime ne franchit les règles de perte internes ; le résultat est inconclusif "
            "pour un choix et impose une reconstruction de la famille."
        )
    if rejected:
        labels = ", ".join(config["regimes"][key]["label"] for key in rejected)
        lines.append(f"Rejetés dans la portée du modèle : {labels}.")
    lines.extend(
        [
            "",
            f"Verdict de comparaison : `{result['comparison_result']}`. La famille de quatre "
            "candidats reste incomplète par construction.",
            "",
            "Aucun score composite n'est calculé : une amélioration de charge ou de récupération "
            "ne compense jamais une privation, un dépassement, une inégalité ou une rente.",
            "",
            "## Frontières et sorties médianes",
            "",
        ]
    )
    for scenario_id, scenario in config["scenarios"].items():
        lines.extend(
            [
                f"### {scenario['label']} (`{scenario_id}`)",
                "",
                "| Régime | Vital % | Éco % | Gini | Charge | Rente % | Jours | Portes | Frontière |",
                "|---|---:|---:|---:|---:|---:|---:|---:|:---:|",
            ]
        )
        for regime_id, regime in config["regimes"].items():
            item = result["summaries"][scenario_id][regime_id]
            med = _median_vector(item["metrics"])
            lines.append(
                "| {label} | {vital:.2f} | {eco:.2f} | {gini:.3f} | {admin:.1f} | "
                "{rent:.2f} | {recovery:.1f} | {breaches} | {frontier} |".format(
                    label=regime["label"],
                    vital=med["vital_unmet_pct"],
                    eco=med["eco_overshoot_pct"],
                    gini=med["inequality_gini"],
                    admin=med["admin_load_hours_per_1000"],
                    rent=med["rent_capture_pct"],
                    recovery=med["recovery_days"],
                    breaches=len(item["breached_gates"]),
                    frontier="oui" if item["pareto_frontier"] else "non",
                )
            )
        frontier_labels = ", ".join(
            config["regimes"][key]["label"] for key in result["frontier_by_scenario"][scenario_id]
        )
        lines.extend(["", f"Frontière de Pareto : {frontier_labels}.", ""])

    lines.extend(["## Verdicts préspécifiés", ""])
    for regime_id, verdict in verdicts.items():
        lines.extend(
            [
                f"### {config['regimes'][regime_id]['label']}",
                "",
                f"- Statut : `{verdict['status']}`.",
                f"- Scènes perdant au moins trois portes : "
                f"{', '.join(verdict['constitutional_gate_loss_scenarios']) or 'aucune'}.",
                f"- Scènes de domination appariée : "
                f"{', '.join(verdict['pareto_dominated_scenarios']) or 'aucune'}.",
                f"- Limites de revendication dépassées : "
                f"{', '.join(verdict['claim_failures']) or 'aucune'}.",
                "",
            ]
        )

    lines.extend(["## Limites de détectabilité observées", ""])
    if result["detectability_warnings"]:
        lines.extend(
            [
                "Les canaux suivants sont saturés au plancher pour tous les candidats. "
                "L'absence de différence y est donc classée `indéterminée`, jamais "
                "`équivalence des régimes` :",
                "",
            ]
        )
        for warning in result["detectability_warnings"]:
            lines.append(
                f"- `{warning['scenario']}:{warning['metric']}` — "
                f"{warning['reason']} (médianes {warning['observed_medians']})."
            )
    else:
        lines.append("Aucune saturation commune exacte n'a été détectée sur les médianes.")
    lines.extend(
        [
            "",
            "## Garde épistémique",
            "",
            f"- Statut scientifique : `{config['scientific_status']}`.",
            f"- Rôle des équations : `{config['law_role']}`.",
            f"- Base de sélection : {config['selection_basis']}.",
            f"- Discriminant indépendant : {config['independent_discriminant']}.",
            f"- Condition de renversement : {config['reversal_condition']}.",
            f"- Ambiguïté restante : {config['remaining_ambiguity']}.",
            "",
            "Les seuils, scènes, paramètres et règles de perte ont été gelés dans le fichier "
            "de configuration avant la première exécution enregistrée. Cette préspécification "
            "n'est pas une validation externe des équations.",
            "",
            "## Définitions opératoires et limites",
            "",
            "| Sortie | Définition dans ce jumeau | Construit rival / limite |",
            "|---|---|---|",
        ]
    )
    for metric, definition in config["metrics"].items():
        lines.append(
            f"| {_metric_label(metric)} | {definition['operational_definition']} | "
            f"{definition['closest_alternative_construct']} — {definition['scope_guard']} |"
        )
    lines.extend(
        [
            "",
            "## Prochaine observation capable de changer la conclusion",
            "",
            "Calibrer indépendamment les huit entrées et douze paramètres sur au moins deux "
            "territoires, puis réexécuter les scènes sans permettre aux concepteurs de modifier "
            "les équations. Une inversion de frontière de Pareto ou un échec de validité d'un "
            "indicateur retire la préférence correspondante.",
            "",
        ]
    )
    return "\n".join(lines)


def run_experiment(config_path: str | Path, output_dir: str | Path) -> dict[str, Any]:
    config_path = Path(config_path)
    output_dir = Path(output_dir)
    config = load_config(config_path)
    output_dir.mkdir(parents=True, exist_ok=True)

    summaries: dict[str, dict[str, Any]] = {}
    for scenario_id in config["scenarios"]:
        summaries[scenario_id] = {}
        for regime_id in config["regimes"]:
            runs = [
                simulate_once(config, scenario_id, regime_id, run)
                for run in range(config["runs_per_scenario"])
            ]
            metric_summary = summarize_runs(runs)
            median_vector = _median_vector(metric_summary)
            breached = [
                metric for metric in METRICS if median_vector[metric] > config["gates"][metric]
            ]
            summaries[scenario_id][regime_id] = {
                "metrics": metric_summary,
                "breached_gates": breached,
            }

    detectability_warnings: list[dict[str, Any]] = []
    for scenario_id in config["scenarios"]:
        for metric in METRICS:
            medians = [
                summaries[scenario_id][regime_id]["metrics"][metric]["median"]
                for regime_id in config["regimes"]
            ]
            if all(abs(value) <= 1e-12 for value in medians):
                detectability_warnings.append(
                    {
                        "scenario": scenario_id,
                        "metric": metric,
                        "reason": "saturation exacte à la borne inférieure du simulateur",
                        "observed_medians": [round(value, 8) for value in medians],
                        "interpretation": "no_difference_is_not_equivalence",
                    }
                )

    frontier_by_scenario: dict[str, list[str]] = {}
    for scenario_id in config["scenarios"]:
        frontier: list[str] = []
        for regime_id in config["regimes"]:
            current = _median_vector(summaries[scenario_id][regime_id]["metrics"])
            dominators = []
            for rival_id in config["regimes"]:
                if rival_id == regime_id:
                    continue
                rival = _median_vector(summaries[scenario_id][rival_id]["metrics"])
                if dominates(rival, current):
                    dominators.append(rival_id)
            summaries[scenario_id][regime_id]["dominated_by"] = dominators
            summaries[scenario_id][regime_id]["pareto_frontier"] = not dominators
            if not dominators:
                frontier.append(regime_id)
        frontier_by_scenario[scenario_id] = frontier

    gate_rule = config["loss_rules"]["constitutional_gate_loss"]
    pareto_rule = config["loss_rules"]["pareto_loss"]
    verdicts: dict[str, dict[str, Any]] = {}
    for regime_id, regime in config["regimes"].items():
        gate_loss_scenarios = [
            scenario_id
            for scenario_id in config["scenarios"]
            if len(summaries[scenario_id][regime_id]["breached_gates"])
            >= gate_rule["minimum_breached_gates_in_one_scenario"]
        ]
        dominated_scenarios = [
            scenario_id
            for scenario_id in config["scenarios"]
            if summaries[scenario_id][regime_id]["dominated_by"]
        ]
        claim_failures = []
        for scenario_id in regime["prediction"]["scenarios"]:
            median = _median_vector(summaries[scenario_id][regime_id]["metrics"])
            for metric, limit in regime["prediction"]["limits"].items():
                if median[metric] > limit:
                    claim_failures.append(f"{scenario_id}:{metric}")
        rejected = (
            len(gate_loss_scenarios) >= gate_rule["minimum_scenarios"]
            or len(dominated_scenarios) >= pareto_rule["minimum_scenarios_dominated"]
        )
        status = (
            "rejected_model_internal"
            if rejected
            else "claim_weakened"
            if claim_failures
            else "survives_model_internal"
        )
        verdicts[regime_id] = {
            "status": status,
            "constitutional_gate_loss_scenarios": gate_loss_scenarios,
            "pareto_dominated_scenarios": dominated_scenarios,
            "claim_failures": claim_failures,
        }

    survivors = [
        regime_id
        for regime_id, verdict in verdicts.items()
        if verdict["status"] != "rejected_model_internal"
    ]
    comparison_result = (
        "discriminates"
        if len(survivors) == 1
        else "compatible_survivors"
        if survivors
        else "inconclusive"
    )
    result: dict[str, Any] = {
        "experiment": config["experiment"],
        "config_sha256": hashlib.sha256(config_path.read_bytes()).hexdigest(),
        "runs_per_scenario": config["runs_per_scenario"],
        "non_composite_metrics": True,
        "comparison_result": comparison_result,
        "candidate_set_incomplete": True,
        "detectability_warnings": detectability_warnings,
        "frontier_by_scenario": frontier_by_scenario,
        "summaries": summaries,
        "verdicts": verdicts,
    }

    (output_dir / "verdict.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    csv_fields = ["scenario", "regime"]
    for metric in METRICS:
        csv_fields.extend((f"{metric}_median", f"{metric}_p90"))
    csv_fields.extend(("breached_gates", "pareto_frontier", "dominated_by"))
    with (output_dir / "summary.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=csv_fields, lineterminator="\n")
        writer.writeheader()
        for scenario_id in config["scenarios"]:
            for regime_id in config["regimes"]:
                item = summaries[scenario_id][regime_id]
                row: dict[str, Any] = {"scenario": scenario_id, "regime": regime_id}
                for metric in METRICS:
                    row[f"{metric}_median"] = f"{item['metrics'][metric]['median']:.6f}"
                    row[f"{metric}_p90"] = f"{item['metrics'][metric]['p90']:.6f}"
                row["breached_gates"] = ";".join(item["breached_gates"])
                row["pareto_frontier"] = str(item["pareto_frontier"]).lower()
                row["dominated_by"] = ";".join(item["dominated_by"])
                writer.writerow(row)
    (output_dir / "report.md").write_text(_build_report(config, result), encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    base = Path(__file__).resolve().parent
    parser.add_argument("--config", type=Path, default=base / "scenarios.json")
    parser.add_argument("--output", type=Path, default=base / "results")
    args = parser.parse_args()
    result = run_experiment(args.config, args.output)
    print(
        json.dumps(
            {
                "experiment": result["experiment"],
                "comparison_result": result["comparison_result"],
                "frontier_by_scenario": result["frontier_by_scenario"],
                "verdicts": {
                    key: value["status"] for key, value in result["verdicts"].items()
                },
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
