"""Link prepared contexts to the frozen representative batch without executing it.

This is an offline admission gate. It accepts only metadata receipts made by
``prepared_context.py`` and checks that each prepared profile matches the
corresponding scheduled step. It never starts Qwen, tools, services, timers or
writes a receipt to disk.
"""
from __future__ import annotations

from typing import Any


def _contains_raw_text(value: Any) -> bool:
    """Prepared receipts are metadata-only; raw context must never cross here."""
    if isinstance(value, dict):
        return "text" in value or any(_contains_raw_text(item) for item in value.values())
    if isinstance(value, list):
        return any(_contains_raw_text(item) for item in value)
    return False


def validate_preflight(schedule_result: dict[str, Any], prepared_by_scenario: dict[str, Any]) -> dict[str, Any]:
    """Validate a non-executing, one-context-per-scheduled-case preparation."""
    errors: list[str] = []
    if not isinstance(schedule_result, dict) or not schedule_result.get("schedule_valid"):
        return {"preflight_valid": False, "execution": "not_started", "writes_performed": False,
                "errors": ["schedule_invalid"], "cases": []}
    if schedule_result.get("execution") != "not_started":
        return {"preflight_valid": False, "execution": "not_started", "writes_performed": False,
                "errors": ["schedule_execution_not_not_started"], "cases": []}
    if not isinstance(prepared_by_scenario, dict):
        return {"preflight_valid": False, "execution": "not_started", "writes_performed": False,
                "errors": ["prepared_contexts_invalid"], "cases": []}

    steps = schedule_result.get("steps")
    if not isinstance(steps, list):
        return {"preflight_valid": False, "execution": "not_started", "writes_performed": False,
                "errors": ["schedule_steps_invalid"], "cases": []}
    expected = {row.get("scenario_id") for row in steps if isinstance(row, dict)}
    if None in expected or len(expected) != len(steps):
        return {"preflight_valid": False, "execution": "not_started", "writes_performed": False,
                "errors": ["schedule_case_ids_invalid"], "cases": []}
    if set(prepared_by_scenario) != expected:
        errors.append("prepared_context_case_set_mismatch")

    cases = []
    for step in steps:
        scenario_id, expected_profile = step["scenario_id"], step["profile"]
        receipt = prepared_by_scenario.get(scenario_id)
        if not isinstance(receipt, dict):
            errors.append("prepared_context_missing:" + scenario_id)
            continue
        if _contains_raw_text(receipt):
            errors.append("prepared_context_contains_raw_text:" + scenario_id)
            continue
        if receipt.get("format_version") != 1 or receipt.get("kind") != "prepared_context_preflight":
            errors.append("prepared_context_schema_invalid:" + scenario_id)
            continue
        profile = receipt.get("profile")
        tools = receipt.get("tool_exposure")
        if not isinstance(profile, dict) or profile.get("id") != expected_profile:
            errors.append("prepared_context_profile_mismatch:" + scenario_id)
        if not isinstance(tools, list) or any(not isinstance(tool, str) or not tool for tool in tools):
            errors.append("prepared_context_tools_invalid:" + scenario_id)
        if receipt.get("permission") != "unchanged_not_evaluated":
            errors.append("prepared_context_permission_changed:" + scenario_id)
        if receipt.get("execution") != "not_started":
            errors.append("prepared_context_execution_invalid:" + scenario_id)
        cache = receipt.get("cache")
        if not isinstance(cache, dict) or not isinstance(cache.get("cache_key"), str):
            errors.append("prepared_context_cache_metadata_invalid:" + scenario_id)
        context = receipt.get("context")
        if not isinstance(context, dict) or not isinstance(context.get("included"), list):
            errors.append("prepared_context_metadata_invalid:" + scenario_id)
        cases.append({"scenario_id": scenario_id, "profile": expected_profile,
                      "prepared": isinstance(receipt, dict), "execution": "not_started"})

    return {
        "schema": "corpus.representative-preflight.v1",
        "preflight_valid": not errors,
        "execution": "not_started",
        "writes_performed": False,
        "cases": cases,
        "errors": errors,
        "limits": [
            "Cette porte relie des métadonnées de contexte au lot gelé ; elle ne lance rien.",
            "Un préflight valide ne donne aucune permission et ne remplace pas une confirmation explicite.",
            "Les contenus de contexte restent hors de ce résultat ; seules leurs métadonnées sont acceptées.",
        ],
    }
