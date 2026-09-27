"""Prepare a cache-safe local prompt envelope without sending it anywhere.

The prefix holds only material that must remain identical across a session:
the model identity, the selected tool profile, the permission policy and the
stable Corpus context.  User turns, tool results and retrieved passages are
always placed in the suffix.  ``cache_key`` is an integrity identifier for
that prefix; it is deliberately not a permission grant, a persisted cache or
a claim that the serving engine has reused any KV state.

No socket, subprocess, model call, configuration change or file write occurs
in this module.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from typing import Any


FORMAT_VERSION = 1


def _canonical(value: Any) -> Any:
    """Return a strict JSON-shaped private value with deterministic key order.

    Floating point values are rejected: their platform formatting and special
    values make a policy/cache identity less auditable.  Callers may encode a
    measured number as an integer or string when it is genuinely invariant.
    """
    if value is None or isinstance(value, (bool, str, int)):
        return value
    if isinstance(value, float):
        raise ValueError('Les nombres flottants ne sont pas admis dans une empreinte de cache.')
    if isinstance(value, (list, tuple)):
        return [_canonical(item) for item in value]
    if isinstance(value, dict):
        if any(not isinstance(key, str) for key in value):
            raise ValueError('Les clés d’empreinte doivent être des textes.')
        return {key: _canonical(value[key]) for key in sorted(value)}
    raise ValueError(f'Type non sérialisable dans une empreinte de cache : {type(value).__name__}')


def canonical_json(value: Any) -> str:
    """Canonical UTF-8 JSON used for an inspectable SHA-256 input."""
    return json.dumps(_canonical(value), ensure_ascii=False, sort_keys=True,
                      separators=(',', ':'), allow_nan=False)


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


@dataclass(frozen=True)
class CacheEnvelope:
    """Detached request material, with an identity for its invariant prefix."""
    model: str
    tool_profile: Any
    permissions: Any
    invariant_context: str
    variable_context: Any
    prefix: str
    suffix: str
    cache_key: str
    invariant_context_sha256: str

    @property
    def prompt(self) -> str:
        return self.prefix + self.suffix

    def cache_metadata(self) -> dict[str, Any]:
        """Return hash-only cache metadata; never include user/tool suffixes."""
        return {
            'format_version': FORMAT_VERSION,
            'model': self.model,
            'cache_key': self.cache_key,
            'invariant_context_sha256': self.invariant_context_sha256,
        }


def build_envelope(*, model: str, tool_profile: Any, permissions: Any,
                   invariant_context: str, variable_context: Any) -> CacheEnvelope:
    """Build a deterministic prefix/suffix pair entirely in memory.

    ``tool_profile`` and ``permissions`` are both part of the cache identity,
    so a more permissive policy or a different set of tools can never be
    mistaken for the same reusable prefix.  ``variable_context`` is excluded
    from that identity by design and is rendered after the prefix.
    """
    if not isinstance(model, str) or not model.strip():
        raise ValueError('model doit être un texte non vide.')
    if not isinstance(invariant_context, str):
        raise ValueError('invariant_context doit être un texte.')
    model = model.strip()
    profile = _canonical(tool_profile)
    policy = _canonical(permissions)
    variable = _canonical(variable_context)
    context_hash = sha256_text(invariant_context)
    identity = {
        'format_version': FORMAT_VERSION,
        'model': model,
        'tool_profile': profile,
        'permissions': policy,
        'invariant_context_sha256': context_hash,
    }
    cache_key = sha256_text(canonical_json(identity))
    prefix = (
        '## Corpus — préfixe invariant v1\n'
        f'Modèle: {model}\n'
        'Profil d’outils (canonique):\n' + canonical_json(profile) + '\n'
        'Permissions (canoniques):\n' + canonical_json(policy) + '\n'
        'Contexte invariant:\n' + invariant_context + '\n'
        '## Fin du préfixe invariant\n\n'
    )
    suffix = (
        '## Corpus — contexte variable v1\n'
        + canonical_json(variable) + '\n'
        '## Fin du contexte variable\n'
    )
    return CacheEnvelope(model=model, tool_profile=profile, permissions=policy,
                         invariant_context=invariant_context,
                         variable_context=variable, prefix=prefix, suffix=suffix,
                         cache_key=cache_key,
                         invariant_context_sha256=context_hash)


def same_cache_prefix(left: CacheEnvelope, right: CacheEnvelope) -> bool:
    """Whether two envelopes have exactly the same reusable invariant prefix."""
    if not isinstance(left, CacheEnvelope) or not isinstance(right, CacheEnvelope):
        raise ValueError('Deux CacheEnvelope sont attendues.')
    return left.cache_key == right.cache_key and left.prefix == right.prefix
