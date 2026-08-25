#!/usr/bin/env python3
"""Static boundary checks for the site-binding preparation of CCT-FC-D10-001."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROTOCOL_PATH = ROOT / "d10-budget-charge-constitutionnelle-v0.1.json"
CONSTITUTION_PATH = ROOT.parents[1] / "executable" / "constitution" / "constitution.json"


def validate() -> list[str]:
    protocol = json.loads(PROTOCOL_PATH.read_text(encoding="utf-8"))
    constitution = json.loads(CONSTITUTION_PATH.read_text(encoding="utf-8"))
    errors: list[str] = []

    if protocol.get("id") != "CCT-FC-D10-001":
        errors.append("unexpected protocol identifier")
    if protocol.get("status") != "ready_for_site_binding":
        errors.append("protocol must remain ready_for_site_binding until a site is explicitly bound")
    if protocol.get("scope") != "mode_fantome_observationnel":
        errors.append("the preparation must remain a shadow-mode protocol")
    if protocol.get("evidence_scope") != "protocol_preparation_only":
        errors.append("the preparation must not claim external evidence")

    decisions = {item["id"]: item for item in constitution["dispositions"]}
    decision = decisions.get(protocol.get("candidate", {}).get("constitution_decision"))
    if decision is None:
        errors.append("candidate decision is absent from the executable constitution")
    else:
        if decision.get("title") != protocol["candidate"].get("title"):
            errors.append("candidate title no longer matches the executable constitution")
        if set(decision.get("invariants", [])) != set(protocol["candidate"].get("invariants", [])):
            errors.append("candidate invariants no longer match the executable constitution")

    required_observation_fields = {
        "id", "construct", "operational_definition", "indicator", "measurement_process",
        "window", "alternative_construct",
    }
    observations = protocol.get("observations", [])
    if len(observations) < 4:
        errors.append("at least four non-compensable observations are required")
    for observation in observations:
        missing = required_observation_fields - set(observation)
        if missing:
            errors.append(f"observation {observation.get('id')} missing {sorted(missing)}")

    required_lists = {
        "site_binding_requirements": 6,
        "method_effect_controls": 5,
        "stop_conditions": 5,
        "reversal_conditions": 4,
        "not_established": 6,
    }
    for key, minimum in required_lists.items():
        value = protocol.get(key)
        if not isinstance(value, list) or len(value) < minimum:
            errors.append(f"{key} must contain at least {minimum} explicit entries")

    text = json.dumps(protocol, ensure_ascii=False).lower()
    forbidden_claims = ("efficacité territoriale établie", "validation politique", "effet causal établi")
    for claim in forbidden_claims:
        if claim in text:
            errors.append(f"forbidden external claim: {claim}")
    return errors


if __name__ == "__main__":
    failures = validate()
    if failures:
        for failure in failures:
            print(f"FAIL: {failure}")
        raise SystemExit(1)
    print("PASS: CCT-FC-D10-001 is internally coherent and bounded to site-binding preparation")
