"""État persistant, local et réversible de l'écosystème Corpus.

Le v0 encode structurellement les matériaux et relations explicites. Il ne
prétend pas encore apprendre : il crée la mémoire d'états nécessaire pour
entraîner plus tard un encodeur neuronal sur des transitions observées.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path

from enriched_relation_graph import enrich
from kernel import build_snapshot


ROOT = Path(__file__).resolve().parents[4]
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
STATE = ARTIFACTS / "corpus-state-kernel-v0.json"
HISTORY = ARTIFACTS / "corpus-state-kernel-history-v0.jsonl"
DIMENSION = 96


def hashed_vector(value: str) -> list[float]:
    digest = hashlib.shake_256(value.encode()).digest(DIMENSION)
    return [(byte / 127.5) - 1.0 for byte in digest]


def add(target: list[float], source: list[float]) -> None:
    for index, value in enumerate(source):
        target[index] += value


def normalized(vector: list[float]) -> list[float]:
    magnitude = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [round(value / magnitude, 8) for value in vector]


def vector_hash(vector: list[float]) -> str:
    return hashlib.sha256(json.dumps(vector, separators=(",", ":")).encode()).hexdigest()


def build_state(root: Path = ROOT) -> dict:
    snapshot = build_snapshot(root)
    graph = enrich(root)
    aggregate = [0.0] * DIMENSION
    nodes = {}
    surfaces: dict[str, int] = {}
    for material in snapshot["materials"]:
        representation = normalized(hashed_vector(f"material|{material['path']}|{material['surface']}|{material['sha256']}"))
        nodes[material["path"]] = {"source_sha256": material["sha256"], "surface": material["surface"], "representation_sha256": vector_hash(representation)}
        surfaces[material["surface"]] = surfaces.get(material["surface"], 0) + 1
        add(aggregate, representation)
    edge_keys = sorted(f"{edge['from']}|{edge['type']}|{edge['to']}" for edge in graph["edges"])
    for edge in edge_keys:
        add(aggregate, hashed_vector(f"edge|{edge}"))
    state_vector = normalized(aggregate)
    return {
        "schema_version": 1,
        "kernel": "CorpusStateKernel v0",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "snapshot_fingerprint": snapshot["fingerprint"],
        "graph_fingerprint": hashlib.sha256("\n".join(edge_keys).encode()).hexdigest(),
        "encoder": {"kind": "deterministic structural hash encoder", "dimension": DIMENSION, "trained": False, "neural_training_status": "not_started; transition evidence is being accumulated", "boundary": "Representations are structural fingerprints, not semantic understanding or mental state."},
        "state_vector": state_vector,
        "state_vector_sha256": vector_hash(state_vector),
        "materials": {"count": len(nodes), "by_surface": surfaces, "nodes": nodes},
        "relations": {"count": len(edge_keys), "explicit_reference_count": graph["added_explicit_reference_count"]},
        "authorization": {"automatic_training": False, "automatic_product_write": False},
    }


def transition(before: dict | None, after: dict) -> dict:
    if before is None:
        return {"kind": "initial_kernel_state", "materials": {"added": after["materials"]["count"], "changed": 0, "removed": 0}, "relations": {"added": after["relations"]["count"], "removed": 0}, "state_vector_l2_delta": None}
    old, new = before["materials"]["nodes"], after["materials"]["nodes"]
    old_paths, new_paths = set(old), set(new)
    edge_changed = before["graph_fingerprint"] != after["graph_fingerprint"]
    l2 = math.sqrt(sum((left - right) ** 2 for left, right in zip(before["state_vector"], after["state_vector"])))
    return {"kind": "kernel_transition", "materials": {"added": len(new_paths - old_paths), "changed": sum(old[path]["source_sha256"] != new[path]["source_sha256"] for path in old_paths & new_paths), "removed": len(old_paths - new_paths)}, "relations": {"added": None if edge_changed else 0, "removed": None if edge_changed else 0, "graph_changed": edge_changed}, "state_vector_l2_delta": round(l2, 8)}


def advance(root: Path = ROOT) -> dict:
    ARTIFACTS.mkdir(exist_ok=True)
    before = json.loads(STATE.read_text()) if STATE.exists() else None
    after = build_state(root)
    event = {"recorded_at": after["observed_at"], "before_state": None if before is None else before["state_vector_sha256"], "after_state": after["state_vector_sha256"], "transition": transition(before, after), "scope_limit": "Persistent structural state observation only; no training, semantic inference, memory claim, agency, or automatic action."}
    STATE.write_text(json.dumps(after, ensure_ascii=False, indent=2) + "\n")
    with HISTORY.open("a") as handle:
        handle.write(json.dumps(event, ensure_ascii=False) + "\n")
    return event


if __name__ == "__main__":
    print(json.dumps(advance(), ensure_ascii=False, indent=2))
