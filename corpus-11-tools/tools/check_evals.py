#!/usr/bin/env python3
"""Validate routing/non-regression eval contracts beyond JSON syntax."""
from __future__ import annotations

from pathlib import Path
import json
import sys

root = Path(__file__).resolve().parents[1]
eval_path = root / "evals" / "routing-and-nonregression.jsonl"
skill_root = root / "skills"
errors: list[str] = []
records: list[dict] = []

for line_no, line in enumerate(eval_path.read_text(encoding="utf-8").splitlines(), 1):
    if not line.strip():
        continue
    try:
        record = json.loads(line)
    except json.JSONDecodeError as exc:
        errors.append(f"line {line_no}: invalid JSON: {exc}")
        continue
    if not isinstance(record, dict):
        errors.append(f"line {line_no}: eval must be an object")
        continue
    records.append(record)
    eval_id = record.get("id")
    prompt = record.get("prompt")
    if not isinstance(eval_id, str) or not eval_id.strip():
        errors.append(f"line {line_no}: missing non-empty id")
    if not isinstance(prompt, str) or not prompt.strip():
        errors.append(f"line {line_no}: missing non-empty prompt")

    values: dict[str, list[str]] = {}
    for field in ("expect", "must", "must_not", "may"):
        value = record.get(field, [])
        if not isinstance(value, list) or not all(isinstance(x, str) and x for x in value):
            errors.append(f"line {line_no}: {field} must be a string list when present")
            values[field] = []
        else:
            values[field] = value

    # An eval may be purely negative (for example, "do not force explore-first"),
    # but it must still contain at least one hard oracle.  `may` alone never
    # turns a scenario into an executable test.
    if not (values["expect"] or values["must"] or values["must_not"]):
        errors.append(
            f"line {line_no}: eval has no hard assertion (expect, must, or must_not)"
        )

    for skill in values["expect"]:
        if not (skill_root / skill / "SKILL.md").is_file():
            errors.append(f"line {line_no}: expected skill does not exist: {skill}")
    for skill in values["may"]:
        if not (skill_root / skill / "SKILL.md").is_file():
            errors.append(f"line {line_no}: optional skill does not exist: {skill}")

ids = [record.get("id") for record in records if isinstance(record.get("id"), str)]
if len(ids) != len(set(ids)):
    errors.append("duplicate eval ids")

inventory = json.loads((root / "docs" / "inventory.json").read_text(encoding="utf-8"))
if len(records) != inventory.get("eval_count"):
    errors.append(f"eval cardinality mismatch: {len(records)} != {inventory.get('eval_count')}")

# Every capability wrapper must be exercised by at least one positive routing
# oracle. Negative tests complement this; they cannot substitute for coverage.
capability_skills = {
    path.parent.parent.name
    for path in skill_root.glob("*/references/capability.md")
}
covered = {
    skill
    for record in records
    for skill in record.get("expect", [])
    if isinstance(skill, str)
}
missing = sorted(capability_skills - covered)
if missing:
    errors.append(f"capabilities without a positive routing eval: {missing}")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(
    f"PASS: {len(records)} eval contracts valid; "
    f"{len(capability_skills)} capability skills positively covered"
)
