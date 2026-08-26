"""Comparaison reproductible : lexical, réseau neuronal et abstention."""

from __future__ import annotations

from collections import Counter
import json
from pathlib import Path

from dataset import partitioned_examples
from neural_router import tokens
from train_neural_router import train


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/evaluation-report.json"


def lexical_predictions(text: str, descriptions: dict[str, str], limit: int = 3) -> list[str]:
    query = set(tokens(text))
    scored = []
    for label, description in descriptions.items():
        terms = set(tokens(description))
        score = len(query & terms) / max(1, len(query | terms))
        scored.append((label, score))
    return [label for label, _ in sorted(scored, key=lambda item: (-item[1], item[0]))[:limit]]


def metrics(examples, predictor) -> dict:
    hits = 0
    expected_total = 0
    predicted_total = 0
    abstentions = 0
    per_case = []
    for example in examples:
        outcome = predictor(example.text)
        predicted = outcome["labels"]
        expected = set(example.labels)
        matched = expected & set(predicted)
        hits += len(matched)
        expected_total += len(expected)
        predicted_total += len(predicted)
        abstentions += int(outcome.get("abstained", False))
        per_case.append({"origin": example.origin, "expected": sorted(expected), "predicted": predicted, "matched": sorted(matched), "abstained": outcome.get("abstained", False)})
    return {"recall_at_3": hits / expected_total if expected_total else 0.0, "precision_at_3": hits / predicted_total if predicted_total else 0.0, "abstention_rate": abstentions / len(examples) if examples else 0.0, "cases": per_case}


def evaluate(root: Path = ROOT) -> dict:
    partitions = partitioned_examples(root)
    model, training = train(root)
    descriptions = {example.labels[0]: example.text for example in partitions["train"] if example.origin.startswith("skill:")}
    neural = metrics(partitions["test"], lambda text: {"labels": [item["capability"] for item in model.predict(text, limit=3)], "abstained": False})
    abstaining = metrics(partitions["test"], lambda text: {"labels": [item["capability"] for item in model.predict_or_abstain(text)["predictions"]], "abstained": model.predict_or_abstain(text)["decision"] == "abstain"})
    lexical = metrics(partitions["test"], lambda text: {"labels": lexical_predictions(text, descriptions), "abstained": False})
    selection = "experimental_not_preferred"
    reason = "The neural model does not improve recall@3 over the lexical baseline on this held-out internal split."
    if neural["recall_at_3"] > lexical["recall_at_3"]:
        selection = "internal_signal_only"
        reason = "The neural model exceeds the lexical baseline on this internal split; independent preregistered evaluation remains required."
    return {"schema_version": 1, "scope": "held-out internal Corpus prompts only; comparison is not external validation", "training": training, "test_case_count": len(partitions["test"]), "baselines": {"lexical_overlap": lexical, "neural_router": neural, "neural_router_with_abstention": abstaining}, "selection": {"status": selection, "reason": reason}, "reversal_condition": "Do not retain the neural route as preferred if it fails to improve a preregistered target metric against the lexical baseline on a future independent test set."}


if __name__ == "__main__":
    report = evaluate()
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    compact = {name: {metric: values[metric] for metric in ("recall_at_3", "precision_at_3", "abstention_rate")} for name, values in report["baselines"].items()}
    print(json.dumps({"test_case_count": report["test_case_count"], "metrics": compact}, ensure_ascii=False, indent=2))
