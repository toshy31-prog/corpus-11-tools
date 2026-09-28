"""Local persistence for immutable visual-artifact occurrences.

This module is intentionally independent from MCP, NS1, the planner and async state.
It owns only occurrence identity, immutable payload persistence and local resolution.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import tempfile
import uuid
from typing import Callable

TOKEN_RE = re.compile(r"^[a-f0-9]{16}$")
OCCURRENCE_ID_RE = re.compile(r"^[a-f0-9]{32}$")
REF_RE = re.compile(
    r"^visual-occurrence:(standalone|[a-f0-9]{16}):([a-f0-9]{32})$"
)
ACTION_KINDS = {"screenshot", "frame"}
SCHEMA_VERSION = 1
KIND = "visual_artifact_occurrence"
MAX_ID_ATTEMPTS = 8


class VisualArtifactError(RuntimeError):
    """Base error for visual-artifact persistence and resolution."""


class VisualArtifactPublicationError(VisualArtifactError):
    """Publication failed; published tells whether the canonical receipt exists."""

    def __init__(self, message: str, *, occurrence_ref: str | None, published: bool):
        super().__init__(message)
        self.occurrence_ref = occurrence_ref
        self.published = published


class VisualArtifactCollisionError(VisualArtifactError):
    pass


def _new_occurrence_id() -> str:
    return uuid.uuid4().hex


def _checkpoint(_name: str) -> None:
    """Test seam only. Production code intentionally performs no action here."""


def _validate_root(root) -> Path:
    path = Path(root)
    if not path.is_absolute():
        path = path.resolve()
    return path


def _scope_for_token(producing_token: str | None) -> str:
    if producing_token is None:
        return "standalone"
    if not isinstance(producing_token, str) or not TOKEN_RE.fullmatch(producing_token):
        raise ValueError("producing_token invalide")
    return producing_token


def _validate_action_kind(action_kind: str) -> str:
    if action_kind not in ACTION_KINDS:
        raise ValueError("action_kind invalide")
    return action_kind


def _parse_ref(occurrence_ref: str) -> tuple[str, str]:
    if not isinstance(occurrence_ref, str):
        raise ValueError("occurrence_ref invalide")
    match = REF_RE.fullmatch(occurrence_ref)
    if not match:
        raise ValueError("occurrence_ref invalide")
    return match.group(1), match.group(2)


def _make_ref(scope: str, occurrence_id: str) -> str:
    if scope != "standalone" and not TOKEN_RE.fullmatch(scope):
        raise ValueError("scope invalide")
    if not OCCURRENCE_ID_RE.fullmatch(occurrence_id):
        raise ValueError("occurrence_id invalide")
    return f"visual-occurrence:{scope}:{occurrence_id}"


def _fsync_dir(path: Path) -> None:
    flags = os.O_RDONLY
    if hasattr(os, "O_DIRECTORY"):
        flags |= os.O_DIRECTORY
    fd = os.open(path, flags)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def _write_temp(directory: Path, data: bytes, prefix: str) -> Path:
    fd, raw = tempfile.mkstemp(prefix=prefix, dir=str(directory))
    path = Path(raw)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
    except BaseException:
        try:
            path.unlink()
        except FileNotFoundError:
            pass
        raise
    return path


def _publish_noreplace(temp_path: Path, final_path: Path) -> None:
    """Atomically create final_path without ever replacing an existing file."""
    try:
        os.link(temp_path, final_path)
    except FileExistsError:
        raise VisualArtifactCollisionError(f"destination déjà publiée: {final_path.name}")
    finally:
        try:
            temp_path.unlink()
        except FileNotFoundError:
            pass
    _fsync_dir(final_path.parent)


def _receipt_bytes(receipt: dict) -> bytes:
    return (json.dumps(receipt, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def _receipt_path(root: Path, scope: str, occurrence_id: str) -> Path:
    return root / scope / occurrence_id / "receipt.json"


def _validate_receipt(receipt: object, *, expected_scope: str, expected_id: str) -> dict:
    if not isinstance(receipt, dict):
        raise VisualArtifactError("receipt invalide")
    expected_keys = {
        "schema_version", "kind", "occurrence_id", "occurrence_ref",
        "producing_token", "action_kind", "content_sha256", "storage_locator",
    }
    if set(receipt) != expected_keys:
        raise VisualArtifactError("champs receipt invalides")
    if receipt["schema_version"] != SCHEMA_VERSION or receipt["kind"] != KIND:
        raise VisualArtifactError("type receipt invalide")
    if receipt["occurrence_id"] != expected_id or not OCCURRENCE_ID_RE.fullmatch(str(receipt["occurrence_id"])):
        raise VisualArtifactError("occurrence_id incohérent")
    expected_ref = _make_ref(expected_scope, expected_id)
    if receipt["occurrence_ref"] != expected_ref:
        raise VisualArtifactError("occurrence_ref incohérente")
    expected_token = None if expected_scope == "standalone" else expected_scope
    if receipt["producing_token"] != expected_token:
        raise VisualArtifactError("producing_token incohérent")
    _validate_action_kind(receipt["action_kind"])
    digest = receipt["content_sha256"]
    if not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest):
        raise VisualArtifactError("content_sha256 invalide")
    locator = receipt["storage_locator"]
    if locator != "payload.png":
        raise VisualArtifactError("storage_locator invalide")
    locator_path = Path(locator)
    if locator_path.is_absolute() or len(locator_path.parts) != 1 or locator_path.name != locator:
        raise VisualArtifactError("storage_locator hors occurrence")
    return receipt


def persist_visual_occurrence(
    root,
    payload: bytes,
    producing_token: str | None,
    action_kind: str,
) -> str:
    """Persist one immutable occurrence and return its addressable occurrence_ref."""
    root_path = _validate_root(root)
    if not isinstance(payload, (bytes, bytearray, memoryview)):
        raise ValueError("payload doit être bytes-like")
    payload_bytes = bytes(payload)
    action_kind = _validate_action_kind(action_kind)
    scope = _scope_for_token(producing_token)
    scope_dir = root_path / scope
    scope_dir.mkdir(parents=True, exist_ok=True)
    _fsync_dir(scope_dir.parent if scope_dir.parent.exists() else root_path)

    last_collision = None
    for _ in range(MAX_ID_ATTEMPTS):
        occurrence_id = _new_occurrence_id()
        if not OCCURRENCE_ID_RE.fullmatch(occurrence_id):
            raise VisualArtifactError("générateur occurrence_id invalide")
        occurrence_ref = _make_ref(scope, occurrence_id)
        occurrence_dir = scope_dir / occurrence_id
        try:
            occurrence_dir.mkdir()
        except FileExistsError as exc:
            last_collision = exc
            continue
        _fsync_dir(scope_dir)

        payload_final = occurrence_dir / "payload.png"
        receipt_final = occurrence_dir / "receipt.json"
        published = False
        try:
            _checkpoint("after_occurrence_dir")
            payload_temp = _write_temp(occurrence_dir, payload_bytes, ".payload-")
            _checkpoint("after_payload_temp")
            _publish_noreplace(payload_temp, payload_final)
            _checkpoint("after_payload_publish")

            receipt = {
                "schema_version": SCHEMA_VERSION,
                "kind": KIND,
                "occurrence_id": occurrence_id,
                "occurrence_ref": occurrence_ref,
                "producing_token": producing_token,
                "action_kind": action_kind,
                "content_sha256": hashlib.sha256(payload_bytes).hexdigest(),
                "storage_locator": "payload.png",
            }
            receipt_temp = _write_temp(occurrence_dir, _receipt_bytes(receipt), ".receipt-")
            _checkpoint("after_receipt_temp")
            _publish_noreplace(receipt_temp, receipt_final)
            published = True
            _checkpoint("after_receipt_publish")
            return occurrence_ref
        except BaseException as exc:
            if isinstance(exc, VisualArtifactPublicationError):
                raise
            raise VisualArtifactPublicationError(
                str(exc),
                occurrence_ref=occurrence_ref,
                published=published or receipt_final.is_file(),
            ) from exc

    raise VisualArtifactCollisionError("collision occurrence_id après tentatives bornées") from last_collision


def resolve_visual_occurrence(root, occurrence_ref: str, *, include_payload: bool = True) -> dict:
    """Resolve metadata independently from payload availability/integrity."""
    root_path = _validate_root(root)
    scope, occurrence_id = _parse_ref(occurrence_ref)
    receipt_path = _receipt_path(root_path, scope, occurrence_id)
    try:
        raw = receipt_path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise VisualArtifactError("receipt introuvable") from exc
    except OSError as exc:
        raise VisualArtifactError("receipt illisible") from exc
    try:
        receipt = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise VisualArtifactError("receipt JSON invalide") from exc
    receipt = _validate_receipt(receipt, expected_scope=scope, expected_id=occurrence_id)

    occurrence_dir = receipt_path.parent
    payload_path = occurrence_dir / receipt["storage_locator"]
    try:
        payload_path.resolve(strict=False).relative_to(root_path.resolve(strict=False))
    except ValueError as exc:
        raise VisualArtifactError("storage_locator hors racine") from exc

    payload = None
    payload_available = False
    payload_integrity = "unavailable"
    try:
        data = payload_path.read_bytes()
    except FileNotFoundError:
        data = None
    except OSError as exc:
        raise VisualArtifactError("payload illisible") from exc
    if data is not None:
        payload_available = True
        payload_integrity = (
            "verified"
            if hashlib.sha256(data).hexdigest() == receipt["content_sha256"]
            else "mismatch"
        )
        if include_payload:
            payload = data

    return {
        "receipt": receipt,
        "payload_available": payload_available,
        "payload_integrity": payload_integrity,
        "payload": payload,
    }


def list_visual_occurrences(root, producing_token: str | None) -> list[str]:
    """List published occurrence refs for one token/scope only; never global-scan."""
    root_path = _validate_root(root)
    scope = _scope_for_token(producing_token)
    scope_dir = root_path / scope
    if not scope_dir.exists():
        return []
    if not scope_dir.is_dir():
        raise VisualArtifactError("scope visuel invalide")
    refs = []
    try:
        children = sorted(scope_dir.iterdir(), key=lambda item: item.name)
    except OSError as exc:
        raise VisualArtifactError("scope visuel illisible") from exc
    for child in children:
        if not child.is_dir():
            continue
        if not OCCURRENCE_ID_RE.fullmatch(child.name):
            continue
        receipt_path = child / "receipt.json"
        if not receipt_path.exists():
            continue
        occurrence_ref = _make_ref(scope, child.name)
        resolved = resolve_visual_occurrence(root_path, occurrence_ref, include_payload=False)
        refs.append(resolved["receipt"]["occurrence_ref"])
    return refs
