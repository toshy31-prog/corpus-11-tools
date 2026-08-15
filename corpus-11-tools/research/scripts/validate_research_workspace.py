#!/usr/bin/env python3
from hashlib import sha256
from pathlib import Path
import subprocess
import sys

research = Path(__file__).resolve().parents[1]
repo = research.parents[1]
errors: list[str] = []

required = [
    research / "sources",
    research / "notes",
    research / "hypotheses",
    research / "reports",
    research / "state" / "current_state.md",
    research / "experiments",
    research / "AGENTS.md",
    research / "AUTOMATION.md",
]
for path in required:
    if not path.exists():
        errors.append(f"missing: {path.relative_to(repo)}")

hypotheses = sorted(
    path for path in (research / "hypotheses").glob("*.md") if path.name != "README.md"
)
if len(hypotheses) != 6:
    errors.append(f"expected six hypothesis records, found {len(hypotheses)}")
for hypothesis in hypotheses:
    text = hypothesis.read_text(encoding="utf-8")
    marker = "## Condition de renversement"
    if marker not in text or not text.split(marker, 1)[1].strip():
        errors.append(f"missing reversal condition: {hypothesis.relative_to(repo)}")

source_status = subprocess.run(
    [
        "git",
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
        "--",
        "corpus-11-tools/research/sources/",
    ],
    cwd=repo,
    text=True,
    capture_output=True,
    check=True,
).stdout
if source_status:
    errors.append("research/sources contains modified, staged, untracked, deleted, renamed or replaced entries")

canonical_pdf = research / "sources" / "Trace_complete_hypothese_temps_recherche.pdf"
compatibility_pdf = research / "Trace_complete_hypothese_temps_recherche.pdf"
if canonical_pdf.is_file() and compatibility_pdf.is_file():
    canonical_hash = sha256(canonical_pdf.read_bytes()).digest()
    compatibility_hash = sha256(compatibility_pdf.read_bytes()).digest()
    if canonical_hash != compatibility_hash:
        errors.append("research PDF copies differ; no copy was removed")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print("PASS: research workspace valid; six reversal conditions; research/sources pristine")
if canonical_pdf.is_file() and compatibility_pdf.is_file():
    print(f"PASS: canonical PDF: {canonical_pdf.relative_to(repo)} (identical compatibility copy retained)")
