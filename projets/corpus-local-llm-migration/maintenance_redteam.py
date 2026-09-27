"""Offline adversarial checks for non-executing maintenance proposals."""
from __future__ import annotations

import copy
import json
from typing import Any

from maintenance_proposal import MaintenanceProposalError, create, evaluate_preconditions, finalize


def baseline_spec(ident="maintenance-redteam"):
    return {
        "id": ident,
        "summary": "Copie de diagnostic stable à classer.",
        "change": {"kind": "copy", "targets": ["/state/source.json", "/state/archive/source.json"]},
        "preconditions": [{"id": "source.sha256", "expected": "abc"}],
        "rollback": {"strategy": "restore_copy", "artifacts": ["/state/backup/source.json"]},
        "postconditions": [{"id": "archive.sha256", "expected": "abc"}],
    }


def _cases(value: Any):
    if not isinstance(value, dict) or value.get("schema_version") != 1 or not isinstance(value.get("cases"), list):
        raise ValueError("Corpus red-team maintenance invalide.")
    rows, seen = [], set()
    for row in value["cases"]:
        if not isinstance(row, dict) or set(row) != {"id", "kind", "expected"} or not all(isinstance(row[key], str) and row[key] for key in row) or row["id"] in seen:
            raise ValueError("Cas red-team maintenance invalide.")
        if row["expected"] not in {"rejected", "not_verified"}:
            raise ValueError("Attente red-team maintenance invalide.")
        seen.add(row["id"])
        rows.append(row)
    return rows


def _rejected(action):
    try:
        action()
    except MaintenanceProposalError:
        return True
    return False


def run(cases: dict[str, Any]) -> dict[str, Any]:
    """Exercise only in-memory contracts; never execute a maintenance action."""
    rows = []
    for case in _cases(cases):
        proposal = create(baseline_spec())
        kind = case["kind"]
        if kind == "tamper_proposal":
            proposal["change"]["targets"].append("/state/unreviewed")
            outcome = "rejected" if _rejected(lambda: evaluate_preconditions(proposal, {"source.sha256": "abc"})) else "accepted"
        elif kind == "cross_proposal_receipt":
            other = create(baseline_spec("other-proposal"))
            outcome = "rejected" if _rejected(lambda: finalize(proposal, {"proposal_sha256": other["proposal_sha256"], "status": "executed", "evidence_id": "op"}, {"archive.sha256": "abc"})) else "accepted"
        elif kind == "missing_rollback":
            broken = baseline_spec()
            broken["rollback"]["artifacts"] = []
            outcome = "rejected" if _rejected(lambda: create(broken)) else "accepted"
        elif kind == "missing_postcondition":
            receipt = finalize(proposal, {"proposal_sha256": proposal["proposal_sha256"], "status": "executed", "evidence_id": "op"}, {})
            outcome = receipt["verification"]
        elif kind == "cancelled_action":
            receipt = finalize(proposal, {"proposal_sha256": proposal["proposal_sha256"], "status": "cancelled", "evidence_id": "op"}, {"archive.sha256": "abc"})
            outcome = receipt["verification"]
        elif kind == "malformed_action_receipt":
            outcome = "rejected" if _rejected(lambda: finalize(proposal, {"status": "executed"}, {"archive.sha256": "abc"})) else "accepted"
        else:
            raise ValueError("Type red-team maintenance inconnu : " + kind)
        rows.append({"id": case["id"], "kind": kind, "expected": case["expected"], "outcome": outcome, "passed": outcome == case["expected"]})
    return {
        "schema_version": 1,
        "kind": "maintenance_redteam_receipt",
        "execution": "not_started",
        "writes_performed": False,
        "model_calls": 0,
        "passed": all(row["passed"] for row in rows),
        "cases": rows,
        "limits": [
            "Les reçus d’action sont des entrées de contrat ; leur authenticité externe exige un stockage ou une signature hors de ce module.",
            "Aucun fichier, service, organizer ou rollback n’est exécuté par cette red-team.",
        ],
    }


def main(argv=None):
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser(description="Red-team statique des propositions de maintenance.")
    parser.add_argument("--cases", type=Path, default=Path(__file__).with_name("maintenance_redteam_cases.json"))
    args = parser.parse_args(argv)
    result = run(json.loads(args.cases.read_text(encoding="utf-8")))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
