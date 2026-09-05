#!/usr/bin/env python3
"""Local synthetic-fixture comparison harness; no model or API adapter."""
from __future__ import annotations

import argparse
import hashlib
import json
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

JOBS = ("chatgpt_custom_gpt", "codex_corpus")
TERMINAL_JOB_STATES = {"sealed", "failed_retryable", "failed_terminal", "timed_out", "cancelled", "invalidated"}
PURPOSES = {"synthetic_fixture", "real_non_sensitive"}
REVIEW_DECISIONS = {"A", "B", "tie", "inconclusive", "invalid"}
REVIEW_CRITERIA = {
    "conclusion_supported",
    "uncertainty_preserved",
    "reversal_condition_preserved",
    "scope_preserved",
    "useful_to_human",
}
EXECUTOR_PROFILES = {
    "chatgpt_custom_gpt": {
        "display_label": "GPT personnalisé dans ChatGPT",
        "environment_kind": "chatgpt_custom_gpt",
        "context_status": "fresh_session_configured_gpt",
        "persistent_configuration": "gpt_instructions_knowledge_and_capabilities",
        "conversation_history_at_start": "none",
        "context_note": "Chaque run démarre dans un chat neuf; seules les instructions, connaissances et capacités propres au GPT restent configurées.",
    },
    "codex_corpus": {
        "display_label": "Codex avec Corpus local",
        "environment_kind": "codex_corpus_local",
        "context_status": "loaded_repository_and_corpus",
        "context_note": "Le dépôt, les outils et les instructions Corpus accessibles dans la tâche font partie du contexte déclaré.",
    },
}


class HarnessError(RuntimeError):
    pass


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def text_digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def paths(root: Path, run_id: str) -> dict[str, Path]:
    run = root / run_id
    return {"run": run, "manifest": run / "manifest.json", "sealed": run / "sealed-manifest.json", "input": run / "input.json", "events": run / "audit.events.jsonl", "comparison": run / "comparison" / "packet.json"}


def append_event(root: Path, run_id: str, event_type: str, **details: Any) -> dict[str, Any]:
    event_path = paths(root, run_id)["events"]
    previous_hash = "0" * 64
    sequence = 1
    if event_path.exists():
        events = [json.loads(line) for line in event_path.read_text(encoding="utf-8").splitlines() if line]
        if events:
            previous_hash, sequence = events[-1]["event_sha256"], events[-1]["sequence"] + 1
    event = {"schema": "comparison-event/v1", "sequence": sequence, "at": now(), "type": event_type, "run_id": run_id, "details": details, "previous_event_sha256": previous_hash}
    event["event_sha256"] = digest(event)
    event_path.parent.mkdir(parents=True, exist_ok=True)
    with event_path.open("a", encoding="utf-8") as handle:
        handle.write(canonical(event) + "\n")
    return event


def create_run(root: Path, run_id: str, raw_prompt: str, purpose: str = "synthetic_fixture") -> None:
    if not raw_prompt:
        raise HarnessError("raw_prompt must not be empty")
    if purpose not in PURPOSES:
        raise HarnessError("unsupported run purpose")
    target = paths(root, run_id)
    if target["run"].exists():
        raise HarnessError("run already exists")
    input_data = {"schema": "comparison-input/v1", "raw_prompt": raw_prompt, "attachments": [], "frozen_at": now(), "normalization": "none", "sensitivity": "synthetic" if purpose == "synthetic_fixture" else "non_sensitive"}
    input_hash = digest(input_data)
    mapping = dict(zip(JOBS, secrets.SystemRandom().sample(["A", "B"], k=2)))
    manifest = {"schema": "comparison-run/v1", "run_id": run_id, "purpose": purpose, "created_at": now(), "input_sha256": input_hash, "status": "awaiting_results", "jobs": list(JOBS), "executor_profiles": EXECUTOR_PROFILES, "sealed_manifest_sha256": None}
    sealed = {"schema": "comparison-sealed-manifest/v1", "run_id": run_id, "input_sha256": input_hash, "blind_mapping": mapping, "created_at": now()}
    sealed_hash = digest(sealed)
    manifest["sealed_manifest_sha256"] = sealed_hash
    write_json(target["input"], input_data)
    write_json(target["sealed"], sealed)
    write_json(target["manifest"], manifest)
    for job in JOBS:
        write_json(target["run"] / "jobs" / job / "job.json", {"schema": "comparison-job/v1", "run_id": run_id, "job_id": job, "attempt_id": 1, "input_sha256": input_hash, "status": "prepared", "executor_kind": "manual_import", "executor_profile": EXECUTOR_PROFILES[job], "may_read_other_response": False})
    append_event(root, run_id, "input_frozen", input_sha256=input_hash)


def import_response(root: Path, run_id: str, job_id: str, response_text: str, operator_notes: str = "") -> None:
    if job_id not in JOBS or not response_text:
        raise HarnessError("known job_id and non-empty response_text are required")
    target = paths(root, run_id)
    manifest = read_json(target["manifest"])
    job_path = target["run"] / "jobs" / job_id / "job.json"
    job = read_json(job_path)
    if job["status"] in TERMINAL_JOB_STATES:
        raise HarnessError("sealed or terminal attempt cannot be replaced; create a new attempt")
    envelope = {"schema": "comparison-response/v1", "run_id": run_id, "job_id": job_id, "attempt_id": job["attempt_id"], "input_sha256": manifest["input_sha256"], "received_at": now(), "response_text": response_text, "response_sha256": text_digest(response_text), "operator_notes": operator_notes, "execution_evidence": "manual_import", "sealed_at": now()}
    response_path = job_path.parent / "response.json"
    write_json(response_path, envelope)
    job["status"] = "sealed"
    job["response_envelope_sha256"] = digest(envelope)
    write_json(job_path, job)
    append_event(root, run_id, "response_sealed", job_id=job_id, attempt_id=job["attempt_id"], response_sha256=envelope["response_sha256"], envelope_sha256=job["response_envelope_sha256"])
    statuses = [read_json(target["run"] / "jobs" / name / "job.json")["status"] for name in JOBS]
    if statuses == ["sealed", "sealed"]:
        manifest["status"] = "both_sealed"
        write_json(target["manifest"], manifest)
        append_event(root, run_id, "both_responses_sealed")


def verify_run(root: Path, run_id: str) -> None:
    target = paths(root, run_id)
    manifest, sealed, input_data = read_json(target["manifest"]), read_json(target["sealed"]), read_json(target["input"])
    if digest(sealed) != manifest["sealed_manifest_sha256"]:
        raise HarnessError("sealed manifest hash mismatch")
    if digest(input_data) != manifest["input_sha256"] or sealed["input_sha256"] != manifest["input_sha256"]:
        raise HarnessError("input hash mismatch")
    if set(sealed["blind_mapping"]) != set(JOBS) or set(sealed["blind_mapping"].values()) != {"A", "B"}:
        raise HarnessError("invalid blind mapping")
    previous, expected = "0" * 64, 1
    for line in target["events"].read_text(encoding="utf-8").splitlines():
        event = json.loads(line)
        supplied = event.pop("event_sha256")
        if event["sequence"] != expected or event["previous_event_sha256"] != previous or digest(event) != supplied:
            raise HarnessError("invalid audit event chain")
        previous, expected = supplied, expected + 1
    for job_id in JOBS:
        job = read_json(target["run"] / "jobs" / job_id / "job.json")
        if job["input_sha256"] != manifest["input_sha256"]:
            raise HarnessError(f"{job_id}: input hash mismatch")
        response_path = target["run"] / "jobs" / job_id / "response.json"
        if job["status"] == "sealed":
            response = read_json(response_path)
            if text_digest(response["response_text"]) != response["response_sha256"] or digest(response) != job["response_envelope_sha256"]:
                raise HarnessError(f"{job_id}: response integrity mismatch")


def prepare_review(root: Path, run_id: str) -> Path:
    verify_run(root, run_id)
    target = paths(root, run_id)
    manifest, sealed = read_json(target["manifest"]), read_json(target["sealed"])
    if manifest["status"] != "both_sealed":
        raise HarnessError("review requires two sealed responses")
    answers: dict[str, dict[str, str]] = {}
    for job_id in JOBS:
        response = read_json(target["run"] / "jobs" / job_id / "response.json")
        answers[sealed["blind_mapping"][job_id]] = {"response_text": response["response_text"], "response_sha256": response["response_sha256"]}
    packet = {"schema": "comparison-review-packet/v1", "run_id": run_id, "input_sha256": manifest["input_sha256"], "answers": answers, "operator_notes_included": False, "automated_verdict": None}
    write_json(target["comparison"], packet)
    manifest["status"] = "comparison_ready"
    write_json(target["manifest"], manifest)
    append_event(root, run_id, "review_packet_created", packet_sha256=digest(packet))
    return target["comparison"]


def record_review(root: Path, run_id: str, decision: str, criteria: list[str]) -> Path:
    """Enregistre un verdict humain explicite sans recopier prompt ni réponses."""
    if decision not in REVIEW_DECISIONS:
        raise HarnessError("unsupported review decision")
    if not criteria or any(criterion not in REVIEW_CRITERIA for criterion in criteria):
        raise HarnessError("at least one known review criterion is required")
    target = paths(root, run_id)
    manifest = read_json(target["manifest"])
    if manifest["status"] != "comparison_ready":
        raise HarnessError("review requires a prepared blind packet")
    packet = read_json(target["comparison"])
    review = {
        "schema": "comparison-human-review/v1",
        "run_id": run_id,
        "reviewed_at": now(),
        "decision": decision,
        "criteria": sorted(set(criteria)),
        "answer_sha256": {label: answer["response_sha256"] for label, answer in packet["answers"].items()},
        "reviewer_note_retention": "none",
        "automated_verdict": False,
    }
    review_path = target["run"] / "comparison" / "human-review.json"
    write_json(review_path, review)
    manifest["status"] = "reviewed"
    manifest["human_review_sha256"] = digest(review)
    write_json(target["manifest"], manifest)
    append_event(root, run_id, "human_review_recorded", decision=decision, criteria=review["criteria"], review_sha256=manifest["human_review_sha256"])
    return review_path


def invalidate_run(root: Path, run_id: str, reason: str) -> None:
    if not reason:
        raise HarnessError("invalidation reason is required")
    target = paths(root, run_id)
    manifest = read_json(target["manifest"])
    if manifest["status"] in {"comparison_ready", "reviewed", "closed"}:
        raise HarnessError("a reviewed or closed run cannot be invalidated")
    manifest["status"] = "invalidated"
    manifest["invalidation_reason"] = reason
    manifest["invalidated_at"] = now()
    write_json(target["manifest"], manifest)
    append_event(root, run_id, "run_invalidated", reason=reason)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime", type=Path, default=Path(__file__).resolve().parents[1] / "runtime")
    actions = parser.add_subparsers(dest="action", required=True)
    create = actions.add_parser("create"); create.add_argument("run_id"); create.add_argument("raw_prompt"); create.add_argument("--purpose", choices=sorted(PURPOSES), default="synthetic_fixture"); create.add_argument("--confirm-non-sensitive", action="store_true")
    import_ = actions.add_parser("import-response"); import_.add_argument("run_id"); import_.add_argument("job_id", choices=JOBS); import_.add_argument("response_text"); import_.add_argument("--operator-notes", default="")
    verify = actions.add_parser("verify"); verify.add_argument("run_id")
    review = actions.add_parser("prepare-review"); review.add_argument("run_id")
    human_review = actions.add_parser("record-review"); human_review.add_argument("run_id"); human_review.add_argument("decision", choices=sorted(REVIEW_DECISIONS)); human_review.add_argument("--criterion", choices=sorted(REVIEW_CRITERIA), action="append", required=True)
    invalidate = actions.add_parser("invalidate"); invalidate.add_argument("run_id"); invalidate.add_argument("reason")
    args = parser.parse_args()
    try:
        if args.action == "create":
            if args.purpose == "real_non_sensitive" and not args.confirm_non_sensitive:
                raise HarnessError("real_non_sensitive requires --confirm-non-sensitive")
            create_run(args.runtime, args.run_id, args.raw_prompt, args.purpose)
        elif args.action == "import-response": import_response(args.runtime, args.run_id, args.job_id, args.response_text, args.operator_notes)
        elif args.action == "verify": verify_run(args.runtime, args.run_id)
        elif args.action == "prepare-review": print(prepare_review(args.runtime, args.run_id))
        elif args.action == "record-review": print(record_review(args.runtime, args.run_id, args.decision, args.criterion))
        else: invalidate_run(args.runtime, args.run_id, args.reason)
    except HarnessError as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
