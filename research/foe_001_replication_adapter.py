#!/usr/bin/env python3
"""Expose the existing FOE-001 controls as a replication-harness reference.

This adapter does not change FOE-001 rules.  It invokes the four existing
adapters and serializes only their already-defined observable results.
"""

from __future__ import annotations

from copy import deepcopy
import importlib.util
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
ADAPTERS = {
    "evidence": ROOT / "research/active/independent-evidence-arena/tests/foe_001_adapter.py",
    "provenance": ROOT / "research/active/provenance-interoperability-lab/tests/foe_001_adapter.py",
    "migration": ROOT / "research/active/semantic-migration-lab/tests/foe_001_adapter.py",
    "diversity": ROOT / "research/active/epistemic-diversity-and-common-mode-failure-lab/tests/foe_001_adapter.py",
}


def _load_adapter(name: str):
    path = ADAPTERS[name]
    spec = importlib.util.spec_from_file_location(f"foe_001_replication_{name}", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load FOE-001 adapter {name}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _core(receipt: dict[str, Any], fields: list[str]) -> dict[str, Any]:
    return {field: receipt[field] for field in fields}


def run_fixture(fixture: dict[str, Any]) -> dict[str, Any]:
    """Run the pre-existing four controls and preserve their observable output."""
    evidence = _load_adapter("evidence")
    provenance = _load_adapter("provenance")
    migration = _load_adapter("migration")
    diversity = _load_adapter("diversity")

    lineages = {case["id"]: evidence.classify(case["lineages"]) for case in fixture["lineage_cases"]}
    lineage_results = [
        {
            "id": case["id"],
            "observed": lineages[case["id"]],
            "expected": case["expected"],
            "procedures": {
                "evaluated": evidence.evaluated_decision(lineages[case["id"]]),
                "control": evidence.counted_source_decision(case["lineages"]),
            },
            "procedure_expected": case["procedure_expected"],
        }
        for case in fixture["lineage_cases"]
    ]
    for item in lineage_results:
        item["matches_expected"] = (
            item["observed"] == item["expected"] and item["procedures"] == item["procedure_expected"]
        )

    receipt = fixture["receipt"]
    baseline = _core(receipt, fixture["core_fields"])
    representations = []
    for name, encode, decode in (
        ("entity", provenance.encode_entity, provenance.decode_entity),
        ("graph", provenance.encode_graph, provenance.decode_graph),
    ):
        restored = decode(json.loads(json.dumps(encode(receipt), sort_keys=True)))
        representations.append({"id": name, "core_fields_preserved": _core(restored, fixture["core_fields"]) == baseline})
    collision = provenance.encode_graph(receipt)
    collision["nodes"].append(deepcopy(collision["nodes"][0]))
    try:
        provenance.decode_graph(collision)
    except ValueError:
        collision_result = "rejected"
    else:
        collision_result = "NOT_REJECTED"
    extended = provenance.encode_entity(receipt)
    extended[fixture["extension"]["field"]] = fixture["extension"]["value"]
    extension_preserved = provenance.decode_entity(extended) == receipt

    migration_results = [
        {
            "id": case["id"],
            "observed": migration.classify(case),
            "expected": case["expected"],
        }
        for case in fixture["migration_cases"]
    ]
    for item in migration_results:
        item["matches_expected"] = item["observed"] == item["expected"]

    clusters = {
        case["id"]: sorted(diversity.cluster(case["lineages"], lineages[case["id"]]))
        for case in fixture["lineage_cases"]
    }
    return {
        "protocol_id": fixture["protocol_id"],
        "lineage_results": lineage_results,
        "provenance": {
            "representations": representations,
            "core_fields_preserved": all(item["core_fields_preserved"] for item in representations),
            "collision": collision_result,
            "extension": {
                "field": fixture["extension"]["field"],
                "value": fixture["extension"]["value"],
                "preserved": extension_preserved,
            },
        },
        "migration_results": migration_results,
        "clusters": clusters,
    }
