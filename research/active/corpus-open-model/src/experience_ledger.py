"""Mémoire d'expérience locale, limitée à la console Corpus."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
LEDGER = PROJECT / "artifacts" / "experience-ledger-v0.jsonl"
ALLOWED = {"dialogue", "human_feedback"}

def record(kind: str, payload: dict) -> dict:
    if kind not in ALLOWED: raise ValueError(f"Unsupported experience kind: {kind}")
    event = {"schema_version": 1, "recorded_at": datetime.now(timezone.utc).isoformat(), "kind": kind, "origin": "local_corpus_console", "payload": {key: value[:8000] if isinstance(value, str) else value for key, value in payload.items()}, "boundary": {"retention": "local until explicitly deleted by the human operator", "training": "not_authorized", "sharing": "not_authorized", "product_write": "not_authorized"}}
    LEDGER.parent.mkdir(exist_ok=True)
    with LEDGER.open("a") as handle: handle.write(json.dumps(event, ensure_ascii=False) + "\n")
    return event

def summary() -> dict:
    rows = [] if not LEDGER.exists() else [json.loads(line) for line in LEDGER.read_text().splitlines() if line.strip()]
    return {"event_count": len(rows), "by_kind": {kind: sum(row["kind"] == kind for row in rows) for kind in sorted(ALLOWED)}}

def clear() -> dict:
    if LEDGER.exists(): LEDGER.unlink()
    return {"cleared": True, "scope": "local console experience ledger only"}
