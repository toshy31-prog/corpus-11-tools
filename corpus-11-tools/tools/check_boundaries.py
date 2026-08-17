#!/usr/bin/env python3
"""Enforce the product, research, and transfer boundaries."""

from __future__ import annotations

from pathlib import Path
import re
import sys


plugin_root = Path(__file__).resolve().parents[1]
repo_root = plugin_root.parent
research_root = repo_root / "research"
transfer_root = repo_root / "transfers"
errors: list[str] = []


required = (
    plugin_root / "labs",
    research_root / "active",
    research_root / "completed",
    transfer_root / "accepted",
    transfer_root / "candidates",
    transfer_root / "rejected",
)
for path in required:
    if not path.is_dir():
        errors.append(f"missing boundary directory: {path.relative_to(repo_root)}")

for obsolete in (
    plugin_root / "research",
    repo_root / "cct-executable",
    repo_root / "governance-lab",
    repo_root / "cct-crisis-lab",
    repo_root / "livrables",
    repo_root / "output",
    repo_root / "ne-me-dis-pas-comment-sauver-le-monde-sauve-le",
):
    if obsolete.exists():
        errors.append(f"obsolete mixed surface remains: {obsolete.relative_to(repo_root)}")

runtime_suffixes = {".py", ".mjs", ".js", ".sh"}
for runtime_root in (plugin_root / "labs", plugin_root / "skills"):
    for path in runtime_root.rglob("*"):
        if not path.is_file() or path.suffix not in runtime_suffixes:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if re.search(r"(?:research/active|research/completed|\.\./research)", text):
            errors.append(
                f"product runtime depends on project research: {path.relative_to(repo_root)}"
            )

generic_lab = plugin_root / "labs" / "experiment-lab"
for path in generic_lab.rglob("*.mjs"):
    text = path.read_text(encoding="utf-8", errors="replace")
    if "lab-adapters" in text or "research/" in text:
        errors.append(
            f"generic experiment engine imports a research adapter: {path.relative_to(repo_root)}"
        )

projects = (
    research_root / "active" / "cct",
    research_root / "active" / "corpus-hypotheses",
    research_root / "completed" / "food-access-paris",
)
for project in projects:
    readme = project / "README.md"
    if not readme.is_file():
        errors.append(f"research project lacks README: {project.relative_to(repo_root)}")

for record in (transfer_root / "accepted").glob("*.md"):
    text = record.read_text(encoding="utf-8")
    if "Destination" not in text or "Vérification" not in text:
        errors.append(
            f"accepted transfer lacks Destination or Vérification: {record.relative_to(repo_root)}"
        )

cct_consumers = (
    research_root / "active" / "cct" / "governance-lab" / "p001_model.py",
    research_root / "active" / "cct" / "governance-lab" / "run_p005_robustness.py",
    research_root / "active" / "cct" / "executable" / "economy" / "economy_model.py",
)
for path in cct_consumers:
    if path.is_file() and "corpus_labs" not in path.read_text(encoding="utf-8"):
        errors.append(f"CCT bypasses extracted generic primitive: {path.relative_to(repo_root)}")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)

accepted = len(list((transfer_root / "accepted").glob("*.md")))
candidates = len(list((transfer_root / "candidates").glob("*.md")))
rejected = len(list((transfer_root / "rejected").glob("*.md")))
print(
    "PASS: product/research boundary is intact; "
    f"transfers={accepted} accepted, {candidates} candidates, {rejected} rejected"
)
