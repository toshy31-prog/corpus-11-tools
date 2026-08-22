#!/usr/bin/env python3
"""Verify exact Git identities of the files that define the behavioral gate."""
from __future__ import annotations

from pathlib import Path
import json
import subprocess
import sys

plugin_root = Path(__file__).resolve().parents[1]
repo_root = plugin_root.parent
inventory_path = plugin_root / "docs" / "behavioral-surface-inventory.json"
inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
errors: list[str] = []

for item in inventory.get("surfaces", []):
    path = item.get("path")
    expected = item.get("git_object")
    kind = item.get("kind")
    if not all(isinstance(value, str) and value for value in (path, expected, kind)):
        errors.append(f"invalid inventory record: {item!r}")
        continue
    target = repo_root / path
    if not target.exists():
        errors.append(f"missing behavioral surface: {path}")
        continue
    proc = subprocess.run(
        ["git", "hash-object", path],
        cwd=repo_root,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        errors.append(f"cannot hash {path}: {proc.stderr.strip()}")
        continue
    actual = proc.stdout.strip()
    if actual != expected:
        errors.append(f"behavioral surface drift: {path}: {actual} != {expected}")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"PASS: {len(inventory.get('surfaces', []))} behavioral gate surfaces exactly attested")
