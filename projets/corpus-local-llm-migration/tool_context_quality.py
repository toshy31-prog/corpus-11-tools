"""Offline structural audit of Corpus tool ergonomics and context budgets.

The audit inspects static catalogue/profile/scenario metadata only. It does not
route a prompt, load a model, invoke a tool, alter descriptions, or grant a
permission. Character totals are catalogue measures, not model tokens/latency.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

from tool_profile_catalog import validate_profiles
from tool_scope import scope_summary

HERE = Path(__file__).resolve().parent
DEFAULT_CATALOG = HERE / "tool_router_catalog_v2.json"
DEFAULT_PROFILES = HERE / "tool_profiles.json"
DEFAULT_SCENARIOS = HERE / "SCENARIOS.json"
DEFAULT_LINKS = HERE / "TOOL_SCENARIO_LINKS.json"
DEFAULT_MAX_PROFILE_TOOLS = 6
DEFAULT_MAX_PROFILE_CHARS = 10_000


def _object(value, label):
    if not isinstance(value, dict):
        raise ValueError(label + " doit être un objet")
    return value


def _links(value, scenario_ids):
    value = _object(value, "liens de scénarios")
    if value.get("schema_version") != 1 or not isinstance(value.get("links"), list) or not isinstance(value.get("not_applicable"), list):
        raise ValueError("schéma des liens invalide")
    linked = {}
    for row in value["links"]:
        if not isinstance(row, dict) or set(row) != {"scenario_id", "required_namespaces", "purpose"}:
            raise ValueError("lien de scénario invalide")
        ident = row["scenario_id"]
        namespaces = row["required_namespaces"]
        if not isinstance(ident, str) or ident in linked or not isinstance(namespaces, list) or not namespaces or any(not isinstance(item, str) or not item for item in namespaces) or not isinstance(row["purpose"], str) or not row["purpose"].strip():
            raise ValueError("lien de scénario invalide")
        linked[ident] = row
    excluded = value["not_applicable"]
    if len(excluded) != len(set(excluded)) or any(not isinstance(item, str) for item in excluded):
        raise ValueError("not_applicable invalide")
    if set(linked) & set(excluded) or set(linked) | set(excluded) != set(scenario_ids):
        raise ValueError("les liens doivent couvrir chaque scénario une fois")
    return linked


def audit(catalog, profiles, scenarios, links, *, max_profile_tools=DEFAULT_MAX_PROFILE_TOOLS,
          max_profile_chars=DEFAULT_MAX_PROFILE_CHARS):
    """Return a content-free quality/coverage report, never a routing decision."""
    catalog = _object(catalog, "catalogue")
    tools = _object(catalog.get("tools"), "catalogue.tools")
    namespaces = _object(catalog.get("namespaces"), "catalogue.namespaces")
    if type(max_profile_tools) is not int or max_profile_tools < 1 or type(max_profile_chars) is not int or max_profile_chars < 1:
        raise ValueError("budgets invalides")
    profile_rows = validate_profiles(profiles, catalog)
    scenario_rows = scenarios.get("scenarios") if isinstance(scenarios, dict) else None
    if not isinstance(scenario_rows, list) or any(not isinstance(row, dict) or not isinstance(row.get("id"), str) for row in scenario_rows):
        raise ValueError("scénarios invalides")
    scenario_ids = [row["id"] for row in scenario_rows]
    if len(scenario_ids) != len(set(scenario_ids)):
        raise ValueError("ids de scénarios dupliqués")
    scenario_links = _links(links, scenario_ids)

    structural = []
    duplicate_descriptions = defaultdict(list)
    namespace_tools = defaultdict(list)
    for name, tool in tools.items():
        if not isinstance(name, str) or not name or not isinstance(tool, dict):
            structural.append("tool_invalid")
            continue
        if tool.get("name") != name:
            structural.append("tool_name_mismatch:" + name)
        namespace = tool.get("namespace")
        if not isinstance(namespace, str) or namespace not in namespaces:
            structural.append("tool_namespace_missing_or_unknown:" + name)
        else:
            namespace_tools[namespace].append(name)
        description = tool.get("captured_description")
        if not isinstance(description, str) or not description.strip():
            structural.append("tool_description_missing:" + name)
        else:
            duplicate_descriptions[hashlib.sha256(description.encode("utf-8")).hexdigest()].append(name)
        effects = tool.get("effects")
        if not isinstance(effects, list) or not effects or any(not isinstance(effect, str) or not effect for effect in effects):
            structural.append("tool_effects_invalid:" + name)
    duplicates = [names for names in duplicate_descriptions.values() if len(names) > 1]
    profile_report = []
    for profile in profile_rows:
        summary = scope_summary(profile["tools"], catalog)
        issues = []
        if summary["count"] > max_profile_tools:
            issues.append("tool_count_over_budget")
        if summary["captured_definition_chars"] > max_profile_chars:
            issues.append("definition_chars_over_budget")
        profile_report.append({"id": profile["id"], "label": profile["label"], **summary, "issues": issues})
    coverage = []
    for scenario in scenario_rows:
        ident = scenario["id"]
        link = scenario_links.get(ident)
        if link is None:
            coverage.append({"scenario_id": ident, "link_status": "not_applicable", "matching_profiles": []})
            continue
        required = link["required_namespaces"]
        missing = sorted(set(required) - set(namespace_tools))
        matching = [profile["id"] for profile in profile_rows if set(required).issubset({tools[name].get("namespace") for name in profile["tools"]})]
        coverage.append({"scenario_id": ident, "link_status": "covered" if not missing else "namespace_missing", "purpose": link["purpose"],
                         "required_namespaces": required, "missing_namespaces": missing, "matching_profiles": matching,
                         "profile_gap": not bool(matching)})
    review = structural + (["duplicate_descriptions_present"] if duplicates else []) + [
        "profile_budget:" + row["id"] for row in profile_report if row["issues"]
    ] + ["scenario_profile_gap:" + row["scenario_id"] for row in coverage if row.get("profile_gap")]
    return {
        "schema": "corpus.tool-context-quality.v1",
        "mode": "static_catalog_only",
        "writes_performed": False,
        "status": "review_required" if review else "structurally_consistent",
        "review_items": review,
        "catalog": {"tool_count": len(tools), "namespace_count": len(namespaces),
                    "namespace_tools": {key: sorted(value) for key, value in sorted(namespace_tools.items())},
                    "duplicate_description_groups": duplicates},
        "profile_budgets": profile_report,
        "scenario_coverage": coverage,
        "budget": {"max_profile_tools": max_profile_tools, "max_profile_definition_chars": max_profile_chars,
                   "measurement": "captured_catalog_characters_not_live_tokens_or_latency"},
        "limits": [
            "La couverture relie des scénarios aux namespaces déclarés ; elle ne prouve pas qu’un outil sera choisi, autorisé ou réussi.",
            "Les budgets mesurent des caractères de définitions capturées, pas les tokens réellement envoyés ni le temps de réponse.",
            "Toute modification de description, profil ou outil exige une preuve séparée et la mise à jour du contrat du catalogue.",
        ],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Audit local et hors modèle des outils Corpus.")
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--profiles", type=Path, default=DEFAULT_PROFILES)
    parser.add_argument("--scenarios", type=Path, default=DEFAULT_SCENARIOS)
    parser.add_argument("--links", type=Path, default=DEFAULT_LINKS)
    parser.add_argument("--max-profile-tools", type=int, default=DEFAULT_MAX_PROFILE_TOOLS)
    parser.add_argument("--max-profile-chars", type=int, default=DEFAULT_MAX_PROFILE_CHARS)
    args = parser.parse_args(argv)
    value = audit(json.loads(args.catalog.read_text(encoding="utf-8")), json.loads(args.profiles.read_text(encoding="utf-8")),
                  json.loads(args.scenarios.read_text(encoding="utf-8")), json.loads(args.links.read_text(encoding="utf-8")),
                  max_profile_tools=args.max_profile_tools, max_profile_chars=args.max_profile_chars)
    print(json.dumps(value, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
