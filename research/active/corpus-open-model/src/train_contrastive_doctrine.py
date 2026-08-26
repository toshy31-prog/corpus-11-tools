"""Entraîne ContrastiveDoctrineRouter v1 sur passages produit explicitement étiquetés."""

from __future__ import annotations

import json
from pathlib import Path

from contrastive_pairs import build, manifest
from contrastive_router import ContrastiveRouter
from train_doctrine import train as train_doctrine


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/contrastive-doctrine-router-v1.json"


def train(root: Path = ROOT):
    doctrine, doctrine_metadata = train_doctrine(root)
    partitions = build(root)
    labels = sorted({row["label"] for group in partitions.values() for row in group})
    model = ContrastiveRouter(doctrine.vocabulary, doctrine.input, labels)
    training = model.train(partitions["train"])
    metadata = {"model": "ContrastiveDoctrineRouter v1", "initialization": "DoctrineCorpusNet v1 self-supervised embeddings", "pairs": manifest(partitions), "training": training, "status": "trained_not_selected", "scope_limit": "Only product skill passages are positive labels; self-supervised research text is not promoted to product doctrine."}
    return model, metadata, partitions


if __name__ == "__main__":
    model, metadata, _ = train()
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps({"metadata": metadata, "network": model.to_dict()}, ensure_ascii=False))
    print(json.dumps(metadata, ensure_ascii=False, indent=2))
