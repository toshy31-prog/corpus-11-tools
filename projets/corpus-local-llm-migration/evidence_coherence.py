"""Block contradictory local agent evidence without promoting any success.

It composes frozen fixtures, redacted traces, tool-policy receipts and optional
maintenance evidence.  It performs no execution and treats agreement only as
absence of a detected contradiction.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any

from scenario_graders import grade


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _maintenance(value: Any, declared_result: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {"status": "invalid", "blockers": ["maintenance_artifact_invalid"]}
    if value.get("kind") == "not_applicable":
        if set(value) != {"kind", "reason"} or not isinstance(value["reason"], str) or not value["reason"].strip():
            return {"status": "invalid", "blockers": ["maintenance_not_applicable_invalid"]}
        return {"status": "not_applicable", "blockers": []}
    if value.get("kind") != "maintenance_receipt":
        return {"status": "invalid", "blockers": ["maintenance_kind_invalid"]}
    copy = dict(value)
    digest = copy.pop("receipt_sha256", None)
    if not isinstance(digest, str) or hashlib.sha256(_canonical(copy).encode("utf-8")).hexdigest() != digest:
        return {"status": "invalid", "blockers": ["maintenance_receipt_sha256_invalid"]}
    action = value.get("action")
    verification = value.get("verification")
    if not isinstance(action, dict) or action.get("status") not in {"executed", "failed", "cancelled"} or verification not in {"verified", "not_verified"}:
        return {"status": "invalid", "blockers": ["maintenance_receipt_shape_invalid"]}
    blockers = []
    if declared_result == "pass" and action["status"] != "executed":
        blockers.append("maintenance_not_executed_with_declared_pass")
    if verification == "verified" and action["status"] != "executed":
        blockers.append("maintenance_verified_without_execution")
    return {"status": "receipt", "action_status": action["status"], "verification": verification, "blockers": blockers}


def assess(bank: dict, fixtures: dict, submission: dict, links: dict, maintenance: dict) -> dict:
    """Return coherence only; a coherent packet remains unverified."""
    try:
        graded = grade(bank, fixtures, submission, links)
    except ValueError as error:
        return {
            "schema_version": 1,
            "kind": "interartifact_coherence",
            "execution": "not_started",
            "coherence_status": "blocked",
            "blockers": ["fixture_or_submission_invalid:" + str(error)[:120]],
            "verified_result": None,
            "promotion": "not_performed",
            "limits": ["Un paquet invalide est bloqué sans exécution ni promotion."],
        }
    blockers = []
    if graded.get("grade_status") != "structural_checks_passed":
        blockers.extend("grader_axis_failed:" + name for name in graded.get("failed_axes", []))
    policy = submission.get("tool_policy_receipt", {}) if isinstance(submission, dict) else {}
    enabled = policy.get("enabled_tools", []) if isinstance(policy, dict) else []
    names = set()
    for item in enabled:
        if not isinstance(item, dict) or not isinstance(item.get("name"), str) or not item["name"]:
            blockers.append("policy_tool_identity_missing")
            continue
        names.add(item["name"])
    trace_tools = {span["attributes"].get("tool.name") for span in graded.get("trace", {}).get("spans", [])
                   if span.get("kind") == "tool" and isinstance(span.get("attributes", {}).get("tool.name"), str)}
    unexpected = sorted(trace_tools - names)
    if unexpected:
        blockers.append("trace_tool_not_exposed_by_policy:" + ",".join(unexpected))
    if policy.get("integrity") == "unverified_fail_closed" and trace_tools:
        blockers.append("trace_tool_present_after_policy_fail_closed")
    maintenance_state = _maintenance(maintenance, graded.get("declared_result"))
    blockers.extend(maintenance_state["blockers"])
    return {
        "schema_version": 1,
        "kind": "interartifact_coherence",
        "execution": "not_started",
        "coherence_status": "blocked" if blockers else "consistent_not_promoted",
        "blockers": sorted(set(blockers)),
        "fixture": {"id": graded.get("fixture_id"), "valid": graded.get("fixtures_valid") is True},
        "trace": {"tool_count": len(trace_tools), "unexpected_tools": unexpected,
                  "content_stored": graded.get("trace", {}).get("privacy", {}).get("content_stored")},
        "policy": {"integrity": policy.get("integrity", "not_reported"), "enabled_tool_count": len(names)},
        "maintenance": maintenance_state,
        "verified_result": None,
        "promotion": "not_performed",
        "limits": [
            "Cohérent signifie seulement qu’aucune contradiction couverte n’a été détectée.",
            "Cette évaluation ne juge ni le texte final, ni l’autorisation effective, ni l’effet extérieur.",
            "Aucun modèle, outil, maintenance ou service n’est lancé.",
        ],
    }
