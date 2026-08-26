"""Entraîne GraphCorpusNet v1 uniquement sur la partition train."""

from __future__ import annotations

import json
from pathlib import Path

from build_knowledge_graph import build_graph
from dataset import partitioned_examples
from graph_neural_router import GraphNeuralRouter, graph_adjacency
from neural_router import vocabulary


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/graph-corpusnet-v1.json"


def train(root: Path = ROOT, epochs: int = 140):
    partitions = partitioned_examples(root)
    labels = sorted({label for groups in partitions.values() for example in groups for label in example.labels})
    graph = build_graph(root)
    model = GraphNeuralRouter(vocabulary(partitions["train"]), labels, graph_adjacency(graph))
    history = model.train(partitions["train"], epochs=epochs)
    metadata = {"model": "GraphCorpusNet v1", "architecture": "word embeddings -> tanh query encoder -> graph-propagated capability embeddings -> sigmoid", "training_examples": len(partitions["train"]), "validation_examples": len(partitions["validation"]), "historical_test_examples": len(partitions["test"]), "graph_edges_used": sum(len(items) for items in graph_adjacency(graph).values()) // 2, "loss_initial": history[0], "loss_final": history[-1], "status": "written_not_selected; select only on validation then evaluate on a new frozen benchmark", "runtime": "Python standard library only"}
    return model, metadata


if __name__ == "__main__":
    model, metadata = train()
    # Architecture serialization is intentionally deferred: a reusable weight
    # format must preserve graph snapshot identity and pass a licence review.
    print(json.dumps(metadata, ensure_ascii=False, indent=2))
