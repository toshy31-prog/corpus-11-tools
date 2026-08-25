#!/usr/bin/env python3
"""Read-only portfolio routing and validation for all active research dossiers."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[2]
RESEARCH = ROOT / "research"
MANIFEST = RESEARCH / "portfolio.json"


SAFE_CHECKS: dict[str, tuple[Path, list[str]]] = {
    "research_workspace": (
        ROOT,
        [sys.executable, "research/active/corpus-hypotheses/scripts/validate_research_workspace.py"],
    ),
    "cct_stack": (
        ROOT / "research/active/cct/executable",
        [sys.executable, "test_stack.py"],
    ),
    "fusion_resonance": (
        ROOT / "research/active/fusion-alpha-feedback/experiments",
        [sys.executable, "test_low_compute_resonance_screen.py"],
    ),
    "fusion_radial": (
        ROOT / "research/active/fusion-alpha-feedback/experiments",
        [sys.executable, "test_low_compute_radial_screen.py"],
    ),
    "fusion_fow": (
        ROOT / "research/active/fusion-alpha-feedback/experiments",
        [sys.executable, "test_low_compute_fow_screen.py"],
    ),
}


def load_manifest() -> list[dict[str, object]]:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if data.get("schema_version") != 1 or not isinstance(data.get("projects"), list):
        raise ValueError("invalid research/portfolio.json schema")
    return data["projects"]


def structural_errors(project: dict[str, object]) -> list[str]:
    path = RESEARCH / str(project["path"])
    errors: list[str] = []
    for required in (path / "README.md", path / "state/current_state.md"):
        if not required.is_file():
            errors.append(str(required.relative_to(ROOT)))
    for field in ("id", "mode", "next_decision", "blocker", "synthetic_scope"):
        if not project.get(field):
            errors.append(f"manifest field {field!r}")
    if not isinstance(project.get("safe_checks"), list):
        errors.append("manifest field 'safe_checks' must be a list")
    return errors


def show_tree(projects: list[dict[str, object]]) -> None:
    print("research/active/")
    for project in projects:
        path = str(project["path"]).removeprefix("active/")
        print(f"├── {path}/ [{project['mode']}]")


def run_safe_checks(projects: list[dict[str, object]]) -> bool:
    ok = True
    completed: set[str] = set()
    for project in projects:
        for check in project["safe_checks"]:
            check = str(check)
            if check in completed:
                continue
            completed.add(check)
            if check not in SAFE_CHECKS:
                print(f"FAIL {project['id']}: unknown safe check {check}")
                ok = False
                continue
            cwd, command = SAFE_CHECKS[check]
            print(f"RUN  {check}: {' '.join(command)}")
            result = subprocess.run(command, cwd=cwd, text=True, capture_output=True)
            if result.returncode == 0:
                print(f"PASS {check}")
            else:
                print(f"FAIL {check} (exit {result.returncode})")
                if result.stdout:
                    print(result.stdout, end="")
                if result.stderr:
                    print(result.stderr, end="", file=sys.stderr)
                ok = False
    return ok


def record_routine(projects: list[dict[str, object]]) -> None:
    """Write an operational trace, never a scientific result or a source."""
    timestamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    filename = timestamp.replace(":", "-").replace("+00:00", "Z") + ".md"
    for project in projects:
        path = RESEARCH / str(project["path"])
        state = path / "state" / "last_automation_run.md"
        report_dir = path / "reports" / "automation"
        report_dir.mkdir(parents=True, exist_ok=True)
        record = (
            "# Routine de portefeuille\n\n"
            f"- Exécutée : {timestamp}\n"
            f"- Projet : `{project['id']}`\n"
            f"- Mode : `{project['mode']}`\n"
            f"- Portée synthétique autorisée : `{project['synthetic_scope']}`\n"
            "- Vérifications sûres : passées quand elles sont déclarées.\n"
            f"- Prochaine décision : {project['next_decision']}\n"
            f"- Blocage : {project['blocker']}\n\n"
            "Cette routine ne constitue ni une observation nouvelle, ni un changement de statut scientifique.\n"
        )
        state.write_text(record, encoding="utf-8")
        (report_dir / filename).write_text(record, encoding="utf-8")
        print(f"RECORDED {project['id']}: {state.relative_to(ROOT)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="validate all project contracts")
    parser.add_argument("--run-safe-checks", action="store_true", help="run declared read-only local checks")
    parser.add_argument("--record", action="store_true", help="record a successful routine in every dossier")
    parser.add_argument("--tree", action="store_true", help="print compact active architecture")
    args = parser.parse_args()
    if args.record:
        args.check = True
        args.run_safe_checks = True
    if not (args.check or args.run_safe_checks or args.tree):
        parser.error("choose at least one of --check, --run-safe-checks, --record or --tree")

    projects = load_manifest()
    expected = {project["path"] for project in projects}
    actual = {
        str(path.relative_to(RESEARCH))
        for path in (RESEARCH / "active").iterdir()
        if path.is_dir()
    }
    missing = sorted(actual - expected)
    if missing:
        print("FAIL uncovered top-level active dossiers: " + ", ".join(missing))
        return 1

    valid = True
    if args.check:
        for project in projects:
            errors = structural_errors(project)
            if errors:
                print(f"FAIL {project['id']}: " + "; ".join(errors))
                valid = False
            else:
                print(f"PASS {project['id']}: {project['mode']}")
                print(f"  SYNTHETIC SCOPE: {project['synthetic_scope']}")
                print(f"  NEXT: {project['next_decision']}")
                print(f"  BLOCKER: {project['blocker']}")
    if args.run_safe_checks:
        valid = run_safe_checks(projects) and valid
    if args.tree:
        show_tree(projects)
    if args.record and valid:
        record_routine(projects)
    return 0 if valid else 1


if __name__ == "__main__":
    raise SystemExit(main())
