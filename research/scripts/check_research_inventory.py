#!/usr/bin/env python3
"""Check declared research-index coverage without assigning scientific status."""

from __future__ import annotations

import argparse
import json
from pathlib import Path, PurePosixPath
import re


ROOT = Path(__file__).resolve().parents[2]
RESEARCH = ROOT / "research"
ACTIVE = RESEARCH / "active"
PORTFOLIO = RESEARCH / "portfolio.json"
ACTIVE_INDEX = ACTIVE / "README.md"
ROOT_INDEX = RESEARCH / "README.md"
MARKDOWN_LINK = re.compile(r"\]\(([^)#]+)(?:#[^)]+)?\)")


def markdown_targets(path: Path) -> set[str]:
    return set(MARKDOWN_LINK.findall(path.read_text(encoding="utf-8")))


def coverage_errors(
    physical: set[str], governed: set[str], excluded: set[str]
) -> list[str]:
    errors: list[str] = []
    overlap = governed & excluded
    if overlap:
        errors.append("paths both governed and excluded: " + ", ".join(sorted(overlap)))
    missing = physical - governed - excluded
    if missing:
        errors.append("physical paths neither governed nor excluded: " + ", ".join(sorted(missing)))
    surplus = (governed | excluded) - physical
    if surplus:
        errors.append("declared top-level paths not physically present: " + ", ".join(sorted(surplus)))
    return errors


def assertion_errors(owner: str, evidence: str, assertion: dict[str, str]) -> list[str]:
    errors: list[str] = []
    required_owner = assertion.get("owner_required_literal", "")
    required_evidence = assertion.get("evidence_required_literal", "")
    forbidden = assertion.get("forbidden_literal", "")
    evidence_link = assertion.get("owner_evidence_link", "")
    if not required_owner or required_owner not in owner:
        errors.append(f"{assertion.get('id')}: owner required literal missing")
    if not required_evidence or required_evidence not in evidence:
        errors.append(f"{assertion.get('id')}: evidence required literal missing")
    if forbidden and forbidden in owner:
        errors.append(f"{assertion.get('id')}: forbidden contradictory literal present")
    if not evidence_link or evidence_link not in markdown_targets_from_text(owner):
        errors.append(f"{assertion.get('id')}: owner evidence link missing")
    return errors


def markdown_targets_from_text(text: str) -> set[str]:
    return set(MARKDOWN_LINK.findall(text))


def project_identity_errors(projects: list) -> list[str]:
    """Reject ambiguous identities before set-based coverage hides duplicates."""
    errors: list[str] = []
    seen: dict[str, set[str]] = {"id": set(), "path": set()}
    for index, project in enumerate(projects):
        if not isinstance(project, dict):
            errors.append(f"projects[{index}]: must be an object")
            continue
        for field in seen:
            value = project.get(field)
            if not isinstance(value, str) or not value.strip():
                errors.append(f"projects[{index}]: {field} must be a nonempty string")
            elif value in seen[field]:
                errors.append(f"portfolio.json: duplicate project {field}: {value}")
            else:
                seen[field].add(value)
                if field == "path":
                    path = PurePosixPath(value)
                    if (
                        path.is_absolute()
                        or len(path.parts) < 2
                        or path.parts[0] != "active"
                        or ".." in path.parts
                        or path.as_posix() != value
                    ):
                        errors.append(
                            f"projects[{index}]: path must be canonical and relative under active/: {value!r}"
                        )
    return errors


def repository_errors(root: Path = ROOT) -> list[str]:
    research = root / "research"
    active = research / "active"
    data = json.loads((research / "portfolio.json").read_text(encoding="utf-8"))
    contract = data.get("index_contract")
    if not isinstance(contract, dict) or contract.get("schema_version") != 1:
        return ["portfolio.json: missing index_contract schema version 1"]

    errors: list[str] = []
    projects = data.get("projects")
    if not isinstance(projects, list):
        return ["portfolio.json: projects must be a list"]
    errors.extend(project_identity_errors(projects))
    project_paths = {
        str(project.get("path"))
        for project in projects
        if isinstance(project, dict) and isinstance(project.get("path"), str)
    }
    physical_top = {
        f"active/{path.name}" for path in active.iterdir() if path.is_dir()
    }
    governed_top = {
        path for path in project_paths if len(Path(path).parts) == 2
    }

    portfolio_policy = contract.get("portfolio_policy", {})
    exclusion_records = portfolio_policy.get("declared_exclusions", [])
    if not isinstance(exclusion_records, list):
        errors.append("index_contract: declared_exclusions must be a list")
        exclusion_records = []
    excluded_top: set[str] = set()
    for record in exclusion_records:
        if not isinstance(record, dict):
            errors.append("index_contract: exclusion must be an object")
            continue
        path = record.get("path")
        reason = record.get("reason")
        if not isinstance(path, str) or len(Path(path).parts) != 2:
            errors.append(f"index_contract: invalid top-level exclusion {path!r}")
            continue
        excluded_top.add(path)
        if not isinstance(reason, str) or not reason.strip():
            errors.append(f"index_contract: exclusion {path!r} has no reason")
        excluded_dir = research / path
        if (excluded_dir / "state/current_state.md").exists():
            errors.append(f"index_contract: exclusion {path!r} now has a governed state; review it")

    errors.extend(coverage_errors(physical_top, governed_top, excluded_top))

    human_policy = contract.get("human_index_policy", {})
    infrastructure = set(human_policy.get("research_infrastructure", []))
    if not infrastructure <= governed_top:
        errors.append("index_contract: research infrastructure must be governed top-level paths")
    nested_declared = set(human_policy.get("nested_extensions", []))
    nested_governed = {
        path for path in project_paths if len(Path(path).parts) > 2
    }
    if nested_declared != nested_governed:
        errors.append(
            "index_contract: nested extension declarations differ from portfolio projects"
        )

    active_targets = markdown_targets(active / "README.md")
    root_targets = markdown_targets(research / "README.md")
    for path in sorted(physical_top):
        name = Path(path).name + "/"
        if name not in active_targets:
            errors.append(f"active/README.md: missing top-level path {name}")
        root_name = path + "/"
        if root_name not in root_targets:
            errors.append(f"research/README.md: missing top-level path {root_name}")

    assertions = contract.get("status_assertions", [])
    if not isinstance(assertions, list):
        errors.append("index_contract: status_assertions must be a list")
        assertions = []
    for assertion in assertions:
        if not isinstance(assertion, dict):
            errors.append("index_contract: status assertion must be an object")
            continue
        owner_path = research / str(assertion.get("owner", ""))
        evidence_path = research / str(assertion.get("evidence", ""))
        if not owner_path.is_file():
            errors.append(f"{assertion.get('id')}: owner file missing")
            continue
        if not evidence_path.is_file():
            errors.append(f"{assertion.get('id')}: evidence file missing")
            continue
        errors.extend(
            assertion_errors(
                owner_path.read_text(encoding="utf-8"),
                evidence_path.read_text(encoding="utf-8"),
                assertion,
            )
        )
    return errors


def self_test() -> None:
    first = {"id": "a", "path": "active/a"}
    assert project_identity_errors([first, {"id": "b", "path": "active/b"}]) == []
    assert len(project_identity_errors([first, dict(first)])) == 2
    assert project_identity_errors([first, {"id": "a", "path": "active/b"}]) == [
        "portfolio.json: duplicate project id: a"
    ]
    assert project_identity_errors([first, {"id": "b", "path": "active/a"}]) == [
        "portfolio.json: duplicate project path: active/a"
    ]
    assert project_identity_errors([None, {"id": "", "path": 7}])
    assert project_identity_errors([
        first, {"id": "nested", "path": "active/a/extension"}
    ]) == []
    for alias in (
        "active/a/extension/..", "active/a/../a", "active/./a",
        "active//a", "active/a/", "./active/a", "/active/a",
        "active", "archive/a",
    ):
        assert any("path must be canonical" in error for error in
                   project_identity_errors([first, {"id": "alias", "path": alias}]))
    assert coverage_errors({"active/a", "active/b"}, {"active/a"}, {"active/b"}) == []
    assert coverage_errors({"active/a", "active/b"}, {"active/a"}, set()) == [
        "physical paths neither governed nor excluded: active/b"
    ]
    assertion = {
        "id": "status",
        "owner_required_literal": "state: verified",
        "evidence_required_literal": "state: verified",
        "forbidden_literal": "state: suspended",
        "owner_evidence_link": "report.md",
    }
    assert assertion_errors("state: verified [report](report.md)", "state: verified", assertion) == []
    contradiction = assertion_errors(
        "state: verified; state: suspended [report](report.md)",
        "state: verified",
        assertion,
    )
    assert any("forbidden contradictory literal" in error for error in contradiction)
    print("PASS check_research_inventory self-test")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    errors = repository_errors()
    if errors:
        for error in errors:
            print(f"FAIL {error}")
        return 1
    print("PASS research inventory: physical presence, human indexes, portfolio exclusions, and declared status assertions")
    print("NOTE no scientific status was inferred")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
