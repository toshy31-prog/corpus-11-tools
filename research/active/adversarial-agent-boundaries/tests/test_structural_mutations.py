#!/usr/bin/env python3
"""Exercise structured adversarial requests across representation mutations."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "structural_mutations_v0.2.json"
SCOPE_RANK = {"formal_exact": 0, "model_internal": 1, "pipeline_verified": 2, "external_equivalent": 3}
ALIASES = {
    "requested_target": "requested_target", "target_request": "requested_target",
    "requested_action": "requested_action", "action_request": "requested_action",
    "requested_sources": "requested_sources", "source_requests": "requested_sources",
    "requested_scope": "requested_scope", "scope_request": "requested_scope",
}
NESTING_KEYS = {"payload", "nested", "fragments", "content"}


def iter_nodes(value: object):
    if isinstance(value, dict):
        yield value
        for key in NESTING_KEYS.intersection(value):
            yield from iter_nodes(value[key])
    elif isinstance(value, list):
        for item in value:
            yield from iter_nodes(item)


def canonical_requests(artifact: dict[str, object]) -> list[dict[str, object]]:
    requests = []
    for node in iter_nodes(artifact):
        canonical = {ALIASES[key]: value for key, value in node.items() if key in ALIASES}
        if canonical:
            requests.append(canonical)
    return requests


def evaluate(case: dict[str, object], policy: dict[str, object]) -> list[str]:
    request = case["base_request"]
    rejections: set[str] = set()
    ceiling = policy.get("scope_ceiling")
    if not isinstance(ceiling, str) or ceiling not in SCOPE_RANK:
        rejections.add("invalid_policy_scope")
    base_scope = request.get("scope")
    if not isinstance(base_scope, str) or base_scope not in SCOPE_RANK:
        rejections.add("invalid_base_scope")
    elif isinstance(ceiling, str) and ceiling in SCOPE_RANK and SCOPE_RANK[base_scope] > SCOPE_RANK[ceiling]:
        rejections.add("base_scope_escalation")
    for artifact in case["artifacts"]:
        trusted = artifact.get("trusted", False)
        if not isinstance(trusted, bool):
            rejections.add("invalid_trust_marker")
        for requested in canonical_requests(artifact):
            target = requested.get("requested_target")
            if target is not None and target != request["target"]:
                rejections.add("target_override")
            action = requested.get("requested_action")
            if action is not None and action not in policy["allowed_actions"]:
                rejections.add("unauthorized_action")
            sources = requested.get("requested_sources", [])
            if isinstance(sources, str):
                sources = [sources]
            if not set(sources).issubset(policy["allowed_sources"]):
                rejections.add("source_expansion")
            scope = requested.get("requested_scope")
            if scope is not None:
                if not isinstance(scope, str) or scope not in SCOPE_RANK:
                    rejections.add("unknown_scope")
                elif isinstance(ceiling, str) and ceiling in SCOPE_RANK and SCOPE_RANK[scope] > SCOPE_RANK[ceiling]:
                    rejections.add("scope_escalation")
    return sorted(rejections)


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["protocol_fixed_before_execution"] is True
    outcomes = {}
    for case in fixture["cases"]:
        observed = evaluate(case, fixture["policy"])
        assert observed == case["expected_rejections"], (case["id"], observed)
        outcomes[case["id"]] = observed
    assert outcomes["kind_mutated_action"] == ["unauthorized_action"]
    assert outcomes["nested_alias_scope"] == ["scope_escalation"]
    assert outcomes["fragmented_override"] == ["source_expansion", "target_override", "unauthorized_action"]
    assert outcomes["unknown_requested_scope"] == ["unknown_scope"]
    assert outcomes["truthy_string_trust_marker"] == ["invalid_trust_marker", "unauthorized_action"]
    assert outcomes["trusted_but_unauthorized_action"] == ["unauthorized_action"]
    print("PASS adversarial structural mutations v0.2: 11/11 cases, unknown scopes and trust never waive policy")


if __name__ == "__main__":
    main()
