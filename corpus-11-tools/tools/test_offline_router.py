#!/usr/bin/env python3
"""Offline regression gate for deterministic Corpus routing.

This suite is intentionally API-free. It checks that every declared positive
routing oracle is reachable and invariant to candidate presentation order.
It does not pretend to validate free-form LLM interpretation; that remains a
separate live gate.
"""
from __future__ import annotations

import json
from pathlib import Path
import random

from offline_router import route

ROOT = Path(__file__).resolve().parents[1]
EVALS = ROOT / "evals" / "routing-and-nonregression.jsonl"
SKILLS = sorted(p.name for p in (ROOT / "skills").iterdir() if p.is_dir())

RECORDS = [
    json.loads(line)
    for line in EVALS.read_text(encoding="utf-8").splitlines()
    if line.strip()
]


def _orders(record_id: str) -> list[list[str]]:
    orders: list[list[str]] = [SKILLS, list(reversed(SKILLS))]
    rng = random.Random(record_id)
    for _ in range(32):
        perm = SKILLS.copy()
        rng.shuffle(perm)
        orders.append(perm)
    return orders


def test_all_declared_positive_routes_are_reachable() -> None:
    errors: list[str] = []
    for record in RECORDS:
        expected = set(record.get("expect", []))
        baseline = set(route(record["prompt"], SKILLS))
        missing = expected - baseline
        if missing:
            errors.append(
                f"{record['id']}: offline route misses {sorted(missing)}; "
                f"got {sorted(baseline)}"
            )
    assert not errors, "\n" + "\n".join(errors)


def test_direct_scene_does_not_force_explore_first() -> None:
    errors: list[str] = []
    for record in RECORDS:
        if "force explore-first" not in record.get("must_not", []):
            continue
        baseline = set(route(record["prompt"], SKILLS))
        if "explore-first" in baseline:
            errors.append(f"{record['id']}: explore-first forced despite negative contract")
    assert not errors, "\n" + "\n".join(errors)


def test_candidate_presentation_order_is_materially_inert() -> None:
    errors: list[str] = []
    for record in RECORDS:
        baseline = set(route(record["prompt"], SKILLS))
        for idx, order in enumerate(_orders(record["id"])):
            got = set(route(record["prompt"], order))
            if got != baseline:
                errors.append(
                    f"{record['id']}: candidate-order drift on permutation {idx}; "
                    f"baseline={sorted(baseline)} got={sorted(got)}"
                )
                break
    assert not errors, "\n" + "\n".join(errors)


def test_offline_routing_execution_count() -> None:
    # Documents the intended regression breadth and fails if the eval corpus or
    # permutation count is accidentally changed without updating the contract.
    assert len(RECORDS) == 77
    assert sum(len(_orders(record["id"])) for record in RECORDS) == 77 * 34
