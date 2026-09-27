"""Integrity contract for Corpus' static local tool catalogue.

The contract keeps model-visible tool descriptions and schemas outside the
execution path until their local, reviewed fingerprints match.  It is not a
claim of protection against an actor who can replace both this contract and its
catalogue on the same machine; that boundary requires OS-level controls.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
CONTRACT_PATH = HERE / "tool_router_catalog_contract.json"


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_json(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def tool_fingerprint(tool: dict[str, Any]) -> dict[str, Any]:
    return {
        "namespace": tool.get("namespace"),
        "risk": tool.get("risk"),
        "effects": list(tool.get("effects", [])),
        "dependencies": list(tool.get("dependencies", [])),
        "schema_sha256": sha256_json(tool.get("captured_schema", {})),
        "description_sha256": hashlib.sha256(
            str(tool.get("captured_description", "")).encode("utf-8")
        ).hexdigest(),
    }


def build_contract(catalog: dict[str, Any], *, catalog_filename: str) -> dict[str, Any]:
    tools = catalog.get("tools")
    if not isinstance(tools, dict):
        raise ValueError("catalogue sans objet tools")
    if any(not isinstance(name, str) or not name or not isinstance(row, dict) for name, row in tools.items()):
        raise ValueError("catalogue avec outil invalide")
    return {
        "schema_version": 1,
        "boundary": "static_local_tool_catalog",
        "policy": {
            "catalog_origin": "native_local_reviewed",
            "dynamic_tool_discovery": "deny",
            "unverified_catalog_action": "fail_closed",
            "execution_authorization": "separate_from_tool_exposure",
        },
        "catalog": {
            "filename": catalog_filename,
            "sha256": sha256_json(catalog),
            "tool_count": len(tools),
            "tools": {name: tool_fingerprint(tools[name]) for name in sorted(tools)},
        },
    }


def trusted_tool_names(contract: dict[str, Any]) -> list[str]:
    catalog = contract.get("catalog", {}) if isinstance(contract, dict) else {}
    tools = catalog.get("tools", {}) if isinstance(catalog, dict) else {}
    return sorted(name for name in tools if isinstance(name, str))


def validate(catalog: dict[str, Any], contract: dict[str, Any], *, catalog_filename: str) -> None:
    """Raise ValueError for any catalogue/contract drift; no repair is implicit."""
    if not isinstance(contract, dict) or contract.get("schema_version") != 1:
        raise ValueError("contrat de catalogue absent ou incompatible")
    expected = build_contract(catalog, catalog_filename=catalog_filename)
    if contract.get("boundary") != expected["boundary"]:
        raise ValueError("limite du contrat de catalogue invalide")
    if contract.get("policy") != expected["policy"]:
        raise ValueError("politique du contrat de catalogue invalide")
    if contract.get("catalog") != expected["catalog"]:
        raise ValueError("empreinte du catalogue d’outils non vérifiée")


def load_verified(catalog_path: Path, contract_path: Path = CONTRACT_PATH) -> dict[str, Any]:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    contract = json.loads(contract_path.read_text(encoding="utf-8"))
    validate(catalog, contract, catalog_filename=catalog_path.name)
    return catalog


def load_contract(path: Path = CONTRACT_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))
