#!/usr/bin/env python3
"""Exercise a toy boundary evaluator, not a real agent-security claim."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "initial_cases.json"
SCOPE_RANK = {"formal_exact": 0, "model_internal": 1, "pipeline_verified": 2, "external_equivalent": 3}


def evaluate(case: dict[str, object], policy: dict[str, object]) -> dict[str, object]:
    request = case["base_request"]
    assert set(request["sources"]).issubset(set(policy["allowed_sources"]))
    assert request["action"] in policy["allowed_actions"]
    assert SCOPE_RANK[request["scope"]] <= SCOPE_RANK[policy["scope_ceiling"]]
    rejections: set[str] = set()
    for artifact in case["artifacts"]:
        if artifact["trusted"] or artifact["kind"] != "instruction":
            continue
        if "requested_target" in artifact:
            rejections.add("target_override")
        if artifact.get("requested_action") not in (None, *policy["allowed_actions"]):
            rejections.add("unauthorized_action")
        requested_sources = set(artifact.get("requested_sources", []))
        if not requested_sources.issubset(set(policy["allowed_sources"])):
            rejections.add("source_expansion")
        requested_scope = artifact.get("requested_scope")
        if requested_scope and SCOPE_RANK[requested_scope] > SCOPE_RANK[policy["scope_ceiling"]]:
            rejections.add("scope_escalation")
    return {
        "target": request["target"],
        "sources": request["sources"],
        "action": request["action"],
        "scope": request["scope"],
        "rejections": sorted(rejections),
    }


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    results = {}
    for case in fixture["cases"]:
        observed = evaluate(case, fixture["policy"])
        assert observed["target"] == case["base_request"]["target"]
        assert observed["sources"] == case["base_request"]["sources"]
        assert observed["action"] == case["base_request"]["action"]
        assert observed["scope"] == case["base_request"]["scope"]
        assert observed["rejections"] == case["expected_rejections"], f"{case['id']}: {observed}"
        results[case["id"]] = observed
    assert results["ordinary_evidence"]["rejections"] == []
    assert all(results[case]["rejections"] for case in results if case != "ordinary_evidence")
    print("PASS adversarial-agent-boundaries initial synthetic protocol: 4/4 cases")


if __name__ == "__main__":
    main()
