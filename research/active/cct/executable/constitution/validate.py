#!/usr/bin/env python3
"""Validateur de la constitution et des décisions CCT.

Le module importe le sous-ensemble JSON Schema borné de Corpus, puis ajoute les
contraintes croisées CCT qu'un schéma structurel n'exprime pas simplement. Il ne
constitue ni une autorisation juridique, ni une preuve de performance réelle.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


for _parent in Path(__file__).resolve().parents:
    _labs = _parent / "corpus-11-tools" / "labs" / "python"
    if _labs.is_dir():
        sys.path.insert(0, str(_labs))
        break
else:  # pragma: no cover - repository layout failure
    raise RuntimeError("Corpus generic labs are unavailable")

from corpus_labs import validate_json_schema_subset  # noqa: E402


MODULE_DIR = Path(__file__).resolve().parent
CONSTITUTION_SCHEMA = MODULE_DIR / "constitution.schema.json"
DECISION_SCHEMA = MODULE_DIR / "decision.schema.json"
DEFAULT_CONSTITUTION = MODULE_DIR / "constitution.json"

def validate_schema(
    value: Any,
    schema: dict[str, Any],
    root_schema: dict[str, Any] | None = None,
    path: str = "$",
) -> list[str]:
    """Conserve l'ancienne surface CCT en déléguant le moteur à Corpus."""

    return validate_json_schema_subset(
        value,
        schema,
        root_schema=root_schema,
        path=path,
    )


def load_json(path: Path | str) -> Any:
    with Path(path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _duplicates(values: Iterable[str]) -> set[str]:
    seen: set[str] = set()
    duplicates: set[str] = set()
    for value in values:
        if value in seen:
            duplicates.add(value)
        seen.add(value)
    return duplicates


def _actor_references(disposition: dict[str, Any]) -> Iterable[tuple[str, str]]:
    for role, actor_ids in disposition["actors"].items():
        for actor_id in actor_ids:
            yield f"actors.{role}", actor_id
    for trigger in disposition["triggers"]:
        yield f"triggers.{trigger['id']}.observer", trigger["observer"]
    for trace in disposition["required_traces"]:
        yield f"required_traces.{trace['id']}.producer", trace["producer"]
    for appeal in disposition["appeals"]:
        for actor_id in appeal["recipient"]:
            yield f"appeals.{appeal['id']}.recipient", actor_id
    for actor_id in disposition["stop"]["observers"]:
        yield "stop.observers", actor_id
    for actor_id in disposition["stop"]["authorized_actors"]:
        yield "stop.authorized_actors", actor_id
    for actor_id in disposition["restitution"]["responsible"]:
        yield "restitution.responsible", actor_id
    for actor_id in disposition["restitution"]["certifier"]:
        yield "restitution.certifier", actor_id


LIFECYCLE_ORDER = {
    "proposee": 0,
    "ecrite": 1,
    "tests_statiques_passes": 2,
    "autorisee": 3,
    "deployee": 4,
    "reobservee": 5,
}


def validate_constitution_data(
    data: dict[str, Any], schema: dict[str, Any] | None = None
) -> list[str]:
    schema = schema or load_json(CONSTITUTION_SCHEMA)
    errors = validate_schema(data, schema)
    if errors:
        return errors

    actor_ids = [actor["id"] for actor in data["actors"]]
    invariant_ids = [invariant["id"] for invariant in data["invariants"]]
    disposition_ids = [disposition["id"] for disposition in data["dispositions"]]
    for label, values in (
        ("acteur", actor_ids),
        ("invariant", invariant_ids),
        ("disposition", disposition_ids),
    ):
        for duplicate in sorted(_duplicates(values)):
            errors.append(f"{label} dupliqué: {duplicate}")

    known_actors = set(actor_ids)
    known_invariants = set(invariant_ids)
    covered_invariants: set[str] = set()

    if LIFECYCLE_ORDER[data["artifact_status"]["state"]] > LIFECYCLE_ORDER["tests_statiques_passes"]:
        errors.append("artifact_status.state: un prototype sans effet juridique ne peut prétendre être autorisé ou déployé")

    for disposition in data["dispositions"]:
        disposition_id = disposition["id"]
        covered_invariants.update(disposition["invariants"])
        for invariant_id in disposition["invariants"]:
            if invariant_id not in known_invariants:
                errors.append(f"{disposition_id}: invariant inconnu {invariant_id}")
        for location, actor_id in _actor_references(disposition):
            if actor_id not in known_actors:
                errors.append(f"{disposition_id}.{location}: acteur inconnu {actor_id}")

        for collection_name, collection, marker in (
            ("triggers", disposition["triggers"], "-T"),
            ("required_traces", disposition["required_traces"], "-TR"),
            ("appeals", disposition["appeals"], "-R"),
        ):
            local_ids = [entry["id"] for entry in collection]
            for duplicate in sorted(_duplicates(local_ids)):
                errors.append(f"{disposition_id}.{collection_name}: identifiant dupliqué {duplicate}")
            for local_id in local_ids:
                if not local_id.startswith(disposition_id + marker):
                    errors.append(f"{disposition_id}.{collection_name}: {local_id} appartient à une autre disposition")

        roles = disposition["actors"]
        critical_intersection = (
            set(roles["proposer_regle"])
            & set(roles["collecter_donnees"])
            & set(roles["evaluer"])
            & set(roles["sanctionner"])
        )
        if critical_intersection:
            errors.append(f"{disposition_id}: cumul règle-données-évaluation-sanction par {sorted(critical_intersection)}")
        if set(roles["executer"]) & set(roles["controler"]):
            errors.append(f"{disposition_id}: exécution et contrôle ne sont pas séparés")

        stop_keys = set(roles["arreter"])
        restart_keys = set(roles["relancer"])
        certify_keys = set(roles["certifier_restitution"])
        if stop_keys & restart_keys or stop_keys & certify_keys or restart_keys & certify_keys:
            errors.append(f"{disposition_id}: les clés d'arrêt, relance et certification doivent être disjointes")
        if not set(disposition["stop"]["authorized_actors"]).issubset(stop_keys):
            errors.append(f"{disposition_id}: acteur d'arrêt absent du rôle arreter")
        if not set(disposition["restitution"]["certifier"]).issubset(certify_keys):
            errors.append(f"{disposition_id}: certificateur absent du rôle certifier_restitution")
        if set(disposition["restitution"]["responsible"]) & set(disposition["restitution"]["certifier"]):
            errors.append(f"{disposition_id}: responsable et certificateur de restitution doivent être distincts")

        lifecycle = disposition["lifecycle"]
        state_rank = LIFECYCLE_ORDER[lifecycle["state"]]
        if state_rank > LIFECYCLE_ORDER["tests_statiques_passes"]:
            errors.append(f"{disposition_id}.lifecycle: surclassement institutionnel interdit dans ce prototype")
        for next_state in lifecycle["allowed_next"]:
            if LIFECYCLE_ORDER[next_state] <= state_rank:
                errors.append(f"{disposition_id}.lifecycle.allowed_next: transition non progressive vers {next_state}")
        if state_rank <= LIFECYCLE_ORDER["tests_statiques_passes"]:
            required_unknown = {"autorisee", "deployee", "reobservee"}
            missing = required_unknown - set(lifecycle["not_established"])
            if missing:
                errors.append(f"{disposition_id}.lifecycle.not_established: statuts manquants {sorted(missing)}")

    uncovered = known_invariants - covered_invariants
    if uncovered:
        errors.append(f"invariants sans disposition exécutable: {sorted(uncovered)}")
    return errors


def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def validate_decision_data(
    decision: dict[str, Any],
    constitution: dict[str, Any],
    schema: dict[str, Any] | None = None,
) -> list[str]:
    schema = schema or load_json(DECISION_SCHEMA)
    errors = validate_schema(decision, schema)
    if errors:
        return errors

    constitution_errors = validate_constitution_data(constitution)
    if constitution_errors:
        return [f"constitution invalide: {error}" for error in constitution_errors]
    if decision["constitution_id"] != constitution["id"]:
        errors.append("constitution_id: la décision vise une autre constitution")
    if decision["status"] != decision["lifecycle"]["state"]:
        errors.append("lifecycle.state doit être identique au status de la décision")
    if decision["status"] not in {"brouillon", "proposee"}:
        errors.append("status: la constitution candidate non autorisée ne peut valider une décision active ou autorisée")
    if "ordinaire" in decision["classification"] and len(decision["classification"]) > 1:
        errors.append("classification: ordinaire ne peut être combinée à une classe renforcée")

    starts = _parse_datetime(decision["duration"]["starts_at"])
    review = _parse_datetime(decision["duration"]["review_at"])
    expires = _parse_datetime(decision["duration"]["expires_at"])
    if not starts < review <= expires:
        errors.append("duration: ordre requis starts_at < review_at <= expires_at")

    known_actors = {actor["id"] for actor in constitution["actors"]}
    for role, assignments in decision["actors"].items():
        for actor_id in assignments:
            if actor_id not in known_actors:
                errors.append(f"actors.{role}: acteur inconnu {actor_id}")
    roles = decision["actors"]
    critical_intersection = (
        set(roles["proposer_regle"])
        & set(roles["collecter_donnees"])
        & set(roles["evaluer"])
        & set(roles["sanctionner"])
    )
    if critical_intersection:
        errors.append(f"actors: cumul règle-données-évaluation-sanction par {sorted(critical_intersection)}")
    if set(roles["executer"]) & set(roles["controler"]):
        errors.append("actors: exécution et contrôle ne sont pas séparés")
    if (
        set(roles["arreter"]) & set(roles["relancer"])
        or set(roles["arreter"]) & set(roles["certifier_restitution"])
        or set(roles["relancer"]) & set(roles["certifier_restitution"])
    ):
        errors.append("actors: les clés d'arrêt, relance et certification doivent être disjointes")

    dispositions = {item["id"]: item for item in constitution["dispositions"]}
    compliance_ids = [item["disposition_id"] for item in decision["compliance"]]
    for duplicate in sorted(_duplicates(compliance_ids)):
        errors.append(f"compliance: disposition dupliquée {duplicate}")
    if any(kind in decision["classification"] for kind in ("urgente", "coercitive", "secrete")) and "D04" not in compliance_ids:
        errors.append("compliance: D04 obligatoire pour décision urgente, coercitive ou secrète")

    for compliance in decision["compliance"]:
        disposition_id = compliance["disposition_id"]
        disposition = dispositions.get(disposition_id)
        if disposition is None:
            errors.append(f"compliance: disposition inconnue {disposition_id}")
            continue
        valid_trigger_ids = {item["id"] for item in disposition["triggers"]}
        supplied_trigger_ids = {item["trigger_id"] for item in compliance["trigger_evidence"]}
        unknown_triggers = supplied_trigger_ids - valid_trigger_ids
        if unknown_triggers:
            errors.append(f"{disposition_id}: déclencheurs inconnus {sorted(unknown_triggers)}")
        if not supplied_trigger_ids & valid_trigger_ids:
            errors.append(f"{disposition_id}: aucune preuve d'un déclencheur recevable")

        missing_invariants = set(disposition["invariants"]) - set(compliance["invariants_checked"])
        if missing_invariants:
            errors.append(f"{disposition_id}: invariants non vérifiés {sorted(missing_invariants)}")
        expected_traces = {item["id"] for item in disposition["required_traces"]}
        missing_traces = expected_traces - set(compliance["trace_plan"])
        if missing_traces:
            errors.append(f"{disposition_id}: traces obligatoires absentes {sorted(missing_traces)}")
        valid_appeals = {item["id"] for item in disposition["appeals"]}
        missing_appeals = valid_appeals - set(compliance["appeal_plan"])
        if missing_appeals:
            errors.append(f"{disposition_id}: recours obligatoires absents {sorted(missing_appeals)}")

        for role, authorized in disposition["actors"].items():
            if not set(decision["actors"][role]) & set(authorized):
                errors.append(f"{disposition_id}: aucun acteur affecté n'est habilité pour {role}")

        stop_plan = compliance["stop_plan"]
        if stop_plan["authorized_actor"] not in disposition["stop"]["authorized_actors"]:
            errors.append(f"{disposition_id}: acteur d'arrêt non habilité {stop_plan['authorized_actor']}")
        if stop_plan["authorized_actor"] not in decision["actors"]["arreter"]:
            errors.append(f"{disposition_id}: acteur d'arrêt absent des affectations")
        if stop_plan["deadline_hours"] > disposition["stop"]["deadline_hours"]:
            errors.append(f"{disposition_id}: délai d'arrêt supérieur à la limite constitutionnelle")

        restitution = compliance["restitution_plan"]
        if restitution["responsible"] not in disposition["restitution"]["responsible"]:
            errors.append(f"{disposition_id}: responsable de restitution non habilité")
        if restitution["certifier"] not in disposition["restitution"]["certifier"]:
            errors.append(f"{disposition_id}: certificateur de restitution non habilité")
        if restitution["responsible"] not in decision["actors"]["executer"]:
            errors.append(f"{disposition_id}: responsable de restitution absent des exécutants")
        if restitution["certifier"] not in decision["actors"]["certifier_restitution"]:
            errors.append(f"{disposition_id}: certificateur absent des affectations")
        if restitution["certifier"] in {restitution["responsible"], stop_plan["authorized_actor"]}:
            errors.append(f"{disposition_id}: certification de restitution non indépendante")
        if restitution["deadline_hours"] > disposition["restitution"]["deadline_hours"]:
            errors.append(f"{disposition_id}: délai de restitution supérieur à la limite constitutionnelle")
    return errors


def validate_document(
    document_path: Path | str,
    constitution_path: Path | str = DEFAULT_CONSTITUTION,
) -> tuple[str, list[str]]:
    data = load_json(document_path)
    kind = data.get("document_kind") if isinstance(data, dict) else None
    if kind == "cct_constitution":
        return kind, validate_constitution_data(data)
    if kind == "cct_decision":
        constitution = load_json(constitution_path)
        return kind, validate_decision_data(data, constitution)
    return str(kind or "inconnu"), ["$.document_kind: type de document inconnu"]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Valide une constitution ou une décision CCT candidate.")
    parser.add_argument("document", type=Path, help="Fichier JSON à valider")
    parser.add_argument("--constitution", type=Path, default=DEFAULT_CONSTITUTION, help="Constitution de référence pour une décision")
    parser.add_argument("--json", action="store_true", help="Émettre le résultat en JSON")
    args = parser.parse_args(argv)
    try:
        kind, errors = validate_document(args.document, args.constitution)
    except (OSError, json.JSONDecodeError, KeyError, ValueError) as exc:
        kind, errors = "illisible", [str(exc)]
    result = {"valid": not errors, "document_kind": kind, "errors": errors}
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif errors:
        print(f"INVALIDE — {args.document}")
        for error in errors:
            print(f"- {error}")
    else:
        print(f"VALIDE — {args.document} ({kind})")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
