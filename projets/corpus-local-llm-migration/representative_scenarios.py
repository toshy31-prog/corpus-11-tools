"""Prepare a strict, non-executing Corpus representative scenario batch.

This module selects four existing frozen scenarios for a later grouped model
validation.  It only checks static contracts: scenario/fixture provenance,
profile-to-namespace coverage, and the explicit non-execution boundary.
It does not call Qwen, tools, a service, or the network.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from scenario_evaluation import validate_bank, validate_fixtures
from tool_profile_catalog import validate_profiles

HERE = Path(__file__).resolve().parent
DEFAULT_BANK = HERE / "SCENARIOS.json"
DEFAULT_FIXTURES = HERE / "SCENARIO_FIXTURES.json"
DEFAULT_CATALOG = HERE / "tool_router_catalog_v2.json"
DEFAULT_PROFILES = HERE / "tool_profiles.json"
DEFAULT_BATCH = HERE / "REPRESENTATIVE_SCENARIO_BATCH.json"
SCHEMA = "corpus.representative-scenario-batch.v1"
REQUIRED_KINDS = frozenset({"project_resume", "admissible_memory", "authorized_tool", "controlled_error"})
ALLOWED_RESULT = frozenset({"pass", "fail", "inconclusive"})


def _canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha256(value):
    return hashlib.sha256(_canonical(value)).hexdigest()


def _object(value, label):
    if not isinstance(value, dict):
        raise ValueError(label + " invalide")
    return value


def validate_batch(batch, bank, fixtures, catalog, profiles):
    """Validate an unexecuted representative selection without starting it."""
    bank_gate = validate_bank(bank)
    fixture_gate = validate_fixtures(bank, fixtures)
    if not bank_gate["bank_valid"] or not fixture_gate["fixtures_valid"]:
        return {"batch_valid": False, "execution": "not_performed", "errors": ["scenario_or_fixture_bank_invalid"]}
    batch = _object(batch, "batch")
    if batch.get("schema") != SCHEMA:
        return {"batch_valid": False, "execution": "not_performed", "errors": ["schema_invalid"]}
    errors = []
    if batch.get("execution") != "not_performed":
        errors.append("execution_must_be_not_performed")
    if batch.get("source_bank_sha256") != _sha256(bank):
        errors.append("source_bank_sha256_mismatch")
    if batch.get("fixtures_sha256") != _sha256(fixtures):
        errors.append("fixtures_sha256_mismatch")
    selected = batch.get("selected")
    if not isinstance(selected, list) or len(selected) != len(REQUIRED_KINDS):
        errors.append("selection_count_invalid")
        selected = []
    profile_rows = validate_profiles(profiles, catalog)
    profile_tools = {row["id"]: set(row["tools"]) for row in profile_rows}
    tools = catalog.get("tools", {}) if isinstance(catalog, dict) else {}
    scenario_by_id = {row["id"]: row for row in bank["scenarios"]}
    fixture_by_id = {row["id"]: row for row in fixtures["fixtures"]}
    kinds, identifiers = set(), set()
    checked = []
    expected_fields = {"kind", "scenario_id", "fixture_sha256", "profile", "required_namespaces", "declared_result", "execution", "acceptance", "limits"}
    for row in selected:
        if not isinstance(row, dict) or set(row) != expected_fields:
            errors.append("selection_shape_invalid")
            continue
        kind, ident = row["kind"], row["scenario_id"]
        if kind in kinds: errors.append("kind_duplicated:" + str(kind))
        if ident in identifiers: errors.append("scenario_duplicated:" + str(ident))
        kinds.add(kind); identifiers.add(ident)
        scenario, fixture = scenario_by_id.get(ident), fixture_by_id.get(ident)
        if kind not in REQUIRED_KINDS: errors.append("kind_unknown:" + str(kind))
        if scenario is None or fixture is None: errors.append("scenario_or_fixture_unknown:" + str(ident)); continue
        if row["fixture_sha256"] != fixture["scenario_sha256"]: errors.append("fixture_sha256_mismatch:" + ident)
        if row["execution"] != "not_performed": errors.append("row_execution_invalid:" + ident)
        if row["declared_result"] not in ALLOWED_RESULT: errors.append("declared_result_invalid:" + ident)
        required = row["required_namespaces"]
        if not isinstance(required, list) or not required or len(required) != len(set(required)) or any(not isinstance(v, str) or not v for v in required):
            errors.append("required_namespaces_invalid:" + ident); required = []
        profile = row["profile"]
        if profile not in profile_tools: errors.append("profile_unknown:" + ident); exposed = set()
        else: exposed = {tools[name].get("namespace") for name in profile_tools[profile] if isinstance(tools.get(name), dict)}
        missing = sorted(set(required) - exposed)
        if missing: errors.append("profile_namespace_gap:" + ident + ":" + ",".join(missing))
        if not isinstance(row["acceptance"], list) or not row["acceptance"] or any(not isinstance(v, str) or not v for v in row["acceptance"]): errors.append("acceptance_invalid:" + ident)
        if not isinstance(row["limits"], list) or not row["limits"] or any(not isinstance(v, str) or not v for v in row["limits"]): errors.append("limits_invalid:" + ident)
        checked.append({"kind": kind, "scenario_id": ident, "profile": profile, "required_namespaces": required, "missing_namespaces": missing, "fixture_status": fixture["fixture_status"], "execution": row["execution"]})
    if kinds != REQUIRED_KINDS: errors.append("required_kinds_missing_or_extra")
    return {
        "schema": SCHEMA, "batch_valid": not errors, "execution": "not_performed", "writes_performed": False,
        "selected_count": len(checked), "selected": checked, "errors": errors,
        "limits": [
            "Lot préparé uniquement : aucun modèle, outil, service ou réseau n’est lancé.",
            "Les résultats sont tous à venir ; aucun pass déclaré ou vérifié n’est produit ici.",
            "Une exécution ultérieure doit utiliser les fixtures gelées et scenario_graders.py sur des reçus déjà enregistrés.",
        ],
    }


def load_and_validate(batch_path=DEFAULT_BATCH, bank_path=DEFAULT_BANK, fixtures_path=DEFAULT_FIXTURES,
                      catalog_path=DEFAULT_CATALOG, profiles_path=DEFAULT_PROFILES):
    return validate_batch(
        json.loads(Path(batch_path).read_text(encoding="utf-8")),
        json.loads(Path(bank_path).read_text(encoding="utf-8")),
        json.loads(Path(fixtures_path).read_text(encoding="utf-8")),
        json.loads(Path(catalog_path).read_text(encoding="utf-8")),
        json.loads(Path(profiles_path).read_text(encoding="utf-8")),
    )


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description="Vérifie hors modèle le lot représentatif Corpus.")
    parser.add_argument("--batch", type=Path, default=DEFAULT_BATCH)
    parser.add_argument("--bank", type=Path, default=DEFAULT_BANK)
    parser.add_argument("--fixtures", type=Path, default=DEFAULT_FIXTURES)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--profiles", type=Path, default=DEFAULT_PROFILES)
    args = parser.parse_args(argv)
    print(json.dumps(load_and_validate(args.batch, args.bank, args.fixtures, args.catalog, args.profiles), ensure_ascii=False, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
