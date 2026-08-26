"""Extrait les transitions déjà tracées par Git, sans modifier Corpus."""
from __future__ import annotations

import json
import subprocess
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/historical-git-transitions-v0.json"


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout


def changes(parent: str | None, commit: str) -> list[dict]:
    args = ["diff-tree", "--no-commit-id", "--name-status", "-r"]
    args.extend([parent, commit] if parent else ["--root", commit])
    rows = []
    for line in git(*args).splitlines():
        fields = line.split("\t")
        code = fields[0]
        if code.startswith("R") or code.startswith("C"):
            rows.append({"status": code[0], "similarity": code[1:] or None, "before": fields[1], "after": fields[2]})
        else:
            rows.append({"status": code, "path": fields[1]})
    return rows


def extract() -> dict:
    commits = git("rev-list", "--reverse", "HEAD").splitlines()
    events = []
    for commit in commits:
        fields = git("show", "-s", "--format=%H%x00%P%x00%aI%x00%an%x00%s", commit).rstrip("\n").split("\x00")
        identifier, parents, recorded_at, author, subject = fields
        transition = changes(parents.split()[0] if parents else None, identifier)
        counts = Counter(row["status"] for row in transition)
        events.append({
            "source": "git_history",
            "commit": identifier,
            "parent": parents.split()[0] if parents else None,
            "recorded_at": recorded_at,
            "author": author,
            "subject": subject,
            "changes": transition,
            "change_counts": dict(sorted(counts.items())),
        })
    return {
        "schema_version": 1,
        "source": {
            "kind": "local_git_history",
            "repository": str(ROOT),
            "commit_count": len(commits),
            "provenance": "Commit metadata and name-status file diffs only; no file contents, semantic intent, or causal explanation are inferred.",
            "scope_limit": "Historical repository transitions are a distinct source from the live temporal ledger. They may support bounded retrospective experiments but must not be represented as new live observations.",
        },
        "events": events,
    }


if __name__ == "__main__":
    output = extract()
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    summary = {"output": str(OUTPUT), "commit_count": output["source"]["commit_count"], "transition_count": len(output["events"]), "scope_limit": output["source"]["scope_limit"]}
    print(json.dumps(summary, ensure_ascii=False, indent=2))
