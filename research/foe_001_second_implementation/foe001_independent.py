#!/usr/bin/env python3
"""Implementation indépendante, limitée au fixture gelé FOE-001."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


EXPECTED_INPUT_SHA256 = {
    "protocol": "ad523be81c6a4f3478b8d88de41b85b99ee30b368c0f7729942d3cdbabd63711",
    "fixture": "0fde7cb2e30ee0352ab9f0101666698e485559fede42d7ec5df930daa22d41b1",
}
DEPENDENCIES = {"language": "Python", "runtime": "Python 3", "packages": []}
DEPENDENCY_AXES = ("source_ids", "generator_ids", "hypothesis_ids", "code_ids", "failure_mode_ids")


class CollisionError(ValueError):
    """Two receipts with one id cannot be silently merged."""


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_frozen_inputs(protocol_path: Path, fixture_path: Path) -> dict[str, str]:
    observed = {"protocol": sha256_file(protocol_path), "fixture": sha256_file(fixture_path)}
    if observed != EXPECTED_INPUT_SHA256:
        raise ValueError(f"frozen input SHA-256 mismatch: {observed}")
    return observed


def _overlap(left: list[str], right: list[str]) -> bool:
    return bool(set(left) & set(right))


def classify_lineages(lineages: list[dict[str, Any]]) -> str:
    """Classify without filling missing lineage information."""
    if len(lineages) < 2 or any(not lineage.get(axis) for lineage in lineages for axis in DEPENDENCY_AXES):
        return "independence_unknown"
    for index, left in enumerate(lineages):
        for right in lineages[index + 1 :]:
            if any(_overlap(left[axis], right[axis]) for axis in DEPENDENCY_AXES):
                return "shared_failure_mode"
    return "independent"


def evaluate_procedures(lineages: list[dict[str, Any]]) -> dict[str, str]:
    named_sources = {source for lineage in lineages for source in lineage.get("source_ids", [])}
    control = "eligible" if len(named_sources) >= 2 else "not_eligible"
    lineage_status = classify_lineages(lineages)
    evaluated = {
        "independent": "eligible",
        "shared_failure_mode": "not_eligible",
        "independence_unknown": "withhold",
    }[lineage_status]
    return {"evaluated": evaluated, "control": control}


def encode_json(receipt: dict[str, Any]) -> str:
    return json.dumps(receipt, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def decode_json(payload: str) -> dict[str, Any]:
    value = json.loads(payload)
    if not isinstance(value, dict):
        raise ValueError("receipt JSON must be an object")
    return value


def encode_flat(receipt: dict[str, Any]) -> list[tuple[str, str]]:
    """A distinct key/value representation, retaining unknown extension keys."""
    return [(key, json.dumps(receipt[key], sort_keys=True, separators=(",", ":"), ensure_ascii=False)) for key in sorted(receipt)]


def decode_flat(payload: list[tuple[str, str]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, encoded_value in payload:
        if key in result:
            raise ValueError(f"duplicate flat field: {key}")
        result[key] = json.loads(encoded_value)
    return result


def require_core_preserved(original: dict[str, Any], restored: dict[str, Any], core_fields: list[str]) -> None:
    missing = [field for field in core_fields if field not in restored]
    altered = [field for field in core_fields if field in restored and original[field] != restored[field]]
    if missing or altered:
        raise ValueError(f"core field loss or alteration; missing={missing}, altered={altered}")


def register_receipt(registry: dict[str, dict[str, Any]], receipt: dict[str, Any]) -> None:
    receipt_id = receipt["receipt_id"]
    if receipt_id in registry and registry[receipt_id] != receipt:
        raise CollisionError(f"receipt collision: {receipt_id}")
    registry[receipt_id] = receipt


def classify_migration(case: dict[str, Any]) -> str:
    before, after = case["before"], case["after"]
    changes = [(field, before[field], after[field]) for field in sorted(set(before) | set(after)) if before.get(field) != after.get(field)]
    if not changes:
        return "stable"
    declared = {tuple(rule) for rule in case["declared"]}
    return "declared_rule_change" if all(change in declared for change in changes) else "unexplained_drift"


def run_fixture(fixture: dict[str, Any]) -> dict[str, Any]:
    lineage_results = []
    for case in fixture["lineage_cases"]:
        observed = classify_lineages(case["lineages"])
        procedures = evaluate_procedures(case["lineages"])
        lineage_results.append({
            "id": case["id"], "observed": observed, "expected": case["expected"],
            "procedures": procedures, "procedure_expected": case["procedure_expected"],
            "matches_expected": observed == case["expected"] and procedures == case["procedure_expected"],
        })

    original = fixture["receipt"]
    extension = fixture["extension"]
    extended = {**original, extension["field"]: extension["value"]}
    json_round_trip = decode_json(encode_json(extended))
    flat_round_trip = decode_flat(encode_flat(extended))
    require_core_preserved(extended, json_round_trip, fixture["core_fields"])
    require_core_preserved(extended, flat_round_trip, fixture["core_fields"])
    registry: dict[str, dict[str, Any]] = {}
    register_receipt(registry, original)
    collision = {**original, "attribution": "conflicting-attribution"}
    try:
        register_receipt(registry, collision)
    except CollisionError:
        collision_result = "rejected"
    else:
        collision_result = "NOT_REJECTED"

    migrations = []
    for case in fixture["migration_cases"]:
        observed = classify_migration(case)
        migrations.append({"id": case["id"], "observed": observed, "expected": case["expected"], "matches_expected": observed == case["expected"]})

    return {
        "protocol_id": fixture["protocol_id"],
        "dependencies": DEPENDENCIES,
        "lineage_results": lineage_results,
        "provenance": {
            "representations": ["canonical_json", "flat_key_value"],
            "core_fields_preserved": True,
            "collision": collision_result,
            "extension": {"field": extension["field"], "value": extension["value"], "preserved": json_round_trip[extension["field"]] == extension["value"] and flat_round_trip[extension["field"]] == extension["value"]},
        },
        "migration_results": migrations,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--protocol", type=Path, required=True)
    parser.add_argument("--fixture", type=Path, required=True)
    parser.add_argument("--write-report", type=Path, required=True)
    args = parser.parse_args()
    hashes = verify_frozen_inputs(args.protocol, args.fixture)
    report = run_fixture(json.loads(args.fixture.read_text(encoding="utf-8")))
    report["input_sha256"] = hashes
    serialized = json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False) + "\n"
    args.write_report.write_text(serialized, encoding="utf-8")
    print(serialized, end="")


if __name__ == "__main__":
    main()
