#!/usr/bin/env python3
"""Holdout-style audits against eval-specific deterministic routing rules."""
from __future__ import annotations

import json
from pathlib import Path
import re

from offline_router import RULES, normalize, route

ROOT = Path(__file__).resolve().parents[1]
EVALS = ROOT / "evals" / "routing-and-nonregression.jsonl"
INDEX = ROOT / "skills" / "corpus-11-routing" / "references" / "capability-index.md"
SKILLS = sorted(path.name for path in (ROOT / "skills").iterdir() if path.is_dir())


def records() -> list[dict]:
    return [json.loads(line) for line in EVALS.read_text(encoding="utf-8").splitlines() if line.strip()]


def capability_descriptions() -> dict[str, str]:
    text = INDEX.read_text(encoding="utf-8")
    capability_section = text.split("## Operational skills", 1)[0]
    result: dict[str, str] = {}
    for line in capability_section.splitlines():
        match = re.match(r"^- `([^`]+)` — (.+)$", line)
        if match and match.group(1) in SKILLS:
            result[match.group(1)] = match.group(2)
    return result


def test_rules_do_not_copy_long_eval_phrases_unless_canonically_indexed() -> None:
    eval_prompts = [normalize(record["prompt"]) for record in records()]
    canonical = normalize(INDEX.read_text(encoding="utf-8"))
    leaks: list[str] = []
    for rule in RULES:
        for raw in rule.any_terms + rule.all_terms:
            term = normalize(raw)
            if len(term.split()) < 4:
                continue
            if term in canonical:
                continue
            hits = [record["id"] for record in records() if term in normalize(record["prompt"])]
            if hits:
                leaks.append(f"{rule.skill}: {raw!r} copied from {hits}")
    assert not leaks, "\n" + "\n".join(leaks)


def test_canonical_capability_descriptions_self_route_without_eval_oracles() -> None:
    missing: list[str] = []
    descriptions = capability_descriptions()
    assert len(descriptions) == 49
    for skill, description in descriptions.items():
        selected = route(description, SKILLS)
        if skill not in selected:
            missing.append(f"{skill}: got {selected}; description={description!r}")
    assert not missing, "\n" + "\n".join(missing)


def test_canonical_descriptions_do_not_explode_route_width() -> None:
    too_wide: list[str] = []
    for skill, description in capability_descriptions().items():
        selected = route(description, SKILLS)
        if len(selected) > 10:
            too_wide.append(f"{skill}: {len(selected)} skills -> {selected}")
    assert not too_wide, "\n" + "\n".join(too_wide)
