"""Premier cerveau récurrent local pour la trajectoire historique de Corpus.

Il lit une suite d'événements réels (révisions Git avant → après), conserve un
état GRU et tente de prédire la forme lexicale du prochain événement. Son état
est une trace neuronale comprimée de la trajectoire, non une conscience, une
intention ou une compréhension établie.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

import torch


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "artifacts" / "historical-change-pairs-v2.jsonl"
OUTPUT = PROJECT / "artifacts" / "ecosystem-world-model-v0-validation.json"
CHECKPOINT = PROJECT / "artifacts" / "ecosystem-world-model-v0.pt"
DIMENSION, HIDDEN, MAX_TOKENS = 2048, 128, 1600


def hashed_event(rows: list[dict]) -> torch.Tensor:
    vector = torch.zeros(DIMENSION)
    text = " ".join(f"{row['before_path']} {row['after_path']} {row['before']} {row['after']}" for row in rows)
    for token in re.findall(r"[\w]+", text.casefold())[:MAX_TOKENS]:
        vector[int(hashlib.sha256(token.encode()).hexdigest()[:8], 16) % DIMENSION] = 1.0
    return vector


def events() -> list[dict]:
    if not SOURCE.exists():
        raise RuntimeError("Missing historical revisions; run compile_historical_change_pairs_v2.py first.")
    grouped: dict[tuple[int, str], list[dict]] = defaultdict(list)
    for line in SOURCE.read_text().splitlines():
        row = json.loads(line)
        grouped[(row["commit_ordinal"], row["commit"])].append(row)
    return [{"ordinal": ordinal, "commit": commit, "vector": hashed_event(rows)} for (ordinal, commit), rows in sorted(grouped.items())]


class EcosystemWorldModel(torch.nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.perception = torch.nn.Sequential(torch.nn.Linear(DIMENSION, HIDDEN), torch.nn.GELU())
        self.memory = torch.nn.GRUCell(HIDDEN, HIDDEN)
        self.prediction = torch.nn.Linear(HIDDEN, DIMENSION)

    def forward(self, sequence: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        state = torch.zeros(HIDDEN, device=sequence.device)
        predictions, states = [], []
        for event in sequence:
            state = self.memory(self.perception(event), state)
            states.append(state)
            predictions.append(self.prediction(state))
        return torch.stack(predictions), torch.stack(states)


def bce(logits: torch.Tensor, target: torch.Tensor) -> float:
    return torch.nn.functional.binary_cross_entropy_with_logits(logits, target).item()


def run(epochs: int = 240) -> dict:
    history = events()
    sequence = torch.stack([event["vector"] for event in history])
    train_end, validation_end = int(len(history) * .70), int(len(history) * .85)
    # Predict event t+1 after incorporating event t. The final test horizon is untouched.
    train_input, train_target = sequence[:train_end - 1], sequence[1:train_end]
    validation_input, validation_target = sequence[train_end - 1:validation_end - 1], sequence[train_end:validation_end]
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    torch.manual_seed(71)
    model = EcosystemWorldModel().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-3)
    for _ in range(epochs):
        optimizer.zero_grad(set_to_none=True)
        logits, _ = model(train_input.to(device))
        loss = torch.nn.functional.binary_cross_entropy_with_logits(logits, train_target.to(device))
        loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0); optimizer.step()
    with torch.no_grad():
        validation_logits, validation_states = model(validation_input.to(device))
        neural_loss = bce(validation_logits.cpu(), validation_target)
        prevalence = train_target.mean(dim=0).clamp(.001, .999)
        baseline_logits = torch.logit(prevalence).expand_as(validation_target)
        baseline_loss = bce(baseline_logits, validation_target)
    selected = neural_loss < baseline_loss * .98
    result = {
        "model": "EcosystemWorldModel v0",
        "task": "From the historical sequence of Git-traced Corpus revisions, retain a recurrent neural state and predict the lexical form of the next revision event.",
        "data": {"historical_commit_events": len(history), "feature_dimension": DIMENSION, "source": "actual parent-to-commit text revisions; Git establishes succession, not intent or meaning"},
        "split": {"algorithm": "chronological events: first 70% train, next 15% validation, final 15% test", "counts": {"train_targets": len(train_target), "validation_targets": len(validation_target), "test_events_reserved": len(history) - validation_end}, "test_status": "reserved_not_loaded_by_this_run"},
        "validation": {"baseline_prevalence_bce": baseline_loss, "neural_bce": neural_loss, "selected": selected, "rule": "neural validation BCE must improve by at least 2% over prevalence baseline"},
        "state": {"hidden_dimension": HIDDEN, "final_validation_state_l2": round(float(validation_states[-1].norm().cpu()), 8), "checkpoint": str(CHECKPOINT) if selected else None},
        "scope_limit": "A recurrent predictive state over one historical repository trajectory. It is not evidence of emergence, consciousness, agency, semantic understanding, or reliable future prediction.",
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    if selected:
        torch.save({"state_dict": model.state_dict(), "configuration": {"dimension": DIMENSION, "hidden": HIDDEN}, "selection": result["validation"]}, CHECKPOINT)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("--epochs", type=int, default=240)
    arguments = parser.parse_args()
    try:
        print(json.dumps(run(arguments.epochs), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
