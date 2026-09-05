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
ALLOWED_SYNTHETIC_SCOPES = {"formal_exact", "model_internal", "pipeline_verified"}


SAFE_CHECKS: dict[str, tuple[Path, list[str]]] = {
    "ecosystem_episode_ledger": (
        ROOT,
        [
            sys.executable,
            "research/active/corpus-open-model/tests/test_ecosystem_episode_ledger.py",
        ],
    ),
    "native_conversation_surface": (
        ROOT,
        [
            sys.executable,
            "-m",
            "unittest",
            "discover",
            "-s",
            "research/active/model-response-comparison-harness/native_surface/tests",
            "-p",
            "test_*.py",
        ],
    ),
    "conversational_surface_candidate": (
        ROOT,
        [sys.executable, "corpus-11-tools/tools/check_conversational_surface.py"],
    ),
    "comparison_harness": (
        ROOT,
        [sys.executable, "research/active/model-response-comparison-harness/tests/test_harness.py"],
    ),
    "portfolio_manifest": (
        ROOT / "research/scripts",
        [sys.executable, "test_portfolio_cycle.py"],
    ),
    "accessibility_functional_tasks": (
        ROOT,
        [sys.executable, "research/active/accessibility-and-modal-equivalence-lab/tests/test_functional_modal_tasks.py"],
    ),
    "adversarial_structural_mutations": (
        ROOT,
        [sys.executable, "research/active/adversarial-agent-boundaries/tests/test_structural_mutations.py"],
    ),
    "causal_scm_campaign": (
        ROOT,
        [sys.executable, "research/active/causal-claim-calibration-lab/tests/test_scm_campaign.py"],
    ),
    "contested_joint_compatibility": (
        ROOT,
        [sys.executable, "research/active/contested-claims-lab/tests/test_joint_compatibility.py"],
    ),
    "diversity_provenance_failures": (
        ROOT,
        [sys.executable, "research/active/epistemic-diversity-and-common-mode-failure-lab/tests/test_provenance_failures.py"],
    ),
    "forecast_fictional_registry": (
        ROOT,
        [sys.executable, "research/active/forecast-calibration-lab/tests/test_fictional_forecast_registry.py"],
    ),
    "fusion_fictive_tae_matrix": (
        ROOT,
        [sys.executable, "research/active/fusion-alpha-feedback/f0-data-global-tae-matrix/pipeline/test_fictive_tae_matrix.py"],
    ),
    "governance_state_machine": (
        ROOT,
        [sys.executable, "research/active/contributor-ecosystem-governance-lab/tests/test_governance_state_machine.py"],
    ),
    "independent_lineage_graphs": (
        ROOT,
        [sys.executable, "research/active/independent-evidence-arena/tests/test_lineage_graphs.py"],
    ),
    "interruptibility_cutpoints": (
        ROOT,
        [sys.executable, "research/active/research-interruptibility-and-recovery-lab/tests/test_cutpoint_recovery.py"],
    ),
    "material_order_confluence": (
        ROOT,
        [sys.executable, "research/active/material-trace-lab/tests/test_order_confluence.py"],
    ),
    "multilingual_controlled_grammar": (
        ROOT,
        [sys.executable, "research/active/multilingual-research-fidelity-lab/tests/test_controlled_grammar.py"],
    ),
    "option_explicit_tree": (
        ROOT,
        [sys.executable, "research/active/portfolio-option-value-lab/tests/test_explicit_option_tree.py"],
    ),
    "privacy_taint_recourse": (
        ROOT,
        [sys.executable, "research/active/privacy-recourse-lab/tests/test_taint_recourse_model.py"],
    ),
    "provenance_core_mutations": (
        ROOT,
        [sys.executable, "research/active/provenance-interoperability-lab/tests/test_core_mutations.py"],
    ),
    "recovery_distributed_fictional": (
        ROOT,
        [sys.executable, "research/active/corpus-hypotheses/experiments/test_recovery_distributed_fictional_v0_1.py"],
    ),
    "relation_fictional_migrations": (
        ROOT,
        [sys.executable, "research/active/relation-loss-observatory/tests/test_fictional_paired_migrations.py"],
    ),
    "footprint_generated_logs": (
        ROOT,
        [sys.executable, "research/active/research-footprint-and-yield-lab/tests/test_generated_decision_logs.py"],
    ),
    "semantic_transition_manifest": (
        ROOT,
        [sys.executable, "research/active/semantic-migration-lab/tests/test_transition_manifest.py"],
    ),
    "user_capacity_population": (
        ROOT,
        [sys.executable, "research/active/user-capacity-and-dependence-lab/tests/test_fictional_capacity_population.py"],
    ),
    "material_trace_initial": (
        ROOT,
        [sys.executable, "research/active/material-trace-lab/tests/test_initial_protocol.py"],
    ),
    "provenance_interop_initial": (
        ROOT,
        [sys.executable, "research/active/provenance-interoperability-lab/tests/test_initial_protocol.py"],
    ),
    "multilingual_fidelity_initial": (
        ROOT,
        [sys.executable, "research/active/multilingual-research-fidelity-lab/tests/test_initial_protocol.py"],
    ),
    "adversarial_boundaries_initial": (
        ROOT,
        [sys.executable, "research/active/adversarial-agent-boundaries/tests/test_initial_protocol.py"],
    ),
    "semantic_migration_initial": (
        ROOT,
        [sys.executable, "research/active/semantic-migration-lab/tests/test_initial_protocol.py"],
    ),
    "contested_claims_initial": (
        ROOT,
        [sys.executable, "research/active/contested-claims-lab/tests/test_initial_protocol.py"],
    ),
    "causal_calibration_initial": (
        ROOT,
        [sys.executable, "research/active/causal-claim-calibration-lab/tests/test_initial_protocol.py"],
    ),
    "privacy_recourse_initial": (
        ROOT,
        [sys.executable, "research/active/privacy-recourse-lab/tests/test_initial_protocol.py"],
    ),
    "initial_protocols": (
        ROOT,
        [sys.executable, "research/scripts/check_initial_protocols.py"],
    ),
    "research_workspace": (
        ROOT,
        [sys.executable, "research/active/corpus-hypotheses/scripts/validate_research_workspace.py"],
    ),
    "corpus_factorization_s4_quotient": (
        ROOT / "research/active/corpus-hypotheses/experiments",
        [sys.executable, "test_factorization_s4_quotient_audit.py"],
    ),
    "corpus_factorization_b3": (
        ROOT / "research/active/corpus-hypotheses/experiments",
        [sys.executable, "test_b3_fixed_space_orbits.py"],
    ),
    "cct_stack": (
        ROOT / "research/active/cct/executable",
        [sys.executable, "test_stack.py"],
    ),
    "cct_d10_campaign": (
        ROOT / "research/active/cct/field-calibration/campaign",
        [sys.executable, "-m", "unittest", "discover", "-p", "test_*.py"],
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
    "fusion_f0_matching": (
        ROOT / "research/active/fusion-alpha-feedback/f0-data-global-tae-matrix/pipeline",
        [sys.executable, "test_f0_matching.py"],
    ),
}


def load_manifest() -> list[dict[str, object]]:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if data.get("schema_version") != 1 or not isinstance(data.get("projects"), list):
        raise ValueError("invalid research/portfolio.json schema")
    return data["projects"]


def manifest_errors(projects: list[dict[str, object]]) -> list[str]:
    """Reject ambiguous or out-of-scope routing before any record is written."""
    errors: list[str] = []
    ids: set[str] = set()
    paths: set[str] = set()
    for index, project in enumerate(projects):
        label = f"project[{index}]"
        if not isinstance(project, dict):
            errors.append(f"{label}: project entry must be an object")
            continue
        project_id = project.get("id")
        project_path = project.get("path")
        if not isinstance(project_id, str) or not project_id:
            errors.append(f"{label}: invalid id")
        elif project_id in ids:
            errors.append(f"{label}: duplicate id {project_id!r}")
        else:
            ids.add(project_id)
        if not isinstance(project_path, str) or not project_path:
            errors.append(f"{label}: invalid path")
        else:
            relative = Path(project_path)
            if (
                relative.is_absolute()
                or not relative.parts
                or relative.parts[0] != "active"
                or ".." in relative.parts
            ):
                errors.append(f"{label}: path must stay below research/active: {project_path!r}")
            if project_path in paths:
                errors.append(f"{label}: duplicate path {project_path!r}")
            else:
                paths.add(project_path)
        scope = project.get("synthetic_scope")
        if scope not in ALLOWED_SYNTHETIC_SCOPES:
            errors.append(f"{label}: unsupported synthetic_scope {scope!r}")
        checks = project.get("safe_checks")
        if not isinstance(checks, list):
            errors.append(f"{label}: safe_checks must be a list")
        else:
            unknown = sorted({str(check) for check in checks} - set(SAFE_CHECKS))
            if unknown:
                errors.append(f"{label}: unknown safe checks {', '.join(unknown)}")
    return errors


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
    schema_errors = manifest_errors(projects)
    if schema_errors:
        for error in schema_errors:
            print(f"FAIL manifest: {error}")
        return 1

    expected = {str(project["path"]) for project in projects}
    actual = {
        str(state.parent.parent.relative_to(RESEARCH))
        for state in (RESEARCH / "active").rglob("state/current_state.md")
        if (state.parent.parent / "README.md").is_file()
    }
    uncovered = sorted(actual - expected)
    if uncovered:
        print("FAIL uncovered active dossiers: " + ", ".join(uncovered))
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
