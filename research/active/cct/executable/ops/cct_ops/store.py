"""Adaptateur de stockage CCT sur le journal générique de Corpus."""

from __future__ import annotations

from pathlib import Path
import sys
from typing import Any


for _parent in Path(__file__).resolve().parents:
    _labs = _parent / "corpus-11-tools" / "labs" / "python"
    if _labs.is_dir():
        sys.path.insert(0, str(_labs))
        break
else:  # pragma: no cover - disposition du dépôt invalide
    raise RuntimeError("Corpus generic labs are unavailable")

from corpus_labs.event_store import (  # noqa: E402
    EventStore as CorpusEventStore,
    GENESIS_HASH,
    StoreError,
    canonical_json,
    digest,
    normalize_time,
    parse_time,
    utc_now,
)


SCHEMA_VERSION = "cct-ops/0.1"


def empty_state(created_at: str) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "prototype": True,
        "deployment_status": "non_deploye",
        "created_at": created_at,
        "actors": {},
        "proposals": {},
        "decisions": {},
        "mandates": {},
        "appeals": {},
        "temporary_powers": {},
    }


class EventStore(CorpusEventStore):
    """Configuration CCT de la primitive append-only de Corpus."""

    def __init__(self, root: str | Path):
        super().__init__(
            root,
            schema_version=SCHEMA_VERSION,
            state_factory=empty_state,
            bootstrap_roles=("auditor", "registrar"),
            export_format="cct-ops-export/0.1",
            artifact_metadata={
                "prototype": True,
                "deployment_status": "non_deploye",
            },
        )
