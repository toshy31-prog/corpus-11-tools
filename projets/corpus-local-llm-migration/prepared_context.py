"""Deterministic, offline preflight for compact Corpus model context.

This module prepares a proposal for one future model turn. It selects an existing
tool profile, removes exact duplicate supplied passages, and makes a cache-safe
prefix. It does not retrieve, execute, persist, change permissions or call models.
"""
from __future__ import annotations
from dataclasses import dataclass
import hashlib
from typing import Any
from cache_envelope import CacheEnvelope, build_envelope, canonical_json
from capability_profile_contract import selection_receipt

FORMAT_VERSION = 1
_ALLOWED_KINDS = {"attached", "retrieved", "tool_result", "resume", "workspace"}

def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

def _text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} doit être un texte non vide.")
    return value

@dataclass(frozen=True)
class PreparedContext:
    """Detached material for inspection before a later model request."""
    profile_receipt: dict[str, Any]
    envelope: CacheEnvelope
    included_context: tuple[dict[str, str], ...]
    dropped_duplicates: tuple[dict[str, str], ...]

    def receipt(self) -> dict[str, Any]:
        """Return inspectable metadata without context passage contents."""
        return {
            "format_version": FORMAT_VERSION, "kind": "prepared_context_preflight",
            "profile": self.profile_receipt["profile"],
            "tool_exposure": self.profile_receipt["selection"]["tools"],
            "permission": self.profile_receipt["permission"], "execution": "not_started",
            "cache": self.envelope.cache_metadata(),
            "context": {
                "supplied_count": len(self.included_context) + len(self.dropped_duplicates),
                "included_count": len(self.included_context),
                "dropped_exact_duplicates": len(self.dropped_duplicates),
                "included": [{"id": row["id"], "kind": row["kind"], "provenance": row["provenance"], "permission_scope": row["permission_scope"], "sha256": row["sha256"]} for row in self.included_context],
                "dropped": [{"id": row["id"], "duplicate_of": row["duplicate_of"], "sha256": row["sha256"]} for row in self.dropped_duplicates],
            },
            "limits": [
                "La déduplication est textuelle exacte dans une même provenance et un même périmètre de permission ; elle ne juge ni pertinence ni vérité.",
                "Le profil ne modifie aucune permission et ne lance aucun outil.",
                "L’empreinte de cache ne prouve ni écriture ni réutilisation de cache par le runtime.",
                "Le contexte préparé reste une proposition ; le requêteur doit encore demander toute exécution nécessaire.",
            ],
        }

def prepare_context(*, model: str, profile_id: str, profiles: dict[str, Any], catalog: dict[str, Any], permissions: dict[str, Any], invariant_context: str, user_request: str, context_items: list[dict[str, Any]]) -> PreparedContext:
    """Preserve supplied order; only exact text within one trust boundary is removed.

    A boundary is the declared kind, provenance and permission_scope. Equal
    text crossing one of those values stays separate: compaction must never
    silently merge a less trusted source or a different disclosure basis.
    """
    _text(invariant_context, "invariant_context")
    _text(user_request, "user_request")
    if not isinstance(context_items, list):
        raise ValueError("context_items doit être une liste.")
    profile = selection_receipt(profile_id, profiles, catalog)
    included, dropped, seen, ids = [], [], {}, set()
    for index, raw in enumerate(context_items):
        if not isinstance(raw, dict):
            raise ValueError(f"Contexte {index + 1} : un objet est attendu.")
        item_id = _text(raw.get("id"), f"Contexte {index + 1}.id")
        kind = raw.get("kind")
        if kind not in _ALLOWED_KINDS:
            raise ValueError(f"Contexte {index + 1}.kind est invalide.")
        body = _text(raw.get("text"), f"Contexte {index + 1}.text")
        provenance = raw.get("provenance", "unspecified")
        permission_scope = raw.get("permission_scope", "unspecified")
        _text(provenance, f"Contexte {index + 1}.provenance")
        _text(permission_scope, f"Contexte {index + 1}.permission_scope")
        if item_id in ids:
            raise ValueError(f"Identifiant de contexte dupliqué : {item_id}")
        ids.add(item_id)
        digest = _sha256_text(body)
        boundary = canonical_json({"kind": kind, "provenance": provenance, "permission_scope": permission_scope})
        dedupe_key = _sha256_text(digest + "\n" + boundary)
        if dedupe_key in seen:
            dropped.append({"id": item_id, "duplicate_of": seen[dedupe_key], "sha256": digest})
            continue
        seen[dedupe_key] = item_id
        included.append({"id": item_id, "kind": kind, "provenance": provenance, "permission_scope": permission_scope, "text": body, "sha256": digest})
    variable_context = {"user_request": user_request, "context": [{"id": r["id"], "kind": r["kind"], "provenance": r["provenance"], "permission_scope": r["permission_scope"], "text": r["text"]} for r in included]}
    envelope = build_envelope(model=model, tool_profile={"id": profile["profile"]["id"], "tools": profile["selection"]["tools"]}, permissions=permissions, invariant_context=invariant_context, variable_context=variable_context)
    return PreparedContext(profile_receipt=profile, envelope=envelope, included_context=tuple(included), dropped_duplicates=tuple(dropped))
