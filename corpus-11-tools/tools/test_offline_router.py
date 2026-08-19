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
import sys

from offline_router import route

ROOT = Path(__file__).resolve().parents[1]
EVALS = ROOT / "evals" / "routing-and-nonregression.jsonl"
SKILLS = sorted(p.name for p in (ROOT / "skills").iterdir() if p.is_dir())

records = [
    json.loads(line)
    for line in EVALS.read_text(encoding="utf-8").splitlines()
    if line.strip()
]

errors: list[str] = []

for record in records:
    expected = set(record.get("expect", []))
    baseline = set(route(record["prompt"], SKILLS))
    missing = expected - baseline
    if missing:
        errors.append(f"{record['id']}: offline route misses {sorted(missing)}; got {sorted(baseline)}")

    # The one explicit negative routing contract in the corpus is semantic but
    # mechanically checkable: do not force explore-first on a direct scene.
    if "force explore-first" in record.get("must_not", []) and "explore-first" in baseline:
        errors.append(f"{record['id']}: explore-first was forced despite negative contract")

    # Candidate order is presentation only. It must never alter the material set.
    orders: list[list[str]] = [SKILLS, list(reversed(SKILLS))]
    rng = random.Random(record["id"])
    for _ in range(32):
        perm = SKILLS.copy()
        rng.shuffle(perm)
        orders.append(perm)
    for idx, order in enumerate(orders):
        got = set(route(record["prompt"], order))
        if got != baseline:
            errors.append(
                f"{record['id']}: candidate-order drift on permutation {idx}; "
                f"baseline={sorted(baseline)} got={sorted(got)}"
            )
            break

if errors:
    print("FAIL: deterministic offline routing")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print(
    f"PASS: {len(records)} offline routing contracts; "
    f"{len(records) * 34} order-variation executions stable"
)
