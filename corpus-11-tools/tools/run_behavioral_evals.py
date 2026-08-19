#!/usr/bin/env python3
"""Execute Corpus routing evals against an installed Codex plugin.

This is intentionally a behavioral gate, not a JSON-shape check. It invokes
Codex twice per eval with opposite candidate ordering and requires the hard
routing expectations to survive both runs. Missing or rejected authentication
is a hard failure rather than an implicit skip.
"""
from __future__ import annotations

from pathlib import Path
import json
import os
import shlex
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
eval_path = root / "evals" / "routing-and-nonregression.jsonl"
skills = sorted(path.name for path in (root / "skills").iterdir() if path.is_dir())
records = [
    json.loads(line)
    for line in eval_path.read_text(encoding="utf-8").splitlines()
    if line.strip()
]
errors: list[str] = []

# `codex exec` headless authentication uses CODEX_API_KEY. Keep compatibility
# with callers that still provide OPENAI_API_KEY by normalizing it explicitly,
# then remove OPENAI_API_KEY from the child environment to avoid ambiguous auth
# precedence. An already-authenticated local CODEX_HOME remains valid when
# auth.json is present.
codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
has_auth_file = (codex_home / "auth.json").is_file()
api_key = os.environ.get("CODEX_API_KEY") or os.environ.get("OPENAI_API_KEY")
if not (api_key or has_auth_file):
    print(
        "FAIL: behavioral evals require CODEX_API_KEY (or OPENAI_API_KEY for "
        "compatibility) or an authenticated CODEX_HOME containing auth.json"
    )
    sys.exit(2)

codex_env = os.environ.copy()
if api_key:
    codex_env["CODEX_API_KEY"] = api_key
    codex_env.pop("OPENAI_API_KEY", None)

codex = os.environ.get("CORPUS_CODEX_COMMAND", "codex")
# In codex-cli 0.137.0, approval policy is a global flag and must precede the
# `exec` subcommand. The sandbox remains read-only and the run remains
# non-interactive; moving this flag does not weaken either boundary.
base_cmd = shlex.split(codex) + [
    "--ask-for-approval", "never",
    "exec",
    "--ephemeral",
    "--sandbox", "read-only",
    "--skip-git-repo-check",
]


class AuthenticationError(RuntimeError):
    """Codex could not authenticate to the model endpoint."""


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
    # Use Codex's final-message file instead of assuming stdout contains only
    # the model result. This keeps the parser strict while remaining robust to
    # CLI progress/event output.
    with tempfile.TemporaryDirectory(prefix="corpus-eval-") as raw:
        output_path = Path(raw) / "last-message.json"
        proc = subprocess.run(
            base_cmd + ["--output-last-message", str(output_path), prompt],
            cwd=root,
            text=True,
            capture_output=True,
            timeout=int(os.environ.get("CORPUS_EVAL_TIMEOUT", "180")),
            env=codex_env,
        )
        if proc.returncode != 0:
            stderr = proc.stderr[-4000:]
            if "401 Unauthorized" in stderr or "Missing bearer or basic authentication" in stderr:
                raise AuthenticationError(
                    "Codex API authentication rejected; verify CODEX_API_KEY secret wiring"
                )
            raise RuntimeError(f"codex exit {proc.returncode}: {stderr[-2000:]}")
        if not output_path.is_file():
            raise RuntimeError(
                "codex exited successfully but did not write --output-last-message; "
                f"stderr={proc.stderr[-2000:]}"
            )
        return json.loads(output_path.read_text(encoding="utf-8").strip())


for index, record in enumerate(records, 1):
    outputs = []
    for label, ordering in (("forward", skills), ("reverse", list(reversed(skills)))):
        try:
            output = run_one(record, ordering)
        except AuthenticationError as exc:
            print(f"FAIL: {record.get('id', index)} {label}: {exc}")
            sys.exit(2)
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
