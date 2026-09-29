"""Minimal optional authorization gate in front of the existing async launcher."""
from __future__ import annotations

import json
from pathlib import Path
import time

import authorization_owner
import corpus_gpt_async as async_jobs
import corpus_gpt_job_policy as job_policy


def load_authorization_root(config_path):
    if config_path is None:
        return None
    try:
        value=json.loads(Path(config_path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except (OSError,json.JSONDecodeError) as exc:
        raise ValueError("authorization configuration invalide") from exc
    if not isinstance(value,dict) or set(value)!={"authorization_root"}:
        raise ValueError("authorization configuration invalide")
    raw=value.get("authorization_root")
    if not isinstance(raw,str) or not raw.strip() or not Path(raw).is_absolute():
        raise ValueError("authorization configuration invalide")
    return Path(raw)


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

def requires_durable_authorization(job, registry):
    return job_policy.requires_durable_authorization(job, registry)


def start_job_configured(*args, authorization_config_path=None, **kwargs):
    job = args[0] if args else kwargs.get("job")
    allowed_jobs = kwargs.get("allowed_jobs")
    if isinstance(job, str) and isinstance(allowed_jobs, list) and job in allowed_jobs:
        try:
            protected = job_policy.requires_durable_authorization(job, kwargs.get("job_registry"))
        except ValueError as exc:
            raise ValueError("authorization_requirement_invalid") from exc
        if protected:
            existing = async_jobs.existing_active_job(
                job, bb=kwargs.get("bb"), causal_refs=kwargs.get("causal_refs")
            )
            if existing is not None:
                return existing
            if kwargs.get("authorization_root") is None:
                try:
                    root = load_authorization_root(authorization_config_path)
                except ValueError as exc:
                    raise ValueError("authorization_check_failed") from exc
                if root is None:
                    raise ValueError("authorization_check_failed")
                kwargs["authorization_root"] = root
    return start_job(*args, **kwargs)
