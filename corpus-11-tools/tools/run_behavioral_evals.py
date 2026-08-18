#!/usr/bin/env python3
"""Execute Corpus routing evals against an installed Codex plugin.

This is intentionally a behavioral gate, not a JSON-shape check. It invokes
Codex twice per eval with opposite candidate ordering and requires the hard
routing expectations to survive both runs. Missing authentication is a hard
failure rather than an implicit skip.
"""
from __future__ import annotations

from pathlib import Path
import json
import os
import shlex
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
eval_path = root / "evals" / "routing-and-nonregression.jsonl"
skills = sorted(path.name for path in (root / "skills").iterdir() if path.is_dir())
records = [
    json.loads(line)
    for line in eval_path.read_text(encoding="utf-8").splitlines()
    if line.strip()
]
errors: list[str] = []

# A fresh CODEX_HOME proves only isolation, not authentication. In CI the
# behavioral gate therefore requires an explicit API credential. Locally an
# already-authenticated CODEX_HOME is accepted only when auth.json is present.
codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
has_auth_file = (codex_home / "auth.json").is_file()
if not (os.environ.get("OPENAI_API_KEY") or has_auth_file):
    print(
        "FAIL: behavioral evals require OPENAI_API_KEY or an authenticated "
        "CODEX_HOME containing auth.json"
    )
    sys.exit(2)

codex = os.environ.get("CORPUS_CODEX_COMMAND", "codex")
base_cmd = shlex.split(codex) + [
    "exec",
    "--ephemeral",
    "--sandbox", "read-only",
    "--ask-for-approval", "never",
    "--skip-git-repo-check",
]


def run_one(record: dict, ordering: list[str]) -> dict:
    contract = {
        "selected_skills": "array of exact Corpus skill folder names",
        "principles": "array of exact canonical phrases that materially apply",
    }
    prompt = (
        "Use the installed Corpus 11 Tools plugin. Route the user request; do not solve it. "
        "Return ONLY one compact JSON object, with no markdown, matching this contract: "
        f"{json.dumps(contract, ensure_ascii=False)}. "
        "Candidate-name presentation order is deliberately adversarial and must not change "
        "a material routing decision: "
        f"{json.dumps(ordering, ensure_ascii=False)}. "
        "User request: " + record["prompt"]
    )
    proc = subprocess.run(
        base_cmd + [prompt],
        cwd=root,
        text=True,
        capture_output=True,
        timeout=int(os.environ.get("CORPUS_EVAL_TIMEOUT", "180")),
    )
    if proc.returncode != 0:
        raise RuntimeError(f"codex exit {proc.returncode}: {proc.stderr[-2000:]}")
    return json.loads(proc.stdout.strip())


for index, record in enumerate(records, 1):
    outputs = []
    for label, ordering in (("forward", skills), ("reverse", list(reversed(skills)))):
        try:
            output = run_one(record, ordering)
        except Exception as exc:
            errors.append(
                f"{record.get('id', index)} {label}: execution/parsing failed: {exc}"
            )
            continue
        outputs.append((label, output))
        selected = output.get("selected_skills", []) if isinstance(output, dict) else []
        principles = output.get("principles", []) if isinstance(output, dict) else []
        if not isinstance(selected, list) or not all(isinstance(x, str) for x in selected):
            errors.append(f"{record['id']} {label}: invalid selected_skills")
            continue
        missing = sorted(set(record.get("expect", [])) - set(selected))
        if missing:
            errors.append(
                f"{record['id']} {label}: missing expected skills {missing}; got {selected}"
            )
        if not isinstance(principles, list) or not all(isinstance(x, str) for x in principles):
            errors.append(f"{record['id']} {label}: invalid principles")
            principles = []
        joined = "\n".join(principles)
        for required in record.get("must", []):
            if required not in joined:
                errors.append(
                    f"{record['id']} {label}: missing required principle {required!r}"
                )
        for forbidden in record.get("must_not", []):
            if forbidden in joined:
                errors.append(
                    f"{record['id']} {label}: forbidden principle emitted {forbidden!r}"
                )

    if len(outputs) == 2:
        first = set(outputs[0][1].get("selected_skills", []))
        second = set(outputs[1][1].get("selected_skills", []))
        required = set(record.get("expect", []))
        optional = set(record.get("may", []))
        # Extra optional routing may vary. A change outside the declared optional
        # set is material order drift, including for negative-only evals.
        delta = (first ^ second) - optional
        if delta:
            errors.append(f"{record['id']}: material order drift {sorted(delta)}")
        if required and (not required <= first or not required <= second):
            errors.append(f"{record['id']}: required routing unstable under permutation")
    print(f"[{index}/{len(records)}] {record['id']} checked", flush=True)

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(
    f"PASS: {len(records)} behavioral evals passed in forward and reverse candidate order"
)
