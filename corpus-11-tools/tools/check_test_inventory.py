#!/usr/bin/env python3
"""Fail closed when any attested validation test surface changes silently."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent
INVENTORY = PACKAGE_ROOT / "docs" / "test-inventory.json"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def git_object(path: str) -> str:
    proc = subprocess.run(
        ["git", "rev-parse", f"HEAD:{path}"],
        cwd=REPO_ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if proc.returncode != 0:
        fail(f"attested test surface missing from HEAD: {path}")
    return proc.stdout.strip()


def main() -> None:
    try:
        data = json.loads(INVENTORY.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"cannot parse {INVENTORY.relative_to(REPO_ROOT)}: {exc}")

    surfaces = data.get("surfaces")
    if not isinstance(surfaces, list) or not surfaces:
        fail("test inventory must contain a non-empty surfaces list")

    seen: set[str] = set()
    for index, entry in enumerate(surfaces, 1):
        if not isinstance(entry, dict):
            fail(f"surface #{index} is not an object")
        path = entry.get("path")
        expected = entry.get("git_object")
        kind = entry.get("kind")
        if not isinstance(path, str) or not path:
            fail(f"surface #{index} has no valid path")
        if path in seen:
            fail(f"duplicate test surface: {path}")
        seen.add(path)
        if kind not in {"blob", "tree"}:
            fail(f"invalid kind for {path}: {kind!r}")
        if not isinstance(expected, str) or len(expected) != 40:
            fail(f"invalid git object id for {path}")

        actual = git_object(path)
        if actual != expected:
            fail(
                f"test surface drift for {path}: expected {expected}, got {actual}; "
                "review the test change and explicitly re-attest docs/test-inventory.json"
            )

    # Guard the declared discovery scopes against un-attested test modules.
    tracked = subprocess.check_output(
        ["git", "ls-files"], cwd=REPO_ROOT, text=True
    ).splitlines()
    attested = set(seen)

    def covered(path: str) -> bool:
        return any(path == root or path.startswith(root + "/") for root in attested)

    discovered = []
    for path in tracked:
        p = Path(path)
        name = p.name
        if path.startswith("research/completed/food-access-paris/site/"):
            if "/tests/" in path and name.endswith((".mjs", ".js")):
                discovered.append(path)
            continue
        if path.startswith(("corpus-11-tools/", "research/")):
            if name.startswith("test_") and name.endswith(".py"):
                discovered.append(path)
            elif name.endswith((".test.mjs", ".test.js")) or (
                name.startswith("test-") and name.endswith((".mjs", ".js"))
            ):
                discovered.append(path)

    uncovered = sorted(path for path in discovered if not covered(path))
    if uncovered:
        fail("un-attested discovered test modules: " + ", ".join(uncovered))

    print(f"PASS: exact test inventory attested ({len(surfaces)} surfaces, {len(discovered)} modules)")


if __name__ == "__main__":
    main()
