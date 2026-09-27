"""Redacted, deterministic tool-exposure receipts for the local router.

This is deliberately about *exposure at the router boundary*.  A tool mask does
not grant execution permission, and the router cannot observe a later approval
or refusal.  The receipt makes that limit explicit instead of inferring it.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
CATALOG_PATH = HERE / "tool_router_catalog_v2.json"


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_json(value: Any) -> str:
    return hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()


def catalog_provenance(catalog: dict[str, Any], *, path: Path = CATALOG_PATH) -> dict[str, Any]:
    """Return local catalogue identity without exposing any user request."""
    tools = catalog.get("tools", {}) if isinstance(catalog, dict) else {}
    namespaces = catalog.get("namespaces", {}) if isinstance(catalog, dict) else {}
    return {
        "kind": "local_tool_catalog",
        "path": path.name,
        "catalog_version": catalog.get("version") if isinstance(catalog, dict) else None,
        "catalog_sha256": sha256_json(catalog),
        "tool_count": len(tools) if isinstance(tools, dict) else 0,
        "namespace_count": len(namespaces) if isinstance(namespaces, dict) else 0,
    }


def _tool_manifest(name: str, tool: dict[str, Any]) -> dict[str, Any]:
    """Return auditable immutable-ish metadata for an exposed known tool."""
    return {
        "name": name,
        "namespace": tool.get("namespace"),
        "effects": list(tool.get("effects", [])),
        "risk": tool.get("risk"),
        "dependencies": list(tool.get("dependencies", [])),
        "schema_sha256": sha256_json(tool.get("captured_schema", {})),
        "description_sha256": hashlib.sha256(
            str(tool.get("captured_description", "")).encode("utf-8")
        ).hexdigest(),
    }


def snapshot(*, catalog: dict[str, Any], mode: str, enabled_tools: list[str],
             forbidden_namespaces: list[str] | None = None,
             source: str = "router") -> dict[str, Any]:
    """Build a receipt for a router-computed exposure decision.

    This never contains user text, tool arguments, session identifiers, or an
    assertion that a later execution permission was granted.
    """
    tools = catalog.get("tools", {})
    enabled = sorted(set(enabled_tools))
    known = [name for name in enabled if name in tools]
    unknown = sorted(set(enabled) - set(known))
    return {
        "schema_version": 1,
        "boundary": "tool_exposure",
        "source": source,
        "router_mode": mode,
        "catalog": catalog_provenance(catalog),
        "enabled_tools": [_tool_manifest(name, tools[name]) for name in known],
        "unknown_enabled_tools": unknown,
        "forbidden_namespaces": sorted(set(forbidden_namespaces or [])),
        "execution_permission": {
            "status": "not_observed_at_router",
            "reason": "Le masque d’outils limite l’exposition au modèle ; il n’accorde ni ne prouve une autorisation d’exécution.",
        },
    }


def unverified_snapshot(*, contract: dict[str, Any] | None, mode: str,
                        source: str, error: str) -> dict[str, Any]:
    """Fail-closed receipt when the catalogue cannot be trusted/read.

    Contract metadata is only a diagnostic; no tool metadata is emitted or
    enabled from an unverified catalogue.
    """
    meta = contract.get("catalog", {}) if isinstance(contract, dict) else {}
    return {
        "schema_version": 1,
        "boundary": "tool_exposure",
        "source": source,
        "router_mode": mode,
        "catalog": {
            "kind": "local_tool_catalog_contract",
            "path": meta.get("filename"),
            "catalog_sha256": meta.get("sha256"),
            "tool_count": meta.get("tool_count"),
        },
        "integrity": "unverified_fail_closed",
        "integrity_error": error[:160],
        "enabled_tools": [],
        "unknown_enabled_tools": [],
        "forbidden_namespaces": [],
        "execution_permission": {
            "status": "not_observed_at_router",
            "reason": "Le catalogue non vérifié n’expose aucun outil.",
        },
    }
