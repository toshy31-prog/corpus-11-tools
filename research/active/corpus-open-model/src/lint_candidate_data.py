"""Contrôles de structure et d'isolement du jeu candidat v1."""

from __future__ import annotations

import json
from pathlib import Path

from benchmark_v1 import cases as benchmark_cases
from dataset import evaluation_rows


ROOT = Path(__file__).resolve().parents[4]
CANDIDATES = ROOT / "research/active/corpus-open-model/data/v1/candidates.jsonl"


def load() -> list[dict]:
    return [json.loads(line) for line in CANDIDATES.read_text().splitlines() if line.strip()]


def declared_labels() -> set[str]:
    inventory = json.loads((ROOT / "corpus-11-tools/docs/inventory.json").read_text())
    return set(inventory["skills"])


def lint() -> dict:
    rows = load()
    required = {"id", "scenario_family", "language", "kind", "text", "labels", "provenance"}
    assert all(required <= set(row) for row in rows), "missing required field"
    assert len({row["id"] for row in rows}) == len(rows), "duplicate id"
    assert len({row["text"].casefold() for row in rows}) == len(rows), "duplicate text"
    assert all(set(row["labels"]) <= declared_labels() for row in rows), "unknown label"
    assert all((row["kind"] == "negative") == (not row["labels"]) for row in rows), "negative/label mismatch"
    historical = {example.text.casefold() for _, example, _ in evaluation_rows(ROOT)}
    benchmark = {row["prompt"].casefold() for row in benchmark_cases()}
    assert not ({row["text"].casefold() for row in rows} & (historical | benchmark)), "exact overlap with evaluation material"
    return {"status": "valid", "count": len(rows), "positive_count": sum(bool(row["labels"]) for row in rows), "negative_count": sum(not row["labels"] for row in rows), "languages": sorted({row["language"] for row in rows}), "labels_covered": len({label for row in rows for label in row["labels"]}), "scope": "synthetic candidate training data; not independent external evidence"}


if __name__ == "__main__":
    print(json.dumps(lint(), ensure_ascii=False, indent=2))
