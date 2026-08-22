#!/usr/bin/env python3
"""Fail closed when the total-validation workflow drifts from pinned CI inputs."""
from __future__ import annotations

from pathlib import Path
import re
import sys

plugin_root = Path(__file__).resolve().parents[1]
repo_root = plugin_root.parent
workflow = repo_root / ".github" / "workflows" / "post-merge-full-validation.yml"
text = workflow.read_text(encoding="utf-8")
errors: list[str] = []

# Third-party actions must be immutable commit SHAs, never floating tags/branches.
for match in re.finditer(r"(?m)^\s*-?\s*uses:\s*([^\s#]+)", text):
    value = match.group(1)
    if "@" not in value:
        errors.append(f"action without ref: {value}")
        continue
    _, ref = value.rsplit("@", 1)
    if not re.fullmatch(r"[0-9a-f]{40}", ref):
        errors.append(f"action is not pinned to a full commit SHA: {value}")

# Runtime selectors must be exact patch versions.
for key in ("python-version", "node-version"):
    for match in re.finditer(rf"(?m)^\s*{re.escape(key)}:\s*['\"]?([^'\"\s#]+)", text):
        value = match.group(1)
        if not re.fullmatch(r"\d+\.\d+\.\d+", value):
            errors.append(f"{key} is not an exact patch version: {value}")

# Ban generic freshness selectors anywhere in executable workflow text.
for forbidden in ("-latest", "@latest", "==latest", ":latest"):
    if forbidden in text:
        errors.append(f"floating selector present: {forbidden}")

# setup-node v6 can auto-enable package-manager caching; total validation opts out
# explicitly so cache behavior cannot silently change with repository metadata.
if "package-manager-cache: false" not in text:
    errors.append("setup-node package-manager-cache is not explicitly disabled")

# Python validation dependencies must be installed from repository-controlled,
# hash-locked requirement files.  Direct ad-hoc installs are prohibited.
if "--require-hashes --only-binary=:all: -r tools/requirements-bootstrap.txt" not in text:
    errors.append("hash-pinned pip bootstrap is not enforced")
if "--require-hashes --only-binary=:all: -r tools/requirements-validation.txt" not in text:
    errors.append("hash-pinned Python validation requirements are not enforced")
if re.search(r"pip install[^\n]*pytest==", text):
    errors.append("ad-hoc pytest installation remains in workflow")

# Codex CLI version must remain exact rather than a range/tag.
for match in re.finditer(r"@openai/codex@([^\s'\"]+)", text):
    if not re.fullmatch(r"\d+\.\d+\.\d+", match.group(1)):
        errors.append(f"Codex CLI is not exactly pinned: {match.group(1)}")
if "@openai/codex@" not in text:
    errors.append("Codex CLI exact version pin missing")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print("PASS: CI actions, runtimes, caches, Python wheels, and Codex CLI are pinned")
