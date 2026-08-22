#!/usr/bin/env python3
"""Fail closed when any attested validation test surface changes silently."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parent
INVENTORY = PACKAGE_ROOT / "docs" / "test-inventory.json"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def run(*args: str, cwd: Path = REPO_ROOT, check: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(
        list(args),
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and proc.returncode != 0:
        fail(f"command failed: {' '.join(args)}\n{proc.stdout}\n{proc.stderr}")
    return proc


def git_object(path: str) -> str:
    proc = run("git", "rev-parse", f"HEAD:{path}", check=False)
    if proc.returncode != 0:
        fail(f"attested test surface missing from HEAD: {path}")
    return proc.stdout.strip()


def validate() -> tuple[int, int]:
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

    tracked = run("git", "ls-files").stdout.splitlines()
    attested = set(seen)

    def covered(path: str) -> bool:
        return any(path == root or path.startswith(root + "/") for root in attested)

    discovered: list[str] = []
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

    return len(surfaces), len(discovered)


def self_test() -> None:
    """Prove the guard rejects a distinct committed test mutation."""
    target = "corpus-11-tools/labs/python/tests/test_json_schema_subset.py"
    with tempfile.TemporaryDirectory(prefix="corpus-test-inventory-") as raw:
        worktree = Path(raw) / "mutant"
        run("git", "worktree", "add", "--detach", str(worktree), "HEAD")
        try:
            path = worktree / target
            path.write_text(path.read_text(encoding="utf-8") + "\n# committed inventory mutation\n", encoding="utf-8")
            run("git", "add", target, cwd=worktree)
            run(
                "git",
                "-c",
                "user.name=Corpus Validation",
                "-c",
                "user.email=validation@invalid.local",
                "commit",
                "-m",
                "mutation: alter attested test surface",
                cwd=worktree,
            )
            mutant = run(
                sys.executable,
                str(worktree / "corpus-11-tools" / "tools" / "check_test_inventory.py"),
                cwd=worktree / "corpus-11-tools",
                check=False,
            )
            if mutant.returncode == 0:
                fail("self-test false-negative: committed test mutation was accepted")
            combined = mutant.stdout + mutant.stderr
            if "test surface drift" not in combined:
                fail("self-test failed for an unexpected reason:\n" + combined)
        finally:
            run("git", "worktree", "remove", "--force", str(worktree), check=False)
    print("PASS: committed mutation of an attested test surface was rejected")


def main() -> None:
    surfaces, modules = validate()
    print(f"PASS: exact test inventory attested ({surfaces} surfaces, {modules} modules)")
    if "--self-test" in sys.argv[1:]:
        self_test()


if __name__ == "__main__":
    main()
