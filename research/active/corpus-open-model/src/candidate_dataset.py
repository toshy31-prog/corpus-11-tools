"""Partitions stables par famille pour le jeu de supervision candidat v1."""

from __future__ import annotations

import hashlib
from collections import Counter
from pathlib import Path

from lint_candidate_data import load


def partition_for_family(family: str) -> str:
    bucket = int(hashlib.sha256(family.encode()).hexdigest()[:8], 16) % 100
    return "train" if bucket < 70 else "validation" if bucket < 85 else "test"


def partitioned() -> dict[str, list[dict]]:
    result = {"train": [], "validation": [], "test": []}
    for row in load():
        result[partition_for_family(row["scenario_family"])].append(row)
    return result


def manifest() -> dict:
    partitions = partitioned()
    families = {partition: sorted({row["scenario_family"] for row in rows}) for partition, rows in partitions.items()}
    return {"schema_version": 1, "unit": "scenario_family", "algorithm": "sha256(family) modulo 100: train <70, validation <85, test otherwise", "counts": {partition: len(rows) for partition, rows in partitions.items()}, "families": families, "invariant": "A scenario family belongs to exactly one partition; test data is not passed to candidate training or validation scripts."}
