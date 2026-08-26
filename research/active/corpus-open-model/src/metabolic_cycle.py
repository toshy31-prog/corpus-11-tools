"""Cycle v0 : gel, sondes et comparaison sans auto-entraînement."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

from organism_environment import observe


ROOT = Path(__file__).resolve().parents[4]
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
CYCLE = ARTIFACTS / "metabolic-cycle-v0.json"
DEFAULT_CHECKPOINT = ARTIFACTS / "tiny-doctrine-encoder-v1.3-best.pt"
PROBE_PATHS = [
    "corpus-11-tools/docs/inventory.json",
    "corpus-11-tools/skills/corpus-11-routing/SKILL.md",
    "corpus-11-tools/skills/conclusion-discipline/SKILL.md",
    "corpus-11-tools/skills/user-agency-preservation/SKILL.md",
]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def probes(root: Path) -> list[dict]:
    result = []
    for relative in PROBE_PATHS:
        path = root / relative
        if path.exists():
            result.append({"path": relative, "sha256": digest(path)})
    return result


def freeze(checkpoint: Path = DEFAULT_CHECKPOINT, root: Path = ROOT) -> dict:
    if not checkpoint.exists():
        raise RuntimeError(f"Checkpoint absent: {checkpoint}")
    ARTIFACTS.mkdir(exist_ok=True)
    state = {"schema_version": 1, "cycle": "metabolic-v0", "phase": "frozen", "frozen_at": datetime.now(timezone.utc).isoformat(), "environment": observe(root), "model": {"checkpoint": str(checkpoint), "sha256": digest(checkpoint)}, "probes": probes(root), "authorization": {"automatic_training": False, "automatic_product_write": False}, "interpretation_limit": "A frozen relation between environment and checkpoint, not evidence of organismic learning or agency."}
    CYCLE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    return state


def compare(checkpoint: Path, root: Path = ROOT) -> dict:
    if not CYCLE.exists():
        raise RuntimeError("Cycle absent : exécute d'abord freeze.")
    if not checkpoint.exists():
        raise RuntimeError(f"Checkpoint absent: {checkpoint}")
    baseline = json.loads(CYCLE.read_text())
    current = observe(root)
    comparison = {"schema_version": 1, "cycle": "metabolic-v0", "phase": "compared", "compared_at": datetime.now(timezone.utc).isoformat(), "baseline_environment_fingerprint": baseline["environment"]["snapshot_fingerprint"], "current_environment_fingerprint": current["snapshot_fingerprint"], "environment_changed": baseline["environment"]["snapshot_fingerprint"] != current["snapshot_fingerprint"], "baseline_model_sha256": baseline["model"]["sha256"], "current_model_sha256": digest(checkpoint), "model_changed": baseline["model"]["sha256"] != digest(checkpoint), "probe_set": baseline["probes"], "interpretation_limit": "Hash changes are traces only. Representation drift requires the separate probe script and does not establish learning, agency, or adaptation."}
    return comparison


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    freeze_parser = subparsers.add_parser("freeze")
    freeze_parser.add_argument("--checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    compare_parser = subparsers.add_parser("compare")
    compare_parser.add_argument("--checkpoint", type=Path, required=True)
    arguments = parser.parse_args()
    try:
        result = freeze(arguments.checkpoint) if arguments.command == "freeze" else compare(arguments.checkpoint)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
