"""Jeu supervisé traçable et partitions stables pour CorpusNet-Router."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from neural_router import Example


def project_root() -> Path:
    return Path(__file__).resolve().parents[4]


def split_name(identifier: str) -> str:
    """Partition stable, indépendante de l'ordre physique du fichier."""
    bucket = int(hashlib.sha256(identifier.encode()).hexdigest()[:8], 16) % 100
    return "train" if bucket < 70 else "validation" if bucket < 85 else "test"


def evaluation_rows(root: Path | None = None) -> list[tuple[str, Example, str]]:
    root = root or project_root()
    path = root / "corpus-11-tools/evals/routing-and-nonregression.jsonl"
    rows = []
    for line in path.read_text().splitlines():
        row = json.loads(line)
        if row.get("expect"):
            identifier = row["id"]
            rows.append((identifier, Example(row["prompt"], row["expect"], f"eval:{identifier}"), split_name(identifier)))
    return rows


def skill_description_examples(root: Path | None = None) -> list[Example]:
    root = root or project_root()
    examples = []
    for skill_file in sorted((root / "corpus-11-tools/skills").glob("*/SKILL.md")):
        sections = skill_file.read_text().split("---", 2)
        if len(sections) < 3:
            continue
        metadata = dict(line.split(": ", 1) for line in sections[1].splitlines() if ": " in line)
        if "name" in metadata and "description" in metadata:
            examples.append(Example(metadata["description"], [metadata["name"]], f"skill:{skill_file.parent.name}"))
    return examples


def partitioned_examples(root: Path | None = None) -> dict[str, list[Example]]:
    partitions = {"train": skill_description_examples(root), "validation": [], "test": []}
    for _, example, partition in evaluation_rows(root):
        partitions[partition].append(example)
    return partitions
