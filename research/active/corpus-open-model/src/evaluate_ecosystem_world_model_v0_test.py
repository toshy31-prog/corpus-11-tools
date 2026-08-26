"""Évaluation unique du test réservé pour EcosystemWorldModel v0.

Ce script ne réentraîne rien et ne sélectionne rien : il charge uniquement le
checkpoint choisi sur validation et le compare à la même baseline de fréquence.
Après son exécution, le test v0 est considéré observé et ne doit plus servir à
régler cette version.
"""
from __future__ import annotations

import json
from pathlib import Path

import torch

from train_ecosystem_world_model_v0 import CHECKPOINT, EcosystemWorldModel, bce, events


PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT / "artifacts" / "ecosystem-world-model-v0-test.json"


def run() -> dict:
    if not CHECKPOINT.exists():
        raise RuntimeError("Missing selected checkpoint; run the historical training selection first.")
    history = events()
    sequence = torch.stack([event["vector"] for event in history])
    train_end, validation_end = int(len(history) * .70), int(len(history) * .85)
    train_target = sequence[1:train_end]
    # The first held-out input is the final validation event; no target event is
    # used as input before it is predicted.
    test_input, test_target = sequence[validation_end - 1:-1], sequence[validation_end:]
    payload = torch.load(CHECKPOINT, map_location="cpu", weights_only=True)
    model = EcosystemWorldModel()
    model.load_state_dict(payload["state_dict"])
    model.eval()
    with torch.no_grad():
        test_logits, _ = model(test_input)
        neural_loss = bce(test_logits, test_target)
        prevalence = train_target.mean(dim=0).clamp(.001, .999)
        baseline_loss = bce(torch.logit(prevalence).expand_as(test_target), test_target)
    result = {
        "model": "EcosystemWorldModel v0",
        "checkpoint": str(CHECKPOINT),
        "selection": payload["selection"],
        "test": {
            "baseline_prevalence_bce": baseline_loss,
            "neural_bce": neural_loss,
            "relative_change_vs_baseline": (neural_loss - baseline_loss) / baseline_loss,
            "targets": len(test_target),
        },
        "split": {
            "algorithm": "chronological events: first 70% train, next 15% validation, final 15% test",
            "counts": {"historical_commit_events": len(history), "train_targets": len(train_target), "test_targets": len(test_target)},
            "test_status": "observed_for_ecosystem_world_model_v0_do_not_tune_v0_again",
        },
        "status": "test_observed_do_not_tune_v0_again",
        "scope_limit": "One held-out chronological segment of one repository history. This is a predictive comparison, not evidence of emergence, consciousness, agency, semantic understanding, or a live autonomous capacity.",
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return result


if __name__ == "__main__":
    try:
        print(json.dumps(run(), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
