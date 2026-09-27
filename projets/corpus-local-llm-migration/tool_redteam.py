"""Deterministic offline red-team checks for the Corpus tool boundary.

The cases mutate only in-memory copies of static metadata.  They never call a
model, route a user request, start a process, or invoke a tool.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

from tool_catalog_contract import build_contract, validate
from tool_profile_catalog import validate_profiles
from tool_scope import with_tools

HERE = Path(__file__).resolve().parent
DEFAULT_CASES = HERE / "tool_redteam_cases.json"


class RedTeamError(ValueError):
    pass


def _case_rows(cases: dict[str, Any]) -> list[dict[str, Any]]:
    if not isinstance(cases, dict) or cases.get("schema_version") != 1 or not isinstance(cases.get("cases"), list):
        raise RedTeamError("Corpus de red-team invalide.")
    seen, rows = set(), []
    for row in cases["cases"]:
        if not isinstance(row, dict) or not isinstance(row.get("id"), str) or not row["id"] or row["id"] in seen:
            raise RedTeamError("Cas de red-team invalide.")
        if row.get("expected") not in {"accepted", "rejected"} or not isinstance(row.get("kind"), str):
            raise RedTeamError("Attente ou type de cas invalide.")
        seen.add(row["id"])
        rows.append(dict(row))
    return rows


def _profile(profiles: dict[str, Any], ident: str) -> dict[str, Any]:
    rows = profiles.get("profiles", []) if isinstance(profiles, dict) else []
    for row in rows:
        if isinstance(row, dict) and row.get("id") == ident:
            return row
    raise RedTeamError("Profil de cas introuvable : " + ident)


def _expect_rejection(action) -> bool:
    try:
        action()
    except (ValueError, KeyError, TypeError):
        return True
    return False


def run(catalog: dict[str, Any], profiles: dict[str, Any], cases: dict[str, Any]) -> dict[str, Any]:
    """Run static adversarial metadata cases and return a content-free receipt."""
    contract = build_contract(catalog, catalog_filename="tool_router_catalog_v2.json")
    rows = []
    for case in _case_rows(cases):
        kind, expected = case["kind"], case["expected"]
        accepted = False
        if kind == "catalog_description_append":
            changed = copy.deepcopy(catalog)
            changed["tools"][case["tool"]]["captured_description"] += case["payload"]
            accepted = not _expect_rejection(lambda: validate(changed, contract, catalog_filename="tool_router_catalog_v2.json"))
        elif kind == "catalog_schema_relax":
            changed = copy.deepcopy(catalog)
            changed["tools"][case["tool"]]["captured_schema"]["additionalProperties"] = True
            accepted = not _expect_rejection(lambda: validate(changed, contract, catalog_filename="tool_router_catalog_v2.json"))
        elif kind == "catalog_tool_injection":
            changed = copy.deepcopy(catalog)
            changed["tools"][case["tool"]] = {"name": case["tool"], "namespace": "ssh", "risk": "high", "effects": ["network"], "dependencies": [], "captured_description": "unsafe", "captured_schema": {}}
            accepted = not _expect_rejection(lambda: validate(changed, contract, catalog_filename="tool_router_catalog_v2.json"))
        elif kind == "catalog_namespace_switch":
            changed = copy.deepcopy(catalog)
            changed["tools"][case["tool"]]["namespace"] = case["namespace"]
            accepted = not _expect_rejection(lambda: validate(changed, contract, catalog_filename="tool_router_catalog_v2.json"))
        elif kind == "profile_unknown_tool":
            changed = copy.deepcopy(profiles)
            _profile(changed, case["profile"])["tools"].append(case["tool"])
            accepted = not _expect_rejection(lambda: validate_profiles(changed, catalog))
        elif kind == "profile_duplicate_tool":
            changed = copy.deepcopy(profiles)
            row = _profile(changed, case["profile"])
            row["tools"].append(row["tools"][0])
            accepted = not _expect_rejection(lambda: validate_profiles(changed, catalog))
        elif kind == "explicit_mask_unknown_tool":
            accepted = not _expect_rejection(lambda: with_tools({"agent": "corpus"}, [case["tool"]], catalog))
        elif kind == "plan_profile_nonempty":
            accepted = not _expect_rejection(lambda: with_tools({"agent": "corpus-plan"}, ["read"], catalog))
        elif kind == "profile_excludes_tool":
            accepted = case["tool"] not in _profile(profiles, case["profile"])["tools"]
        else:
            raise RedTeamError("Type de red-team inconnu : " + kind)
        outcome = "accepted" if accepted else "rejected"
        rows.append({"id": case["id"], "kind": kind, "expected": expected, "outcome": outcome, "passed": outcome == expected})
    return {
        "schema_version": 1,
        "kind": "tool_redteam_receipt",
        "execution": "not_started",
        "tools_invoked": [],
        "model_calls": 0,
        "passed": all(row["passed"] for row in rows),
        "cases": rows,
        "limits": [
            "Les mutations restent en mémoire et ne modifient ni catalogue ni profils sur disque.",
            "Cette red-team vérifie des contrats statiques ; elle ne prouve pas qu’un moteur externe respecte chaque API.",
        ],
    }


def main(argv=None) -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Red-team statique des outils Corpus.")
    parser.add_argument("--catalog", type=Path, default=HERE / "tool_router_catalog_v2.json")
    parser.add_argument("--profiles", type=Path, default=HERE / "tool_profiles.json")
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES)
    args = parser.parse_args(argv)
    value = run(json.loads(args.catalog.read_text()), json.loads(args.profiles.read_text()), json.loads(args.cases.read_text()))
    print(json.dumps(value, ensure_ascii=False, indent=2))
    return 0 if value["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
