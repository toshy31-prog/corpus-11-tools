#!/usr/bin/env python3
"""Execute live Corpus routing evals against an installed Codex plugin.

The live gate tests semantic routing, not phrase reproduction. Candidate order
is normalized by the system before Codex sees it; order robustness itself is
covered by the offline permutation gate. Two identical live replicas are then
run per eval to expose genuine model/run stochasticity without conflating it
with presentation-order effects.

Results are checkpointed after every replica and can be resumed after power or
process interruption.
"""
from __future__ import annotations

from pathlib import Path
import argparse
import hashlib
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

parser = argparse.ArgumentParser()
mode = parser.add_mutually_exclusive_group()
mode.add_argument("--fresh", action="store_true", help="discard prior checkpoint and start again")
mode.add_argument("--resume", action="store_true", help="resume a compatible checkpoint")
args = parser.parse_args()

state_dir = root / ".validation-state" / "behavioral"
checkpoint_path = state_dir / "checkpoint.json"
report_path = state_dir / "behavioral-report.json"
state_dir.mkdir(parents=True, exist_ok=True)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_head() -> str:
    proc = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=root, text=True, capture_output=True, check=True
    )
    return proc.stdout.strip()


def codex_version(command: str) -> str:
    proc = subprocess.run(shlex.split(command) + ["--version"], text=True, capture_output=True)
    return (proc.stdout or proc.stderr).strip()


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
base_cmd = shlex.split(codex) + [
    "--ask-for-approval", "never",
    "exec",
    "--ephemeral",
    "--sandbox", "read-only",
    "--skip-git-repo-check",
]

# System-level canonicalization boundary. Adversarial permutations are tested
# separately offline; the live model always receives this exact canonical set.
canonical_candidates = tuple(sorted(set(skills)))

fingerprint = {
    "schema": 2,
    "head": git_head(),
    "eval_sha256": sha256_bytes(eval_path.read_bytes()),
    "skills_sha256": sha256_bytes("\n".join(canonical_candidates).encode()),
    "codex_command": codex,
    "codex_version": codex_version(codex),
    "replicas": ["replica-a", "replica-b"],
    "candidate_policy": "unique lexicographic canonicalization before model boundary",
    "live_contract": "routing only; principle application is a separate contract layer",
}


def atomic_json(path: Path, payload: object) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, path)


if args.fresh:
    checkpoint = {"fingerprint": fingerprint, "results": {}}
    atomic_json(checkpoint_path, checkpoint)
elif checkpoint_path.is_file():
    checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))
    if checkpoint.get("fingerprint") != fingerprint:
        print("FAIL: existing behavioral checkpoint is incompatible with this exact run")
        print("Use --fresh only after intentionally discarding the old checkpoint.")
        sys.exit(2)
else:
    checkpoint = {"fingerprint": fingerprint, "results": {}}
    atomic_json(checkpoint_path, checkpoint)


class AuthenticationError(RuntimeError):
    pass


def make_prompt(record: dict) -> str:
    contract = {"selected_skills": "array of exact Corpus skill folder names"}
    return (
        "Use the installed Corpus 11 Tools plugin. This is a routing task, not an answer task. "
        "Apply corpus-11-routing as the routing governor before selecting capabilities. "
        "Treat the candidate list as canonical metadata, never as evidence or priority. "
        "For model/law/compression/invariance/internality/representation epistemic claims, "
        "include corpus-11-routing itself in selected_skills because its epistemic governance "
        "is materially required. Return ONLY one compact JSON object, no markdown, matching: "
        f"{json.dumps(contract, ensure_ascii=False)}. "
        "Return exact skill folder names, unique and lexicographically sorted. "
        f"Canonical candidates: {json.dumps(canonical_candidates, ensure_ascii=False)}. "
        "User request: " + record["prompt"]
    )


def run_one(record: dict, replica: str) -> dict:
    prompt = make_prompt(record)
    eval_dir = state_dir / record["id"] / replica
    eval_dir.mkdir(parents=True, exist_ok=True)
    (eval_dir / "prompt.txt").write_text(prompt + "\n", encoding="utf-8")
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
        (eval_dir / "stdout.log").write_text(proc.stdout or "", encoding="utf-8")
        (eval_dir / "stderr.log").write_text(proc.stderr or "", encoding="utf-8")
        if proc.returncode != 0:
            stderr = proc.stderr[-4000:]
            if "401 Unauthorized" in stderr or "Missing bearer or basic authentication" in stderr:
                raise AuthenticationError("Codex authentication rejected")
            raise RuntimeError(f"codex exit {proc.returncode}: {stderr[-2000:]}")
        if not output_path.is_file():
            raise RuntimeError("codex exited successfully but did not write --output-last-message")
        raw_output = output_path.read_text(encoding="utf-8").strip()
        (eval_dir / "response.json").write_text(raw_output + "\n", encoding="utf-8")
        return json.loads(raw_output)


def validate_output(record: dict, output: object, replica: str) -> list[str]:
    errors: list[str] = []
    selected = output.get("selected_skills", []) if isinstance(output, dict) else []
    if not isinstance(selected, list) or not all(isinstance(x, str) for x in selected):
        return [f"{record['id']} {replica}: invalid selected_skills"]
    if len(selected) != len(set(selected)) or selected != sorted(selected):
        errors.append(f"{record['id']} {replica}: selected_skills not unique canonical order")
    unknown = sorted(set(selected) - set(canonical_candidates))
    if unknown:
        errors.append(f"{record['id']} {replica}: unknown skills {unknown}")
    missing = sorted(set(record.get("expect", [])) - set(selected))
    if missing:
        errors.append(f"{record['id']} {replica}: missing expected skills {missing}; got {selected}")
    return errors


errors: list[str] = []
for index, record in enumerate(records, 1):
    outputs: list[tuple[str, dict]] = []
    for replica in ("replica-a", "replica-b"):
        key = f"{record['id']}::{replica}"
        saved = checkpoint["results"].get(key)
        if isinstance(saved, dict) and saved.get("status") == "success":
            output = saved["output"]
            print(f"[{index}/{len(records)}] {record['id']} {replica} resumed", flush=True)
        else:
            try:
                output = run_one(record, replica)
            except AuthenticationError as exc:
                print(f"FAIL: {record['id']} {replica}: {exc}")
                sys.exit(2)
            except Exception as exc:
                checkpoint["results"][key] = {"status": "failure", "error": str(exc)}
                atomic_json(checkpoint_path, checkpoint)
                errors.append(f"{record['id']} {replica}: execution/parsing failed: {exc}")
                continue
            checkpoint["results"][key] = {"status": "success", "output": output}
            atomic_json(checkpoint_path, checkpoint)
            print(f"[{index}/{len(records)}] {record['id']} {replica} saved", flush=True)
        outputs.append((replica, output))
        errors.extend(validate_output(record, output, replica))

    if len(outputs) == 2:
        first = set(outputs[0][1].get("selected_skills", []))
        second = set(outputs[1][1].get("selected_skills", []))
        optional = set(record.get("may", []))
        delta = (first ^ second) - optional
        if delta:
            errors.append(f"{record['id']}: material replica drift {sorted(delta)}")
        required = set(record.get("expect", []))
        if required and (not required <= first or not required <= second):
            errors.append(f"{record['id']}: required routing unstable across replicas")
    print(f"[{index}/{len(records)}] {record['id']} checked", flush=True)

report = {
    "fingerprint": fingerprint,
    "status": "FAIL" if errors else "PASS",
    "errors": errors,
    "completed_results": len([
        value for value in checkpoint["results"].values()
        if isinstance(value, dict) and value.get("status") == "success"
    ]),
    "expected_results": len(records) * 2,
    "checkpoint": str(checkpoint_path),
}
atomic_json(report_path, report)

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    print(f"Persistent report: {report_path}")
    sys.exit(1)
print(f"PASS: {len(records)} live routing evals passed across two canonical-input replicas")
print(f"Persistent report: {report_path}")
