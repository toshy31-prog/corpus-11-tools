"""Compare une baseline lexicale à un encodeur neuronal de révisions Git.

Tâche : distinguer un vrai couple (version parent, version commit) d'un couple
corrompu dont la seconde version provient d'une autre révision historique de la
même partition et de la même extension. Ce n'est ni une prédiction du futur ni
une inférence d'intention : seulement une cohérence de révision textuelle.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

import torch


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "artifacts" / "historical-change-pairs-v2.jsonl"
OUTPUT = PROJECT / "artifacts" / "historical-change-coherence-v2-validation.json"
VOCABULARY = 16_384
EMBEDDING = 96
MAX_TOKENS = 768


def tokens(text: str) -> list[int]:
    words = re.findall(r"[\w]+", text.casefold())[:MAX_TOKENS]
    return [int(hashlib.sha256(word.encode()).hexdigest()[:8], 16) % VOCABULARY for word in words] or [0]


def jaccard(left: list[int], right: list[int]) -> float:
    a, b = set(left), set(right)
    return len(a & b) / max(1, len(a | b))


def auc(scores: list[float], labels: list[int]) -> float:
    positives = sum(labels)
    negatives = len(labels) - positives
    if not positives or not negatives:
        raise ValueError("AUC requires positive and negative examples")
    wins = 0.0
    for positive in (score for score, label in zip(scores, labels) if label):
        for negative in (score for score, label in zip(scores, labels) if not label):
            wins += 1.0 if positive > negative else .5 if positive == negative else 0.0
    return wins / (positives * negatives)


def load_rows() -> list[dict]:
    if not SOURCE.exists():
        raise RuntimeError("Dataset missing; run compile_historical_change_pairs_v2.py first.")
    rows = [json.loads(line) for line in SOURCE.read_text().splitlines() if line.strip()]
    if len(rows) < 30:
        raise RuntimeError(f"Only {len(rows)} textual revisions; need at least 30.")
    return rows


def split(rows: list[dict]) -> dict[str, list[dict]]:
    # Commits, not individual file rows, determine the chronological partition.
    commits = sorted({(row["commit_ordinal"], row["commit"]) for row in rows})
    train_end, validation_end = int(len(commits) * .70), int(len(commits) * .85)
    by_commit = {"train": set(commits[:train_end]), "validation": set(commits[train_end:validation_end]), "test": set(commits[validation_end:])}
    return {name: [row for row in rows if (row["commit_ordinal"], row["commit"]) in accepted] for name, accepted in by_commit.items()}


def corruptions(rows: list[dict]) -> list[int]:
    """Deterministic same-extension negative for every row, avoiding itself."""
    groups: dict[str, list[int]] = {}
    for index, row in enumerate(rows):
        groups.setdefault(row["extension"], []).append(index)
    result = []
    for index, row in enumerate(rows):
        candidates = groups[row["extension"]]
        if len(candidates) < 2:
            candidates = list(range(len(rows)))
        position = candidates.index(index) if index in candidates else 0
        # The offset is always in [1, len(candidates)-1]: a corruption may
        # never reuse the true post-revision of this same example.
        offset = 1 + (index * 17) % (len(candidates) - 1) if len(candidates) > 1 else 0
        result.append(candidates[(position + offset) % len(candidates)] if len(candidates) > 1 else index)
    if any(left == right for left, right in enumerate(result)):
        raise RuntimeError("Cannot construct non-self negative revisions for this partition.")
    return result


class RevisionEncoder(torch.nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.embedding = torch.nn.EmbeddingBag(VOCABULARY, EMBEDDING, mode="mean")
        self.score = torch.nn.Sequential(
            torch.nn.Linear(EMBEDDING * 4, 128), torch.nn.GELU(), torch.nn.Dropout(.10), torch.nn.Linear(128, 1)
        )

    def encode(self, sequences: list[list[int]], device: torch.device) -> torch.Tensor:
        flattened = [token for sequence in sequences for token in sequence]
        offsets, offset = [], 0
        for sequence in sequences:
            offsets.append(offset); offset += len(sequence)
        return self.embedding(torch.tensor(flattened, device=device), torch.tensor(offsets, device=device))

    def forward(self, left: list[list[int]], right: list[list[int]], device: torch.device) -> torch.Tensor:
        a, b = self.encode(left, device), self.encode(right, device)
        return self.score(torch.cat((a, b, torch.abs(a - b), a * b), dim=1)).squeeze(1)


def examples(rows: list[dict]) -> tuple[list[list[int]], list[list[int]], torch.Tensor, list[float]]:
    wrong = corruptions(rows)
    before = [tokens(row["before"]) for row in rows]
    after = [tokens(row["after"]) for row in rows]
    left, right, labels, baseline = [], [], [], []
    for index in range(len(rows)):
        left.extend((before[index], before[index]))
        right.extend((after[index], after[wrong[index]]))
        labels.extend((1.0, 0.0))
        baseline.extend((jaccard(before[index], after[index]), jaccard(before[index], after[wrong[index]])))
    return left, right, torch.tensor(labels), baseline


def run(epochs: int = 160) -> dict:
    partitions = split(load_rows())
    if min(len(partitions[name]) for name in partitions) < 2:
        raise RuntimeError("A chronological partition has too few file revisions for paired negatives.")
    train_left, train_right, train_y, _ = examples(partitions["train"])
    validation_left, validation_right, validation_y, validation_baseline = examples(partitions["validation"])
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    torch.manual_seed(71)
    model = RevisionEncoder().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-3)
    model.train()
    for _ in range(epochs):
        optimizer.zero_grad(set_to_none=True)
        logits = model(train_left, train_right, device)
        loss = torch.nn.functional.binary_cross_entropy_with_logits(logits, train_y.to(device))
        loss.backward(); optimizer.step()
    model.eval()
    with torch.no_grad():
        logits = model(validation_left, validation_right, device)
        probability = torch.sigmoid(logits).cpu()
        validation_loss = torch.nn.functional.binary_cross_entropy_with_logits(logits.cpu(), validation_y).item()
    labels = validation_y.int().tolist()
    baseline_auc, neural_auc = auc(validation_baseline, labels), auc(probability.tolist(), labels)
    selected = neural_auc > baseline_auc + .05
    result = {
        "experiment": "historical-change-coherence-v2",
        "task": "Distinguish Git-traced textual parent-to-commit revisions from same-partition synthetic mismatched revisions.",
        "source": "Local Git textual revisions with before/after contents; Git establishes version succession only, not semantic intent or quality.",
        "split": {"algorithm": "chronological commit split: first 70% train, next 15% validation, final 15% test; a commit never crosses partitions", "counts": {name: len(rows) for name, rows in partitions.items()}, "test_status": "reserved_unused_by_training_and_validation"},
        "baseline": {"kind": "Jaccard overlap of hashed word tokens between before and candidate after", "validation_auc": baseline_auc},
        "neural_model": {"architecture": "hashed word EmbeddingBag(16384, 96) shared across before/after → [a,b,|a-b|,a*b] → GELU(128) → sigmoid", "epochs": epochs, "device": str(device), "validation_binary_cross_entropy": validation_loss, "validation_auc": neural_auc},
        "selection": {"selected_for_one_future_test": selected, "rule": "neural validation AUC must exceed Jaccard baseline by more than 0.05", "next_action": "freeze then evaluate the held-out test once" if selected else "reject this model; do not open the test"},
        "scope_limit": "A paired historical revision coherence task only. It does not establish language understanding, future prediction, causal explanation, live learning, memory, identity, agency, or emergence.",
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=160)
    args = parser.parse_args()
    try:
        print(json.dumps(run(args.epochs), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
