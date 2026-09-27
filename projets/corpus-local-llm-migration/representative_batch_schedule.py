"""Build a non-executing, fail-closed schedule for Corpus representative cases.

The schedule is a declaration for a future grouped campaign. It calls only
static validators and delegation admission; it never starts a model, worker,
tool, service, timer, or network request.
"""
from __future__ import annotations

import json
from pathlib import Path

from delegation_admission import AdmissionError, admit
from representative_scenarios import (DEFAULT_BATCH, DEFAULT_BANK, DEFAULT_CATALOG,
                                      DEFAULT_FIXTURES, DEFAULT_PROFILES, _sha256,
                                      validate_batch)
from tool_profile_catalog import validate_profiles

HERE = Path(__file__).resolve().parent
DEFAULT_SCHEDULE = HERE / "REPRESENTATIVE_BATCH_SCHEDULE.json"
SCHEMA = "corpus.representative-batch-schedule.v1"
_REQUIRED_STOP_KEYS = frozenset({"after_case_if", "on_controlled_error", "on_budget_exceeded", "action"})


def _read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _error(message):
    return {"schedule_valid": False, "execution": "not_started", "errors": [message]}


def validate_schedule(schedule, batch, bank, fixtures, catalog, profiles):
    """Validate order, declared budgets and fail-closed continuation conditions."""
    batch_gate = validate_batch(batch, bank, fixtures, catalog, profiles)
    if not batch_gate.get("batch_valid"):
        return _error("representative_batch_invalid")
    if not isinstance(schedule, dict) or schedule.get("schema") != SCHEMA:
        return _error("schedule_schema_invalid")
    errors = []
    if schedule.get("execution") != "not_started":
        errors.append("execution_must_be_not_started")
    if schedule.get("batch_sha256") != _sha256(batch):
        errors.append("batch_sha256_mismatch")
    if schedule.get("fixture_bank_sha256") != _sha256(fixtures):
        errors.append("fixture_bank_sha256_mismatch")
    rows = schedule.get("steps")
    selected = batch.get("selected", [])
    if not isinstance(rows, list) or len(rows) != len(selected):
        errors.append("step_count_invalid")
        rows = []
    by_id = {row["scenario_id"]: row for row in selected}
    profile_rows = {row["id"]: row for row in validate_profiles(profiles, catalog)}
    allowed_fields = {"order", "scenario_id", "profile", "requested_tools", "estimated_seconds", "max_tool_calls", "risk", "requires_confirmation", "exclusive_resources", "expected_case_verdict", "controlled_fault"}
    previous = 0
    tasks = []
    seen = set()
    for row in rows:
        if not isinstance(row, dict) or set(row) != allowed_fields:
            errors.append("step_shape_invalid")
            continue
        order, ident = row["order"], row["scenario_id"]
        if type(order) is not int or order != previous + 1:
            errors.append("order_not_strictly_sequential:" + str(ident))
        previous = order if type(order) is int else previous
        if ident in seen:
            errors.append("scenario_duplicated:" + str(ident))
        seen.add(ident)
        source = by_id.get(ident)
        if source is None:
            errors.append("scenario_not_in_batch:" + str(ident)); continue
        if row["profile"] != source["profile"]:
            errors.append("profile_mismatch:" + ident)
        profile = profile_rows.get(row["profile"])
        if profile is None or sorted(row["requested_tools"]) != sorted(profile.get("tools", [])):
            errors.append("requested_tools_mismatch:" + ident)
        if row["expected_case_verdict"] != "pass":
            errors.append("expected_case_verdict_must_be_pass:" + ident)
        controlled = row["controlled_fault"]
        if source["kind"] == "controlled_error":
            if controlled != "simulated_quota_error_preserves_prior_state":
                errors.append("controlled_fault_contract_missing:" + ident)
        elif controlled is not None:
            errors.append("unexpected_controlled_fault:" + ident)
        tasks.append({
            "id": ident, "depends_on": [rows[order - 2]["scenario_id"]] if type(order) is int and order > 1 and len(rows) >= order - 1 else [],
            "exclusive_resources": row["exclusive_resources"], "parallel_safe": False,
            "parallel_rationale": None, "estimated_seconds": row["estimated_seconds"],
            "max_tool_calls": row["max_tool_calls"], "requested_tools": row["requested_tools"],
            "risk": row["risk"], "requires_confirmation": row["requires_confirmation"],
        })
    if seen != set(by_id): errors.append("steps_do_not_match_batch")
    stop = schedule.get("stop_conditions")
    if not isinstance(stop, dict) or set(stop) != _REQUIRED_STOP_KEYS:
        errors.append("stop_conditions_invalid")
    elif (stop["after_case_if"] != "missing_receipt_or_grader_failure_or_case_verdict_not_pass"
          or stop["on_controlled_error"] != "continue_only_when_fault_matches_contract_and_case_verdict_pass"
          or stop["on_budget_exceeded"] != "stop_before_next_case"
          or stop["action"] != "stop_batch_and_preserve_evidence"):
        errors.append("stop_conditions_not_fail_closed")
    budget = schedule.get("budget")
    admission = None
    if not isinstance(budget, dict):
        errors.append("budget_invalid")
    else:
        try:
            admission = admit(tasks, budget, catalog=catalog)
        except (AdmissionError, KeyError, TypeError) as exc:
            errors.append("delegation_admission_invalid:" + str(exc))
    if admission and admission["admission"] != "eligible":
        errors.append("delegation_admission_rejected")
    return {
        "schema": SCHEMA, "schedule_valid": not errors, "execution": "not_started", "writes_performed": False,
        "errors": errors, "steps": [{"order": row["order"], "scenario_id": row["scenario_id"], "profile": row["profile"], "estimated_seconds": row["estimated_seconds"], "max_tool_calls": row["max_tool_calls"], "controlled_fault": row["controlled_fault"]} for row in rows if isinstance(row, dict) and "scenario_id" in row],
        "admission": admission,
        "limits": [
            "Ordonnanceur déclaratif : aucun modèle, sous-agent, outil, service, minuterie ou réseau n’est lancé.",
            "eligible signifie seulement que le plan respecte ses budgets déclarés ; il ne donne aucune permission d’exécution.",
            "Chaque preuve future doit passer par scenario_graders.py ; un échec ou une preuve manquante arrête le lot avant le cas suivant.",
        ],
    }


def load_and_validate(schedule_path=DEFAULT_SCHEDULE, batch_path=DEFAULT_BATCH, bank_path=DEFAULT_BANK,
                      fixtures_path=DEFAULT_FIXTURES, catalog_path=DEFAULT_CATALOG, profiles_path=DEFAULT_PROFILES):
    return validate_schedule(_read(schedule_path), _read(batch_path), _read(bank_path), _read(fixtures_path), _read(catalog_path), _read(profiles_path))


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description="Vérifie un ordonnanceur déclaratif hors modèle.")
    parser.add_argument("--schedule", type=Path, default=DEFAULT_SCHEDULE)
    parser.add_argument("--batch", type=Path, default=DEFAULT_BATCH)
    parser.add_argument("--bank", type=Path, default=DEFAULT_BANK)
    parser.add_argument("--fixtures", type=Path, default=DEFAULT_FIXTURES)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--profiles", type=Path, default=DEFAULT_PROFILES)
    args = parser.parse_args(argv)
    print(json.dumps(load_and_validate(args.schedule, args.batch, args.bank, args.fixtures, args.catalog, args.profiles), ensure_ascii=False, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
