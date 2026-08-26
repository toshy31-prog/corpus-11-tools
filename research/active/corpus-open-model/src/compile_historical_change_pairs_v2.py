"""Compile des révisions textuelles historiques de Corpus, sans les interpréter.

Chaque ligne est un couple réellement tracé par Git : la version d'un fichier
dans le parent d'un commit et sa version dans ce commit. Les deux contenus sont
conservés avec leur provenance afin de pouvoir entraîner et évaluer un modèle
sur des changements, plutôt que sur de simples métadonnées de commit.
"""
from __future__ import annotations

import json
import subprocess
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT / "artifacts" / "historical-change-pairs-v2.jsonl"
MANIFEST = PROJECT / "artifacts" / "historical-change-pairs-v2-manifest.json"
TEXT_EXTENSIONS = {".md", ".txt", ".py", ".json", ".yaml", ".yml", ".toml", ".csv"}
MAX_CHARS_PER_SIDE = 12_000


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout


def text_at(revision: str, path: str) -> str | None:
    result = subprocess.run(
        ["git", "show", f"{revision}:{path}"], cwd=ROOT, capture_output=True
    )
    if result.returncode:
        return None
    try:
        text = result.stdout.decode("utf-8")
    except UnicodeDecodeError:
        return None
    if "\x00" in text:
        return None
    return text[:MAX_CHARS_PER_SIDE]


def revision_rows(parent: str, commit: str) -> list[tuple[str, str]]:
    """Return (path in parent, path in commit) only for text revisions."""
    output = git("diff-tree", "--no-commit-id", "--name-status", "-r", "-M", parent, commit)
    rows: list[tuple[str, str]] = []
    for line in output.splitlines():
        fields = line.split("\t")
        status = fields[0]
        if status.startswith("M") and len(fields) == 2:
            before = after = fields[1]
        elif status.startswith("R") and len(fields) == 3:
            before, after = fields[1], fields[2]
        else:
            continue
        if Path(after).suffix.casefold() in TEXT_EXTENSIONS:
            rows.append((before, after))
    return rows


def compile_pairs() -> dict:
    commits = git("rev-list", "--reverse", "HEAD").splitlines()
    rows: list[dict] = []
    skipped = Counter()
    for ordinal, commit in enumerate(commits):
        parents = git("show", "-s", "--format=%P", commit).strip().split()
        if not parents:
            continue
        parent = parents[0]
        recorded_at = git("show", "-s", "--format=%aI", commit).strip()
        for before_path, after_path in revision_rows(parent, commit):
            before, after = text_at(parent, before_path), text_at(commit, after_path)
            if before is None or after is None:
                skipped["non_text_or_unavailable"] += 1
                continue
            if before == after:
                skipped["identical_content"] += 1
                continue
            rows.append({
                "schema_version": 1,
                "source": "local_git_history",
                "commit": commit,
                "parent": parent,
                "commit_ordinal": ordinal,
                "recorded_at": recorded_at,
                "before_path": before_path,
                "after_path": after_path,
                "extension": Path(after_path).suffix.casefold(),
                "before": before,
                "after": after,
            })
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows))
    manifest = {
        "schema_version": 1,
        "dataset": str(OUTPUT),
        "example_count": len(rows),
        "commits_examined": len(commits),
        "examples_by_extension": dict(sorted(Counter(row["extension"] for row in rows).items())),
        "skipped": dict(sorted(skipped.items())),
        "provenance": "Each example is a Git-traced parent-file to commit-file textual revision. Git establishes version succession, not author intent, semantic meaning, quality, or causality.",
        "boundary": "Historical data only; distinct from the live temporal ledger. This compiler reads Git and writes local research artifacts only. It does not alter Corpus materials or train a model.",
        "content_limit": {"max_characters_per_side": MAX_CHARS_PER_SIDE, "included_extensions": sorted(TEXT_EXTENSIONS)},
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return manifest


if __name__ == "__main__":
    print(json.dumps(compile_pairs(), ensure_ascii=False, indent=2))
