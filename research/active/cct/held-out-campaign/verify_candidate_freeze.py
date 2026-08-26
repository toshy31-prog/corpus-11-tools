#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "candidate-freeze.json"


def verify() -> list[str]:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors: list[str] = []
    for key in ("candidate", "political_model"):
        entry = data[key]
        target = (HERE / entry["path"]).resolve()
        actual = hashlib.sha256(target.read_bytes()).hexdigest()
        if actual != entry["sha256"]:
            errors.append(f"{key}: gel rompu, attendu {entry['sha256']}, obtenu {actual}")
    if data.get("lifecycle_at_freeze") != "tests_statiques_passes":
        errors.append("le gel ne doit pas promouvoir le cycle de vie")
    return errors


if __name__ == "__main__":
    failures = verify()
    print(json.dumps({"valid": not failures, "errors": failures}, ensure_ascii=False, indent=2))
    raise SystemExit(1 if failures else 0)
