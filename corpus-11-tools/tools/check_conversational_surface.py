#!/usr/bin/env python3
"""Validate the candidate conversational-surface non-interference protocol.

This is deliberately a fixture-level gate, not an LLM or user-study result.
It demonstrates that the candidate surface receives a completed analytic
payload and can vary only its public presentation.  It does not claim that a
future natural-language implementation, or use by people, has the same effect.
"""
from __future__ import annotations

from pathlib import Path
import json
import sys
from typing import Any, Iterable


PLUGIN_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PLUGIN_ROOT.parent
FIXTURE_PATH = REPO_ROOT / "transfers" / "candidates" / "conversational-corpus-surface-evals.jsonl"
SKILL_ROOT = PLUGIN_ROOT / "skills"

ANALYTIC_FIELDS = (
    "expected_routes",
    "critical_dependencies",
    "material_invariants",
    "reversal_conditions",
    "unresolved_alternatives",
)
REQUIRED_PROHIBITIONS = {
    "routes",
    "critical dependencies",
    "material conclusion",
    "reversal conditions",
    "unresolved alternatives",
}
PERMITTED_PRESENTATION_CHANGES = {
    "clarification wording",
    "presentation order",
    "public wording",
    "response length",
    "resume summary",
    "taxonomy visibility",
    "user controls",
    "visible detail",
}


def string_list(record: dict[str, Any], field: str, line_no: int, errors: list[str]) -> list[str]:
    value = record.get(field)
    if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
        errors.append(f"line {line_no}: {field} must be a list of non-empty strings")
        return []
    if len(value) != len(set(value)):
        errors.append(f"line {line_no}: {field} must not contain duplicates")
    return value


def analytic_payload(record: dict[str, Any]) -> dict[str, tuple[str, ...]]:
    """Seal the fields the public surface is forbidden to alter.

    Tuples make the payload immutable at this boundary.  A real surface must
    receive this payload after routing and analysis, rather than recreate it
    from a rewritten user request.
    """
    return {field: tuple(record[field]) for field in ANALYTIC_FIELDS}


def render_surface(
    user_scene: str,
    analysis: dict[str, tuple[str, ...]],
    *,
    instruction: str,
    permitted_changes: Iterable[str],
) -> dict[str, Any]:
    """Build a presentation envelope without touching the analytic payload.

    No routing, capability selection, conclusion synthesis, or reversal logic
    is implemented here.  The candidate is intentionally post-analytic.
    """
    return {
        "user_scene": user_scene,
        "presentation": {
            "instruction": instruction,
            "permitted_changes": tuple(sorted(permitted_changes)),
        },
        "analysis": {field: tuple(analysis[field]) for field in ANALYTIC_FIELDS},
    }


def rotations(values: list[str]) -> list[tuple[str, ...]]:
    if not values:
        return [()]
    return [tuple(values[index:] + values[:index]) for index in range(len(values))]


def load_records() -> tuple[list[tuple[int, dict[str, Any]]], list[str]]:
    errors: list[str] = []
    records: list[tuple[int, dict[str, Any]]] = []
    if not FIXTURE_PATH.is_file():
        return records, [f"missing candidate fixture: {FIXTURE_PATH.relative_to(REPO_ROOT)}"]
    for line_no, line in enumerate(FIXTURE_PATH.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"line {line_no}: invalid JSON: {exc}")
            continue
        if not isinstance(record, dict):
            errors.append(f"line {line_no}: fixture must be an object")
            continue
        records.append((line_no, record))
    if not records:
        errors.append("candidate fixture must contain at least one record")
    return records, errors


def validate_record(record: dict[str, Any], line_no: int, known_skills: set[str]) -> list[str]:
    errors: list[str] = []
    for field in ("id", "class", "raw_prompt", "surface_instruction"):
        value = record.get(field)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"line {line_no}: {field} must be a non-empty string")

    values = {
        field: string_list(record, field, line_no, errors)
        for field in ANALYTIC_FIELDS + ("surface_may_change", "surface_must_not_change")
    }

    for field in ("expected_routes", "critical_dependencies"):
        unknown = sorted(set(values[field]) - known_skills)
        if unknown:
            errors.append(f"line {line_no}: {field} refer to unknown skills {unknown}")

    if not values["expected_routes"]:
        errors.append(f"line {line_no}: expected_routes must not be empty")
    if not values["material_invariants"]:
        errors.append(f"line {line_no}: material_invariants must not be empty")
    if not values["reversal_conditions"]:
        errors.append(f"line {line_no}: reversal_conditions must not be empty")

    prohibited = set(values["surface_must_not_change"])
    missing_prohibitions = sorted(REQUIRED_PROHIBITIONS - prohibited)
    if missing_prohibitions:
        errors.append(
            f"line {line_no}: surface_must_not_change omits {missing_prohibitions}"
        )
    unknown_presentation = sorted(
        set(values["surface_may_change"]) - PERMITTED_PRESENTATION_CHANGES
    )
    if unknown_presentation:
        errors.append(
            f"line {line_no}: unsupported public presentation change {unknown_presentation}"
        )
    overlap = sorted(prohibited & set(values["surface_may_change"]))
    if overlap:
        errors.append(f"line {line_no}: a change is both allowed and prohibited {overlap}")

    if errors:
        return errors

    baseline = analytic_payload(record)
    for variant in rotations(values["surface_may_change"]):
        rendered = render_surface(
            record["raw_prompt"],
            baseline,
            instruction=record["surface_instruction"],
            permitted_changes=variant,
        )
        if rendered["user_scene"] != record["raw_prompt"]:
            errors.append(f"line {line_no}: surface did not preserve the original user scene")
        if rendered["analysis"] != baseline:
            errors.append(
                f"line {line_no}: presentation variation changed the sealed analytic payload"
            )
        if tuple(rendered["presentation"]["permitted_changes"]) != tuple(sorted(variant)):
            errors.append(f"line {line_no}: presentation variant was not represented faithfully")
    return errors


def main() -> int:
    records, errors = load_records()
    known_skills = {
        path.name for path in SKILL_ROOT.iterdir() if path.is_dir() and (path / "SKILL.md").is_file()
    }
    ids: list[str] = []
    for line_no, record in records:
        errors.extend(validate_record(record, line_no, known_skills))
        identifier = record.get("id")
        if isinstance(identifier, str) and identifier.strip():
            ids.append(identifier)
    if len(ids) != len(set(ids)):
        errors.append("duplicate conversational-surface fixture IDs")

    if errors:
        print("FAIL")
        for error in errors:
            print(" -", error)
        return 1
    print(
        "PASS: "
        f"{len(records)} conversational-surface fixtures preserve sealed analytic payloads "
        "under permitted presentation variations"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
