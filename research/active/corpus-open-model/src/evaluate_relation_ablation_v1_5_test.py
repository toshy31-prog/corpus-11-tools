"""Ouverture unique du test v1.5 pour les deux branches préenregistrées."""

from __future__ import annotations

from dataclasses import fields
import json
from pathlib import Path

from compute_profile import TinyDoctrineProfile, hardware_status
from ecological_corpus import compile_ecological_corpus, manifest
from ecological_relation_experiment import metrics_by_stratum
from ecological_tiny_encoder import EcologicalTinyEncoder, torch
from relation_stratified_split import manifest as split_manifest, split_documents
from select_relation_ablation_v1_5 import OUTPUT as SELECTION
from train_relation_ablation_v1_5 import paths


ROOT = Path(__file__).resolve().parents[4]
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
OUTPUT = ARTIFACTS / "ecological-relation-v1.5-test.json"


def evaluate() -> dict:
    if OUTPUT.exists():
        raise RuntimeError("v1.5 test already observed; refuse to run it again.")
    if not SELECTION.exists():
        raise RuntimeError("v1.5 selection is not frozen; test remains closed.")
    if not hardware_status()["ready_for_gpu_training"] or EcologicalTinyEncoder is None:
        raise RuntimeError("GPU training runtime unavailable.")
    selection = json.loads(SELECTION.read_text())
    documents = compile_ecological_corpus(ROOT)
    partitions = split_documents(documents)
    profile = None
    results = {}
    device = torch.device("cuda")
    for context in ("declared", "ablated"):
        _, checkpoint = paths(context)
        payload = torch.load(checkpoint, map_location=device, weights_only=True)
        profile = TinyDoctrineProfile(**{field.name: payload["profile"][field.name] for field in fields(TinyDoctrineProfile)})
        config = {key: getattr(profile, key) for key in ("vocabulary_size", "hidden_size", "layers", "heads", "feedforward_size", "sequence_length")}
        model = EcologicalTinyEncoder(**config).to(device)
        model.load_state_dict(payload["state_dict"])
        results[context] = {"checkpoint": str(checkpoint), "selected_step": payload["step"], "selected_validation_related_masked_language_loss": payload["validation_related_masked_language_loss"], "test_by_stratum": metrics_by_stratum(model, partitions["test"], profile, device, context)}
    split = split_manifest(partitions)
    split["test_status"] = "observed_for_ecological_relation_ablation_v1_5_do_not_tune_again"
    result = {"experiment": "ecological-relation-ablation-v1.5", "selection": selection, "results": results, "corpus": manifest(partitions["test"]), "split": split, "status": "test_observed_do_not_tune_v1_5_again", "scope_limit": "Ablation comparison of a declared relation-count signal on a fresh stratified Corpus partition. It does not establish relation understanding, causal mechanisms, memory, identity, agency or emergence."}
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return result


if __name__ == "__main__":
    try:
        print(json.dumps(evaluate(), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
