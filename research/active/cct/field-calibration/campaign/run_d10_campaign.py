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
PROTOCOL_PATH = ROOT.parent / "protocols" / "d10-budget-charge-constitutionnelle-v0.1.json"
GATES = ("vital_need", "critical_ceiling", "right", "minimal_trace", "restitution")
TRACE_CONTESTABILITY_FIELDS = (
    "timestamped_decision",
    "reason",
    "saturated_resource",
    "protected_gate",
    "recourse_path",
    "correction",
    "restitution_event",
    "counter_narrative",
)
OBSERVATION_REQUIRED_FIELDS = {
    "D10-O1": ("gate_states", "gate_narratives"),
    "D10-O2": (
        "hours_by_role",
        "processing_delay",
        "abandonments.before_recourse",
        "abandonments.after_recourse",
        "unplanned_hours",
        "work_logs.visible",
        "work_logs.hidden",
        "work_logs.lost",
    ),
    "D10-O3": tuple(f"trace.{field}" for field in TRACE_CONTESTABILITY_FIELDS) + (
        "trace.audit_off_registry_decisions",
    ),
    "D10-O4": (
        "recovery_log",
        "queue_below_local_threshold",
        "reactivation_verified",
        "remaining_losses",
        "active_repair_paths",
        "simulated_usability_test",
    ),
}
OBSERVATION_PROXY_FIELDS = {
    "D10-O1": ("gate_proxy_passes", "gate_proxy_margins"),
    "D10-O2": ("visible_work", "hidden_work", "lost_work"),
    "D10-O3": ("contestability_proxy_passes", "contestability_margin"),
    "D10-O4": ("restitution_proxy_passes", "restitution_margin"),
}
EXECUTION_REQUIRED_FIELDS = (
    "execution_contract.activation_observable",
    "execution_contract.activation_window_hours",
    "execution_contract.activation_channel",
    "execution_contract.presentation_order_rule",
    "execution_contract.observer_created_work_tracking",
    "execution_contract.missing_values_tracking",
    "execution_contract.abandonment_tracking",
    "execution_contract.off_registry_decision_tracking",
)


def load_config(path: Path = CONFIG_PATH) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def has_path(record: Mapping[str, object], path: str) -> bool:
    current: object = record
    for part in path.split("."):
        if not isinstance(current, Mapping) or part not in current:
            return False
        current = current[part]
    return current is not None


def field_coverage(
    records: list[Mapping[str, object]], fields: tuple[str, ...]
) -> dict[str, list[str]]:
    present = [field for field in fields if records and all(has_path(record, field) for record in records)]
    return {
        "required_fields": list(fields),
        "present_fields": present,
        "missing_fields": [field for field in fields if field not in present],
    }


def protocol_conformance(
    config: Mapping[str, object], rows: list[dict[str, object]]
) -> dict[str, object]:
    protocol = json.loads(PROTOCOL_PATH.read_text(encoding="utf-8"))
    if protocol["id"] != config["id"]:
        raise ValueError("campaign configuration and observation protocol disagree")
    declared_observations = {item["id"] for item in protocol["observations"]}
    if declared_observations != {"D10-O1", "D10-O2", "D10-O3", "D10-O4"}:
        raise ValueError("unexpected observation contract")
    outcomes = [outcome for row in rows for outcome in row["outcomes"].values()]
    observation_status = {}
    for observation_id in sorted(declared_observations):
        coverage = field_coverage(outcomes, OBSERVATION_REQUIRED_FIELDS[observation_id])
        proxy_coverage = field_coverage(outcomes, OBSERVATION_PROXY_FIELDS[observation_id])
        observation_status[observation_id] = {
            **coverage,
            "proxy_fields_present": proxy_coverage["present_fields"],
            "verdict": "fields_complete" if not coverage["missing_fields"] else "fields_incomplete",
        }
    execution_status = field_coverage([config], EXECUTION_REQUIRED_FIELDS)
    execution_status["verdict"] = (
        "fields_complete" if not execution_status["missing_fields"] else "fields_incomplete"
    )
    structurally_complete = execution_status["verdict"] == "fields_complete" and all(
        item["verdict"] == "fields_complete" for item in observation_status.values()
    )
    verdict = (
        "structural_fields_complete_semantics_unverified"
        if structurally_complete
        else "nonconformant_observation_contract"
    )
    return {
        "reference": str(PROTOCOL_PATH.relative_to(ROOT.parents[3])),
        "assessment_scope": "pipeline_verified",
        "assessment_kind": "structural_field_coverage",
        "verdict": verdict,
        "artifact_role": (
            "protocol_execution_candidate" if structurally_complete else "implementation_audit_only"
        ),
        "execution_status": execution_status,
        "observation_status": observation_status,
        "consequence": (
            "Structural presence permits only a protocol execution candidate; semantics, "
            "usability and protocol reversal remain unverified."
            if structurally_complete
            else "The numerical rows audit implemented equations. Protocol reversal claims "
            "remain not assessable until every execution and O1-O4 requirement is present."
        ),
    }


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
        "gate_proxy_passes": gates,
        "gate_proxy_margins": margins,
        "visible_work": round(visible, 9),
        "hidden_work": round(hidden, 9),
        "lost_work": round(lost, 9),
        "contestability_proxy_passes": contestability >= 0.5,
        "contestability_margin": round(contestability - 0.5, 9),
        "restitution_proxy_passes": restitution_margin >= 0.0 and gates["restitution"],
        "restitution_margin": round(restitution_margin, 9),
    }


def classify(
    rows: list[dict[str, object]],
    conformance_verdict: str = "nonconformant_observation_contract",
) -> dict[str, object]:
    by_variation: dict[str, list[dict[str, object]]] = {}
    for row in rows:
        by_variation.setdefault(str(row["variation"]), []).append(row)
    classifications = {}
    for variation, selected in by_variation.items():
        d10_gate_proxy_events = []
        comparator_proxy_events = []
        hidden_load_scalar_events = []
        proxy_threshold_events = []
        baseline_proxy_threshold_events = []
        d10_relative_advantage_worlds = []
        d10_relative_margins = []
        restitution_proxy_events = []
        for row in selected:
            d10 = row["outcomes"]["d10"]
            baseline = row["outcomes"]["baseline"]
            if not all(d10["gate_proxy_passes"].values()):
                d10_gate_proxy_events.append(row["world_id"])
            if (
                all(baseline["gate_proxy_passes"].values())
                and all(
                    float(baseline[key]) < float(d10[key])
                    for key in ("visible_work", "hidden_work", "lost_work")
                )
            ):
                comparator_proxy_events.append(row["world_id"])
            if float(d10["hidden_work"]) > float(baseline["hidden_work"]):
                hidden_load_scalar_events.append(row["world_id"])
            if not d10["contestability_proxy_passes"]:
                proxy_threshold_events.append(row["world_id"])
            if not baseline["contestability_proxy_passes"]:
                baseline_proxy_threshold_events.append(row["world_id"])
            relative_margin = float(d10["contestability_margin"]) - float(
                baseline["contestability_margin"]
            )
            d10_relative_margins.append(relative_margin)
            if relative_margin > 0:
                d10_relative_advantage_worlds.append(row["world_id"])
            if not d10["restitution_proxy_passes"]:
                restitution_proxy_events.append(row["world_id"])
        systematic_hidden = len(hidden_load_scalar_events) == len(selected)
        mechanical_events = []
        if d10_gate_proxy_events:
            mechanical_events.append("gate_proxy_below_threshold")
        if comparator_proxy_events:
            mechanical_events.append("comparator_proxy_dominance")
        if systematic_hidden:
            mechanical_events.append("hidden_load_scalar_worse_in_all_rows")
        if proxy_threshold_events:
            mechanical_events.append("contestability_proxy_below_threshold")
        if restitution_proxy_events:
            mechanical_events.append("restitution_proxy_below_threshold")
        if conformance_verdict == "nonconformant_observation_contract":
            protocol_status = "not_assessable_nonconformant"
        elif conformance_verdict == "structural_fields_complete_semantics_unverified":
            protocol_status = "not_assessable_semantics_unverified"
        else:
            raise ValueError(
                f"unknown protocol conformance verdict: {conformance_verdict}"
            )
        classifications[variation] = {
            "verdict": protocol_status,
            "protocol_reversal_status": protocol_status,
            "mechanical_proxy_condition": bool(mechanical_events),
            "mechanical_proxy_events": mechanical_events,
            "d10_gate_proxy_below_threshold_worlds": d10_gate_proxy_events,
            "comparator_gate_and_load_proxy_dominance_worlds": comparator_proxy_events,
            "d10_hidden_load_scalar_worse_in_all_rows": systematic_hidden,
            "d10_hidden_load_scalar_worse_worlds": hidden_load_scalar_events,
            "d10_contestability_proxy_below_threshold_worlds": proxy_threshold_events,
            "baseline_contestability_proxy_below_threshold_worlds": baseline_proxy_threshold_events,
            "d10_relative_contestability_advantage_worlds": d10_relative_advantage_worlds,
            "d10_relative_contestability_margin_min": round(min(d10_relative_margins), 9),
            "d10_relative_contestability_margin_max": round(max(d10_relative_margins), 9),
            "d10_restitution_proxy_below_threshold_worlds": restitution_proxy_events,
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
    conformance = protocol_conformance(config, rows)
    return {
        "protocol": config["id"],
        "scope": config["scope"],
        "generator": config["generator"],
        "declared_invariants": config["invariants"],
        "audited_invariants": [
            "same generated row supplied to both mechanism equations",
            "complete 2^5 factorial traversal",
            "five gate proxy bits and margins reported separately",
            "visible hidden and lost workload scalars reported separately",
            "no compensatory aggregate success score",
        ],
        "protocol_effect": config["protocol_effect"],
        "withdrawal_condition": config["withdrawal_condition"],
        "world_count": len(generated),
        "variation_count": len(config["sensitivity_variations"]),
        "protocol_conformance": conformance,
        "construct_validity": {
            "construct": "trace contestable under load",
            "operational_definition": "A decision can be attributed, understood, contested, corrected and reconciled after contention.",
            "computed_indicator": "scalar contestability proxy minus a fixed threshold",
            "measurement_process": "deterministic equation over declared channel and perturbation coefficients",
            "closest_alternative_construct": "configured contestability score",
            "missing_trace_fields": list(TRACE_CONTESTABILITY_FIELDS),
            "verdict": "proxy_substitution",
            "separating_observation": "generated O3 trace fields plus an independently specified recourse-use oracle",
        },
        "rows": rows,
        "classification": classify(rows, str(conformance["verdict"])),
    }


def write_report(result: Mapping[str, object], path: Path) -> None:
    world_count = int(result["world_count"])
    variation_count = int(result["variation_count"])
    conformance = result["protocol_conformance"]
    missing_observations = "; ".join(
        f"{observation_id}: {', '.join(item['missing_fields'])}"
        for observation_id, item in conformance["observation_status"].items()
        if item["missing_fields"]
    ) or "aucun"
    missing_execution = ", ".join(conformance["execution_status"]["missing_fields"]) or "aucune"
    conformance_verdict = str(conformance["verdict"])
    artifact_role = str(conformance["artifact_role"])
    if conformance_verdict == "nonconformant_observation_contract":
        scope_reason = "car le contrat d'observation n'est pas satisfait"
        conformance_summary = (
            "Les lignes numériques auditent l'implémentation, mais ne constituent pas une "
            "exécution conforme de `CCT-SC-D10-001`; les exigences structurelles absentes "
            "interdisent même le rôle de candidat à l'exécution du protocole."
        )
        construct_summary = (
            "Il ne génère pas la trace O3 nécessaire pour établir qu'une décision est attribuable, "
            "contestable, corrigible et réconciliable. Le franchissement du seuil ne constitue "
            "donc pas un renversement de la trace ou du recours."
        )
        construct_field_summary = (
            "Les champs absents sont : "
            + ", ".join(result["construct_validity"]["missing_trace_fields"])
            + "."
        )
    elif conformance_verdict == "structural_fields_complete_semantics_unverified":
        scope_reason = (
            "car les champs structurels sont complets, tandis que leur sémantique et leur "
            "utilisabilité restent non vérifiées"
        )
        conformance_summary = (
            "Les champs requis sont structurellement présents. Cela autorise seulement le rôle "
            "`protocol_execution_candidate`; la sémantique, l'utilisabilité et tout renversement "
            "protocolaire restent non évalués."
        )
        construct_summary = (
            "Les champs O3 sont structurellement présents, mais leur contenu, leur relation au "
            "score et leur utilisabilité ne sont pas vérifiés. Le seuil reste donc un proxy et "
            "ne constitue pas un renversement de la trace ou du recours."
        )
        construct_field_summary = "Champs O3 structurellement absents : aucun."
    else:
        raise ValueError(f"unknown protocol conformance verdict: {conformance_verdict}")
    lines = [
        "# CCT-SC-D10-001 — artefact numérique apparié", "",
        "## Portée", "",
        f"Calcul `model_internal` sur {world_count} mondes factoriels fictifs et "
        f"{variation_count} variations déclarées. "
        "Il ne mesure aucune institution, population, personne, décision ou donnée réelle. "
        f"Son rôle d'artefact est `{artifact_role}` {scope_reason}.", "",
        "## Conditions mécaniques de proxy", "",
        "| Variation | Renversement protocolaire | Événements mécaniques | Proxy de porte D10 sous seuil | Proxy de contestabilité D10 sous seuil | Proxy témoin sous seuil | Proxy de restitution D10 sous seuil | Dominance sur proxies de portes/charges |",
        "|---|---|---|---:|---:|---:|---:|---:|",
    ]
    for variation, item in result["classification"].items():
        events = ", ".join(item["mechanical_proxy_events"]) or "aucun"
        lines.append(
            f"| {variation} | {item['protocol_reversal_status']} | {events} | "
            f"{len(item['d10_gate_proxy_below_threshold_worlds'])}/{world_count} | "
            f"{len(item['d10_contestability_proxy_below_threshold_worlds'])}/{world_count} | "
            f"{len(item['baseline_contestability_proxy_below_threshold_worlds'])}/{world_count} | "
            f"{len(item['d10_restitution_proxy_below_threshold_worlds'])}/{world_count} | "
            f"{len(item['comparator_gate_and_load_proxy_dominance_worlds'])}/{world_count} |"
        )
    baseline = result["classification"]["baseline"]
    constrained = result["classification"]["d10_constrained_recourse"]
    lines.extend([
        "", "## Conclusion la plus forte permise", "",
        f"Dans la variation de base, le renversement protocolaire est "
        f"`{baseline['protocol_reversal_status']}`. La condition mécanique de proxy vaut "
        f"`{str(baseline['mechanical_proxy_condition']).lower()}`; elle ne constitue pas une "
        "observation O1, O2, O3 ou O4.", "",
        f"Dans la variation de recours contraint, le renversement protocolaire reste "
        f"`{constrained['protocol_reversal_status']}`. Le proxy D10 passe "
        f"sous le seuil dans {len(constrained['d10_contestability_proxy_below_threshold_worlds'])}/{world_count} "
        f"mondes, tout en gardant une marge supérieure de "
        f"{constrained['d10_relative_contestability_margin_min']:.2f} au témoin dans "
        f"{len(constrained['d10_relative_contestability_advantage_worlds'])}/{world_count} mondes.", "",
        "## Validité du construit", "",
        f"Verdict : `{result['construct_validity']['verdict']}`. Le pipeline calcule un "
        f"score configuré puis lui applique un seuil. {construct_summary}", "",
        construct_field_summary, "",
        "## Conformité au protocole", "",
        f"Verdict : `{conformance_verdict}`. {conformance_summary}", "",
        f"Champs d'observation absents : {missing_observations}.", "",
        f"Exigences d'exécution absentes : {missing_execution}.", "",
        "Les scalaires de charge visible, cachée et perdue restent séparés; aucun score global ne compense un proxy de porte. "
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
