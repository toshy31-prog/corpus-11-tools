#!/usr/bin/env python3
"""Classify a project without turning activity into impact.

The gate is deterministic and deliberately produces no aggregate score. It is
intended for decisions before externalization and for honest project closure.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


BOOLEAN_FIELDS = (
    "best_existing_alternative_checked",
    "distinct_delta_established",
    "decision_changing_outcome",
    "artifact_written",
    "tested",
    "authorized",
    "deployed",
    "reobserved",
    "external_effect_verified",
    "maintenance_owner_identified",
    "stop_condition_triggered",
)

LIFECYCLE = (
    ("artifact_written", "written"),
    ("tested", "tested"),
    ("authorized", "authorized"),
    ("deployed", "deployed"),
    ("reobserved", "reobserved"),
)


def audit(record: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(record.get("project"), str) or not record["project"].strip():
        errors.append("project must be a non-empty string")
    for field in BOOLEAN_FIELDS:
        if not isinstance(record.get(field), bool):
            errors.append(f"{field} must be boolean")
    retained = record.get("retained_assets")
    if not isinstance(retained, list) or not all(
        isinstance(item, str) and item.strip() for item in retained
    ):
        errors.append("retained_assets must be a list of non-empty strings")

    if errors:
        return {"verdict": "invalid_record", "errors": errors, "warnings": []}

    seen_false = False
    lifecycle = "declared"
    for field, label in LIFECYCLE:
        value = record[field]
        if value and seen_false:
            errors.append(f"lifecycle inconsistency: {field}=true after an unmet stage")
        if value:
            lifecycle = label
        else:
            seen_false = True

    if record["external_effect_verified"] and not record["reobserved"]:
        errors.append("external effect cannot be verified without reobservation")
    if record["deployed"] and not record["reobserved"]:
        warnings.append("deployment is not reobservation or robust capacity")
    if not record["external_effect_verified"]:
        warnings.append("do not claim impact")

    no_delta = (
        record["best_existing_alternative_checked"]
        and not record["distinct_delta_established"]
    )
    if record["stop_condition_triggered"] or no_delta:
        verdict = "abandon_and_harvest"
    elif not record["best_existing_alternative_checked"]:
        verdict = "compare_before_externalizing"
    elif not record["distinct_delta_established"]:
        verdict = "do_not_externalize"
    elif not record["decision_changing_outcome"]:
        verdict = "stop_low_information_work"
    elif not record["maintenance_owner_identified"]:
        verdict = "blocked_without_maintenance"
    elif record["external_effect_verified"]:
        verdict = "effect_verified_in_recorded_scope"
    else:
        verdict = "continue_bounded_test"

    if errors:
        verdict = "invalid_record"

    return {
        "project": record.get("project"),
        "verdict": verdict,
        "highest_lifecycle_stage": lifecycle,
        "external_effect_verified": record["external_effect_verified"],
        "retained_assets": retained,
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("record", type=Path, help="JSON project record")
    args = parser.parse_args()
    try:
        record = json.loads(args.record.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"verdict": "invalid_record", "errors": [str(exc)]}))
        return 2
    if not isinstance(record, dict):
        print(json.dumps({"verdict": "invalid_record", "errors": ["root must be an object"]}))
        return 2
    result = audit(record)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if not result["errors"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
