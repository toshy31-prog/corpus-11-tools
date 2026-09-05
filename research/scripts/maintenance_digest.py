#!/usr/bin/env python3
"""Produce a local, non-destructive maintenance digest for the Corpus workspace."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / ".maintenance" / "digest.md"
ARTIFACT_DIRS = ("artifacts", "runtime", "checkpoints", "outputs")


def git_lines(*args: str) -> list[str]:
    result = subprocess.run(
        ["git", *args], cwd=ROOT, text=True, capture_output=True, check=True
    )
    return [line for line in result.stdout.splitlines() if line]


def relative_paths(pattern: str) -> list[str]:
    return sorted(str(path.relative_to(ROOT)) for path in ROOT.glob(pattern) if path.is_file())


def directory_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())


def collect() -> dict[str, object]:
    ignored = git_lines("ls-files", "--others", "--ignored", "--exclude-standard")
    # `git ls-files` lists ignored files, not necessarily their containing directory.
    artifact_roots = [
        path for path in ROOT.rglob("*")
        if path.is_dir() and path.name in ARTIFACT_DIRS
        and path.relative_to(ROOT).parts[0] not in {".venv", ".venv-tiny-doctrine"}
        and any(str(child.relative_to(ROOT)) in ignored for child in path.rglob("*") if child.is_file())
    ]
    return {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "branch": git_lines("branch", "--show-current")[0],
        "git_status": git_lines("status", "--short", "--branch"),
        "skills": relative_paths("**/SKILL.md"),
        "plugin_manifests": sorted(set(relative_paths("**/.codex-plugin/plugin.json") + relative_paths("**/marketplace.json"))),
        "transfer_candidates": relative_paths("transfers/candidates/*"),
        "archives": relative_paths("research/archive/**/ARCHIVE.md"),
        "untracked": git_lines("ls-files", "--others", "--exclude-standard"),
        "ignored_artifacts": [
            {"path": str(path.relative_to(ROOT)), "bytes": directory_size(path)}
            for path in sorted(artifact_roots)
        ],
    }


def render(data: dict[str, object]) -> str:
    def paths(title: str, entries: list[str]) -> list[str]:
        return [f"## {title}", *(f"- `{entry}`" for entry in entries)] if entries else [f"## {title}", "- Aucun."]

    lines = [
        "# Digest de maintenance",
        "",
        f"- Généré : {data['generated_at']}",
        f"- Branche : `{data['branch']}`",
        "- Mode : lecture et inventaire seulement ; aucune installation, suppression, archive ou publication automatique.",
        "",
    ]
    lines += paths("État Git", list(data["git_status"]))
    lines += [""] + paths("Skills récupérables", list(data["skills"]))
    lines += [""] + paths("Manifests de plugins", list(data["plugin_manifests"]))
    lines += [""] + paths("Candidats de transfert", list(data["transfer_candidates"]))
    lines += [""] + paths("Dossiers archivés", list(data["archives"]))
    lines += [""] + paths("Fichiers non suivis à trier", list(data["untracked"]))
    artifacts = list(data["ignored_artifacts"])
    lines += ["", "## Artefacts locaux conservés"]
    lines += [f"- `{item['path']}` — {item['bytes']} octets" for item in artifacts] or ["- Aucun."]
    lines += ["", "## Décision suivante", "- Examiner les candidats listés ; intégrer, archiver ou ignorer explicitement. Les actions destructrices et les push restent humains."]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--json", action="store_true", help="print JSON instead of Markdown")
    args = parser.parse_args()
    data = collect()
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0
    output = args.output if args.output.is_absolute() else ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render(data), encoding="utf-8")
    print(output.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
