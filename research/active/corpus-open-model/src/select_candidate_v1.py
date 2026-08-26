"""Sélection d'un routeur enrichi, sans lire le test candidat v1."""

from __future__ import annotations

import json
from pathlib import Path

from candidate_dataset import partitioned as candidate_partitions
from dataset import partitioned_examples
from evaluate import lexical_predictions, metrics
from neural_router import Example, NeuralRouter, vocabulary
from train_neural_router import train as train_v0


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/candidate-v1-selection.json"


def examples(rows: list[dict]) -> list[Example]:
    return [Example(row["text"], row["labels"], f"candidate:{row['id']}") for row in rows]


def select(root: Path = ROOT) -> dict:
    historical = partitioned_examples(root)
    candidates = candidate_partitions()
    train_examples = historical["train"] + examples(candidates["train"])
    validation = examples(candidates["validation"])
    labels = sorted({label for group in historical.values() for example in group for label in example.labels})
    candidate = NeuralRouter(vocabulary(train_examples), labels)
    history = candidate.train(train_examples, epochs=160)
    v0, _ = train_v0(root)
    descriptions = {example.labels[0]: example.text for example in historical["train"] if example.origin.startswith("skill:")}
    lexical = metrics(validation, lambda text: {"labels": lexical_predictions(text, descriptions), "abstained": False})
    existing = metrics(validation, lambda text: {"labels": [item["capability"] for item in v0.predict(text, limit=3)], "abstained": False})
    augmented = metrics(validation, lambda text: {"labels": [item["capability"] for item in candidate.predict(text, limit=3)], "abstained": False})
    status = "not_selected"
    reason = "The augmented candidate does not exceed both baselines on candidate-v1 validation recall@3."
    if augmented["recall_at_3"] > max(lexical["recall_at_3"], existing["recall_at_3"]):
        status = "candidate_for_candidate_v1_test_only"
        reason = "The augmented candidate exceeds both baselines on validation and may receive one final evaluation on the untouched candidate-v1 test partition."
    return {"schema_version": 1, "scope": "candidate-v1 validation only; candidate-v1 test was not loaded", "training": {"historical_train_examples": len(historical["train"]), "candidate_train_examples": len(candidates["train"]), "loss_initial": history[0], "loss_final": history[-1]}, "metrics": {"lexical_overlap": lexical, "corpusnet_v0": existing, "augmented_candidate": augmented}, "selection": {"status": status, "reason": reason}, "reversal_condition": "If selected, withdraw the candidate when its untouched candidate-v1 test recall@3 does not exceed the selected baseline."}


if __name__ == "__main__":
    report = select()
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    compact = {name: {metric: values[metric] for metric in ("recall_at_3", "precision_at_3")} for name, values in report["metrics"].items()}
    print(json.dumps({"metrics": compact, "selection": report["selection"]}, ensure_ascii=False, indent=2))
