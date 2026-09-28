"""Minimal specialized authorization owner/checker.

This module owns only authorization truth. Storage is always explicitly configured
by the caller; there is no global default and no execution side effect.
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path
import re
import uuid

_REF_RE = re.compile(r"^authorization:[a-f0-9]{32}$")


def _path(root, authorization_ref: str) -> Path:
    if not isinstance(authorization_ref, str) or not _REF_RE.fullmatch(authorization_ref):
        raise ValueError("authorization_ref invalide")
    return Path(root) / (authorization_ref.split(":", 1)[1] + ".json")


def _valid_text(value, field: str) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > 500:
        raise ValueError(field + " invalide")
    return value.strip()


def _valid_time(value, field: str) -> float:
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value):
        raise ValueError(field + " invalide")
    return float(value)


def issue_authorization(root, *, action: str, target: str, expires_at: float) -> dict:
    """Issue one exact action/target authorization under a fresh owner identity."""
    action = _valid_text(action, "action")
    target = _valid_text(target, "target")
    expires_at = _valid_time(expires_at, "expires_at")
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)

    for _ in range(8):
        authorization_ref = "authorization:" + uuid.uuid4().hex
        path = _path(root, authorization_ref)
        value = {
            "schema_version": 1,
            "kind": "corpus_authorization",
            "authorization_ref": authorization_ref,
            "action": action,
            "target": target,
            "expires_at": expires_at,
        }
        raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            continue
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(raw)
                handle.flush()
                os.fsync(handle.fileno())
        except Exception:
            try:
                path.unlink()
            except FileNotFoundError:
                pass
            raise
        return value
    raise RuntimeError("impossible de créer une identité authorization unique")


def check_authorization(root, authorization_ref: str, *, action: str, target: str, now: float) -> dict:
    """Check one exact authorization; never executes or mutates the authorization."""
    action = _valid_text(action, "action")
    target = _valid_text(target, "target")
    now = _valid_time(now, "now")
    try:
        path = _path(root, authorization_ref)
    except ValueError:
        return {"status": "unknown"}

    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {"status": "unknown"}
    except OSError as exc:
        return {"status": "error", "reason": type(exc).__name__}

    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return {"status": "error", "reason": "invalid_json"}
    if not isinstance(value, dict) or value.get("kind") != "corpus_authorization":
        return {"status": "error", "reason": "invalid_object"}
    if value.get("authorization_ref") != authorization_ref:
        return {"status": "error", "reason": "ref_mismatch"}
    if value.get("action") != action or value.get("target") != target:
        return {"status": "scope_mismatch"}
    expires_at = value.get("expires_at")
    if not isinstance(expires_at, (int, float)) or isinstance(expires_at, bool) or not math.isfinite(expires_at):
        return {"status": "error", "reason": "invalid_expires_at"}
    if now >= float(expires_at):
        return {"status": "expired"}
    return {"status": "valid"}
