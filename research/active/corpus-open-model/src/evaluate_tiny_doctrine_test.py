"""Évaluation unique du checkpoint v1.3 sélectionné, sur test non vu."""

from __future__ import annotations

from dataclasses import fields
import json
from pathlib import Path

from compute_profile import TinyDoctrineProfile, hardware_status
from doctrine_corpus import compile_corpus, manifest
from doctrine_split import split_documents, manifest as split_manifest
from tiny_doctrine_encoder import TinyDoctrineEncoder, torch
from train_tiny_doctrine import validation_loss


ROOT = Path(__file__).resolve().parents[4]
CHECKPOINT = Path(__file__).resolve().parents[1] / "artifacts/tiny-doctrine-encoder-v1.3-best.pt"
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/tiny-doctrine-encoder-v1.3-test.json"


def evaluate() -> dict:
    if not hardware_status()["ready_for_gpu_training"] or TinyDoctrineEncoder is None:
        raise RuntimeError("GPU training runtime unavailable.")
    if not CHECKPOINT.exists():
        raise RuntimeError(f"Best checkpoint missing: {CHECKPOINT}")
    device = torch.device("cuda")
    payload = torch.load(CHECKPOINT, map_location=device, weights_only=True)
    profile = TinyDoctrineProfile(**{field.name: payload["profile"][field.name] for field in fields(TinyDoctrineProfile)})
    model = TinyDoctrineEncoder(**{key: getattr(profile, key) for key in ("vocabulary_size", "hidden_size", "layers", "heads", "feedforward_size", "sequence_length")}).to(device)
    model.load_state_dict(payload["state_dict"])
    partitions = split_documents(compile_corpus(ROOT))
    split = split_manifest(partitions)
    split["test_status"] = "observed_for_tiny_doctrine_v1_3_do_not_tune_again"
    result = {"model": payload["model"], "checkpoint": str(CHECKPOINT), "selected_step": payload["step"], "selected_validation_masked_language_loss": payload["validation_masked_language_loss"], "test_masked_language_loss": validation_loss(model, partitions["test"], profile, device), "corpus": manifest(partitions["test"]), "split": split, "status": "test_observed_do_not_tune_v1_3_again", "scope_limit": "Token prediction on held-out Corpus documents only; not routing or doctrinal reasoning evaluation."}
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return result


if __name__ == "__main__":
    try:
        print(json.dumps(evaluate(), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
