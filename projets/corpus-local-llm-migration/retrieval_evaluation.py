"""Deterministic, offline quality evaluation for recorded retrieval identifiers.

It evaluates already-recorded ranked document IDs only. It never queries the
retriever, loads an embedding model, reads document content, or changes an index.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

SCHEMA = "corpus.retrieval-evaluation.v1"
_MAX_CASES = 200
_MAX_IDS = 100
_ID = re.compile(r"^[A-Za-z0-9._:/@-]{1,200}$")


def _ids(value, field, *, allow_empty=False):
    if not isinstance(value, list) or (not value and not allow_empty) or len(value) > _MAX_IDS:
        raise ValueError(f"{field} invalide")
    if any(not isinstance(item, str) or not _ID.fullmatch(item) for item in value):
        raise ValueError(f"{field} invalide")
    if len(set(value)) != len(value):
        raise ValueError(f"{field} contient des doublons")
    return value


def _fraction(value, name):
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not 0 <= value <= 1:
        raise ValueError(f"{name} invalide")
    return float(value)


def evaluate(manifest: dict) -> dict:
    """Evaluate ranked IDs against explicit relevance and safety expectations."""
    if not isinstance(manifest, dict) or manifest.get("schema") != SCHEMA:
        raise ValueError("Schéma d’évaluation retrieval invalide")
    cases = manifest.get("cases")
    if not isinstance(cases, list) or not cases or len(cases) > _MAX_CASES:
        raise ValueError("cases invalide")
    gates = manifest.get("quality_gates", {})
    if not isinstance(gates, dict) or set(gates) - {"min_mean_recall_at_k", "min_case_hit_rate", "max_forbidden_results"}:
        raise ValueError("quality_gates invalide")
    min_recall = _fraction(gates.get("min_mean_recall_at_k", 1), "min_mean_recall_at_k")
    min_hit_rate = _fraction(gates.get("min_case_hit_rate", 1), "min_case_hit_rate")
    max_forbidden = gates.get("max_forbidden_results", 0)
    if type(max_forbidden) is not int or max_forbidden < 0:
        raise ValueError("max_forbidden_results invalide")
    seen = set()
    rows = []
    for case in cases:
        if not isinstance(case, dict) or set(case) - {"id", "expected_ids", "forbidden_ids", "result_ids"}:
            raise ValueError("cas d’évaluation invalide")
        ident = case.get("id")
        if not isinstance(ident, str) or not _ID.fullmatch(ident) or ident in seen:
            raise ValueError("id de cas invalide ou dupliqué")
        seen.add(ident)
        expected = _ids(case.get("expected_ids"), "expected_ids")
        forbidden = _ids(case.get("forbidden_ids", []), "forbidden_ids", allow_empty=True)
        results = _ids(case.get("result_ids"), "result_ids", allow_empty=True)
        if set(expected) & set(forbidden):
            raise ValueError("expected_ids et forbidden_ids se chevauchent")
        relevant = [item for item in results if item in expected]
        forbidden_found = [item for item in results if item in forbidden]
        first_rank = next((index + 1 for index, item in enumerate(results) if item in expected), None)
        rows.append({
            "id": ident,
            "result_count": len(results),
            "expected_count": len(expected),
            "relevant_found": relevant,
            "missing_expected": [item for item in expected if item not in results],
            "forbidden_found": forbidden_found,
            "recall_at_k": len(relevant) / len(expected),
            "precision_at_k": len(relevant) / len(results) if results else 0,
            "first_relevant_rank": first_rank,
            "hit": bool(relevant),
        })
    count = len(rows)
    mean_recall = sum(row["recall_at_k"] for row in rows) / count
    hit_rate = sum(row["hit"] for row in rows) / count
    forbidden_count = sum(len(row["forbidden_found"]) for row in rows)
    checks = {
        "mean_recall_at_k": mean_recall >= min_recall,
        "case_hit_rate": hit_rate >= min_hit_rate,
        "forbidden_results": forbidden_count <= max_forbidden,
    }
    return {
        "schema": SCHEMA,
        "mode": "recorded_results_only",
        "writes_performed": False,
        "result": "pass" if all(checks.values()) else "fail",
        "checks": checks,
        "metrics": {"cases": count, "mean_recall_at_k": mean_recall, "case_hit_rate": hit_rate,
                    "forbidden_results": forbidden_count},
        "quality_gates": {"min_mean_recall_at_k": min_recall, "min_case_hit_rate": min_hit_rate,
                          "max_forbidden_results": max_forbidden},
        "cases": rows,
        "limits": [
            "Évalue des identifiants de résultats déjà enregistrés ; aucune recherche n’est lancée.",
            "La pertinence attendue est fournie par l’évaluateur : elle doit être revue et représentative.",
            "Ce résultat ne mesure ni la latence, ni la qualité des embeddings, ni la confidentialité des documents.",
        ],
    }


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description="Évalue des identifiants de retrieval enregistrés, hors ligne.")
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args(argv)
    print(json.dumps(evaluate(json.loads(args.manifest.read_text(encoding="utf-8"))), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
