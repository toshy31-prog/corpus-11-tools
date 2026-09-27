"""Non-executing maintenance proposals with evidence and rollback contracts.

This module is intentionally unable to touch the filesystem, start a service,
or invoke an organizer.  It defines the evidence needed *before* a separate,
explicitly-authorized maintenance action and what must be observed afterwards.
"""
from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from typing import Any


class MaintenanceProposalError(ValueError):
    pass


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _digest(value: Any) -> str:
    return hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()


def _steps(value: Any, field: str) -> list[dict[str, str]]:
    if not isinstance(value, list) or not value:
        raise MaintenanceProposalError(f"{field} doit contenir au moins une vérification.")
    rows = []
    seen = set()
    for row in value:
        if not isinstance(row, dict) or set(row) != {"id", "expected"}:
            raise MaintenanceProposalError(f"Étape invalide dans {field}.")
        ident, expected = row["id"], row["expected"]
        if not isinstance(ident, str) or not ident or len(ident) > 180 or not isinstance(expected, str) or not expected:
            raise MaintenanceProposalError(f"Étape invalide dans {field}.")
        if ident in seen:
            raise MaintenanceProposalError(f"Étape dupliquée dans {field} : {ident}.")
        seen.add(ident)
        rows.append({"id": ident, "expected": expected})
    return rows


def create(spec: dict[str, Any]) -> dict[str, Any]:
    """Create a reviewable proposal; this function has no side effect."""
    if not isinstance(spec, dict):
        raise MaintenanceProposalError("Proposition objet requise.")
    required = {"id", "summary", "change", "preconditions", "rollback", "postconditions"}
    if set(spec) != required:
        raise MaintenanceProposalError("Champs de proposition incomplets ou inconnus.")
    ident, summary = spec["id"], spec["summary"]
    if not isinstance(ident, str) or not ident or len(ident) > 120:
        raise MaintenanceProposalError("Identifiant de proposition invalide.")
    if not isinstance(summary, str) or not summary.strip() or len(summary) > 500:
        raise MaintenanceProposalError("Résumé de proposition invalide.")
    change = spec["change"]
    if not isinstance(change, dict) or set(change) != {"kind", "targets"}:
        raise MaintenanceProposalError("Changement invalide.")
    if change["kind"] not in {"copy", "move", "edit", "delete", "classify"}:
        raise MaintenanceProposalError("Type de changement invalide.")
    if not isinstance(change["targets"], list) or not change["targets"] or any(not isinstance(x, str) or not x.startswith("/") for x in change["targets"]):
        raise MaintenanceProposalError("Cibles absolues requises.")
    if len(set(change["targets"])) != len(change["targets"]):
        raise MaintenanceProposalError("Cibles dupliquées.")
    rollback = spec["rollback"]
    if not isinstance(rollback, dict) or set(rollback) != {"strategy", "artifacts"}:
        raise MaintenanceProposalError("Plan de retour arrière invalide.")
    if rollback["strategy"] not in {"restore_snapshot", "restore_copy", "reverse_move", "not_applicable"}:
        raise MaintenanceProposalError("Stratégie de retour arrière invalide.")
    if not isinstance(rollback["artifacts"], list) or any(not isinstance(x, str) or not x for x in rollback["artifacts"]):
        raise MaintenanceProposalError("Artefacts de retour arrière invalides.")
    if change["kind"] != "classify" and not rollback["artifacts"]:
        raise MaintenanceProposalError("Un changement matériel exige un artefact de retour arrière.")
    value = {
        "schema_version": 1,
        "kind": "maintenance_proposal",
        "state": "proposed",
        "execution": "not_started",
        "approval": "required",
        "id": ident,
        "summary": summary.strip(),
        "change": {"kind": change["kind"], "targets": sorted(change["targets"])},
        "preconditions": _steps(spec["preconditions"], "preconditions"),
        "rollback": {"strategy": rollback["strategy"], "artifacts": sorted(rollback["artifacts"])},
        "postconditions": _steps(spec["postconditions"], "postconditions"),
        "limits": [
            "Cette proposition ne modifie aucun fichier et ne lance aucune opération.",
            "Une autorisation explicite et une exécution séparée restent nécessaires.",
            "Le reçu final ne vaut vérification que si une preuve d’exécution correspondante est fournie.",
        ],
    }
    value["proposal_sha256"] = _digest(value)
    return value


def _validate_proposal_integrity(proposal: dict[str, Any]) -> None:
    if not isinstance(proposal, dict) or proposal.get("kind") != "maintenance_proposal":
        raise MaintenanceProposalError("Proposition de maintenance requise.")
    actual = dict(proposal)
    fingerprint = actual.pop("proposal_sha256", None)
    if not isinstance(fingerprint, str) or fingerprint != _digest(actual):
        raise MaintenanceProposalError("Empreinte de proposition invalide.")


def evaluate_preconditions(proposal: dict[str, Any], observations: dict[str, str]) -> dict[str, Any]:
    """Evaluate declared preconditions against caller-provided observations only."""
    _validate_proposal_integrity(proposal)
    if not isinstance(observations, dict) or any(not isinstance(k, str) or not isinstance(v, str) for k, v in observations.items()):
        raise MaintenanceProposalError("Observations invalides.")
    rows = [{**step, "observed": observations.get(step["id"]), "met": observations.get(step["id"]) == step["expected"]}
            for step in proposal["preconditions"]]
    return {"proposal_sha256": proposal["proposal_sha256"], "state": "ready_for_authorization" if all(row["met"] for row in rows) else "blocked", "checks": rows,
            "execution": "not_started"}


def finalize(proposal: dict[str, Any], action_receipt: dict[str, Any], observations: dict[str, str]) -> dict[str, Any]:
    """Create a post-action receipt; never treats a planned action as executed."""
    _validate_proposal_integrity(proposal)
    if not isinstance(action_receipt, dict) or set(action_receipt) != {"proposal_sha256", "status", "evidence_id"}:
        raise MaintenanceProposalError("Reçu d’action invalide.")
    if action_receipt["proposal_sha256"] != proposal.get("proposal_sha256"):
        raise MaintenanceProposalError("Reçu d’action lié à une autre proposition.")
    if action_receipt["status"] not in {"executed", "failed", "cancelled"} or not isinstance(action_receipt["evidence_id"], str) or not action_receipt["evidence_id"]:
        raise MaintenanceProposalError("Statut ou preuve d’action invalide.")
    if not isinstance(observations, dict) or any(not isinstance(k, str) or not isinstance(v, str) for k, v in observations.items()):
        raise MaintenanceProposalError("Observations invalides.")
    rows = [{**step, "observed": observations.get(step["id"]), "met": observations.get(step["id"]) == step["expected"]}
            for step in proposal["postconditions"]]
    verified = action_receipt["status"] == "executed" and all(row["met"] for row in rows)
    receipt = {
        "schema_version": 1,
        "kind": "maintenance_receipt",
        "proposal_sha256": proposal["proposal_sha256"],
        "action": {"status": action_receipt["status"], "evidence_id": action_receipt["evidence_id"]},
        "postconditions": rows,
        "verification": "verified" if verified else "not_verified",
        "rollback": deepcopy(proposal["rollback"]),
        "limits": "Ce reçu évalue les observations fournies ; il ne prouve pas une cause ni un effet au-delà de ces contrôles.",
    }
    receipt["receipt_sha256"] = _digest(receipt)
    return receipt
