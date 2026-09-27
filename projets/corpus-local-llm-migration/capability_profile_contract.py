"""Read-only contract for local capability-profile selection.

A profile is a compact *tool exposure* suggestion.  It never modifies an
OpenCode permission rule and cannot demonstrate that a selected tool executes.
"""
from __future__ import annotations

from typing import Any

from tool_profile_catalog import validate_profiles
from tool_scope import scope_summary

_RISK = {"low": 0, "medium": 1, "high": 2}
_CONFIRMATION_EFFECTS = {"write", "delete", "destructive", "execute", "network", "remote", "delegate", "generate"}


def _dependency_closure(names: list[str], tools: dict[str, Any]) -> list[str]:
    """Resolve catalogue dependencies without executing or exposing a mask.

    A profile must be reviewed for the tools it names *and* any dependency a
    router would need to add.  Unknown dependencies or cycles make the static
    profile receipt fail closed instead of silently omitting the extra power.
    """
    resolved, visiting = set(), set()

    def visit(name: str) -> None:
        if name in resolved:
            return
        if name in visiting:
            raise ValueError("Cycle de dépendances d’outil : " + name)
        tool = tools.get(name)
        if not isinstance(tool, dict):
            raise ValueError("Dépendance d’outil inconnue : " + name)
        dependencies = tool.get("dependencies", [])
        if not isinstance(dependencies, list) or any(not isinstance(item, str) or not item for item in dependencies):
            raise ValueError("Dépendances d’outil invalides : " + name)
        visiting.add(name)
        for dependency in dependencies:
            visit(dependency)
        visiting.remove(name)
        resolved.add(name)

    for name in names:
        visit(name)
    return sorted(resolved)


def selection_receipt(profile_id: str, profiles: dict[str, Any], catalog: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(profile_id, str) or not profile_id:
        raise ValueError("Identifiant de profil requis.")
    rows = validate_profiles(profiles, catalog)
    profile = next((row for row in rows if row["id"] == profile_id), None)
    if profile is None:
        raise ValueError("Profil inconnu.")
    summary = scope_summary(profile["tools"], catalog)
    tools = catalog["tools"]
    resolved_names = _dependency_closure(summary["names"], tools)
    risks = [tools[name].get("risk", "high") for name in resolved_names]
    if any(risk not in _RISK for risk in risks):
        raise ValueError("Risque d’outil invalide dans le catalogue.")
    namespaces = sorted({tools[name].get("namespace") for name in resolved_names})
    effects = sorted({effect for name in resolved_names for effect in tools[name].get("effects", [])
                      if isinstance(effect, str)})
    requires_confirmation = bool(set(effects) & _CONFIRMATION_EFFECTS)
    return {
        "schema_version": 1,
        "kind": "capability_profile_selection",
        "profile": {"id": profile["id"], "label": profile["label"], "description": profile["description"]},
        "selection": {"tools": summary["names"], "namespaces": namespaces, "scope_sha256": summary["scope_sha256"],
                      "captured_definition_chars": summary["captured_definition_chars"],
                      "resolved_tools": resolved_names,
                      "dependencies_added": sorted(set(resolved_names) - set(summary["names"]))},
        "risk": {"maximum": max(risks, key=lambda value: _RISK[value], default="low"),
                 "per_tool": {name: tools[name].get("risk", "high") for name in resolved_names},
                 "resolved_effects": effects,
                 "explicit_execution_authorization_required": requires_confirmation},
        "permission": "unchanged_not_evaluated",
        "execution": "not_started",
        "limits": [
            "La sélection ne fait que limiter les outils visibles dans un message.",
            "Les permissions de la conversation restent séparées et inchangées.",
            "Un outil sélectionné peut être refusé, échouer ou ne jamais être appelé.",
            "Les dépendances sont incluses dans le reçu de risque ; leur présence ne vaut jamais autorisation d’exécution.",
        ],
    }
