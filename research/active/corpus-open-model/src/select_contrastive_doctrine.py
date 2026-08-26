"""Sélection sur passages validation, puis unique passage au benchmark gelé."""

from __future__ import annotations

import json
from pathlib import Path

from contrastive_pairs import build
from evaluate import lexical_predictions, metrics
from neural_router import Example, tokens
from train_contrastive_doctrine import train


ROOT = Path(__file__).resolve().parents[4]
BENCHMARK = ROOT / "research/active/corpus-open-model/benchmarks/contrastive-v1/cases.jsonl"
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/contrastive-doctrine-selection.json"


def _examples(pairs: list[dict]) -> list[Example]:
    return [Example(" ".join(pair["tokens"]), [pair["label"]], f"pair:{pair['id']}") for pair in pairs]


def _descriptions(root: Path) -> dict[str, str]:
    result = {}
    for skill in (root / "corpus-11-tools/skills").glob("*/SKILL.md"):
        result[skill.parent.name] = skill.read_text()
    return result


def _benchmark(model) -> dict:
    rows = [json.loads(line) for line in BENCHMARK.read_text().splitlines() if line.strip()]
    expected_total = correct = predicted_total = negatives = negative_abstentions = 0
    details = []
    for row in rows:
        predicted = [item["capability"] for item in model.predict(tokens(row["prompt"]), limit=3)]
        expected = set(row["expect"])
        matched = expected & set(predicted)
        expected_total += len(expected)
        correct += len(matched)
        predicted_total += len(predicted)
        if not expected:
            negatives += 1
            negative_abstentions += int(not predicted)
        details.append({"id": row["id"], "expected": sorted(expected), "predicted": predicted, "matched": sorted(matched)})
    return {"case_count": len(rows), "recall_at_3": correct / expected_total if expected_total else 0.0, "precision_at_3": correct / predicted_total if predicted_total else 0.0, "negative_abstention_rate": negative_abstentions / negatives if negatives else 0.0, "cases": details}


def select(root: Path = ROOT) -> dict:
    model, metadata, partitions = train(root)
    validation = _examples(partitions["validation"])
    descriptions = _descriptions(root)
    lexical = metrics(validation, lambda text: {"labels": lexical_predictions(text, descriptions), "abstained": False})
    contrastive = metrics(validation, lambda text: {"labels": [item["capability"] for item in model.predict(tokens(text), limit=3)], "abstained": False})
    status = "not_selected"
    reason = "The contrastive model does not improve validation recall@3 over lexical retrieval. The frozen benchmark remains unread."
    benchmark = None
    if contrastive["recall_at_3"] > lexical["recall_at_3"]:
        status = "benchmark_observed"
        reason = "The contrastive model exceeds lexical retrieval on validation; the frozen benchmark is now observed exactly once."
        benchmark = _benchmark(model)
    return {"schema_version": 1, "scope": "validation passages first; frozen contrastive-v1 benchmark loaded only after selection", "metadata": metadata, "validation": {"lexical_overlap": lexical, "contrastive": contrastive}, "selection": {"status": status, "reason": reason}, "benchmark": benchmark}


if __name__ == "__main__":
    report = select()
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    compact = {name: {key: values[key] for key in ("recall_at_3", "precision_at_3")} for name, values in report["validation"].items()}
    print(json.dumps({"validation": compact, "selection": report["selection"], "benchmark": None if report["benchmark"] is None else {key: report["benchmark"][key] for key in ("recall_at_3", "precision_at_3", "negative_abstention_rate")}}, ensure_ascii=False, indent=2))
