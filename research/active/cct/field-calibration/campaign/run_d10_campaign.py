#!/usr/bin/env python3
"""Execute the bounded fictional CCT-SC-D10-001 matched campaign."""

from __future__ import annotations

import argparse
from copy import deepcopy
from itertools import product
import json
from pathlib import Path
from typing import Mapping


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "d10_campaign_v0.1.json"
GATES = ("vital_need", "critical_ceiling", "right", "minimal_trace", "restitution")


def load_config(path: Path = CONFIG_PATH) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def worlds(config: Mapping[str, object]) -> list[dict[str, object]]:
    axes = config["generator"]["axes"]
    names = list(axes)
    generated = []
    for levels in product(*(axes[name].items() for name in names)):
        labels = {name: level[0] for name, level in zip(names, levels)}
        values = {name: float(level[1]) for name, level in zip(names, levels)}
        generated.append({
            "id": "__".join(f"{name}-{labels[name]}" for name in names),
            "labels": labels,
            "values": values,
        })
    return generated


def varied_mechanisms(config: Mapping[str, object], variation: str) -> dict[str, object]:
    mechanisms = deepcopy(config["mechanisms"])
    change = config["sensitivity_variations"][variation]
    if not change:
        return mechanisms
    mechanism = mechanisms[change["mechanism"]]
    for key, delta in change.items():
        if key == "mechanism":
            continue
        if key == "gate_capacity":
            mechanism[key] = {
                gate: max(0.0, min(1.0, float(value) + float(delta)))
                for gate, value in mechanism[key].items()
            }
        else:
            mechanism[key] = max(0.0, min(1.5, float(mechanism[key]) + float(delta)))
    return mechanisms


def simulate(
    config: Mapping[str, object], world: Mapping[str, object], mechanism: Mapping[str, object]
) -> dict[str, object]:
    values = world["values"]
    mean_pressure = sum(float(value) for value in values.values()) / len(values)
    effective_shedding = float(mechanism["reversible_shedding"]) * (
        0.65 * float(values["load"]) + 0.35 * float(values["rhythm"])
    )
    gates: dict[str, bool] = {}
    margins: dict[str, float] = {}
    for gate, weights in config["gate_pressure_weights"].items():
        pressure = sum(float(weights[axis]) * float(values[axis]) for axis in weights)
        adjusted_pressure = pressure * (1.0 - 0.22 * effective_shedding)
        capacity = float(mechanism["gate_capacity"][gate]) - (
            float(mechanism["contention_penalty"]) * mean_pressure
        )
        margin = capacity - adjusted_pressure
        margins[gate] = round(margin, 9)
        gates[gate] = margin >= 0.0

    workload_base = 20.0 + 70.0 * float(values["load"]) + 34.0 * float(values["rhythm"])
    off_registry = float(values["perturbation"])
    channel_loss = float(values["channel"])
    visible = workload_base * float(mechanism["visible_work"]) * (1.0 - 0.28 * effective_shedding)
    hidden = workload_base * float(mechanism["hidden_work"]) * (0.45 + off_registry + 0.25 * channel_loss)
    lost = workload_base * float(mechanism["lost_work"]) * (off_registry + 0.35 * channel_loss)
    contestability = float(mechanism["contestability"]) - 0.36 * channel_loss - 0.24 * off_registry
    restitution_margin = (
        float(mechanism["restitution_capacity"])
        - 0.42 * float(values["load"])
        - 0.22 * float(values["rhythm"])
        - 0.18 * off_registry
    )
    return {
        "gates": gates,
        "gate_margins": margins,
        "visible_work": round(visible, 9),
        "hidden_work": round(hidden, 9),
        "lost_work": round(lost, 9),
        "contestable": contestability >= 0.5,
        "contestability_margin": round(contestability - 0.5, 9),
        "restitution_usable": restitution_margin >= 0.0 and gates["restitution"],
        "restitution_margin": round(restitution_margin, 9),
    }


def classify(rows: list[dict[str, object]]) -> dict[str, object]:
    by_variation: dict[str, list[dict[str, object]]] = {}
    for row in rows:
        by_variation.setdefault(str(row["variation"]), []).append(row)
    classifications = {}
    for variation, selected in by_variation.items():
        d10_gate_losses = []
        comparator_reversals = []
        hidden_load_reversals = []
        trace_reversals = []
        restitution_reversals = []
        for row in selected:
            d10 = row["outcomes"]["d10"]
            baseline = row["outcomes"]["baseline"]
            if not all(d10["gates"].values()):
                d10_gate_losses.append(row["world_id"])
            if (
                all(baseline["gates"].values())
                and all(
                    float(baseline[key]) < float(d10[key])
                    for key in ("visible_work", "hidden_work", "lost_work")
                )
            ):
                comparator_reversals.append(row["world_id"])
            if float(d10["hidden_work"]) > float(baseline["hidden_work"]):
                hidden_load_reversals.append(row["world_id"])
            if not d10["contestable"]:
                trace_reversals.append(row["world_id"])
            if not d10["restitution_usable"]:
                restitution_reversals.append(row["world_id"])
        systematic_hidden = len(hidden_load_reversals) == len(selected)
        triggered = bool(comparator_reversals or systematic_hidden or trace_reversals or restitution_reversals)
        classifications[variation] = {
            "verdict": "reversal_triggered" if triggered else "not_reversed_in_declared_model",
            "d10_gate_loss_worlds": d10_gate_losses,
            "comparator_maintains_all_gates_with_lower_separate_loads": comparator_reversals,
            "d10_hidden_load_worse_in_all_worlds": systematic_hidden,
            "d10_hidden_load_worse_worlds": hidden_load_reversals,
            "d10_trace_unusable_worlds": trace_reversals,
            "d10_restitution_unusable_worlds": restitution_reversals,
        }
    return classifications


def execute(config: Mapping[str, object]) -> dict[str, object]:
    generated = worlds(config)
    rows = []
    for variation in config["sensitivity_variations"]:
        mechanisms = varied_mechanisms(config, variation)
        for world in generated:
            outcomes = {
                name: simulate(config, world, mechanism)
                for name, mechanism in mechanisms.items()
            }
            rows.append({
                "variation": variation,
                "world_id": world["id"],
                "world": world["values"],
                "outcomes": outcomes,
            })
    return {
        "protocol": config["id"],
        "scope": config["scope"],
        "generator": config["generator"],
        "invariants": config["invariants"],
        "protocol_effect": config["protocol_effect"],
        "withdrawal_condition": config["withdrawal_condition"],
        "world_count": len(generated),
        "variation_count": len(config["sensitivity_variations"]),
        "rows": rows,
        "classification": classify(rows),
    }


def write_report(result: Mapping[str, object], path: Path) -> None:
    lines = [
        "# CCT-SC-D10-001 — campagne fictive appariée", "",
        "## Portée", "",
        "Résultat `model_internal` sur 32 mondes factoriels fictifs et cinq variations déclarées. "
        "Il ne mesure aucune institution, population, personne, décision ou donnée réelle.", "",
        "## Classifications mécaniques", "",
        "| Variation | Verdict | Pertes de porte D10 | Trace D10 inutilisable | Restitution D10 inutilisable | Rival meilleur sur les trois charges et cinq portes |", 
        "|---|---|---:|---:|---:|---:|",
    ]
    for variation, item in result["classification"].items():
        lines.append(
            f"| {variation} | {item['verdict']} | {len(item['d10_gate_loss_worlds'])}/32 | "
            f"{len(item['d10_trace_unusable_worlds'])}/32 | "
            f"{len(item['d10_restitution_unusable_worlds'])}/32 | "
            f"{len(item['comparator_maintains_all_gates_with_lower_separate_loads'])}/32 |"
        )
    baseline = result["classification"]["baseline"]
    constrained = result["classification"]["d10_constrained_recourse"]
    lines.extend([
        "", "## Conclusion la plus forte permise", "",
        f"Dans la variation de base, la condition de renversement est `{baseline['verdict']}`. "
        f"D10 perd au moins une porte dans {len(baseline['d10_gate_loss_worlds'])}/32 mondes, "
        f"sa trace devient inutilisable dans {len(baseline['d10_trace_unusable_worlds'])}/32 mondes "
        f"et sa restitution dans {len(baseline['d10_restitution_unusable_worlds'])}/32 mondes. "
        "Ces nombres décrivent uniquement les équations déclarées.", "",
        f"La variation de recours contraint produit `{constrained['verdict']}` et rend la trace "
        f"inutilisable dans {len(constrained['d10_trace_unusable_worlds'])}/32 mondes. La survie "
        "de base est donc dépendante du protocole; elle ne constitue pas une validation du mécanisme.", "",
        "Les charges visible, cachée et perdue restent séparées; aucun score global ne compense une porte perdue. "
        "Les variations montrent l'effet possible du protocole et des coefficients choisis.", "",
        "## Génération, contrôles et retrait", "",
        f"- Générateur : `{result['generator']['kind']}`, graine `{result['generator']['seed']}` (non utilisée car parcours exhaustif).",
        "- Paramètres : deux niveaux déclarés pour charge, canal, rythme, perturbation et environnement.",
        "- Invariants : mondes appariés, parcours complet, cinq portes et trois charges séparées, aucun score compensatoire.",
        f"- Effet possible du protocole : {result['protocol_effect']}",
        f"- Condition de retrait : {result['withdrawal_condition']}",
    ])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=CONFIG_PATH)
    parser.add_argument("--output", type=Path, default=ROOT.parent / "results" / "cct-sc-d10-001")
    args = parser.parse_args()
    result = execute(load_config(args.config))
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "result.json").write_text(
        json.dumps(result, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    write_report(result, args.output / "report.md")
    print(json.dumps(result["classification"], sort_keys=True))


if __name__ == "__main__":
    main()
