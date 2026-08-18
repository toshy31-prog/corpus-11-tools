#!/usr/bin/env python3
"""Validate declared release identity against manifest, inventory, and Git tags."""
from __future__ import annotations

from pathlib import Path
import json
import re
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
repo = root.parent
errors: list[str] = []

manifest = json.loads((root / ".codex-plugin" / "plugin.json").read_text(encoding="utf-8"))
inventory = json.loads((root / "docs" / "inventory.json").read_text(encoding="utf-8"))
release = inventory.get("release")
version = inventory.get("version")
manifest_version = manifest.get("version")

if not isinstance(release, str) or not re.fullmatch(r"v\d+\.\d+\.\d+", release):
    errors.append(f"invalid stable release marker: {release!r}")
if version != manifest_version:
    errors.append(f"manifest/inventory version mismatch: {manifest_version!r} != {version!r}")
if isinstance(release, str) and isinstance(version, str):
    semantic = version.split("+", 1)[0]
    if release != f"v{semantic}":
        errors.append(f"release/version mismatch: {release!r} != v{semantic}")

if isinstance(release, str):
    tag = subprocess.run(
        ["git", "rev-parse", "-q", "--verify", f"refs/tags/{release}^{{commit}}"],
        cwd=repo,
        text=True,
        capture_output=True,
    )
    if tag.returncode != 0:
        errors.append(f"declared stable tag missing: {release}")
    else:
        target = tag.stdout.strip()
        main_ref = "origin/main"
        main = subprocess.run(
            ["git", "rev-parse", "-q", "--verify", main_ref],
            cwd=repo,
            text=True,
            capture_output=True,
        )
        if main.returncode != 0:
            main_ref = "main"
        ancestor = subprocess.run(
            ["git", "merge-base", "--is-ancestor", target, main_ref],
            cwd=repo,
            text=True,
            capture_output=True,
        )
        if ancestor.returncode != 0:
            errors.append(f"declared stable tag {release} is not an ancestor of {main_ref}")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"PASS: release identity {release} / {version} is coherent and tagged on main history")
