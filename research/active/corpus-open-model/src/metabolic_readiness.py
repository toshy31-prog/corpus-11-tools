"""Évalue si le registre possède assez d'histoire pour autoriser v1.7."""

from __future__ import annotations

import json
from pathlib import Path

ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
EVENTS = ARTIFACTS / "temporal-relation-events-v0.jsonl"

def readiness() -> dict:
    events = [json.loads(line) for line in EVENTS.read_text().splitlines()] if EVENTS.exists() else []
    transitions = [event for event in events if event["difference"]["kind"] == "transition"]
    changed = sum(sum(event["difference"][group].values()) for event in transitions for group in ("materials", "relations"))
    return {"protocol": "transition-v1.7", "observed_events": len(events), "real_transitions": len(transitions), "cumulative_observable_changes": changed, "thresholds": {"real_transitions": 10, "cumulative_observable_changes": 50}, "ready": len(transitions) >= 10 and changed >= 50, "next_action": "human may propose a bounded v1.7 training run" if len(transitions) >= 10 and changed >= 50 else "continue observing real Corpus changes; do not manufacture changes or train v1.7"}

if __name__ == "__main__": print(json.dumps(readiness(), ensure_ascii=False, indent=2))
