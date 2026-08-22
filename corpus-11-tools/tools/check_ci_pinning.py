#!/usr/bin/env python3
"""Fail closed when the total-validation workflow drifts from pinned CI inputs."""
from __future__ import annotations

from pathlib import Path
import json
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
for key in ("python-version", "node-version", "pip-version"):
    for match in re.finditer(rf"(?m)^\s*{re.escape(key)}:\s*['\"]?([^'\"\s#]+)", text):
        value = match.group(1)
        if not re.fullmatch(r"\d+\.\d+\.\d+", value):
            errors.append(f"{key} is not an exact patch version: {value}")

setup_python_count = len(re.findall(r"actions/setup-python@", text))
pip_versions = re.findall(r"(?m)^\s*pip-version:\s*['\"]?([^'\"\s#]+)", text)
if len(pip_versions) != setup_python_count:
    errors.append(
        f"every setup-python use must pin pip-version: {len(pip_versions)} != {setup_python_count}"
    )
for value in pip_versions:
    if value != "26.2.1":
        errors.append(f"setup-python pip-version must match hashed bootstrap 26.2.1, got: {value}")

# Ban generic freshness selectors anywhere in executable workflow text.
for forbidden in ("-latest", "@latest", "==latest", ":latest"):
    if forbidden in text:
        errors.append(f"floating selector present: {forbidden}")

# setup-node v6 can auto-enable package-manager caching; total validation opts out
# explicitly so cache behavior cannot silently change with repository metadata.
cache_values = re.findall(r"(?m)^\s*package-manager-cache:\s*([^\s#]+)", text)
if not cache_values:
    errors.append("setup-node package-manager-cache is not explicitly disabled")
for value in cache_values:
    if value.lower() != "false":
        errors.append(f"package-manager-cache must be false, got: {value}")

# Python validation dependencies must be installed from repository-controlled,
# hash-locked requirement files. Direct ad-hoc installs are prohibited.
if "--require-hashes --only-binary=:all: -r tools/requirements-bootstrap.txt" not in text:
    errors.append("hash-pinned pip bootstrap is not enforced")
if "--require-hashes --only-binary=:all: -r tools/requirements-validation.txt" not in text:
    errors.append("hash-pinned Python validation requirements are not enforced")
if re.search(r"pip install[^\n]*pytest==", text):
    errors.append("ad-hoc pytest installation remains in workflow")

# Codex must come from a repository-controlled npm lock, not global resolution.
codex_root = plugin_root / "tools" / "codex-cli-lock"
package_path = codex_root / "package.json"
lock_path = codex_root / "package-lock.json"
try:
    package = json.loads(package_path.read_text(encoding="utf-8"))
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as exc:
    errors.append(f"Codex lock environment unreadable: {exc}")
else:
    package_version = package.get("dependencies", {}).get("@openai/codex")
    if package_version != "0.137.0":
        errors.append(f"Codex package.json must pin 0.137.0, got: {package_version}")
    packages = lock.get("packages", {})
    root_version = packages.get("", {}).get("dependencies", {}).get("@openai/codex")
    locked_version = packages.get("node_modules/@openai/codex", {}).get("version")
    if root_version != "0.137.0" or locked_version != "0.137.0":
        errors.append(
            f"Codex package-lock must resolve 0.137.0, got root={root_version}, package={locked_version}"
        )
    codex_entries = {
        path: metadata
        for path, metadata in packages.items()
        if path.startswith("node_modules/@openai/codex")
    }
    if len(codex_entries) != 7:
        errors.append(f"Codex lock must attest wrapper plus six platform packages, got {len(codex_entries)}")
    for path, metadata in codex_entries.items():
        integrity = metadata.get("integrity")
        if not isinstance(integrity, str) or not integrity.startswith("sha512-"):
            errors.append(f"Codex lock entry lacks sha512 integrity: {path}")

if "npm install --global @openai/codex" in text:
    errors.append("global Codex npm resolution remains in workflow")
local_codex = "tools/codex-cli-lock/node_modules/.bin/codex"
if local_codex not in text:
    errors.append("workflow does not execute repository-locked Codex binary")
if text.count("working-directory: corpus-11-tools/tools/codex-cli-lock") < 2:
    errors.append("clean-room and behavioral jobs do not both install locked Codex environment")
if text.count("npm audit --audit-level=high") < 3:
    errors.append("security audit missing from food or locked Codex gates")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print("PASS: CI actions, runtimes, caches, Python wheels, and Codex transitive packages are pinned")
