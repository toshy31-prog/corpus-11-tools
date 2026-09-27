"""Deterministic, non-executing admission for bounded Corpus delegations.

This is a planning gate.  It never starts a worker, grants a permission, or
changes a session.  Native `plan_guard.mjs` remains the runtime authority.
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from orchestration_plan import PlanError, build_waves
from tool_catalog_contract import load_verified
from tool_router_runtime import CATALOG_PATH

RISK_ORDER = {"low": 0, "medium": 1, "high": 2}
PARALLEL_RATIONALES = {
    "independent_read_only_analysis",
    "independent_fixture_outputs",
    "disjoint_exclusive_writes",
}
WRITE_TOOLS = {"edit", "write"}


class AdmissionError(ValueError):
    pass


def _nonnegative_int(value: Any, label: str, maximum: int) -> int:
    if type(value) is not int or value < 0 or value > maximum:
        raise AdmissionError(f"{label} invalide.")
    return value


def _names(value: Any, label: str) -> list[str]:
    if not isinstance(value, list) or any(not isinstance(item, str) or not item for item in value):
        raise AdmissionError(f"{label} doit être une liste de noms.")
    if len(value) != len(set(value)):
        raise AdmissionError(f"{label} contient un doublon.")
    return sorted(value)


def _budget(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise AdmissionError("Budget invalide.")
    max_risk = value.get("max_risk")
    if max_risk not in RISK_ORDER:
        raise AdmissionError("max_risk invalide.")
    return {
        "max_tasks": _nonnegative_int(value.get("max_tasks"), "max_tasks", 8),
        "max_parallel": _nonnegative_int(value.get("max_parallel"), "max_parallel", 3),
        "max_total_seconds": _nonnegative_int(value.get("max_total_seconds"), "max_total_seconds", 86400),
        "max_tool_calls": _nonnegative_int(value.get("max_tool_calls"), "max_tool_calls", 1000),
        "max_risk": max_risk,
        "parent_exposed_tools": _names(value.get("parent_exposed_tools"), "parent_exposed_tools"),
    }


def _task(value: Any, catalog: dict[str, Any], parent_tools: set[str]) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise AdmissionError("Tâche invalide.")
    ident = value.get("id")
    if not isinstance(ident, str) or not ident or len(ident) > 120:
        raise AdmissionError("Identifiant de tâche invalide.")
    requested = _names(value.get("requested_tools", []), f"requested_tools de {ident}")
    unknown = set(requested) - set(catalog["tools"])
    if unknown:
        raise AdmissionError(f"Outil inconnu pour {ident} : {sorted(unknown)[0]}.")
    unavailable = set(requested) - parent_tools
    if unavailable:
        raise AdmissionError(f"Outil absent du périmètre parent pour {ident} : {sorted(unavailable)[0]}.")
    declared_risk = value.get("risk")
    if declared_risk not in RISK_ORDER:
        raise AdmissionError(f"Risque invalide pour {ident}.")
    actual_risk = max((RISK_ORDER[catalog["tools"][name].get("risk", "high")] for name in requested), default=0)
    if actual_risk > RISK_ORDER[declared_risk]:
        raise AdmissionError(f"Risque sous-déclaré pour {ident}.")
    confirmation = value.get("requires_confirmation")
    if type(confirmation) is not bool:
        raise AdmissionError(f"requires_confirmation invalide pour {ident}.")
    if actual_risk >= RISK_ORDER["medium"] and not confirmation:
        raise AdmissionError(f"Confirmation explicite requise pour {ident}.")
    parallel_safe = value.get("parallel_safe", False)
    depends_on = _names(value.get("depends_on", []), f"depends_on de {ident}")
    exclusive_resources = _names(value.get("exclusive_resources", []), f"exclusive_resources de {ident}")
    if type(parallel_safe) is not bool:
        raise AdmissionError(f"parallel_safe invalide pour {ident}.")
    rationale = value.get("parallel_rationale")
    if parallel_safe and rationale not in PARALLEL_RATIONALES:
        raise AdmissionError(f"Justification de parallélisme invalide pour {ident}.")
    if not parallel_safe and rationale is not None:
        raise AdmissionError(f"Justification de parallélisme inattendue pour {ident}.")
    # A concurrent edit without a named exclusive target can collide with work
    # that the planner cannot see.  Read-only research has a separate explicit
    # rationale; write work must name its reservation even for one worker.
    if set(requested) & WRITE_TOOLS and not exclusive_resources:
        raise AdmissionError(f"Ressource exclusive requise pour écriture de {ident}.")
    return {
        "id": ident,
        "depends_on": depends_on,
        "exclusive_resources": exclusive_resources,
        "parallel_safe": parallel_safe,
        "parallel_rationale": rationale,
        "estimated_seconds": _nonnegative_int(value.get("estimated_seconds"), f"estimated_seconds de {ident}", 3600),
        "max_tool_calls": _nonnegative_int(value.get("max_tool_calls"), f"max_tool_calls de {ident}", 100),
        "requested_tools": requested,
        "declared_risk": declared_risk,
        "actual_risk": next(name for name, rank in RISK_ORDER.items() if rank == actual_risk),
        "requires_confirmation": confirmation,
    }


def admit(tasks: list[dict[str, Any]], budget: dict[str, Any], *, catalog: dict[str, Any] | None = None) -> dict[str, Any]:
    """Return an auditable plan only; no task becomes authorized or starts.

    The caller must pass the actual parent exposure scope.  This prevents a
    planner from using an attractive task description to grow its own tools.
    """
    limits = _budget(budget)
    if not isinstance(tasks, list) or not tasks:
        raise AdmissionError("Liste de tâches non vide requise.")
    if catalog is None:
        catalog = load_verified(CATALOG_PATH)
    if not isinstance(catalog, dict) or not isinstance(catalog.get("tools"), dict):
        raise AdmissionError("Catalogue vérifié requis.")
    rows = [_task(value, catalog, set(limits["parent_exposed_tools"])) for value in tasks]
    if len({row["id"] for row in rows}) != len(rows):
        raise AdmissionError("Identifiants de tâches dupliqués.")
    total_seconds = sum(row["estimated_seconds"] for row in rows)
    total_calls = sum(row["max_tool_calls"] for row in rows)
    try:
        waves = build_waves(rows)["waves"]
    except PlanError as exc:
        raise AdmissionError(str(exc)) from exc
    violations = []
    if len(rows) > limits["max_tasks"]:
        violations.append("nombre maximal de délégations dépassé")
    if total_seconds > limits["max_total_seconds"]:
        violations.append("budget de temps déclaré dépassé")
    if total_calls > limits["max_tool_calls"]:
        violations.append("budget d’appels d’outils déclaré dépassé")
    if any(len(wave["tasks"]) > limits["max_parallel"] for wave in waves):
        violations.append("budget de parallélisme déclaré dépassé")
    for row in rows:
        if RISK_ORDER[row["declared_risk"]] > RISK_ORDER[limits["max_risk"]]:
            violations.append(f"risque maximal dépassé par {row['id']}")
    wave_time_upper_bound = sum(
        max(next(row['estimated_seconds'] for row in rows if row['id'] == ident) for ident in wave['tasks'])
        for wave in waves
    )
    preconditions = {
        "before_any_execution": [
            "admission_remains_eligible",
            "parent_tool_scope_reobserved",
            "user_confirmation_rechecked_for_confirmed_tasks",
            "catalog_contract_reverified",
        ],
        "before_each_wave": [
            "all_declared_dependencies_completed_and_verified",
            "exclusive_resource_claims_still_disjoint",
            "no_unresolved_failure_from_prior_wave",
        ],
        "status": "required_not_observed",
    }
    return {
        "schema_version": 1,
        "boundary": "delegation_admission",
        "execution": "not_started",
        "admission": "eligible" if not violations else "rejected",
        "violations": violations,
        "budget": deepcopy(limits),
        "requested": rows,
        "waves": waves,
        "totals": {
            "tasks": len(rows), "estimated_seconds": total_seconds,
            "estimated_wall_seconds_upper_bound": wave_time_upper_bound,
            "max_tool_calls": total_calls,
        },
        "execution_preconditions": preconditions,
        "limits": [
            "Ce plan ne lance aucun sous-agent ni outil.",
            "Il ne crée ni permission ni approbation.",
            "plan_guard.mjs reste le contrôle d’exécution et de reprise.",
            "Les estimations sont déclaratives ; elles ne mesurent pas une durée observée.",
            "Une admission eligible reste un plan : les préconditions doivent être observées à nouveau avant chaque vague.",
        ],
    }
