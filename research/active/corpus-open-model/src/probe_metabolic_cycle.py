"""Trace les représentations d'un checkpoint sur les sondes gelées du cycle."""

from __future__ import annotations

from dataclasses import fields
import hashlib
import json
from pathlib import Path

from compute_profile import TinyDoctrineProfile, hardware_status
from metabolic_cycle import CYCLE, digest
from tiny_doctrine_encoder import TinyDoctrineEncoder, torch
from train_tiny_doctrine import token_id


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/metabolic-cycle-v0-probes.json"


def probe(checkpoint: Path) -> dict:
    if not CYCLE.exists():
        raise RuntimeError("Cycle absent : exécute d'abord metabolic_cycle.py freeze.")
    if not hardware_status()["ready_for_gpu_training"] or TinyDoctrineEncoder is None:
        raise RuntimeError("Runtime CUDA/PyTorch indisponible.")
    cycle = json.loads(CYCLE.read_text())
    payload = torch.load(checkpoint, map_location="cuda", weights_only=True)
    profile = TinyDoctrineProfile(**{field.name: payload["profile"][field.name] for field in fields(TinyDoctrineProfile)})
    model = TinyDoctrineEncoder(**{key: getattr(profile, key) for key in ("vocabulary_size", "hidden_size", "layers", "heads", "feedforward_size", "sequence_length")}).to("cuda")
    model.load_state_dict(payload["state_dict"])
    model.eval()
    traces = []
    with torch.no_grad():
        for item in cycle["probes"]:
            text = (ROOT / item["path"]).read_text(errors="ignore")
            words = text.casefold().split()[: profile.sequence_length]
            ids = [token_id(word, profile.vocabulary_size) for word in words]
            ids += [0] * (profile.sequence_length - len(ids))
            hidden = model.encode(torch.tensor([ids], device="cuda"))[0, : len(words)]
            vector = hidden.mean(dim=0).float().cpu().tolist()
            traces.append({"path": item["path"], "source_sha256": item["sha256"], "representation_sha256": hashlib.sha256(json.dumps(vector, separators=(",", ":")).encode()).hexdigest(), "dimension": len(vector)})
    result = {"cycle": "metabolic-v0", "checkpoint": str(checkpoint), "checkpoint_sha256": digest(checkpoint), "traces": traces, "interpretation_limit": "Representation hashes permit later comparison; they do not establish memory, learning, identity, or agency."}
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    return result


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(probe(args.checkpoint), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
