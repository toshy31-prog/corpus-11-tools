#!/usr/bin/env python3
"""Mutation tests for the fail-closed CI pinning policy."""
from __future__ import annotations

from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
SOURCE_REPO = HERE.parents[1]


def run(repo: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(repo / "corpus-11-tools" / "tools" / "check_ci_pinning.py")],
        cwd=repo / "corpus-11-tools",
        text=True,
        capture_output=True,
    )


def copy_repo(raw: str) -> Path:
    repo = Path(raw) / "repo"
    shutil.copytree(
        SOURCE_REPO,
        repo,
        ignore=shutil.ignore_patterns(".git", "node_modules", ".next", "__pycache__"),
    )
    return repo


def mutate_workflow_and_require_failure(old: str, new: str, label: str) -> None:
    with tempfile.TemporaryDirectory() as raw:
        repo = copy_repo(raw)
        workflow = repo / ".github" / "workflows" / "post-merge-full-validation.yml"
        text = workflow.read_text(encoding="utf-8")
        if old not in text:
            raise AssertionError(f"mutation fixture missing for {label}: {old!r}")
        workflow.write_text(text.replace(old, new, 1), encoding="utf-8")
        proc = run(repo)
        assert proc.returncode != 0, f"pinning validator false-negative for {label}:\n{proc.stdout}\n{proc.stderr}"


def test_ci_pinning_rejects_floating_inputs() -> None:
    baseline = run(SOURCE_REPO)
    assert baseline.returncode == 0, baseline.stdout + baseline.stderr
    mutate_workflow_and_require_failure(
        "actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd",
        "actions/checkout@v6",
        "floating GitHub Action tag",
    )
    mutate_workflow_and_require_failure(
        "python-version: '3.12.11'",
        "python-version: '3.12'",
        "floating Python minor",
    )
    mutate_workflow_and_require_failure(
        "pip-version: '26.2.1'",
        "pip-version: '26.2'",
        "floating pip minor",
    )
    mutate_workflow_and_require_failure(
        "package-manager-cache: false",
        "package-manager-cache: true",
        "implicit package-manager cache",
    )
    mutate_workflow_and_require_failure(
        "tools/codex-cli-lock/node_modules/.bin/codex",
        "tools/codex-cli-lock/node_modules/.bin/codex-unlocked",
        "unapproved Codex binary path",
    )


def test_ci_pinning_rejects_codex_lock_drift() -> None:
    with tempfile.TemporaryDirectory() as raw:
        repo = copy_repo(raw)
        package_path = repo / "corpus-11-tools" / "tools" / "codex-cli-lock" / "package.json"
        package = json.loads(package_path.read_text(encoding="utf-8"))
        package["dependencies"]["@openai/codex"] = "0.138.0"
        package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")
        proc = run(repo)
        assert proc.returncode != 0, (
            "pinning validator accepted Codex package drift:\n" + proc.stdout + proc.stderr
        )

    with tempfile.TemporaryDirectory() as raw:
        repo = copy_repo(raw)
        lock_path = repo / "corpus-11-tools" / "tools" / "codex-cli-lock" / "package-lock.json"
        lock = json.loads(lock_path.read_text(encoding="utf-8"))
        lock["packages"]["node_modules/@openai/codex-linux-x64"].pop("integrity", None)
        lock_path.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
        proc = run(repo)
        assert proc.returncode != 0, (
            "pinning validator accepted missing Codex integrity:\n" + proc.stdout + proc.stderr
        )
