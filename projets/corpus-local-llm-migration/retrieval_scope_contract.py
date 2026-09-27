"""Offline admissibility checks for recorded retrieval results.

This closes a gap between ranking quality and memory governance: a result can be
relevant yet be unsuitable for a given context because it is quarantined,
unreviewed or absent from the declared evidence pool.  The module receives only
identifiers and declared metadata; it never opens a document, index, embedding
model, network connection, or runtime.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

SCHEMA = "corpus.retrieval-scope.v1"
_ID = re.compile(r"^[A-Za-z0-9._:/@-]{1,200}$")
_TIERS = frozenset({"core", "recall", "archive", "procedural", "quarantine"})
_PURPOSES = frozenset({"conversation", "resume", "procedure"})


def _id(value, field):
    if not isinstance(value, str) or not _ID.fullmatch(value):
        raise ValueError(f"{field} invalide")
    return value


def _ids(value, field):
    if not isinstance(value, list) or len(value) > 100:
        raise ValueError(f"{field} invalide")
    parsed = [_id(item, field) for item in value]
    if len(parsed) != len(set(parsed)):
        raise ValueError(f"{field} contient des doublons")
    return parsed


def evaluate(manifest: dict) -> dict:
    """Check whether recorded identifiers may be used for a declared purpose.

    This is an admission decision, not a relevance score and not an execution
    permission.  Unknown identifiers and quarantined material fail closed.
    """
    if not isinstance(manifest, dict) or manifest.get("schema") != SCHEMA:
        raise ValueError("Schéma de portée retrieval invalide")
    allowed = {"schema", "purpose", "records", "result_ids", "allow_tiers"}
    if set(manifest) != allowed:
        raise ValueError("Champs de portée retrieval invalides")
    purpose = manifest["purpose"]
    if purpose not in _PURPOSES:
        raise ValueError("purpose invalide")
    allow_tiers = manifest["allow_tiers"]
    if not isinstance(allow_tiers, list) or not allow_tiers or set(allow_tiers) - _TIERS:
        raise ValueError("allow_tiers invalide")
    if "quarantine" in allow_tiers:
        raise ValueError("La quarantaine ne peut jamais être admise au retrieval")
    result_ids = _ids(manifest["result_ids"], "result_ids")
    records = manifest["records"]
    if not isinstance(records, list) or not records or len(records) > 500:
        raise ValueError("records invalide")
    pool = {}
    for record in records:
        if not isinstance(record, dict) or set(record) != {"id", "tier", "review_state", "provenance_state"}:
            raise ValueError("record invalide")
        ident = _id(record["id"], "record.id")
        if ident in pool or record["tier"] not in _TIERS:
            raise ValueError("record dupliqué ou tier invalide")
        if record["review_state"] not in {"reviewed", "not_reviewed"}:
            raise ValueError("review_state invalide")
        if record["provenance_state"] not in {"declared", "verified", "unknown"}:
            raise ValueError("provenance_state invalide")
        pool[ident] = record
    rows = []
    for ident in result_ids:
        record = pool.get(ident)
        reasons = []
        if record is None:
            reasons.append("unknown_identifier")
        else:
            if record["tier"] not in allow_tiers:
                reasons.append("tier_not_allowed")
            if record["tier"] == "quarantine":
                reasons.append("quarantined")
            if record["review_state"] != "reviewed":
                reasons.append("not_reviewed")
            if record["provenance_state"] == "unknown":
                reasons.append("provenance_unknown")
        rows.append({"id": ident, "admitted": not reasons, "reasons": reasons})
    rejected = [row for row in rows if not row["admitted"]]
    return {
        "schema": SCHEMA,
        "mode": "recorded_identifiers_and_declared_metadata_only",
        "writes_performed": False,
        "network": "not_used",
        "result": "pass" if not rejected else "fail_closed",
        "purpose": purpose,
        "allow_tiers": sorted(allow_tiers),
        "rows": rows,
        "metrics": {"result_count": len(rows), "admitted": len(rows) - len(rejected), "rejected": len(rejected)},
        "limits": [
            "Ce contrat ne mesure pas la pertinence sémantique ni le rang.",
            "reviewed et verified sont des statuts déclarés : leur preuve est hors de ce module.",
            "Une admission au contexte ne donne aucune permission d’exécuter un outil ou de modifier la mémoire.",
        ],
    }


def main(argv=None):
    parser = __import__("argparse").ArgumentParser(description="Vérifie la portée de résultats retrieval enregistrés.")
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args(argv)
    print(json.dumps(evaluate(json.loads(args.manifest.read_text(encoding="utf-8"))), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
