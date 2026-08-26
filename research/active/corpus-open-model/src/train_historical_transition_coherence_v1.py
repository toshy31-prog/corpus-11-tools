"""Apprend la cohérence locale de paires de transitions Git historiques.

Chaque positif est (commit t-1, commit t). Chaque négatif remplace t par un
commit historique non adjacent de la même partition chronologique.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import torch


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "artifacts/historical-git-transitions-v0.json"
OUTPUT = PROJECT / "artifacts/historical-transition-coherence-v1-validation.json"
DIMENSION = 384


def event_vector(event: dict) -> tuple[torch.Tensor, set[str]]:
    text = [event["subject"]]
    for change in event["changes"]:
        text.append(change["status"])
        text.extend(value for key, value in change.items() if key in {"path", "before", "after"})
    words = set(re.findall(r"[a-z0-9]+", " ".join(text).casefold()))
    values = torch.zeros(DIMENSION)
    for word in words:
        values[int(hashlib.sha256(word.encode()).hexdigest()[:8], 16) % DIMENSION] = 1.0
    return values, words


def pair_features(left: torch.Tensor, right: torch.Tensor) -> torch.Tensor:
    return torch.cat((left, right, torch.abs(left - right), left * right))


def auc(scores: list[float], labels: list[int]) -> float:
    positives = sum(labels)
    negatives = len(labels) - positives
    if not positives or not negatives:
        return float("nan")
    wins = 0.0
    for positive in (score for score, label in zip(scores, labels) if label):
        for negative in (score for score, label in zip(scores, labels) if not label):
            wins += 1.0 if positive > negative else .5 if positive == negative else 0.0
    return wins / (positives * negatives)


def rows(events: list[dict], indices: list[int], vectors: list[torch.Tensor], word_sets: list[set[str]]) -> tuple[torch.Tensor, torch.Tensor, list[float]]:
    features, labels, lexical_scores = [], [], []
    size = len(indices)
    for position, index in enumerate(indices):
        left, right = index - 1, index
        features.append(pair_features(vectors[left], vectors[right])); labels.append(1.0)
        lexical_scores.append(len(word_sets[left] & word_sets[right]) / max(1, len(word_sets[left] | word_sets[right])))
        replacement_position = (position * 17 + 11) % size
        if replacement_position == position:
            replacement_position = (replacement_position + 3) % size
        wrong = indices[replacement_position]
        features.append(pair_features(vectors[left], vectors[wrong])); labels.append(0.0)
        lexical_scores.append(len(word_sets[left] & word_sets[wrong]) / max(1, len(word_sets[left] | word_sets[wrong])))
    return torch.stack(features), torch.tensor(labels).unsqueeze(1), lexical_scores


def run(epochs: int = 300) -> dict:
    if not SOURCE.exists():
        raise RuntimeError("Historical transition source missing; run extract_historical_transitions.py first.")
    events = json.loads(SOURCE.read_text())["events"]
    vectors, word_sets = zip(*(event_vector(event) for event in events))
    available = list(range(1, len(events)))
    train_end, validation_end = int(len(available) * .70), int(len(available) * .85)
    train_indices, validation_indices, test_indices = available[:train_end], available[train_end:validation_end], available[validation_end:]
    train_x, train_y, _ = rows(events, train_indices, list(vectors), list(word_sets))
    validation_x, validation_y, lexical = rows(events, validation_indices, list(vectors), list(word_sets))
    torch.manual_seed(71)
    model = torch.nn.Sequential(torch.nn.Linear(DIMENSION * 4, 64), torch.nn.ReLU(), torch.nn.Dropout(.10), torch.nn.Linear(64, 1))
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-3)
    model.train()
    for _ in range(epochs):
        optimizer.zero_grad(set_to_none=True)
        loss = torch.nn.functional.binary_cross_entropy_with_logits(model(train_x), train_y)
        loss.backward(); optimizer.step()
    model.eval()
    with torch.no_grad():
        logits = model(validation_x)
        probabilities = torch.sigmoid(logits).squeeze(1)
        validation_loss = torch.nn.functional.binary_cross_entropy_with_logits(logits, validation_y).item()
    labels = validation_y.squeeze(1).int().tolist()
    baseline_auc = auc(lexical, labels)
    neural_auc = auc(probabilities.tolist(), labels)
    selected = neural_auc > baseline_auc + .05
    result = {
        "experiment": "historical-transition-coherence-v1",
        "task": "Discriminate an actual adjacent historical commit pair from a non-adjacent historical pairing, using only commit subjects and file-status/path traces.",
        "source": "312 local Git commits, a historical source separate from the live temporal ledger.",
        "split": {"algorithm": "chronological target commits: first 70% train, next 15% validation, final 15% test", "counts": {"train_positive_pairs": len(train_indices), "validation_positive_pairs": len(validation_indices), "test_positive_pairs": len(test_indices)}, "test_status": "reserved_unobserved_not_loaded_for_metrics"},
        "baseline": {"kind": "Jaccard overlap of preceding and candidate commit trace tokens", "validation_auc": baseline_auc},
        "neural_model": {"architecture": "hashed trace pair [left, right, absolute difference, product] → ReLU(64) → sigmoid", "epochs": epochs, "validation_binary_cross_entropy": validation_loss, "validation_auc": neural_auc},
        "selection": {"selected_for_one_future_test": selected, "rule": "neural validation AUC must exceed lexical baseline by more than 0.05", "next_action": "freeze then evaluate the chronological test exactly once" if selected else "do not open the test; reject this neural candidate"},
        "scope_limit": "Repository-history pair coherence only. It is not evidence of semantic understanding, causal explanation, live ecological learning, memory, identity, agency, or emergence.",
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return result


if __name__ == "__main__":
    try:
        print(json.dumps(run(), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
