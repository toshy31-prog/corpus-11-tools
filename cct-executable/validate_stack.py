#!/usr/bin/env python3
"""Static lifecycle and completeness checks for the CCT executable package."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ALLOWED = ("described", "written", "tested", "authorized", "deployed", "reobserved")


def load(relative: str) -> dict[str, object]:
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def validate() -> list[str]:
    errors: list[str] = []
    manifest = load("manifest.json")
    ranks = {name: index for index, name in enumerate(ALLOWED)}
    for component in manifest["components"]:
        status = component["status"]
        if status not in ranks:
            errors.append(f"unknown lifecycle status: {status}")
        if not (ROOT / component["path"]).is_dir():
            errors.append(f"missing component directory: {component['path']}")
        if ranks.get(status, 99) >= ranks["authorized"]:
            errors.append(f"untraced promotion beyond local authority: {component['id']}")

    calibration = load("calibration/parameters.json")
    ids = [item["id"] for item in calibration["parameters"]]
    if len(ids) != 12 or len(set(ids)) != 12:
        errors.append("calibration must contain twelve unique parameters")
    required_parameter = {"id", "construct", "observable", "unit", "window", "channels", "owner", "decision"}
    for item in calibration["parameters"]:
        missing = required_parameter - set(item)
        if missing:
            errors.append(f"calibration {item.get('id')} missing {sorted(missing)}")

    pilots = load("pilots/registry.json")
    pilot_ids = [item["id"] for item in pilots["pilots"]]
    if len(pilot_ids) != len(set(pilot_ids)):
        errors.append("duplicate pilot identifiers")
    for pilot in pilots["pilots"]:
        for key in ("decision", "gates", "authorization_required", "rollback_owner"):
            if not pilot.get(key):
                errors.append(f"pilot {pilot['id']} missing {key}")

    evidence = load("evidence/registry.json")
    for entry in evidence["entries"]:
        if entry["status"] not in ALLOWED:
            errors.append(f"evidence {entry['id']} has unknown status")
        if not entry.get("not_established"):
            errors.append(f"evidence {entry['id']} lacks epistemic boundary")
    return errors


if __name__ == "__main__":
    failures = validate()
    if failures:
        for failure in failures:
            print(f"FAIL: {failure}")
        raise SystemExit(1)
    print("CCT-EXEC-0.1: static package checks passed")
