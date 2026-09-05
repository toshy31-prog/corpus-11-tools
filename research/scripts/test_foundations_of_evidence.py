#!/usr/bin/env python3
"""Run the four bounded controls of the frozen FOE-001 portfolio protocol."""

from __future__ import annotations

from copy import deepcopy
import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "research/fixtures/foundations_of_evidence_foe_001.json"
ADAPTERS = {
    "evidence": ROOT / "research/active/independent-evidence-arena/tests/foe_001_adapter.py",
    "provenance": ROOT / "research/active/provenance-interoperability-lab/tests/foe_001_adapter.py",
    "migration": ROOT / "research/active/semantic-migration-lab/tests/foe_001_adapter.py",
    "diversity": ROOT / "research/active/epistemic-diversity-and-common-mode-failure-lab/tests/foe_001_adapter.py",
}


def load_adapter(name: str):
    path = ADAPTERS[name]
    spec = importlib.util.spec_from_file_location(f"foe_001_{name}", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def core(receipt: dict[str, object], fields: list[str]) -> dict[str, object]:
    return {field: receipt[field] for field in fields}


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["protocol_id"] == "FOE-001"
    assert fixture["protocol_fixed_before_execution"] is True

    evidence = load_adapter("evidence")
    provenance = load_adapter("provenance")
    migration = load_adapter("migration")
    diversity = load_adapter("diversity")
    assert all(path.is_file() for path in ADAPTERS.values())
    assert set(fixture["receipt"]["adapter_dependencies"]) == {path.parent.parent.name for path in ADAPTERS.values()}

    # 1. Independent evidence and common-mode detection.
    lineages = {case["id"]: evidence.classify(case["lineages"]) for case in fixture["lineage_cases"]}
    assert lineages == {case["id"]: case["expected"] for case in fixture["lineage_cases"]}
    assert lineages["common_mode"] != "independent"
    assert lineages["incomplete_lineage"] == "independence_unknown"
    procedures = {
        case["id"]: {
            "evaluated": evidence.evaluated_decision(lineages[case["id"]]),
            "control": evidence.counted_source_decision(case["lineages"]),
        }
        for case in fixture["lineage_cases"]
    }
    assert procedures == {case["id"]: case["procedure_expected"] for case in fixture["lineage_cases"]}
    assert procedures["common_mode"] == {"evaluated": "not_eligible", "control": "eligible"}

    # 2. Provenance round trip, collision rejection, and explicit extension handling.
    receipt = fixture["receipt"]
    baseline = core(receipt, fixture["core_fields"])
    for encode, decode in ((provenance.encode_entity, provenance.decode_entity), (provenance.encode_graph, provenance.decode_graph)):
        restored = decode(json.loads(json.dumps(encode(receipt), sort_keys=True)))
        assert core(restored, fixture["core_fields"]) == baseline
    collision = provenance.encode_graph(receipt)
    collision["nodes"].append(deepcopy(collision["nodes"][0]))
    try:
        provenance.decode_graph(collision)
    except ValueError:
        pass
    else:
        raise AssertionError("receipt collision must be rejected")
    extended = provenance.encode_entity(receipt)
    extended[fixture["extension"]["field"]] = fixture["extension"]["value"]
    assert provenance.decode_entity(extended) == receipt
    assert fixture["extension"]["field"] in extended

    # 3. Semantic migration distinguishes declared change from unexplained drift.
    migrations = {case["id"]: migration.classify(case) for case in fixture["migration_cases"]}
    assert migrations == {case["id"]: case["expected"] for case in fixture["migration_cases"]}

    # 4. The classification itself preserves the common-mode and unknown cases.
    source_cases = {case["id"]: case for case in fixture["lineage_cases"]}
    clusters = {case_id: diversity.cluster(source_cases[case_id]["lineages"], verdict) for case_id, verdict in lineages.items()}
    assert clusters["common_mode"] == clusters["incomplete_lineage"]
    assert lineages["common_mode"] == "shared_failure_mode"
    assert lineages["incomplete_lineage"] == "independence_unknown"
    print("PASS FOE-001: 4 bounded controls across 7 frozen variants")


if __name__ == "__main__":
    main()
