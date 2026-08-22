#!/usr/bin/env python3
"""Fail closed when hard eval principles lose canonical traceability."""
from __future__ import annotations

from pathlib import Path
import json
import sys

from principle_registry import ROOT, build_registry

REGISTRY = ROOT / "docs" / "principle-registry.json"
errors: list[str] = []

try:
    committed = json.loads(REGISTRY.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as exc:
    print(f"FAIL\n - principle registry unreadable: {exc}")
    raise SystemExit(1)

expected = build_registry()
if committed != expected:
    errors.append("committed principle registry does not match current eval contracts")

entries = committed.get("entries", []) if isinstance(committed, dict) else []
ids = [entry.get("id") for entry in entries if isinstance(entry, dict)]
if len(ids) != len(set(ids)):
    errors.append("duplicate principle IDs")

for entry in entries:
    if not isinstance(entry, dict):
        errors.append("non-object principle entry")
        continue
    for path in entry.get("source_paths", []):
        source = ROOT / path
        if not source.is_file():
            errors.append(f"missing principle source path: {path}")
    sources = entry.get("source_skills", [])
    if not sources:
        errors.append(f"principle has no source skill: {entry.get('id')}")
    if len(sources) != len(set(sources)):
        errors.append(f"duplicate source skills: {entry.get('id')}")

# The same exact assertion text must not be simultaneously mandatory and
# forbidden. This catches contradictory oracle drift even if IDs differ by kind.
by_text: dict[str, set[str]] = {}
for entry in entries:
    if isinstance(entry, dict):
        by_text.setdefault(entry.get("text", ""), set()).add(entry.get("kind", ""))
for text, kinds in by_text.items():
    if {"must", "must_not"} <= kinds:
        errors.append(f"principle appears as both must and must_not: {text!r}")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"PASS: {len(entries)} hard principles have stable IDs and source traceability")
