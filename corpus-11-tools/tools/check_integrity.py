#!/usr/bin/env python3
"""Verify machine-recorded source integrity and legacy archive checksums."""
from __future__ import annotations

from pathlib import Path
import hashlib
import json
import re
import sys

root = Path(__file__).resolve().parents[1]
errors: list[str] = []
registry_path = root / "docs" / "source-integrity.json"
registry = json.loads(registry_path.read_text(encoding="utf-8"))

provenance_refs = root / "skills" / "provenance-audit" / "references"
context_refs = root / "skills" / "corpus-context-library" / "references"

for name, meta in sorted(registry.items()):
    candidates = [root / name, provenance_refs / name, context_refs / name]
    path = next((candidate for candidate in candidates if candidate.is_file()), None)
    if path is None:
        errors.append(f"integrity registry target missing: {name}")
        continue
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != meta.get("sha256"):
        errors.append(f"sha256 mismatch: {name}: {digest} != {meta.get('sha256')}")
    if len(data) != meta.get("bytes"):
        errors.append(f"byte-size mismatch: {name}: {len(data)} != {meta.get('bytes')}")

manifest = root / "archives" / "legacy" / "MANIFEST.sha256"
legacy_root = manifest.parent
if not manifest.is_file():
    errors.append("legacy checksum manifest missing")
else:
    for number, line in enumerate(manifest.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        match = re.fullmatch(r"([0-9a-fA-F]{64})\s+\*?(.+)", line.strip())
        if not match:
            errors.append(f"legacy manifest line {number}: malformed")
            continue
        expected, filename = match.groups()
        target = legacy_root / filename
        if not target.is_file():
            errors.append(f"legacy manifest target missing: {filename}")
            continue
        actual = hashlib.sha256(target.read_bytes()).hexdigest()
        if actual.lower() != expected.lower():
            errors.append(f"legacy checksum mismatch: {filename}")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"PASS: source-integrity registry ({len(registry)} objects) and legacy manifest verified")
