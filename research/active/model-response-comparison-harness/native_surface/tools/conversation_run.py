#!/usr/bin/env python3
"""Immutable local run journal for the Corpus conversational surface."""
from __future__ import annotations

import argparse
import hashlib
import json
from argparse import Namespace
from pathlib import Path
from typing import Any

from conversation_surface import render, verify
from seal_analytic_packet import build_packet


class RunError(RuntimeError):
    pass


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_new_json(path: Path, value: dict[str, Any]) -> None:
    with path.open("x", encoding="utf-8") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n")


def replace_json(path: Path, value: dict[str, Any]) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def raw_digest(raw_prompt: str) -> str:
    return hashlib.sha256(raw_prompt.encode("utf-8")).hexdigest()


def attempt_number(path: Path) -> int:
    try:
        return int(path.name.removeprefix("attempt-"))
    except ValueError as exc:
        raise RunError(f"invalid attempt directory: {path}") from exc


def job_path(attempt: Path) -> Path:
    return attempt / "job.json"


def verified_result(attempt: Path, raw_prompt: str) -> dict[str, Any] | None:
    try:
        job = read_json(job_path(attempt))
        packet = read_json(attempt / "packet.json")
        rendered = read_json(attempt / "rendered.json")
        if job.get("state") != "verified" or packet.get("raw_prompt") != raw_prompt:
            return None
        verify(packet, rendered)
        return rendered
    except (OSError, ValueError, RunError):
        return None


def attempts_for(root: Path, raw_prompt: str) -> list[Path]:
    request = root / raw_digest(raw_prompt)
    if not request.exists():
        return []
    return sorted((path for path in request.glob("attempt-*") if path.is_dir()), key=attempt_number)


def prepare(root: Path, raw_prompt: str) -> dict[str, Any]:
    if not raw_prompt.strip():
        raise RunError("raw_prompt is required")
    try:
        root.mkdir(parents=True, exist_ok=True)
        request = root / raw_digest(raw_prompt)
        request.mkdir(exist_ok=True)
    except OSError as exc:
        raise RunError("sealing workspace is not writable; analysis has not started") from exc

    attempts = attempts_for(root, raw_prompt)
    for attempt in reversed(attempts):
        rendered = verified_result(attempt, raw_prompt)
        if rendered is not None:
            return {
                "state": "resume_verified",
                "attempt": str(attempt),
                "packet": str(attempt / "packet.json"),
                "rendered": str(attempt / "rendered.json"),
                "conversation": rendered["conversation"],
            }

    next_number = (attempt_number(attempts[-1]) + 1) if attempts else 1
    attempt = request / f"attempt-{next_number:03d}"
    try:
        attempt.mkdir()
        write_new_json(job_path(attempt), {
            "schema": "corpus-native-conversation-job/v1",
            "raw_prompt": raw_prompt,
            "raw_prompt_sha256": raw_digest(raw_prompt),
            "state": "prepared",
        })
    except OSError as exc:
        raise RunError("sealing workspace is not writable; analysis has not started") from exc
    return {"state": "ready_for_analysis", "attempt": str(attempt)}


def load_job(attempt: Path) -> dict[str, Any]:
    try:
        job = read_json(job_path(attempt))
    except (OSError, ValueError) as exc:
        raise RunError("attempt has no readable job record") from exc
    if job.get("schema") != "corpus-native-conversation-job/v1":
        raise RunError("unsupported job schema")
    return job


def start(attempt: Path) -> dict[str, Any]:
    job = load_job(attempt)
    if job.get("state") != "prepared":
        raise RunError("attempt is not available for analysis")
    job["state"] = "analysis_started"
    replace_json(job_path(attempt), job)
    return {"state": job["state"], "attempt": str(attempt)}


def complete(args: argparse.Namespace) -> dict[str, Any]:
    attempt = args.attempt
    job = load_job(attempt)
    if job.get("state") != "analysis_started":
        raise RunError("attempt is not available for completion")
    if args.raw_prompt != job.get("raw_prompt"):
        raise RunError("raw_prompt does not match the reserved attempt")
    if (attempt / "packet.json").exists() or (attempt / "rendered.json").exists():
        raise RunError("attempt already contains output and will not be overwritten")
    try:
        packet = build_packet(Namespace(
            raw_prompt=args.raw_prompt,
            conclusion=args.conclusion,
            uncertainty=args.uncertainty,
            reversal=args.reversal,
            route=args.route,
            dependency=args.dependency,
        ))
        write_new_json(attempt / "packet.json", packet)
        rendered = render(packet, args.detail)
        write_new_json(attempt / "rendered.json", rendered)
        verify(packet, rendered)
    except (OSError, ValueError, RuntimeError) as exc:
        job["state"] = "completion_failed"
        replace_json(job_path(attempt), job)
        raise RunError(f"sealing, rendering, or verification failed: {exc}") from exc
    job["state"] = "verified"
    replace_json(job_path(attempt), job)
    return {
        "state": "verified",
        "attempt": str(attempt),
        "packet": str(attempt / "packet.json"),
        "rendered": str(attempt / "rendered.json"),
        "conversation": rendered["conversation"],
    }


def recover(attempt: Path) -> dict[str, Any]:
    job = load_job(attempt)
    raw_prompt = job.get("raw_prompt")
    if not isinstance(raw_prompt, str):
        raise RunError("attempt has no raw prompt")
    rendered = verified_result(attempt, raw_prompt)
    if rendered is None:
        raise RunError("no verified render is available for recovery")
    return {
        "state": "recovered_verified_render",
        "attempt": str(attempt),
        "conversation": rendered["conversation"],
    }


def emit(value: dict[str, Any]) -> None:
    print(json.dumps(value, ensure_ascii=False, sort_keys=True))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    prepare_parser = commands.add_parser("prepare")
    prepare_parser.add_argument("--root", type=Path, default=Path("/tmp/corpus-native-conversation/runs"))
    prepare_parser.add_argument("--raw-prompt", required=True)
    start_parser = commands.add_parser("start")
    start_parser.add_argument("--attempt", type=Path, required=True)
    complete_parser = commands.add_parser("complete")
    complete_parser.add_argument("--attempt", type=Path, required=True)
    complete_parser.add_argument("--raw-prompt", required=True)
    complete_parser.add_argument("--conclusion", required=True)
    complete_parser.add_argument("--uncertainty", action="append", default=[])
    complete_parser.add_argument("--reversal", action="append", default=[])
    complete_parser.add_argument("--route", action="append", default=[])
    complete_parser.add_argument("--dependency", action="append", default=[])
    complete_parser.add_argument("--detail", choices=("compact", "standard", "inspectable"), default="standard")
    recover_parser = commands.add_parser("recover")
    recover_parser.add_argument("--attempt", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == "prepare":
            result = prepare(args.root, args.raw_prompt)
        elif args.command == "start":
            result = start(args.attempt)
        elif args.command == "complete":
            result = complete(args)
        else:
            result = recover(args.attempt)
        emit(result)
    except RunError as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
