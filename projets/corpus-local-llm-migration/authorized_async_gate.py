"""Minimal optional authorization gate in front of the existing async launcher."""
from __future__ import annotations

import time

import authorization_owner
import corpus_gpt_async as async_jobs


def requires_durable_authorization(job: str, registry: dict | None) -> bool:
    """The job registry owns this execution property; absence means historical behavior."""
    if not isinstance(registry, dict):
        return False
    row = registry.get(job)
    return isinstance(row, dict) and row.get("requires_durable_authorization") is True


def _stop_reason(status: str) -> str:
    return {
        "unknown": "authorization_unknown",
        "expired": "authorization_expired",
        "scope_mismatch": "authorization_scope_mismatch",
        "error": "authorization_check_failed",
    }.get(status, "authorization_check_failed")


def start_job(
    job: str,
    *,
    allowed_jobs: list[str],
    entry,
    bb,
    repo,
    job_kind="browser",
    visual_target="",
    causal_refs=None,
    job_registry=None,
    authorization_root=None,
    authorization_checker=authorization_owner.check_authorization,
    now=None,
):
    """Gate only explicitly protected jobs, then delegate to the historical start_job."""
    protected = requires_durable_authorization(job, job_registry)
    if protected:
        refs = async_jobs.normalize_causal_refs(causal_refs, allow_verification=False)
        authorization_ref = refs.get("authorization_ref")
        if authorization_ref is None:
            raise ValueError("authorization_required")
        if authorization_root is None:
            raise ValueError("authorization_check_failed")
        try:
            verdict = authorization_checker(
                authorization_root,
                authorization_ref,
                action="start_job",
                target=job,
                now=time.time() if now is None else now,
            )
        except Exception as exc:
            raise ValueError("authorization_check_failed") from exc
        status = verdict.get("status") if isinstance(verdict, dict) else None
        if status != "valid":
            raise ValueError(_stop_reason(str(status)))
    return async_jobs.start_job(
        job,
        allowed_jobs=allowed_jobs,
        entry=entry,
        bb=bb,
        repo=repo,
        job_kind=job_kind,
        visual_target=visual_target,
        causal_refs=causal_refs,
    )
