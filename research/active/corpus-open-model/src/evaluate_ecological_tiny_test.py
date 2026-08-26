"""Ouverture unique, volontairement explicite, du test v1.4 après sélection."""

from __future__ import annotations

from dataclasses import fields
import json
from pathlib import Path

from compute_profile import TinyDoctrineProfile, hardware_status
from ecological_corpus import compile_ecological_corpus, manifest
from ecological_split import manifest as split_manifest, split_documents
from ecological_tiny_encoder import EcologicalTinyEncoder, torch
from train_ecological_tiny import validation_loss


ROOT = Path(__file__).resolve().parents[4]
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
CHECKPOINT = ARTIFACTS / "ecological-tiny-encoder-v1.4-best.pt"
OUTPUT = ARTIFACTS / "ecological-tiny-encoder-v1.4-test.json"


def evaluate() -> dict:
    if OUTPUT.exists():
        raise RuntimeError("v1.4 test already observed; refuse to run it again.")
    if not hardware_status()["ready_for_gpu_training"] or EcologicalTinyEncoder is None:
        raise RuntimeError("GPU training runtime unavailable.")
    if not CHECKPOINT.exists():
        raise RuntimeError(f"Best checkpoint missing: {CHECKPOINT}")
    device = torch.device("cuda")
    payload = torch.load(CHECKPOINT, map_location=device, weights_only=True)
    profile = TinyDoctrineProfile(**{field.name: payload["profile"][field.name] for field in fields(TinyDoctrineProfile)})
    config = {key: getattr(profile, key) for key in ("vocabulary_size", "hidden_size", "layers", "heads", "feedforward_size", "sequence_length")}
    model = EcologicalTinyEncoder(**config).to(device)
    model.load_state_dict(payload["state_dict"])
    partitions = split_documents(compile_ecological_corpus(ROOT))
    split = split_manifest(partitions)
    split["test_status"] = "observed_for_ecological_tiny_v1_4_do_not_tune_again"
    result = {"model": payload["model"], "checkpoint": str(CHECKPOINT), "selected_step": payload["step"], "selected_validation_masked_language_loss": payload["validation_masked_language_loss"], "test_masked_language_loss": validation_loss(model, partitions["test"], profile, device), "corpus": manifest(partitions["test"]), "split": split, "status": "test_observed_do_not_tune_v1_4_again", "scope_limit": "Token prediction with declared ecological context on a new held-out Corpus partition; not evidence of reasoning, memory, identity, agency or emergence."}
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return result


if __name__ == "__main__":
    try:
        print(json.dumps(evaluate(), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
