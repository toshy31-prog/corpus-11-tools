#!/usr/bin/env python3
"""Check bounded disclosure and formal recourse requirements in a fake dossier."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "initial_cases.json"
FORBIDDEN = {
    "protected_review": {"direct_identifier", "contact", "pseudonym", "raw_testimony"},
    "public_aggregate": {"case_id", "direct_identifier", "contact", "pseudonym", "raw_testimony", "evidence_digest", "appeal_token"},
}
RECOURSE_REQUIRED = {
    "adjudication": {"case_id", "pseudonym", "raw_testimony", "evidence_digest", "requested_remedy", "appeal_token"},
    "protected_review": {"case_id", "evidence_digest", "appeal_token"},
}
MAX_RETENTION = {"adjudication": 30, "protected_review": 7, "public_aggregate": 0}


def materialize(case: dict[str, str], profile: dict[str, object]) -> dict[str, dict[str, str]]:
    return {
        audience: {field: case[field] for field in view["fields"]}
        for audience, view in profile["views"].items()
    }


def assess(case: dict[str, str], profile: dict[str, object]) -> dict[str, bool]:
    views = profile["views"]
    materialized = materialize(case, profile)
    privacy = True
    for audience, forbidden in FORBIDDEN.items():
        view = views[audience]
        assert set(materialized[audience]) == set(view["fields"])
        if forbidden.intersection(view["fields"]):
            privacy = False
    for audience, maximum in MAX_RETENTION.items():
        if views[audience]["retention_days"] > maximum:
            privacy = False
    recourse = all(RECOURSE_REQUIRED[audience].issubset(set(views[audience]["fields"])) for audience in RECOURSE_REQUIRED)
    return {"privacy": privacy, "recourse": recourse}


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    synthetic_case = fixture["synthetic_case"]
    assert ".invalid" in synthetic_case["contact"]
    assert "Synthetic" in synthetic_case["raw_testimony"]
    assert "synthetic" in synthetic_case["evidence_digest"]
    results = {}
    for profile in fixture["profiles"]:
        observed = assess(synthetic_case, profile)
        assert observed == profile["expected"], f"{profile['id']}: {observed}"
        results[profile["id"]] = observed
    assert results["full"] == {"privacy": False, "recourse": True}
    assert results["minimal"] == {"privacy": True, "recourse": False}
    assert results["graduated"] == {"privacy": True, "recourse": True}
    print("PASS privacy-recourse-lab initial synthetic protocol: 3/3 disclosure profiles")


if __name__ == "__main__":
    main()
