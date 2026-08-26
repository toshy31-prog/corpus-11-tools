"""Baseline et réseau neuronal sur les transitions Git historiques de Corpus.

La tâche est volontairement étroite : à partir du commit précédent, prédire les
types de changements du commit suivant (ajout, modification, suppression,
renommage, copie). Les dernières transitions restent non évaluées ici.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import torch


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "artifacts/historical-git-transitions-v0.json"
OUTPUT = PROJECT / "artifacts/historical-transition-v0-validation.json"
LABELS = ("A", "M", "D", "R", "C")
DIMENSION = 512


def tokens(event: dict) -> list[str]:
    parts = [event["subject"]]
    for change in event["changes"]:
        parts.append(change["status"])
        parts.extend(value for key, value in change.items() if key in {"path", "before", "after"})
    return re.findall(r"[a-z0-9]+", " ".join(parts).casefold())


def vector(words: list[str]) -> list[float]:
    values = [0.0] * DIMENSION
    for word in words:
        index = int(hashlib.sha256(word.encode()).hexdigest()[:8], 16) % DIMENSION
        values[index] = 1.0
    return values


def target(event: dict) -> list[float]:
    present = {change["status"] for change in event["changes"]}
    return [float(label in present) for label in LABELS]


def partitions(events: list[dict]) -> dict[str, list[dict]]:
    rows = [{"features": vector(tokens(events[index - 1])), "target": target(events[index]), "commit": events[index]["commit"]} for index in range(1, len(events))]
    train_end = int(len(rows) * .70)
    validation_end = int(len(rows) * .85)
    return {"train": rows[:train_end], "validation": rows[train_end:validation_end], "test": rows[validation_end:]}


def tensors(rows: list[dict]) -> tuple[torch.Tensor, torch.Tensor]:
    return torch.tensor([row["features"] for row in rows], dtype=torch.float32), torch.tensor([row["target"] for row in rows], dtype=torch.float32)


def metrics(predictions: torch.Tensor, labels: torch.Tensor) -> dict:
    predicted = predictions >= .5
    actual = labels.bool()
    per_label = {}
    for index, name in enumerate(LABELS):
        true_positive = int((predicted[:, index] & actual[:, index]).sum())
        false_positive = int((predicted[:, index] & ~actual[:, index]).sum())
        false_negative = int((~predicted[:, index] & actual[:, index]).sum())
        denominator = 2 * true_positive + false_positive + false_negative
        per_label[name] = 0.0 if denominator == 0 else 2 * true_positive / denominator
    return {"macro_f1": sum(per_label.values()) / len(per_label), "per_change_type_f1": per_label}


def run(epochs: int = 250) -> dict:
    if not SOURCE.exists():
        raise RuntimeError("Historical transition source missing; run extract_historical_transitions.py first.")
    events = json.loads(SOURCE.read_text())["events"]
    split = partitions(events)
    train_x, train_y = tensors(split["train"])
    validation_x, validation_y = tensors(split["validation"])
    baseline_probability = train_y.mean(dim=0)
    baseline = metrics(baseline_probability.unsqueeze(0).expand_as(validation_y), validation_y)
    torch.manual_seed(71)
    model = torch.nn.Sequential(torch.nn.Linear(DIMENSION, 64), torch.nn.ReLU(), torch.nn.Linear(64, len(LABELS)))
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-3, weight_decay=1e-3)
    for _ in range(epochs):
        optimizer.zero_grad(set_to_none=True)
        loss = torch.nn.functional.binary_cross_entropy_with_logits(model(train_x), train_y)
        loss.backward()
        optimizer.step()
    with torch.no_grad():
        validation_probability = torch.sigmoid(model(validation_x))
        validation_loss = torch.nn.functional.binary_cross_entropy(validation_probability, validation_y).item()
    neural = metrics(validation_probability, validation_y)
    selected = neural["macro_f1"] > baseline["macro_f1"] + .05
    result = {
        "experiment": "historical-transition-v0",
        "task": "Predict which Git file-change types appear in the next historical commit from the preceding commit's subject and path/status trace.",
        "source": "312 local Git commits, extracted before this experiment; historical source distinct from the live temporal ledger.",
        "split": {"algorithm": "chronological transitions: first 70% train, next 15% validation, final 15% test", "counts": {name: len(rows) for name, rows in split.items()}, "test_status": "reserved_unobserved_not_loaded_for_metrics"},
        "baseline": {"kind": "train prevalence thresholded at 0.5", **baseline},
        "neural_model": {"architecture": "hashed preceding-commit trace (512) → ReLU(64) → five sigmoid change-type outputs", "epochs": epochs, "validation_binary_cross_entropy": validation_loss, **neural},
        "selection": {"selected_for_one_future_test": selected, "rule": "neural validation macro-F1 must exceed baseline by more than 0.05", "next_action": "freeze this candidate then evaluate the chronological test exactly once" if selected else "do not open the test; reject this neural candidate for this task"},
        "scope_limit": "This measures only repository-change-type prediction on a historical local trace. It does not establish understanding, ecological learning, memory, identity, agency, or an ability to predict real-world Corpus evolution.",
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return result


if __name__ == "__main__":
    try:
        print(json.dumps(run(), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
