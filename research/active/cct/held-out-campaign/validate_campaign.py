#!/usr/bin/env python3
from __future__ import annotations

from collections import Counter
import json
from pathlib import Path
import sys
from typing import Any


EXPECTED_FREEZE = "CCT-V013-FREEZE-2026-08-26-01"
REQUIRED_TAGS = {"reliable-information-rare-action", "degraded-information-available-action"}


def validate(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if data.get("protocol_version") != "cct-held-out-campaign/v1":
        errors.append("version de protocole incorrecte")
    if data.get("candidate_freeze_id") != EXPECTED_FREEZE:
        errors.append("gel de candidate incorrect")
    if data.get("contender_identities_revealed") is not False:
        errors.append("les identités doivent rester scellées avant verdict")
    submissions = data.get("submissions", [])
    if len(submissions) < 8:
        errors.append("au moins huit mondes admis sont requis")
    ids = [item.get("scenario_id") for item in submissions]
    hashes = [item.get("freeze_hash") for item in submissions]
    if len(set(ids)) != len(ids) or None in ids:
        errors.append("identifiants de scénario uniques requis")
    if len(set(hashes)) != len(hashes) or None in hashes:
        errors.append("empreintes de scénario uniques requises")
    if any(item.get("admission_status") != "admitted" for item in submissions):
        errors.append("tous les mondes doivent avoir passé l'admission")
    authors = Counter(item.get("author_id") for item in submissions)
    if None in authors or len(authors) < 2:
        errors.append("au moins deux auteurs distincts sont requis")
    if authors and max(authors.values()) > len(submissions) / 2:
        errors.append("aucun auteur ne peut fournir plus de la moitié des mondes")
    if not any(item.get("predicted_rival_advantage") is True for item in submissions):
        errors.append("un monde prédit favorable à un rival non-CCT est requis")
    observed_tags = {tag for item in submissions for tag in item.get("stress_tags", [])}
    missing_tags = REQUIRED_TAGS - observed_tags
    if missing_tags:
        errors.append(f"familles de stress manquantes: {sorted(missing_tags)}")
    return errors


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: python3 validate_campaign.py campaign-manifest.json")
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    failures = validate(data)
    print(json.dumps({"valid": not failures, "errors": failures}, ensure_ascii=False, indent=2))
    raise SystemExit(1 if failures else 0)
