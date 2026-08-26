"""Runner du benchmark gelé v1, hors de toute donnée d'entraînement."""

from __future__ import annotations

import json
from pathlib import Path

from dataset import partitioned_examples
from evaluate import lexical_predictions
from train_neural_router import train


ROOT = Path(__file__).resolve().parents[4]
CASES = ROOT / "research/active/corpus-open-model/benchmarks/v1/cases.jsonl"
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/benchmark-v1-report.json"


def cases() -> list[dict]:
    return [json.loads(line) for line in CASES.read_text().splitlines() if line.strip()]


def score(rows: list[dict], predict) -> dict:
    correct = 0
    expected_total = 0
    predicted_total = 0
    negatives = 0
    negative_abstentions = 0
    details = []
    for row in rows:
        prediction = predict(row["prompt"])
        labels = prediction["labels"]
        expected = set(row["expect"])
        matched = expected & set(labels)
        correct += len(matched)
        expected_total += len(expected)
        predicted_total += len(labels)
        if not expected:
            negatives += 1
            negative_abstentions += int(not labels)
        details.append({"id": row["id"], "kind": row["kind"], "language": row["language"], "expected": sorted(expected), "predicted": labels, "matched": sorted(matched), "abstained": not labels})
    return {"recall_at_3": correct / expected_total if expected_total else 0.0, "precision_at_3": correct / predicted_total if predicted_total else 0.0, "negative_abstention_rate": negative_abstentions / negatives if negatives else 0.0, "cases": details}


def run(root: Path = ROOT) -> dict:
    model, training = train(root)
    partitions = partitioned_examples(root)
    descriptions = {example.labels[0]: example.text for example in partitions["train"] if example.origin.startswith("skill:")}
    rows = cases()
    lexical = score(rows, lambda text: {"labels": lexical_predictions(text, descriptions)})
    neural = score(rows, lambda text: {"labels": [item["capability"] for item in model.predict(text, limit=3)]})
    abstaining = score(rows, lambda text: {"labels": [item["capability"] for item in model.predict_or_abstain(text)["predictions"]]})
    return {"benchmark": "v1", "status": "frozen_synthetic_development_benchmark", "training": training, "case_count": len(rows), "methods": {"lexical_overlap": lexical, "neural_router": neural, "neural_router_with_abstention": abstaining}, "warning": "Do not use this benchmark to tune v0. It is now observed; reserve it for reporting only."}


if __name__ == "__main__":
    report = run()
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({name: {key: values[key] for key in ("recall_at_3", "precision_at_3", "negative_abstention_rate")} for name, values in report["methods"].items()}, ensure_ascii=False, indent=2))
