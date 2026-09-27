"""Validate the local, content-free delivery manifest for this migration lot.

The manifest is an audit index, not a deployment plan.  It never launches a
model, a service, a command from the manifest, or a network request.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_MANIFEST = HERE / "DELIVERY_MANIFEST.json"
SCHEMA = "corpus.delivery-manifest.v1"
_ALLOWED_STATES = frozenset({"verified_static", "observed_bounded", "prepared_not_executed"})
_ALLOWED_KINDS = frozenset({"contract", "documentation", "validator", "test", "evidence_index"})


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(manifest: dict, *, root: Path = HERE) -> dict:
    if not isinstance(manifest, dict) or set(manifest) != {"schema", "scope", "execution", "entries", "limits"}:
        raise ValueError("manifest_shape_invalid")
    if manifest["schema"] != SCHEMA:
        raise ValueError("manifest_schema_invalid")
    if manifest["scope"] != "local_migration_lot":
        raise ValueError("manifest_scope_invalid")
    if manifest["execution"] != "not_started":
        raise ValueError("manifest_must_not_claim_execution")
    if not isinstance(manifest["limits"], list) or not manifest["limits"]:
        raise ValueError("manifest_limits_invalid")
    entries = manifest["entries"]
    if not isinstance(entries, list) or not entries:
        raise ValueError("manifest_entries_invalid")
    seen = set()
    normalized = []
    for item in entries:
        if not isinstance(item, dict) or set(item) != {"id", "kind", "path", "sha256", "status", "note"}:
            raise ValueError("entry_shape_invalid")
        ident = item["id"]
        if not isinstance(ident, str) or not ident or ident in seen:
            raise ValueError("entry_id_invalid")
        seen.add(ident)
        if item["kind"] not in _ALLOWED_KINDS or item["status"] not in _ALLOWED_STATES:
            raise ValueError("entry_status_or_kind_invalid")
        path = Path(item["path"])
        if path.is_absolute() or ".." in path.parts or not path.parts:
            raise ValueError("entry_path_not_relative")
        local = root / path
        if not local.is_file():
            raise ValueError("entry_file_missing:" + item["path"])
        claimed = item["sha256"]
        if not isinstance(claimed, str) or len(claimed) != 64 or any(c not in "0123456789abcdef" for c in claimed):
            raise ValueError("entry_hash_invalid")
        if sha256_file(local) != claimed:
            raise ValueError("entry_hash_mismatch:" + item["path"])
        note = item["note"]
        if not isinstance(note, str) or not note or len(note) > 220:
            raise ValueError("entry_note_invalid")
        normalized.append(dict(item))
    return {
        "schema": SCHEMA,
        "manifest_valid": True,
        "execution": "not_started",
        "entry_count": len(normalized),
        "status_counts": {state: sum(row["status"] == state for row in normalized) for state in sorted(_ALLOWED_STATES)},
        "entries": normalized,
        "limits": list(manifest["limits"]),
    }


def load_and_validate(path: Path = DEFAULT_MANIFEST) -> dict:
    return validate(json.loads(path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    print(json.dumps(load_and_validate(), ensure_ascii=False, indent=2))
