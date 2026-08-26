"""Observatoire minimal du milieu Corpus, sans attribution d'émergence."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path

from build_knowledge_graph import build_graph
from kernel import build_snapshot


ROOT = Path(__file__).resolve().parents[4]
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
STATE = ARTIFACTS / "organism-environment-state.json"
EVENTS = ARTIFACTS / "organism-environment-events.jsonl"


def observe(root: Path = ROOT) -> dict:
    snapshot = build_snapshot(root)
    graph = build_graph(root)
    carrier_counts = {}
    for material in snapshot["materials"]:
        carrier_counts[material["surface"]] = carrier_counts.get(material["surface"], 0) + 1
    return {"schema_version": 1, "observed_at": datetime.now(timezone.utc).isoformat(), "snapshot_fingerprint": snapshot["fingerprint"], "material_count": snapshot["material_count"], "carriers": carrier_counts, "graph": {"nodes": graph["node_count"], "edges": graph["edge_count"]}, "observer_boundary": {"writes_product": False, "auto_modifies_model": False, "claim": "state observation only"}}


def record(root: Path = ROOT) -> dict:
    ARTIFACTS.mkdir(exist_ok=True)
    current = observe(root)
    previous = json.loads(STATE.read_text()) if STATE.exists() else None
    event = {"kind": "initial_observation" if previous is None else "state_transition", "before_fingerprint": None if previous is None else previous["snapshot_fingerprint"], "after_fingerprint": current["snapshot_fingerprint"], "changed": previous is None or previous["snapshot_fingerprint"] != current["snapshot_fingerprint"], "protocol_effect_note": "This observation may itself create artifacts, which are excluded from the snapshot; it does not establish an organism-level change.", "state": current}
    EVENTS.write_text((EVENTS.read_text() if EVENTS.exists() else "") + json.dumps(event, ensure_ascii=False) + "\n")
    STATE.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n")
    return event


if __name__ == "__main__":
    print(json.dumps(record(), ensure_ascii=False, indent=2))
