"""Deterministic multi-axis graders for future, already-recorded agent scenarios.

The grader checks structural evidence only: tool exposure, router policy,
reported terminal state and a reported latency budget. It never executes a
scenario, reads tool arguments, judges final-answer meaning, or promotes a
reported pass to verified success.
"""
from __future__ import annotations

import json
from pathlib import Path

from agent_trace import normalize
from scenario_evaluation import validate_fixtures

HERE = Path(__file__).resolve().parent
DEFAULT_LINKS = HERE / "TOOL_SCENARIO_LINKS.json"


def _object(value, label):
    if not isinstance(value, dict):
        raise ValueError(label + " invalide")
    return value


def _number(value, label):
    if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
        raise ValueError(label + " invalide")
    return float(value)


def _scenario_link(links, fixture_id):
    links = _object(links, "liens")
    if links.get("schema_version") != 1 or not isinstance(links.get("links"), list) or not isinstance(links.get("not_applicable"), list):
        raise ValueError("liens invalides")
    selected = [row for row in links["links"] if isinstance(row, dict) and row.get("scenario_id") == fixture_id]
    if len(selected) > 1:
        raise ValueError("lien de scénario dupliqué")
    if selected:
        namespaces = selected[0].get("required_namespaces")
        if not isinstance(namespaces, list) or not namespaces or any(not isinstance(item, str) or not item for item in namespaces):
            raise ValueError("namespaces requis invalides")
        return sorted(set(namespaces))
    if fixture_id in links["not_applicable"]:
        return []
    raise ValueError("scénario absent des liens")


def _policy_axis(receipt, required_namespaces):
    receipt = _object(receipt, "reçu de politique")
    enabled = receipt.get("enabled_tools")
    forbidden = receipt.get("forbidden_namespaces")
    unknown = receipt.get("unknown_enabled_tools")
    permission = _object(receipt.get("execution_permission"), "execution_permission")
    if not isinstance(enabled, list) or not isinstance(forbidden, list) or not isinstance(unknown, list):
        raise ValueError("reçu de politique invalide")
    namespaces = []
    for item in enabled:
        if not isinstance(item, dict) or not isinstance(item.get("namespace"), str):
            raise ValueError("outil exposé invalide")
        namespaces.append(item["namespace"])
    exposed = sorted(set(namespaces))
    missing = sorted(set(required_namespaces) - set(exposed))
    forbidden_exposed = sorted(set(forbidden) & set(exposed))
    policy_checks = {
        "router_enforce": receipt.get("router_mode") == "enforce",
        "catalog_integrity_not_failed_closed": receipt.get("integrity") != "unverified_fail_closed",
        "no_unknown_enabled_tools": not unknown,
        "no_forbidden_namespace_exposed": not forbidden_exposed,
        "execution_permission_not_inferred": permission.get("status") == "not_observed_at_router",
    }
    return {
        "required_namespaces": required_namespaces,
        "exposed_namespaces": exposed,
        "missing_required_namespaces": missing,
        "tools": {"status": "pass" if not missing else "fail", "checks": {"required_namespaces_exposed": not missing}},
        "policy": {"status": "pass" if all(policy_checks.values()) else "fail", "checks": policy_checks,
                   "forbidden_namespaces_exposed": forbidden_exposed},
    }


def _outcome_axis(value, trace, declared_result):
    value = _object(value, "outcome")
    if set(value) != {"reported_status"} or value["reported_status"] not in {"completed", "incomplete", "interrupted", "error", "cancelled"}:
        raise ValueError("outcome invalide")
    trace_status = trace["run"]["status"]
    expected = "ok" if value["reported_status"] == "completed" else None
    failed_spans = [span["span_id"] for span in trace["spans"] if span["status"] != "ok"]
    # A declared pass has a stronger minimum contract than an incomplete or
    # failed case: it cannot coexist with an incomplete terminal report or a
    # recorded failed/cancelled/unknown span.  This is still structural
    # evidence only; it does not judge whether the answer was correct.
    declared_pass_completed = declared_result != "pass" or value["reported_status"] == "completed"
    declared_pass_trace_clean = declared_result != "pass" or not failed_spans
    checks = {
        "reported_completion_matches_trace": expected is None or trace_status == expected,
        "declared_pass_reports_completed": declared_pass_completed,
        "declared_pass_has_no_non_ok_span": declared_pass_trace_clean,
    }
    return {"reported_status": value["reported_status"], "trace_run_status": trace_status,
            "non_ok_spans": failed_spans,
            "status": "pass" if all(checks.values()) else "fail",
            "checks": checks,
            "limit": "État observé déclaré/normalisé ; il ne mesure pas la qualité sémantique ni l’effet extérieur."}


def _latency_axis(value):
    value = _object(value, "latency_budget")
    if set(value) != {"reported_wall_seconds", "maximum_wall_seconds"}:
        raise ValueError("latency_budget invalide")
    observed = _number(value["reported_wall_seconds"], "reported_wall_seconds")
    maximum = _number(value["maximum_wall_seconds"], "maximum_wall_seconds")
    if maximum <= 0:
        raise ValueError("maximum_wall_seconds invalide")
    return {"reported_wall_seconds": observed, "maximum_wall_seconds": maximum,
            "status": "pass" if observed <= maximum else "fail",
            "checks": {"within_reported_budget": observed <= maximum},
            "limit": "Budget déclaré : le grader ne chronomètre pas ni ne relance l’exécution."}


def grade(bank, fixtures, submission, links):
    """Grade recorded evidence by axis while preserving epistemic boundaries."""
    gate = validate_fixtures(bank, fixtures)
    if not gate.get("fixtures_valid"):
        return {**gate, "grade_status": "fixtures_invalid"}
    submission = _object(submission, "soumission")
    allowed = {"fixture_id", "fixture_sha256", "declared_result", "trace", "tool_policy_receipt", "outcome", "latency_budget"}
    if set(submission) != allowed:
        raise ValueError("champs de soumission grader invalides")
    fixture_id = submission["fixture_id"]
    fixture = next((row for row in fixtures["fixtures"] if row["id"] == fixture_id), None)
    if fixture is None or submission["fixture_sha256"] != fixture["scenario_sha256"]:
        raise ValueError("fixture absente ou périmée")
    if submission["declared_result"] not in {"pass", "fail", "inconclusive"}:
        raise ValueError("declared_result invalide")
    trace = normalize(submission["trace"])
    required = _scenario_link(links, fixture_id)
    policy = _policy_axis(submission["tool_policy_receipt"], required)
    outcome = _outcome_axis(submission["outcome"], trace, submission["declared_result"])
    latency = _latency_axis(submission["latency_budget"])
    axes = {"tools": policy["tools"], "policy": policy["policy"], "outcome": outcome, "latency_budget": latency}
    failed = [name for name, row in axes.items() if row["status"] != "pass"]
    return {
        **gate,
        "schema": "corpus.scenario-graders.v1",
        "mode": "recorded_evidence_only",
        "writes_performed": False,
        "fixture_id": fixture_id,
        "declared_result": submission["declared_result"],
        "verified_result": None,
        "verification_state": "not_verified_by_this_module",
        "grade_status": "structural_checks_passed" if not failed else "structural_checks_failed",
        "failed_axes": failed,
        "axes": axes,
        "trace": trace,
        "promotion": "not_performed",
        "limits": [
            "Le succès déclaré reste déclaré ; verified_result vaut toujours null dans ce module.",
            "Les axes outils et politique vérifient l’exposition, jamais l’autorisation d’exécution ni l’effet d’une action.",
            "Aucun juge sémantique, modèle, outil, service ou configuration n’est lancé.",
        ],
    }


def main(argv=None):
    parser = __import__("argparse").ArgumentParser(description="Grade hors modèle une exécution agentique déjà enregistrée.")
    parser.add_argument("bank", type=Path)
    parser.add_argument("fixtures", type=Path)
    parser.add_argument("submission", type=Path)
    parser.add_argument("--links", type=Path, default=DEFAULT_LINKS)
    args = parser.parse_args(argv)
    value = grade(json.loads(args.bank.read_text(encoding="utf-8")), json.loads(args.fixtures.read_text(encoding="utf-8")),
                  json.loads(args.submission.read_text(encoding="utf-8")), json.loads(args.links.read_text(encoding="utf-8")))
    print(json.dumps(value, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
