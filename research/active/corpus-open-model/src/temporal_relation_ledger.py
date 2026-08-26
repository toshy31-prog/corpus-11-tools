"""Journal append-only des changements observables du milieu Corpus."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path

from enriched_relation_graph import enrich
from kernel import build_snapshot

ROOT = Path(__file__).resolve().parents[4]
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
STATE = ARTIFACTS / "temporal-relation-state-v0.json"
EVENTS = ARTIFACTS / "temporal-relation-events-v0.jsonl"

def _key(edge): return edge["from"], edge["type"], edge["to"]

def observe(root: Path = ROOT) -> dict:
    snapshot, graph = build_snapshot(root), enrich(root)
    return {"schema_version": 1, "observed_at": datetime.now(timezone.utc).isoformat(), "snapshot_fingerprint": snapshot["fingerprint"], "materials": {row["path"]: {"sha256": row["sha256"], "surface": row["surface"], "size": row["size"]} for row in snapshot["materials"]}, "graph": {"edge_count": graph["edge_count"], "edges": graph["edges"]}, "observer_boundary": {"writes_product": False, "auto_trains": False, "claim": "state and difference observation only"}}

def difference(before, after) -> dict:
    if before is None:
        return {"kind": "initial_observation", "materials": {"added": len(after["materials"]), "removed": 0, "changed": 0}, "relations": {"added": len(after["graph"]["edges"]), "removed": 0}}
    old, new = before["materials"], after["materials"]
    old_edges, new_edges = {_key(edge) for edge in before["graph"]["edges"]}, {_key(edge) for edge in after["graph"]["edges"]}
    return {"kind": "transition", "materials": {"added": len(new.keys()-old.keys()), "removed": len(old.keys()-new.keys()), "changed": sum(old[path]["sha256"] != new[path]["sha256"] for path in old.keys() & new.keys())}, "relations": {"added": len(new_edges-old_edges), "removed": len(old_edges-new_edges)}}

def changed_material_paths(before, after) -> dict:
    if before is None:
        return {"added": sorted(after["materials"]), "removed": [], "changed": []}
    old, new = before["materials"], after["materials"]
    return {"added": sorted(new.keys()-old.keys()), "removed": sorted(old.keys()-new.keys()), "changed": sorted(path for path in old.keys() & new.keys() if old[path]["sha256"] != new[path]["sha256"])}

def record(root: Path = ROOT) -> dict:
    ARTIFACTS.mkdir(exist_ok=True)
    before = json.loads(STATE.read_text()) if STATE.exists() else None
    after = observe(root)
    event = {"recorded_at": datetime.now(timezone.utc).isoformat(), "before_fingerprint": None if before is None else before["snapshot_fingerprint"], "after_fingerprint": after["snapshot_fingerprint"], "difference": difference(before, after), "material_paths": changed_material_paths(before, after), "protocol_effect_note": "Local ledger artifacts are excluded from the snapshot; observation does not cause or interpret a Corpus change.", "authorization": {"automatic_training": False, "automatic_product_write": False}}
    with EVENTS.open("a") as handle: handle.write(json.dumps(event, ensure_ascii=False) + "\n")
    STATE.write_text(json.dumps(after, ensure_ascii=False, indent=2) + "\n")
    return event

if __name__ == "__main__": print(json.dumps(record(), ensure_ascii=False, indent=2))
