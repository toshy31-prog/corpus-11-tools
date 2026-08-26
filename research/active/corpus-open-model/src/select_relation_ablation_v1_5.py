"""Fige la sélection v1.5 avant l'ouverture du test stratifié."""

from __future__ import annotations

import json
from pathlib import Path

from train_relation_ablation_v1_5 import paths
from ecological_tiny_encoder import torch


ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
OUTPUT = ARTIFACTS / "ecological-relation-v1.5-selection.json"


def select() -> dict:
    if OUTPUT.exists():
        raise RuntimeError("v1.5 selection already frozen; do not alter it after test authorization.")
    candidates = {}
    for context in ("declared", "ablated"):
        _, checkpoint = paths(context)
        if not checkpoint.exists():
            raise RuntimeError(f"Missing selected checkpoint: {checkpoint}")
        payload = torch.load(checkpoint, map_location="cpu", weights_only=True)
        candidates[context] = {"checkpoint": str(checkpoint), "step": payload["step"], "validation_related_masked_language_loss": payload["validation_related_masked_language_loss"]}
    selected = min(candidates, key=lambda context: candidates[context]["validation_related_masked_language_loss"])
    result = {"experiment": "ecological-relation-ablation-v1.5", "selection_metric": "validation related_document_masked_language_loss", "candidates": candidates, "selected_context": selected, "test_status": "authorized_unobserved", "scope_limit": "Selection uses the relation-bearing validation stratum only; it is not evidence that declared relations are understood."}
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return result


if __name__ == "__main__":
    try:
        print(json.dumps(select(), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
