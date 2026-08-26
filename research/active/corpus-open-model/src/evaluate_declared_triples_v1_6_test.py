"""Ouverture unique du test de discrimination d'arêtes déclarées v1.6."""

from __future__ import annotations

import json
from pathlib import Path

from compute_profile import hardware_status
from declared_triple_model import DeclaredTripleModel, torch
from relation_triples import manifest, split, triples
from train_declared_triples_v1_6 import evaluate
from triple_data import descriptors

ROOT = Path(__file__).resolve().parents[4]
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
CHECKPOINT = ARTIFACTS / "declared-triples-v1.6-best.pt"
OUTPUT = ARTIFACTS / "declared-triples-v1.6-test.json"

def run():
    if OUTPUT.exists(): raise RuntimeError("v1.6 test already observed; refuse to run it again.")
    if not hardware_status()["ready_for_gpu_training"] or DeclaredTripleModel is None: raise RuntimeError("GPU PyTorch unavailable.")
    if not CHECKPOINT.exists(): raise RuntimeError("v1.6 best checkpoint missing.")
    payload=torch.load(CHECKPOINT, map_location="cuda", weights_only=True); device=torch.device("cuda")
    model=DeclaredTripleModel(len(payload["relations"])).to(device); model.load_state_dict(payload["state_dict"])
    partitions=split(triples(ROOT)); result={"model":payload["model"],"checkpoint":str(CHECKPOINT),"selected_epoch":payload["epoch"],"selected_validation":payload["validation"],"test":evaluate(model,partitions["test"],descriptors(ROOT),payload["relations"],device),"graph":manifest(partitions),"status":"test_observed_do_not_tune_v1_6_again","scope_limit":"Binary discrimination of declared graph triples versus synthetic target corruptions only; not relation discovery, world truth, reasoning, agency or emergence."}
    OUTPUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n"); return result

if __name__=="__main__":
    try: print(json.dumps(run(),ensure_ascii=False,indent=2))
    except RuntimeError as e: raise SystemExit(str(e))
