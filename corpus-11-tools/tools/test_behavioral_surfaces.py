#!/usr/bin/env python3
"""Prove behavioral surface attestation rejects silent gate drift."""
from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent
SOURCE_REPO = HERE.parents[1]


def run(repo: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(repo / "corpus-11-tools" / "tools" / "check_behavioral_surfaces.py")],
        cwd=repo / "corpus-11-tools",
        text=True,
        capture_output=True,
    )


def test_behavioral_surface_attestation_rejects_runner_drift() -> None:
    baseline = run(SOURCE_REPO)
    assert baseline.returncode == 0, baseline.stdout + baseline.stderr
    with tempfile.TemporaryDirectory() as raw:
        repo = Path(raw) / "repo"
        shutil.copytree(
            SOURCE_REPO,
            repo,
            ignore=shutil.ignore_patterns(".git", "node_modules", ".next", "__pycache__"),
        )
        runner = repo / "corpus-11-tools" / "tools" / "run_behavioral_evals.py"
        runner.write_text(runner.read_text(encoding="utf-8") + "\n# silent mutation\n", encoding="utf-8")
        proc = run(repo)
        assert proc.returncode != 0, (
            "behavioral surface guard accepted mutated runner:\n"
            + proc.stdout
            + proc.stderr
        )
