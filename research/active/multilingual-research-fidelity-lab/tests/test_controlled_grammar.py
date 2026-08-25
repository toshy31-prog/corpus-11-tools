#!/usr/bin/env python3
"""Compare declared slots with a controlled fictional multilingual grammar."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "controlled_grammar_v0.2.json"
KEYS = {
    "fr": {"PREUVE": "evidence_id", "CONCLUSION": "claim_id", "PORTEE": "scope", "DECISION": "decision", "ATTRIBUTION": "attribution", "MODALITE": "modality", "NEGATION": "negated", "RETRAIT": "reversal_id"},
    "en": {"EVIDENCE": "evidence_id", "CLAIM": "claim_id", "SCOPE": "scope", "DECISION": "decision", "ATTRIBUTION": "attribution", "MODALITY": "modality", "NEGATION": "negated", "REVERSAL": "reversal_id"},
    "de": {"BELEG": "evidence_id", "SCHLUSS": "claim_id", "UMFANG": "scope", "ENTSCHEIDUNG": "decision", "ZUSCHREIBUNG": "attribution", "MODALITAET": "modality", "NEGATION": "negated", "RUECKNAHME": "reversal_id"},
}


def parse_surface(language: str, surface: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for segment in surface.split(";"):
        key, separator, value = segment.strip().partition("=")
        assert separator and key in KEYS[language] and value, (language, segment)
        semantic_key = KEYS[language][key]
        assert semantic_key not in parsed
        parsed[semantic_key] = value
    return parsed


def divergences(case: dict[str, object], required_slots: list[str]) -> list[str]:
    packets = case["packets"]
    assert {packet["language"] for packet in packets} == set(KEYS)
    parsed = {packet["language"]: parse_surface(packet["language"], packet["surface"]) for packet in packets}
    differences: set[str] = set()
    for packet in packets:
        language = packet["language"]
        assert set(required_slots).issubset(packet["slots"])
        assert set(required_slots).issubset(parsed[language])
        for field in required_slots:
            if parsed[language][field] != packet["slots"][field]:
                differences.add(f"surface_slot:{language}:{field}")
    for field in required_slots:
        if len({parsed[language][field] for language in sorted(parsed)}) > 1:
            differences.add(f"cross_language:{field}")
    return sorted(differences)


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["protocol_fixed_before_execution"] is True
    observed = {}
    for case in fixture["cases"]:
        result = divergences(case, fixture["required_slots"])
        assert result == case["expected_divergences"], (case["id"], result)
        observed[case["id"]] = result
    assert "surface_slot:en:negated" in observed["hidden_surface_negation"]
    assert observed["aligned_triplet"] == []
    print("PASS multilingual controlled grammar v0.2: 5/5 fictional triplets")


if __name__ == "__main__":
    main()
