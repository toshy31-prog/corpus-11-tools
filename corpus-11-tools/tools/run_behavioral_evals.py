#!/usr/bin/env python3
"""Execute Corpus routing evals against an installed Codex plugin.

This is intentionally a behavioral gate, not a JSON-shape check. It invokes
Codex twice per eval with opposite candidate ordering and requires the hard
routing expectations to survive both runs. Missing or rejected authentication
is a hard failure rather than an implicit skip.

The runner is crash-resumable. Every successful forward/reverse model result is
persisted and fsynced before the next call starts, together with raw stdout,
stderr, and final-message artifacts. A resumed run refuses stale checkpoints
whose repository/eval/skill/Codex fingerprints do not match the current run.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
EVAL_PATH = ROOT / "evals" / "routing-and-nonregression.jsonl"
SKILLS = sorted(path.name for path in (ROOT / "skills").iterdir() if path.is_dir())
RECORDS = [
    json.loads(line)
    for line in EVAL_PATH.read_text(encoding="utf-8").splitlines()
    if line.strip()
]


class AuthenticationError(RuntimeError):
    """Codex could not authenticate to the model endpoint."""


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_head() -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()


def codex_version(codex_tokens: list[str], env: dict[str, str]) -> str:
    proc = subprocess.run(
        codex_tokens + ["--version"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        env=env,
        timeout=30,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"could not determine Codex version: {proc.stderr[-1000:]}")
    return proc.stdout.strip()


def fsync_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        handle.write(text)
        handle.flush()
        os.fsync(handle.fileno())


def append_jsonl_fsync(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(obj, ensure_ascii=False, sort_keys=True) + "\n")
        handle.flush()
        os.fsync(handle.fileno())


def safe_name(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_." else "_" for ch in value)


def manifest_for(codex_tokens: list[str], codex_env: dict[str, str]) -> dict[str, Any]:
    runner_bytes = Path(__file__).read_bytes()
    eval_bytes = EVAL_PATH.read_bytes()
    skill_payload = "\n".join(SKILLS).encode("utf-8")
    return {
        "schema_version": 1,
        "git_head": git_head(),
        "runner_sha256": sha256_bytes(runner_bytes),
        "eval_sha256": sha256_bytes(eval_bytes),
        "skills_sha256": sha256_bytes(skill_payload),
        "skill_count": len(SKILLS),
        "eval_count": len(RECORDS),
        "codex_version": codex_version(codex_tokens, codex_env),
        "codex_command": codex_tokens,
    }


def load_checkpoint(checkpoint_path: Path) -> tuple[dict[str, Any] | None, dict[tuple[str, str], dict[str, Any]]]:
    if not checkpoint_path.is_file():
        return None, {}
    manifest = None
    completed: dict[tuple[str, str], dict[str, Any]] = {}
    for line_no, line in enumerate(checkpoint_path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"invalid checkpoint JSON at line {line_no}: {exc}") from exc
        if row.get("type") == "manifest":
            if manifest is not None:
                raise RuntimeError("checkpoint contains more than one manifest")
            manifest = row["manifest"]
        elif row.get("type") == "result" and row.get("status") == "ok":
            completed[(row["record_id"], row["label"])] = row
    return manifest, completed


def ensure_state(
    state_dir: Path,
    current_manifest: dict[str, Any],
    *,
    resume: bool,
    fresh: bool,
) -> tuple[Path, dict[tuple[str, str], dict[str, Any]]]:
    checkpoint_path = state_dir / "behavioral-checkpoint.jsonl"
    if fresh and state_dir.exists():
        shutil.rmtree(state_dir)

    existing_manifest, completed = load_checkpoint(checkpoint_path)
    if existing_manifest is None:
        state_dir.mkdir(parents=True, exist_ok=True)
        append_jsonl_fsync(
            checkpoint_path,
            {"type": "manifest", "manifest": current_manifest},
        )
        return checkpoint_path, {}

    if not resume:
        raise RuntimeError(
            f"checkpoint already exists at {checkpoint_path}; use --resume to continue "
            "it or --fresh to discard it"
        )
    if existing_manifest != current_manifest:
        differing = sorted(
            key
            for key in set(existing_manifest) | set(current_manifest)
            if existing_manifest.get(key) != current_manifest.get(key)
        )
        raise RuntimeError(
            "checkpoint fingerprint does not match the current run; refusing stale "
            f"reuse (different fields: {differing}). Use --fresh for a new run."
        )
    return checkpoint_path, completed


def build_prompt(record: dict[str, Any], ordering: list[str]) -> str:
    contract = {
        "selected_skills": "array of exact Corpus skill folder names",
        "principles": "array of exact canonical phrases that materially apply",
    }
    return (
        "Use the installed Corpus 11 Tools plugin. Route the user request; do not solve it. "
        "Return ONLY one compact JSON object, with no markdown, matching this contract: "
        f"{json.dumps(contract, ensure_ascii=False)}. "
        "Candidate-name presentation order is deliberately adversarial and must not change "
        "a material routing decision: "
        f"{json.dumps(ordering, ensure_ascii=False)}. "
        "User request: " + record["prompt"]
    )


def run_one(
    record: dict[str, Any],
    label: str,
    ordering: list[str],
    *,
    base_cmd: list[str],
    codex_env: dict[str, str],
    state_dir: Path,
) -> dict[str, Any]:
    stem = f"{safe_name(record['id'])}-{label}"
    raw_dir = state_dir / "raw"
    output_path = raw_dir / f"{stem}.last-message.json"
    stdout_path = raw_dir / f"{stem}.stdout.log"
    stderr_path = raw_dir / f"{stem}.stderr.log"
    prompt_path = raw_dir / f"{stem}.prompt.txt"
    fsync_text(prompt_path, build_prompt(record, ordering))

    proc = subprocess.run(
        base_cmd + ["--output-last-message", str(output_path), prompt_path.read_text(encoding="utf-8")],
        cwd=ROOT,
        text=True,
        capture_output=True,
        timeout=int(os.environ.get("CORPUS_EVAL_TIMEOUT", "180")),
        env=codex_env,
    )
    fsync_text(stdout_path, proc.stdout)
    fsync_text(stderr_path, proc.stderr)

    if proc.returncode != 0:
        stderr = proc.stderr[-4000:]
        if "401 Unauthorized" in stderr or "Missing bearer or basic authentication" in stderr:
            raise AuthenticationError(
                "Codex authentication rejected; verify the local ChatGPT login or CODEX_API_KEY wiring"
            )
        raise RuntimeError(f"codex exit {proc.returncode}: {stderr[-2000:]}")
    if not output_path.is_file():
        raise RuntimeError(
            "codex exited successfully but did not write --output-last-message; "
            f"stderr={proc.stderr[-2000:]}"
        )
    raw = output_path.read_text(encoding="utf-8").strip()
    try:
        output = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid JSON final message: {exc}; raw={raw[-2000:]}") from exc
    if not isinstance(output, dict):
        raise RuntimeError("final message must be a JSON object")
    return output


def evaluate_output(record: dict[str, Any], label: str, output: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    selected = output.get("selected_skills", [])
    principles = output.get("principles", [])
    if not isinstance(selected, list) or not all(isinstance(x, str) for x in selected):
        return [f"{record['id']} {label}: invalid selected_skills"]
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
            errors.append(f"{record['id']} {label}: missing required principle {required!r}")
    for forbidden in record.get("must_not", []):
        if forbidden in joined:
            errors.append(f"{record['id']} {label}: forbidden principle emitted {forbidden!r}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--resume", action="store_true", help="reuse matching successful checkpointed calls")
    mode.add_argument("--fresh", action="store_true", help="discard any prior checkpoint and start over")
    parser.add_argument(
        "--state-dir",
        type=Path,
        default=ROOT / ".validation-state" / "behavioral",
        help="persistent directory for checkpoint, raw call logs, and final report",
    )
    args = parser.parse_args()

    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    has_auth_file = (codex_home / "auth.json").is_file()
    api_key = os.environ.get("CODEX_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not (api_key or has_auth_file):
        print(
            "FAIL: behavioral evals require CODEX_API_KEY (or OPENAI_API_KEY for "
            "compatibility) or an authenticated CODEX_HOME containing auth.json"
        )
        return 2

    codex_env = os.environ.copy()
    if api_key:
        codex_env["CODEX_API_KEY"] = api_key
        codex_env.pop("OPENAI_API_KEY", None)

    codex_tokens = shlex.split(os.environ.get("CORPUS_CODEX_COMMAND", "codex"))
    base_cmd = codex_tokens + [
        "--ask-for-approval", "never",
        "exec",
        "--ephemeral",
        "--sandbox", "read-only",
        "--skip-git-repo-check",
    ]

    try:
        current_manifest = manifest_for(codex_tokens, codex_env)
        checkpoint_path, completed = ensure_state(
            args.state_dir,
            current_manifest,
            resume=args.resume,
            fresh=args.fresh,
        )
    except Exception as exc:
        print(f"FAIL: checkpoint initialization: {exc}")
        return 2

    errors: list[str] = []
    reused = 0
    executed = 0

    for index, record in enumerate(RECORDS, 1):
        outputs: list[tuple[str, dict[str, Any]]] = []
        for label, ordering in (("forward", SKILLS), ("reverse", list(reversed(SKILLS)))):
            key = (record["id"], label)
            if key in completed:
                output = completed[key]["output"]
                reused += 1
                print(f"[{index}/{len(RECORDS)}] {record['id']} {label} resumed", flush=True)
            else:
                try:
                    output = run_one(
                        record,
                        label,
                        ordering,
                        base_cmd=base_cmd,
                        codex_env=codex_env,
                        state_dir=args.state_dir,
                    )
                except AuthenticationError as exc:
                    append_jsonl_fsync(
                        checkpoint_path,
                        {
                            "type": "result",
                            "status": "auth_error",
                            "record_id": record["id"],
                            "label": label,
                            "error": str(exc),
                        },
                    )
                    print(f"FAIL: {record['id']} {label}: {exc}")
                    return 2
                except Exception as exc:
                    append_jsonl_fsync(
                        checkpoint_path,
                        {
                            "type": "result",
                            "status": "error",
                            "record_id": record["id"],
                            "label": label,
                            "error": str(exc),
                        },
                    )
                    errors.append(f"{record['id']} {label}: execution/parsing failed: {exc}")
                    continue
                append_jsonl_fsync(
                    checkpoint_path,
                    {
                        "type": "result",
                        "status": "ok",
                        "record_id": record["id"],
                        "label": label,
                        "output": output,
                    },
                )
                completed[key] = {
                    "type": "result",
                    "status": "ok",
                    "record_id": record["id"],
                    "label": label,
                    "output": output,
                }
                executed += 1
                print(f"[{index}/{len(RECORDS)}] {record['id']} {label} saved", flush=True)

            outputs.append((label, output))
            errors.extend(evaluate_output(record, label, output))

        if len(outputs) == 2:
            first = set(outputs[0][1].get("selected_skills", []))
            second = set(outputs[1][1].get("selected_skills", []))
            required = set(record.get("expect", []))
            optional = set(record.get("may", []))
            delta = (first ^ second) - optional
            if delta:
                errors.append(f"{record['id']}: material order drift {sorted(delta)}")
            if required and (not required <= first or not required <= second):
                errors.append(f"{record['id']}: required routing unstable under permutation")
        print(f"[{index}/{len(RECORDS)}] {record['id']} checked", flush=True)

    report = {
        "manifest": current_manifest,
        "checkpoint": str(checkpoint_path),
        "executed_calls": executed,
        "reused_calls": reused,
        "total_expected_calls": len(RECORDS) * 2,
        "errors": errors,
        "passed": not errors,
    }
    fsync_text(
        args.state_dir / "behavioral-report.json",
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    )

    if errors:
        print("FAIL")
        for error in errors:
            print(" -", error)
        print(f"Persistent report: {args.state_dir / 'behavioral-report.json'}")
        return 1
    print(
        f"PASS: {len(RECORDS)} behavioral evals passed in forward and reverse candidate order"
    )
    print(f"Persistent report: {args.state_dir / 'behavioral-report.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
