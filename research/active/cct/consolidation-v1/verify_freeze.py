#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
manifest = json.loads((HERE / "cct-1.0-freeze.json").read_text(encoding="utf-8"))
errors: list[str] = []
for relative, expected in manifest.get("files", {}).items():
    path = (HERE / relative).resolve()
    actual = hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else "missing"
    if actual != expected:
        errors.append(f"{relative}: expected {expected}, got {actual}")
print(json.dumps({"valid": not errors, "freezeId": manifest.get("id"), "files": len(manifest.get("files", {})), "errors": errors}, ensure_ascii=False, indent=2))
raise SystemExit(1 if errors else 0)
