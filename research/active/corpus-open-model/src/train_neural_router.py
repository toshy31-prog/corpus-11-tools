"""Entraîne CorpusNet-Router v0 sur des exemples dont la provenance est déclarée."""

from __future__ import annotations

import json
from pathlib import Path

from dataset import partitioned_examples
from neural_router import NeuralRouter, vocabulary


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/corpusnet-router-v0.json"


def train(root: Path = ROOT, epochs: int = 160) -> tuple[NeuralRouter, dict]:
    partitions = partitioned_examples(root)
    examples = partitions["train"]
    labels = sorted({label for group in partitions.values() for example in group for label in example.labels})
    model = NeuralRouter(vocabulary(examples), labels)
    history = model.train(examples, epochs=epochs)
    metadata = {
        "model": "CorpusNet-Router v0",
        "task": "multi-label routing of a request toward declared Corpus capabilities",
        "training_examples": len(examples),
        "validation_examples": len(partitions["validation"]),
        "test_examples": len(partitions["test"]),
        "label_count": len(labels),
        "sources": ["corpus-11-tools/evals/routing-and-nonregression.jsonl (stable train partition only)", "corpus-11-tools/skills/*/SKILL.md front matter"],
        "loss_initial": history[0],
        "loss_final": history[-1],
        "scope_limit": "Internal training loss only; not a measure of semantic understanding, generalization, or validity of the routed method.",
    }
    return model, metadata


if __name__ == "__main__":
    model, metadata = train()
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps({"metadata": metadata, "network": model.to_dict()}, ensure_ascii=False))
    print(json.dumps(metadata, ensure_ascii=False, indent=2))
