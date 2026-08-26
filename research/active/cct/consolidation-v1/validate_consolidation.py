#!/usr/bin/env python3
"""Validate the CCT 1.0 consolidation without promoting its lifecycle."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent
DEFAULT_CANDIDATE = HERE / "cct-1.0-candidate.json"
DEFAULT_LEDGER = HERE / "lineage-ledger.json"
ALLOWED_EXECUTION = {
    "partial",
    "local_tested",
    "local_tested_subset",
    "synthetic_only",
    "static_only",
    "narrative_only",
    "governance_only",
    "not_established",
}
REQUIRED_NOT_ESTABLISHED = {
    "single fully integrated executable",
    "authorization",
    "deployment",
    "institutional effect",
    "protocol robustness",
    "external transport",
}
REQUIRED_LINEAGE = {"0.1", "0.2-0.7", "0.8", "0.9", "0.10", "0.11", "0.12", "0.13", "0.14", "rename-1.0"}


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_source(path: str) -> Path:
    return (HERE / path).resolve()


def validate(candidate: dict[str, Any], ledger: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if candidate.get("schema") != "cct-consolidated-system/v1":
        errors.append("candidate schema invalide")
    if candidate.get("name") != "Confédération des communs terrestres" or candidate.get("short_name") != "CCT":
        errors.append("CCT doit rester le nom du projet politique global")
    if candidate.get("version") != "1.0-candidate":
        errors.append("version attendue: 1.0-candidate")
    partition = candidate.get("object_partition", {})
    if set(partition) != {"CCT", "CCT-POL", "CCT-CONSTITUTION", "CCT-NCE", "CCT-LAB"}:
        errors.append("partition des objets CCT incomplète")
    if "noyau constitutionnel exécutable" not in partition.get("CCT-NCE", ""):
        errors.append("CCT-NCE doit être borné au noyau exécutable")

    lifecycle = candidate.get("lifecycle", {})
    if lifecycle.get("state") != "written_and_locally_validated_composite" or lifecycle.get("promotion_blocked") is not True:
        errors.append("la consolidation doit rester locale et non promue")
    missing_limits = REQUIRED_NOT_ESTABLISHED - set(lifecycle.get("not_established", []))
    if missing_limits:
        errors.append(f"limites de cycle de vie manquantes: {sorted(missing_limits)}")

    sources = candidate.get("canonical_sources", [])
    authorities = [item.get("authority") for item in sources]
    if authorities != list(range(1, len(sources) + 1)):
        errors.append("autorités canoniques non ordonnées ou non uniques")
    for item in sources:
        source = resolve_source(item.get("path", ""))
        if not source.is_file():
            errors.append(f"source canonique absente: {item.get('path')}")

    constitution_path = resolve_source("../executable/constitution/constitution.json")
    disposition_ids = {item["id"] for item in load(constitution_path).get("dispositions", [])}
    invariants = candidate.get("invariant_register", [])
    invariant_ids = [item.get("id") for item in invariants]
    if invariant_ids != [f"I{index:02d}" for index in range(1, 16)]:
        errors.append("les quinze invariants I01-I15 doivent être présents et ordonnés")
    for item in invariants:
        if item.get("execution") not in ALLOWED_EXECUTION:
            errors.append(f"{item.get('id')}: statut d'exécution invalide")
        for target in item.get("constitutional_targets", []):
            if target.startswith("D") and target not in disposition_ids:
                errors.append(f"{item.get('id')}: disposition inconnue {target}")
        if not item.get("constitutional_targets") and item.get("execution") != "narrative_only":
            errors.append(f"{item.get('id')}: cible absente sans statut narratif")
    i13 = next((item for item in invariants if item.get("id") == "I13"), {})
    i15 = next((item for item in invariants if item.get("id") == "I15"), {})
    if i13.get("execution") != "narrative_only" or i15.get("execution") != "not_established":
        errors.append("les restes I13 et I15 doivent demeurer explicites")

    if ledger.get("schema") != "cct-lineage-ledger/v1" or ledger.get("candidate") != candidate.get("id"):
        errors.append("ledger non lié à la candidate")
    vocabulary = set(ledger.get("status_vocabulary", []))
    entries = ledger.get("entries", [])
    versions = {item.get("source_version") for item in entries}
    if REQUIRED_LINEAGE - versions:
        errors.append(f"versions de lignée manquantes: {sorted(REQUIRED_LINEAGE - versions)}")
    ids = [item.get("id") for item in entries]
    if len(ids) != len(set(ids)):
        errors.append("identifiants de lignée dupliqués")
    for item in entries:
        if item.get("status") not in vocabulary:
            errors.append(f"{item.get('id')}: statut de lignée invalide")
        if not item.get("remainder"):
            errors.append(f"{item.get('id')}: reste non déclaré")
        for path in item.get("sources", []):
            if not resolve_source(path).is_file():
                errors.append(f"{item.get('id')}: source absente {path}")
    gap = next((item for item in entries if item.get("source_version") == "0.2-0.7"), {})
    if gap.get("status") != "provenance_gap":
        errors.append("le trou de provenance 0.2-0.7 ne peut être déclaré assimilé")
    v014 = next((item for item in entries if item.get("source_version") == "0.14"), {})
    if v014.get("status") != "compiled_subset" or v014.get("targets") != ["CCT-NCE 0.14"]:
        errors.append("0.14 doit rester un sous-ensemble nommé CCT-NCE 0.14")

    freeze = load(resolve_source("../next-version/v0.14-freeze.json"))
    for filename, expected in freeze.get("files", {}).items():
        data = resolve_source(f"../next-version/{filename}").read_bytes()
        actual = hashlib.sha256(data).hexdigest()
        if actual != expected:
            errors.append(f"gel CCT-NCE altéré: {filename}")
    return errors


if __name__ == "__main__":
    result = validate(load(DEFAULT_CANDIDATE), load(DEFAULT_LEDGER))
    print(json.dumps({"valid": not result, "lifecycleCeiling": "written_and_locally_validated_composite", "errors": result}, ensure_ascii=False, indent=2))
    raise SystemExit(1 if result else 0)
