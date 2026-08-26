#!/usr/bin/env python3
"""Execute every local CCT-EXEC verification and write a machine-readable report."""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parent

CHECKS = [
    {"id": "stack", "cwd": ROOT, "cmd": [sys.executable, "-m", "unittest", "-v", "test_stack.py"], "expected": 0},
    {"id": "constitution_tests", "cwd": ROOT / "constitution", "cmd": [sys.executable, "-m", "unittest", "-v"], "expected": 0},
    {"id": "constitution_valid", "cwd": ROOT / "constitution", "cmd": [sys.executable, "validate.py", "constitution.json", "--json"], "expected": 0},
    {"id": "constitution_invalid_refused", "cwd": ROOT / "constitution", "cmd": [sys.executable, "validate.py", "examples/decision-invalid.json", "--json"], "expected": 1},
    {"id": "economy_tests", "cwd": ROOT / "economy", "cmd": [sys.executable, "-m", "unittest", "-v"], "expected": 0},
    {"id": "economy_run", "cwd": ROOT / "economy", "cmd": [sys.executable, "run_economy.py"], "expected": 0},
    {"id": "ops_tests", "cwd": ROOT / "ops", "cmd": [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"], "expected": 0},
    {"id": "ops_demo", "cwd": ROOT / "ops", "cmd": [sys.executable, "examples/demo_offline.py"], "expected": 0},
    {"id": "governance_lab_tests", "cwd": WORKSPACE / "governance-lab", "cmd": [sys.executable, "-m", "unittest", "-v"], "expected": 0},
    {"id": "p005_robustness", "cwd": WORKSPACE / "governance-lab", "cmd": [sys.executable, "run_p005_robustness.py"], "expected": 0},
    {"id": "field_calibration_d10", "cwd": WORKSPACE / "field-calibration" / "protocols", "cmd": [sys.executable, "-m", "unittest", "-v", "test_validate_d10_protocol.py"], "expected": 0},
    {"id": "v013_candidate", "cwd": WORKSPACE / "next-version", "cmd": [sys.executable, "-m", "unittest", "-v", "test_v013.py"], "expected": 0},
    {"id": "v013_freeze", "cwd": WORKSPACE / "held-out-campaign", "cmd": [sys.executable, "verify_candidate_freeze.py"], "expected": 0},
    {"id": "held_out_admission", "cwd": WORKSPACE / "held-out-campaign", "cmd": ["node", "--test", "test_admission.mjs"], "expected": 0},
    {"id": "held_out_composition", "cwd": WORKSPACE / "held-out-campaign", "cmd": [sys.executable, "-m", "unittest", "-v", "test_campaign_manifest.py"], "expected": 0},
]


def portable_command(command: list[str]) -> list[str]:
    """Remove the host-specific Python executable from a recorded command."""
    if command and Path(command[0]).resolve() == Path(sys.executable).resolve():
        return ["python3", *command[1:]]
    return list(command)


def portable_cwd(path: Path) -> str:
    """Record a workspace-relative directory instead of a maintainer path."""
    return path.resolve().relative_to(WORKSPACE.resolve()).as_posix()


def execute() -> dict[str, object]:
    results = []
    for check in CHECKS:
        completed = subprocess.run(
            check["cmd"], cwd=check["cwd"], text=True,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False,
        )
        passed = completed.returncode == check["expected"]
        results.append({
            "id": check["id"],
            "passed": passed,
            "returncode": completed.returncode,
            "expected_returncode": check["expected"],
            "command": portable_command(check["cmd"]),
            "cwd": portable_cwd(check["cwd"]),
            "output_tail": "" if passed else completed.stdout[-4000:],
        })
        print(f"{'PASS' if passed else 'FAIL'} {check['id']}")
    return {
        "package": "CCT-EXEC-0.1",
        "all_passed": all(item["passed"] for item in results),
        "checks": results,
        "boundary": {
            "highest_local_level": "tested",
            "not_established": ["authorized", "deployed", "reobserved", "territorial_effectiveness"],
        },
    }


def write_report(report: dict[str, object]) -> None:
    (ROOT / "verification-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    lines = [
        "# Vérification CCT-EXEC-0.1", "",
        f"Résultat global : **{'PASS' if report['all_passed'] else 'FAIL'}**", "",
        "| Contrôle | Résultat | Code attendu/obtenu |", "|---|---|---|",
    ]
    for item in report["checks"]:
        lines.append(
            f"| {item['id']} | {'PASS' if item['passed'] else 'FAIL'} | "
            f"{item['expected_returncode']}/{item['returncode']} |"
        )
    lines.extend([
        "", "Le niveau maximal établi est `tested` localement. Autorisation, déploiement, efficacité territoriale et réobservation indépendante ne sont pas établis.",
    ])
    (ROOT / "VERIFICATION.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    result = execute()
    write_report(result)
    raise SystemExit(0 if result["all_passed"] else 1)
