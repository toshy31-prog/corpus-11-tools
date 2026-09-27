"""Provenance and quarantine contract for imported Corpus memory notes.

The contract handles hashes and small provenance labels only. It does not read,
write, index, retrieve, or inject note text. Every imported note starts in
quarantine; a review can only propose an explicit recall selection. Core-memory
promotion is intentionally outside this module.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

SCHEMA = "corpus.memory-quarantine.v1"
SOURCE_KINDS = frozenset({"imported_file", "conversation_archive", "external_document", "tool_output", "manual_export"})
CONFIDENCE = frozenset({"external_untrusted", "declared", "local_observed"})
_HASH = re.compile(r"^[0-9a-f]{64}$")


def _hash(value, label):
    if not isinstance(value, str) or not _HASH.fullmatch(value):
        raise ValueError(label + " doit être une empreinte SHA-256 hexadécimale.")
    return value


def _id(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9._:-]{1,120}", value):
        raise ValueError("id de note invalide.")
    return value


def _source(value):
    if not isinstance(value, dict) or set(value) != {"kind", "reference_sha256"}:
        raise ValueError("source invalide.")
    if value["kind"] not in SOURCE_KINDS:
        raise ValueError("source.kind invalide.")
    return {"kind": value["kind"], "reference_sha256": _hash(value["reference_sha256"], "source.reference_sha256")}


def _entry(value):
    if not isinstance(value, dict) or set(value) != {"id", "note_sha256", "source", "source_confidence"}:
        raise ValueError("entrée importée invalide.")
    confidence = value["source_confidence"]
    if confidence not in CONFIDENCE:
        raise ValueError("source_confidence invalide.")
    return {"id": _id(value["id"]), "note_sha256": _hash(value["note_sha256"], "note_sha256"),
            "source": _source(value["source"]), "source_confidence": confidence}


def quarantine(entries) -> dict:
    """Freeze imported-note provenance in an untrusted, non-injectable state."""
    if not isinstance(entries, list) or not entries:
        raise ValueError("entries doit être une liste non vide.")
    parsed = [_entry(entry) for entry in entries]
    ids = [entry["id"] for entry in parsed]
    if len(ids) != len(set(ids)):
        raise ValueError("id de note dupliqué.")
    return {
        "schema": SCHEMA,
        "mode": "provenance_only",
        "writes_performed": False,
        "notes": [{**entry, "state": "quarantined", "target_tier": "quarantine",
                   "review": {"status": "not_reviewed"},
                   "automatic_injection": False, "core_promotion": "not_supported"} for entry in parsed],
        "limits": [
            "La confiance décrit la provenance déclarée, pas la véracité du contenu.",
            "Une note importée n’est ni indexée ni ajoutée au rappel ou au noyau par ce contrat.",
            "La promotion au noyau exige une procédure distincte, humaine et traçable.",
        ],
    }


def validate(manifest) -> dict:
    """Validate a pristine quarantine manifest; returns a short status only."""
    if not isinstance(manifest, dict) or manifest.get("schema") != SCHEMA:
        raise ValueError("manifeste de quarantaine invalide.")
    notes = manifest.get("notes")
    if not isinstance(notes, list) or not notes:
        raise ValueError("notes invalides.")
    expected = quarantine([{key: note.get(key) for key in ("id", "note_sha256", "source", "source_confidence")} for note in notes])
    if notes != expected["notes"]:
        raise ValueError("manifeste de quarantaine altéré ou non pristine.")
    return {"schema": SCHEMA, "valid": True, "notes": len(notes), "state": "quarantined",
            "execution": "not_performed", "writes_performed": False}


def review_candidates(manifest, reviews) -> dict:
    """Return review proposals without changing a quarantine manifest or a memory tier."""
    validation = validate(manifest)
    if not isinstance(reviews, list):
        raise ValueError("reviews doit être une liste.")
    source = {note["id"]: note for note in manifest["notes"]}
    seen = set()
    rows = []
    for review in reviews:
        if not isinstance(review, dict) or set(review) != {"id", "note_sha256", "reviewer_declared", "decision"}:
            raise ValueError("review invalide.")
        ident = _id(review["id"])
        if ident in seen or ident not in source:
            raise ValueError("review inconnue ou dupliquée.")
        seen.add(ident)
        if review["note_sha256"] != source[ident]["note_sha256"]:
            raise ValueError("review sur note périmée.")
        if review["reviewer_declared"] != "local_user":
            raise ValueError("reviewer_declared invalide.")
        if review["decision"] not in {"retain_quarantine", "propose_recall"}:
            raise ValueError("La revue ne peut proposer que la quarantaine ou le rappel.")
        rows.append({"id": ident, "note_sha256": review["note_sha256"], "reviewer_declared": "local_user",
                     "decision": review["decision"],
                     "next_state": "manual_recall_selection_required" if review["decision"] == "propose_recall" else "quarantined",
                     "target_tier": "quarantine", "core_promotion": "not_supported"})
    return {**validation, "mode": "review_proposal_only", "reviewed": rows,
            "unreviewed_note_ids": sorted(set(source) - seen), "verified_result": None,
            "promotion": "not_performed",
            "limits": [
                "La revue est déclarée locale ; ce module ne lit ni le contenu ni l’identité du relecteur.",
                "propose_recall ne modifie pas l’index ou le tier de la note : une sélection explicite reste requise.",
                "Aucune décision ne peut promouvoir une note importée au noyau.",
            ]}


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description="Quarantaine locale de provenance pour notes importées.")
    parser.add_argument("entries", type=Path, help="JSON liste d’entrées sans contenu de note")
    parser.add_argument("--reviews", type=Path)
    args = parser.parse_args(argv)
    manifest = quarantine(json.loads(args.entries.read_text(encoding="utf-8")))
    value = review_candidates(manifest, json.loads(args.reviews.read_text(encoding="utf-8"))) if args.reviews else manifest
    print(json.dumps(value, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
