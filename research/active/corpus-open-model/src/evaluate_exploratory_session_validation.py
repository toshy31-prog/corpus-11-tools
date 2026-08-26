"""Diagnostic reproductible d'une session exploratoire, sur validation seulement."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from compute_profile import TinyDoctrineProfile
from doctrine_corpus import compile_corpus, manifest
from doctrine_split import manifest as split_manifest, split_documents
from tiny_doctrine_encoder import TinyDoctrineEncoder, torch
from train_tiny_doctrine import validation_loss


ROOT = Path(__file__).resolve().parents[4]
SESSIONS = Path(__file__).resolve().parents[1] / "artifacts/exploratory-sessions"


def latest_checkpoint() -> Path:
    checkpoints = list(SESSIONS.glob("exploratory-session-*.pt"))
    if not checkpoints:
        raise RuntimeError("No exploratory checkpoint is available.")
    return max(checkpoints, key=lambda path: path.stat().st_mtime)


def evaluate(checkpoint: Path) -> dict:
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA PyTorch is required to evaluate this local checkpoint.")
    payload = torch.load(checkpoint, map_location="cuda", weights_only=False)
    profile = TinyDoctrineProfile(**payload["profile"])
    documents = compile_corpus(ROOT)
    partitions = split_documents(documents)
    model = TinyDoctrineEncoder(**{key: getattr(profile, key) for key in ("vocabulary_size", "hidden_size", "layers", "heads", "feedforward_size", "sequence_length")}).to("cuda")
    model.load_state_dict(payload["state_dict"])
    result = {
        "schema_version": 1,
        "model": payload["model"],
        "session_id": payload["session_id"],
        "checkpoint": str(checkpoint),
        "checkpoint_sha256": hashlib.sha256(checkpoint.read_bytes()).hexdigest(),
        "checkpoint_step": payload["step"],
        "validation_masked_language_loss": validation_loss(model, partitions["validation"], profile, torch.device("cuda")),
        "corpus": manifest(partitions["validation"]),
        "split": split_manifest(partitions),
        "status": "exploratory_validation_observed_test_remains_closed",
        "scope_limit": "Fixed-mask diagnostic on the v1.3 validation partition only. This partition has prior development exposure; the result compares local exploratory sessions only and is not independent validation, a capability claim, selection, or deployment authorization.",
    }
    result["split"]["test_status"] = "historical_v1_3_test_observed_closed_not_loaded_by_this_script"
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path)
    parser.add_argument("--latest", action="store_true")
    args = parser.parse_args()
    if bool(args.checkpoint) == args.latest:
        raise SystemExit("Choose exactly one of --checkpoint or --latest.")
    selected = latest_checkpoint() if args.latest else args.checkpoint
    try:
        report = evaluate(selected)
        output = selected.with_suffix(".validation.json")
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        print(json.dumps(report | {"report": str(output)}, ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
