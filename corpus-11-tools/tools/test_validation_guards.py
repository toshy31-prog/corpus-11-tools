#!/usr/bin/env python3
"""Adversarial tests for validation gates: invalid states must be rejected."""
from __future__ import annotations

from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile

HERE = Path(__file__).resolve().parent


def run(script: Path, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(script)], cwd=cwd, text=True, capture_output=True)


def require_failure(proc: subprocess.CompletedProcess[str], label: str) -> None:
    if proc.returncode == 0:
        raise AssertionError(f"validator false-negative for {label}:\n{proc.stdout}\n{proc.stderr}")


def test_boundary_rejects_missing_withdrawal_condition(tmp: Path) -> None:
    repo = tmp / "repo"
    plugin = repo / "corpus-11-tools"
    (plugin / "tools").mkdir(parents=True)
    shutil.copy2(HERE / "check_boundaries.py", plugin / "tools" / "check_boundaries.py")
    (plugin / "labs" / "experiment-lab").mkdir(parents=True)
    (plugin / "skills").mkdir(parents=True)
    for path in (
        repo / "research" / "active" / "cct",
        repo / "research" / "active" / "corpus-hypotheses",
        repo / "research" / "completed" / "food-access-paris",
    ):
        path.mkdir(parents=True)
        (path / "README.md").write_text("ok\n", encoding="utf-8")
    for kind in ("accepted", "candidates", "rejected"):
        (repo / "transfers" / kind).mkdir(parents=True)
    (repo / "transfers" / "accepted" / "bad.md").write_text(
        "- Destination : product\n- Vérification : tests\n", encoding="utf-8"
    )
    require_failure(run(plugin / "tools" / "check_boundaries.py", repo), "accepted transfer without withdrawal condition")


def test_eval_gate_rejects_unknown_expected_skill(tmp: Path) -> None:
    plugin = tmp / "corpus-11-tools"
    (plugin / "tools").mkdir(parents=True)
    shutil.copy2(HERE / "check_evals.py", plugin / "tools" / "check_evals.py")
    (plugin / "evals").mkdir()
    (plugin / "docs").mkdir()
    skill = plugin / "skills" / "known" / "references"
    skill.mkdir(parents=True)
    (skill.parent / "SKILL.md").write_text("---\nname: known\ndescription: x\n---\n", encoding="utf-8")
    (skill / "capability.md").write_text("# CAP.KNOWN — provenance opérationnelle\n", encoding="utf-8")
    record = {"id": "x", "prompt": "p", "expect": ["ghost"]}
    (plugin / "evals" / "routing-and-nonregression.jsonl").write_text(json.dumps(record) + "\n", encoding="utf-8")
    (plugin / "docs" / "inventory.json").write_text(json.dumps({"eval_count": 1}), encoding="utf-8")
    require_failure(run(plugin / "tools" / "check_evals.py", plugin), "eval expecting nonexistent skill")


def test_integrity_gate_rejects_tampering(tmp: Path) -> None:
    plugin = tmp / "corpus-11-tools"
    (plugin / "tools").mkdir(parents=True)
    shutil.copy2(HERE / "check_integrity.py", plugin / "tools" / "check_integrity.py")
    (plugin / "docs").mkdir()
    (plugin / "archives" / "legacy").mkdir(parents=True)
    (plugin / "skills" / "provenance-audit" / "references").mkdir(parents=True)
    target = plugin / "probe.txt"
    target.write_text("tampered", encoding="utf-8")
    (plugin / "docs" / "source-integrity.json").write_text(
        json.dumps({"probe.txt": {"sha256": "0" * 64, "bytes": 8}}), encoding="utf-8"
    )
    (plugin / "archives" / "legacy" / "MANIFEST.sha256").write_text("", encoding="utf-8")
    require_failure(run(plugin / "tools" / "check_integrity.py", plugin), "source-integrity tampering")


def main() -> int:
    tests = [
        test_boundary_rejects_missing_withdrawal_condition,
        test_eval_gate_rejects_unknown_expected_skill,
        test_integrity_gate_rejects_tampering,
    ]
    with tempfile.TemporaryDirectory() as raw:
        base = Path(raw)
        for index, test in enumerate(tests):
            case = base / str(index)
            case.mkdir()
            test(case)
            print(f"PASS mutation: {test.__name__}")
    print(f"PASS: {len(tests)} adversarial validator mutations rejected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
