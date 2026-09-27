"""Privacy-preserving observation of *candidate* prompt-prefix reuse.

The bridge sees OpenCode request bodies but never persists their text, identifiers,
paths, attachments, or hashes of that data. It only keeps an in-process session
configuration marker long enough to decide whether a later request has the same
routing/model shape. The durable record is a small aggregate counter file.

A candidate is deliberately weaker than a llama.cpp cache hit: the backend can
still evict, reject, or miss the actual rendered prompt. This module is only
for deciding whether a cache experiment is worth running.
"""
from __future__ import annotations

import json
import os
import threading
import hashlib
from pathlib import Path

from corpus_paths import STATE_ROOT

FILE = STATE_ROOT / 'telemetry' / 'prefix-cache.json'
LIMIT = 4_000_000
_LOCK = threading.Lock()
_SESSIONS: dict[str, tuple] = {}
_MAX_SESSIONS = 512

EMPTY = {
    'version': 1,
    'requests_observed': 0,
    'routed_payload_bytes_total': 0,
    'routed_payload_bytes_max': 0,
    'continuations_observed': 0,
    'prefix_candidates': 0,
    'configuration_changed': 0,
    'shape_unusable': 0,
    'attachments_present': 0,
    'content_stored': False,
    'actual_cache_hits_observed': 0,
}


def _text(value):
    """Return a content-free structural category, not value text or a hash."""
    return bool(isinstance(value, str) and value.strip())


def _stable_prefix_digest(payload):
    """Hash only in memory the system material that begins a session prompt.

    The intercepted ``parts`` describe the *new* current turn.  Their synthetic
    timestamp or document references are therefore suffix material, not proof
    that the existing session prefix changed.  The durable aggregate contains
    no hash.  This transient digest prevents a merely identical shape from
    qualifying when system instructions changed.  User text, tool outputs,
    attachments and part metadata are never included.
    """
    system = payload.get('system')
    if not isinstance(system, str):
        return None
    return hashlib.sha256(system.encode('utf-8')).digest()


def _shape(payload):
    if not isinstance(payload, dict):
        return None
    model = payload.get('model')
    model = model if isinstance(model, dict) else {}
    parts = payload.get('parts')
    if not isinstance(parts, list):
        return None
    # Deliberately omit strings, filenames, MIME values and every identifier.
    part_kinds = tuple(
        (part.get('type'), bool(part.get('synthetic')))
        for part in parts if isinstance(part, dict) and isinstance(part.get('type'), str)
    )
    if len(part_kinds) != len(parts):
        return None
    tools = payload.get('tools')
    if isinstance(tools, dict):
        # Configuration names are held only in process memory to distinguish
        # masks that could render different tool schemas. They are never written.
        tool_shape = ('mask', tuple(sorted((str(name), value is True) for name, value in tools.items())))
    elif tools is None:
        tool_shape = ('default',)
    else:
        tool_shape = ('other',)
    prefix_digest = _stable_prefix_digest(payload)
    if prefix_digest is None:
        return None
    return (
        str(payload.get('agent', ''))[:200],
        str(model.get('providerID', ''))[:200],
        str(model.get('modelID', ''))[:200],
        str(payload.get('variant', ''))[:200],
        tool_shape,
        _text(payload.get('system')),
        part_kinds,
        prefix_digest,
    )


def _attachments(payload):
    return sum(
        1 for part in payload.get('parts', []) if isinstance(part, dict)
        and part.get('type') == 'file'
    )


def _read(path):
    try:
        if not path.is_file() or path.stat().st_size > 32_000:
            return dict(EMPTY)
        loaded = json.loads(path.read_text(encoding='utf-8'))
        if not isinstance(loaded, dict) or loaded.get('version') != EMPTY['version']:
            return dict(EMPTY)
        return {key: loaded.get(key, default) for key, default in EMPTY.items()}
    except (OSError, ValueError, json.JSONDecodeError):
        return dict(EMPTY)


def _write(value, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    encoded = (json.dumps(value, sort_keys=True, separators=(',', ':')) + '\n').encode()
    with temporary.open('wb') as handle:
        handle.write(encoded)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


def observe(session, body, path=None):
    """Update aggregate counters. Never raises into the message bridge.

    ``session`` is used only as a transient in-memory key and is never written.
    ``body`` is parsed then discarded; only its non-content structural shape is
    retained during the process lifetime.
    """
    try:
        path = FILE if path is None else path
        if not isinstance(session, str) or not session or len(body) > LIMIT:
            return False
        payload = json.loads(body)
        shape = _shape(payload)
        with _LOCK:
            value = _read(path)
            value['requests_observed'] += 1
            value['routed_payload_bytes_total'] += len(body)
            value['routed_payload_bytes_max'] = max(value['routed_payload_bytes_max'], len(body))
            if shape is None:
                value['shape_unusable'] += 1
            else:
                attachments = _attachments(payload)
                previous = _SESSIONS.get(session)
                if previous is not None:
                    value['continuations_observed'] += 1
                    if previous == (shape, attachments):
                        # Candidate only: rendered prompt and server cache are opaque here.
                        # Attachments have no content comparison, so they never qualify.
                        if not attachments:
                            value['prefix_candidates'] += 1
                    else:
                        value['configuration_changed'] += 1
                _SESSIONS[session] = (shape, attachments)
                if len(_SESSIONS) > _MAX_SESSIONS:
                    _SESSIONS.pop(next(iter(_SESSIONS)))
            value['attachments_present'] += _attachments(payload) if isinstance(payload, dict) else 0
            _write(value, path)
        return True
    except (OSError, TypeError, ValueError, json.JSONDecodeError):
        return False


def summary(path=None):
    """Return only aggregate evidence and its explicit epistemic boundary."""
    path = FILE if path is None else path
    value = _read(path)
    candidates = value['prefix_candidates']
    requests = value['requests_observed']
    return {
        'available': bool(path.is_file()),
        'counters': value,
        'candidate_rate': round(candidates / max(1, value['continuations_observed']), 4),
        'average_routed_payload_bytes': round(value['routed_payload_bytes_total'] / max(1, requests)),
        'scope': (
            'same_session_same_system_and_configuration_candidate_only; '
            'no_message_content_or_identifiers_stored; '
            'not_a_backend_cache_hit_measurement'
        ),
        'limits': [
            'Un candidat ne prouve ni préfixe rendu identique, ni lecture du cache KV.',
            'Les tailles sont celles des corps JSON routés ; elles ne sont ni des tokens ni une mesure de contexte réellement traité.',
            'Les sessions et contenus ne sont conservés ni retournés ; un redémarrage oublie les comparaisons en mémoire.',
        ],
    }
