"""Local content-addressed persistence for decision context receipts.

DR1-only primitive: explicit callers choose whether to persist.  Nothing in
decision grounding or the MCP surface is wired to call this module.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import tempfile
from copy import deepcopy

import decision_grounding as dg

DECISION_REF_PREFIX = "decision_context_receipt:"
_DIGEST_RE = re.compile(r"^[a-f0-9]{64}$")


class DecisionReceiptStoreError(RuntimeError):
    """Base class for explicit decision receipt store failures."""


class DecisionReferenceError(DecisionReceiptStoreError):
    """The supplied reference or receipt identity is malformed."""


class DecisionReceiptNotFound(DecisionReceiptStoreError):
    """No persisted receipt exists for the exact decision reference."""


class DecisionReceiptIntegrityError(DecisionReceiptStoreError):
    """Persisted receipt bytes do not verify against their decision reference."""


class DecisionReceiptConflict(DecisionReceiptStoreError):
    """An existing object at this identity is incoherent and was not overwritten."""


def _identified_body(receipt: dict) -> dict:
    if not isinstance(receipt, dict) or receipt.get("kind") != "decision_context_receipt":
        raise DecisionReferenceError("decision_context_receipt requis")
    # This is exactly the body used by decision_grounding after consideration
    # has been attached: receipt_digest never hashes itself.
    return {k: deepcopy(v) for k, v in receipt.items() if k != "receipt_digest"}


def recompute_receipt_digest(receipt: dict) -> str:
    """Recompute identity with decision_grounding's existing canonicalization."""
    return dg._digest(_identified_body(receipt))


def decision_ref_for_receipt(receipt: dict) -> str:
    digest = receipt.get("receipt_digest") if isinstance(receipt, dict) else None
    if not isinstance(digest, str) or not _DIGEST_RE.fullmatch(digest):
        raise DecisionReferenceError("receipt_digest invalide")
    recomputed = recompute_receipt_digest(receipt)
    if recomputed != digest:
        raise DecisionReceiptIntegrityError(
            "receipt_digest ne correspond pas au contenu décisionnel complet"
        )
    return DECISION_REF_PREFIX + digest


def _digest_from_ref(decision_ref: str) -> str:
    if not isinstance(decision_ref, str) or not decision_ref.startswith(DECISION_REF_PREFIX):
        raise DecisionReferenceError("decision_ref invalide")
    digest = decision_ref[len(DECISION_REF_PREFIX):]
    if not _DIGEST_RE.fullmatch(digest):
        raise DecisionReferenceError("decision_ref invalide")
    return digest


def _receipt_path(root, digest: str) -> Path:
    return Path(root) / (digest + ".json")


def _decode_and_verify(raw: str, expected_ref: str) -> dict:
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise DecisionReceiptIntegrityError("receipt persiste illisible") from exc
    try:
        actual_ref = decision_ref_for_receipt(value)
    except (DecisionReferenceError, DecisionReceiptIntegrityError) as exc:
        raise DecisionReceiptIntegrityError(str(exc)) from exc
    if actual_ref != expected_ref:
        raise DecisionReceiptIntegrityError("receipt persiste sous une identite differente")
    return value


def resolve_decision_receipt(root, decision_ref: str) -> dict:
    """Resolve one exact decision reference without scanning or reconstruction."""
    digest = _digest_from_ref(decision_ref)
    path = _receipt_path(root, digest)
    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise DecisionReceiptNotFound(decision_ref) from exc
    except OSError as exc:
        raise DecisionReceiptIntegrityError("receipt persiste illisible") from exc
    return _decode_and_verify(raw, decision_ref)


def store_decision_receipt(root, receipt: dict) -> dict:
    """Explicitly persist one exact receipt under its existing content identity.

    Re-registering identical content is idempotent.  If the identity path
    already exists but does not verify to the exact same canonical receipt, the
    existing bytes are preserved and a conflict is raised.
    """
    decision_ref = decision_ref_for_receipt(receipt)
    digest = _digest_from_ref(decision_ref)
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    path = _receipt_path(root, digest)
    canonical = dg._canon(receipt) + "\n"

    if path.exists():
        try:
            existing = resolve_decision_receipt(root, decision_ref)
        except DecisionReceiptStoreError as exc:
            raise DecisionReceiptConflict(
                "objet existant incoherent; aucun ecrasement effectue"
            ) from exc
        if dg._canon(existing) != dg._canon(receipt):
            raise DecisionReceiptConflict(
                "collision de contenu sous la meme identite; aucun ecrasement effectue"
            )
        return {"decision_ref": decision_ref, "status": "existing"}

    fd, tmp_name = tempfile.mkstemp(prefix="." + digest + ".", dir=str(root))
    tmp = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(canonical)
            handle.flush()
            os.fsync(handle.fileno())
        try:
            os.link(tmp, path)
        except FileExistsError:
            # Another explicit writer won the race.  Validate it; never replace it.
            try:
                existing = resolve_decision_receipt(root, decision_ref)
            except DecisionReceiptStoreError as exc:
                raise DecisionReceiptConflict(
                    "objet concurrent incoherent; aucun ecrasement effectue"
                ) from exc
            if dg._canon(existing) != dg._canon(receipt):
                raise DecisionReceiptConflict(
                    "collision concurrente sous la meme identite"
                )
            return {"decision_ref": decision_ref, "status": "existing"}
        return {"decision_ref": decision_ref, "status": "stored"}
    finally:
        try:
            tmp.unlink()
        except FileNotFoundError:
            pass
