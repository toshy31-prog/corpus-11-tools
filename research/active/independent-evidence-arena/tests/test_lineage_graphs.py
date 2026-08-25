#!/usr/bin/env python3
"""Classify procedural separation from fictional evidence-lineage graphs."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "lineage_graphs_v0.2.json"
COMMON_MODE_KINDS = {"generator", "assumption", "oracle", "code", "evaluator"}
DEPENDENCY_KINDS = COMMON_MODE_KINDS | {"data"}


def validate_dag(nodes: dict[str, dict[str, object]]) -> None:
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node_id: str) -> None:
        assert node_id in nodes
        if node_id in visited:
            return
        assert node_id not in visiting, "lineage graph must be acyclic"
        visiting.add(node_id)
        for parent in nodes[node_id]["parents"]:
            visit(parent)
        visiting.remove(node_id)
        visited.add(node_id)

    for node_id in nodes:
        visit(node_id)


def ancestors(node_id: str, nodes: dict[str, dict[str, object]]) -> set[str]:
    found = {node_id}
    frontier = [node_id]
    while frontier:
        current = frontier.pop()
        for parent in nodes[current]["parents"]:
            if parent not in found:
                found.add(parent)
                frontier.append(parent)
    return found


def classify(case: dict[str, object]) -> dict[str, object]:
    nodes = {node["id"]: node for node in case["nodes"]}
    assert len(nodes) == len(case["nodes"]), "node ids must be unique"
    validate_dag(nodes)
    lineages = [ancestors(terminal, nodes) for terminal in case["evidence_terminals"]]
    dependency_signatures = []
    for lineage in lineages:
        signatures = set()
        for node_id in lineage:
            node = nodes[node_id]
            if node["kind"] not in DEPENDENCY_KINDS:
                continue
            fingerprint = node.get("fingerprint")
            assert isinstance(fingerprint, str) and fingerprint, f"missing dependency fingerprint: {node_id}"
            signatures.add((node["kind"], fingerprint))
        dependency_signatures.append(signatures)
    shared = set.intersection(*dependency_signatures)
    shared_kinds = sorted({kind for kind, _ in shared})
    if COMMON_MODE_KINDS.intersection(shared_kinds):
        verdict = "shared_failure_mode"
    elif "data" in shared_kinds:
        verdict = "partially_separated"
    else:
        verdict = "procedurally_separated"
    return {
        "verdict": verdict,
        "shared_kinds": shared_kinds,
        "shared_dependencies": sorted(f"{kind}:{fingerprint}" for kind, fingerprint in shared),
    }


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["protocol_fixed_before_execution"] is True
    outcomes = {}
    for case in fixture["cases"]:
        result = classify(case)
        assert result == case["expected"], (case["id"], result)
        outcomes[case["id"]] = result["verdict"]
    assert outcomes == {
        "same_generator_new_seeds": "shared_failure_mode",
        "new_code_same_data": "partially_separated",
        "disjoint_fictional_pipelines": "procedurally_separated",
        "distinct_ids_same_generator_fingerprint": "shared_failure_mode",
    }
    assert outcomes["distinct_ids_same_generator_fingerprint"] == "shared_failure_mode"
    print("PASS independent-evidence lineage graphs v0.2: 4/4 dependency structures with fingerprint equivalence")


if __name__ == "__main__":
    main()
