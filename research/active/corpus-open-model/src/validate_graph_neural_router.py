"""Sélection interne de GraphCorpusNet v1 sur validation uniquement."""

from __future__ import annotations

import json
from pathlib import Path

from dataset import partitioned_examples
from evaluate import lexical_predictions, metrics
from train_graph_neural_router import train as train_graph
from train_neural_router import train as train_v0


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/graph-v1-validation.json"


def validate(root: Path = ROOT) -> dict:
    partitions = partitioned_examples(root)
    v0, v0_metadata = train_v0(root)
    graph, graph_metadata = train_graph(root)
    descriptions = {example.labels[0]: example.text for example in partitions["train"] if example.origin.startswith("skill:")}
    lexical = metrics(partitions["validation"], lambda text: {"labels": lexical_predictions(text, descriptions), "abstained": False})
    v0_result = metrics(partitions["validation"], lambda text: {"labels": [item["capability"] for item in v0.predict(text, limit=3)], "abstained": False})
    graph_result = metrics(partitions["validation"], lambda text: {"labels": [item["capability"] for item in graph.predict(text, limit=3)], "abstained": False})
    winner = "not_selected"
    reason = "GraphCorpusNet v1 does not exceed both baselines on validation recall@3."
    if graph_result["recall_at_3"] > max(lexical["recall_at_3"], v0_result["recall_at_3"]):
        winner = "candidate_for_frozen_v2_only"
        reason = "GraphCorpusNet v1 exceeds both baselines on validation; it may be evaluated once on a new frozen benchmark, without tuning."
    return {"schema_version": 1, "scope": "selection on validation partition only; no external claim", "models": {"v0": v0_metadata, "graph_v1": graph_metadata}, "metrics": {"lexical_overlap": lexical, "corpusnet_v0": v0_result, "graph_corpusnet_v1": graph_result}, "selection": {"status": winner, "reason": reason}, "reversal_condition": "Withdraw this selection if the candidate does not exceed the selected baseline on a benchmark frozen before that evaluation."}


if __name__ == "__main__":
    report = validate()
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    summary = {name: {metric: values[metric] for metric in ("recall_at_3", "precision_at_3")} for name, values in report["metrics"].items()}
    print(json.dumps({"metrics": summary, "selection": report["selection"]}, ensure_ascii=False, indent=2))
