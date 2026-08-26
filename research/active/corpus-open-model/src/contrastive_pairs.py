"""Paires doctrinales explicites passage → capability, avec partitions étanches."""

from __future__ import annotations

import hashlib
from pathlib import Path

from neural_router import tokens


def _partition(label: str, index: int, count: int) -> str:
    # Garantit un noyau entraînable pour chaque capability ; les autres chunks
    # restent partitionnés de façon stable.
    if index == 0:
        return "train"
    if index == 1 and count >= 3:
        return "validation"
    if index == 2 and count >= 4:
        return "test"
    bucket = int(hashlib.sha256(f"{label}:{index}".encode()).hexdigest()[:8], 16) % 100
    return "train" if bucket < 70 else "validation" if bucket < 85 else "test"


def build(root: Path, chunk_size: int = 96) -> dict[str, list[dict]]:
    partitions = {"train": [], "validation": [], "test": []}
    for skill_file in sorted((root / "corpus-11-tools/skills").glob("*/SKILL.md")):
        label = skill_file.parent.name
        reference = skill_file.parent / "references/capability.md"
        words = tokens(skill_file.read_text() + (reference.read_text() if reference.exists() else ""))
        chunks = [words[start : start + chunk_size] for start in range(0, len(words), chunk_size)]
        for index, chunk in enumerate(chunks):
            if len(chunk) < 8:
                continue
            partition = _partition(label, index, len(chunks))
            partitions[partition].append({"id": f"{label}:{index}", "label": label, "tokens": chunk, "surface": "product", "status": "product_declared_not_established"})
    return partitions


def manifest(partitions: dict[str, list[dict]]) -> dict:
    return {"schema_version": 1, "source": "corpus-11-tools/skills/*/{SKILL.md,references/capability.md}", "unit": "contiguous token chunk", "counts": {key: len(value) for key, value in partitions.items()}, "capabilities_by_partition": {key: len({row['label'] for row in value}) for key, value in partitions.items()}, "boundary": "Only declared product skill passages receive labels. Research, transfers and archives remain available to self-supervision but are never silently labeled as active rules."}
