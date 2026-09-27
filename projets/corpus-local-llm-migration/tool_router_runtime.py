#!/usr/bin/env python3
"""
Corpus production tool router runtime.

Runs INSIDE the Corpus sandbox, before OpenCode receives a user message.

Pipeline:
  hard constraints
  -> scope/polarity/effect frames
  -> contextual planner
  -> semantic fallback (existing corpus-embed / corpus-rerank on 18741)
  -> namespace set
  -> complete OpenCode tools bool mask

Production guarantees:
- explicit per-message `tools` supplied by a caller are never overwritten;
- corpus-plan is always zero-tool;
- routing failure is fail-closed (all known tools false);
- logs contain hashes/metadata, not raw user text;
- mode is controlled by CONFIG_ROOT/routing/tool-router-mode:
    off | shadow | enforce
"""

from __future__ import annotations

import hashlib
import json
import math
import threading
import time
import urllib.request
from pathlib import Path

from corpus_paths import CONFIG_ROOT, STATE_ROOT
from tool_catalog_contract import load_contract, load_verified, trusted_tool_names
from tool_policy_receipt import snapshot as policy_snapshot, unverified_snapshot
from tool_router_core import (
    all_constraints,
    contextual_query,
    is_anaphoric,
    operational_effects,
    scope_profile,
    split_plan,
    stage0,
)

HERE = Path(__file__).resolve().parent
CATALOG_PATH = HERE / "tool_router_catalog_v2.json"

MODEL_ROUTER = "http://127.0.0.1:18741"
MODE_FILE = CONFIG_ROOT / "routing/tool-router-mode"
LOG_FILE = STATE_ROOT / "logs/corpus-local/tool-router.jsonl"

FIELDS = [
    "summary",
    "capability",
    "operations",
    "objects",
    "scope",
    "effects",
    "examples",
]

RERANK_INSTRUCTION = (
    "Select the Corpus namespace operationally required to fulfill "
    "this request. Rank a namespace highly only when its capability "
    "must actually be used. If no operation is required, prefer "
    "answer_only. Ignore superficial topical overlap."
)

_catalog = None
_doc_vectors = None
_vector_lock = threading.Lock()
_log_lock = threading.Lock()


def _load_catalog():
    global _catalog
    if _catalog is None:
        # Static tool text is untrusted until it matches the reviewed local
        # contract.  A mismatch is handled by route_opencode_body fail-closed.
        _catalog = load_verified(CATALOG_PATH)
    return _catalog


def mode():
    try:
        value = MODE_FILE.read_text(encoding="utf-8").strip().lower()
    except OSError:
        value = "shadow"

    if value not in {"off", "shadow", "enforce"}:
        return "shadow"

    return value


def _all_tool_names():
    return sorted(_load_catalog()["tools"])


def zero_mask():
    try:
        names = _all_tool_names()
    except Exception:
        # A corrupted catalogue must still produce an explicit no-tool mask in
        # enforcement mode.  Names come only from the independent contract.
        try:
            names = trusted_tool_names(load_contract())
        except Exception:
            # An absent contract cannot safely name tools.  The empty native
            # mask is still safer than allowing the original request through.
            names = []
    return {name: False for name in names}


def _policy_receipt(current_mode, enabled_tools, forbidden=None, source="router"):
    """Expose the routing boundary, never claim later execution approval."""
    return policy_snapshot(
        catalog=_load_catalog(),
        mode=current_mode,
        enabled_tools=enabled_tools,
        forbidden_namespaces=forbidden or [],
        source=source,
    )


def _unverified_policy_receipt(current_mode, error):
    try:
        contract = load_contract()
    except Exception:
        contract = None
    return unverified_snapshot(
        contract=contract,
        mode=current_mode,
        source="router_error",
        error=type(error).__name__,
    )


def mask_for(namespaces):
    cat = _load_catalog()
    selected = set(namespaces)

    mask = zero_mask()

    if not selected:
        return mask

    memory_search = "corpus-retrieval_memory_search"
    if memory_search in mask:
        mask[memory_search] = True

    for namespace in selected:
        if namespace == "answer_only":
            continue

        ns = cat["namespaces"].get(namespace)
        if not ns:
            continue

        for tool_name in ns["tools"]:
            if tool_name in mask:
                mask[tool_name] = True

            for dep in cat["tools"][tool_name].get("dependencies", []):
                if dep in mask:
                    mask[dep] = True

    return mask


def _http(path, payload, timeout=120):
    req = urllib.request.Request(
        MODEL_ROUTER + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )

    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode())


def _cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))

    if not na or not nb:
        return 0.0

    return dot / (na * nb)


def _documents():
    cat = _load_catalog()
    field_docs = {}
    compact_docs = {}

    for name, ns in cat["namespaces"].items():
        fields = ns["retrieval_fields"]

        if name != "answer_only":
            for field in FIELDS:
                value = fields.get(field, "").strip()
                if value:
                    field_docs[(name, field)] = value

        compact_docs[name] = "\n".join([
            f"namespace: {name}",
            f"summary: {fields.get('summary', '')}",
            f"capability: {fields.get('capability', '')}",
            f"operations: {fields.get('operations', '')}",
            f"objects: {fields.get('objects', '')}",
            f"scope: {fields.get('scope', '')}",
            f"effects: {fields.get('effects', '')}",
            f"examples: {fields.get('examples', '')}",
            f"not for: {fields.get('not_for', '')}",
        ])

    return field_docs, compact_docs


def _ensure_doc_vectors():
    global _doc_vectors

    if _doc_vectors is not None:
        return _doc_vectors

    with _vector_lock:
        if _doc_vectors is not None:
            return _doc_vectors

        field_docs, compact_docs = _documents()
        texts = []

        for value in list(field_docs.values()) + list(compact_docs.values()):
            if value not in texts:
                texts.append(value)

        response = _http(
            "/v1/embeddings",
            {
                "model": "corpus-embed",
                "input": texts,
            },
            timeout=180,
        )

        rows = sorted(
            response["data"],
            key=lambda row: row.get("index", 0),
        )

        if len(rows) != len(texts):
            raise RuntimeError("Corpus router embedding cache incomplete")

        cache = {
            text: row["embedding"]
            for text, row in zip(texts, rows)
        }

        _doc_vectors = {
            "field_docs": field_docs,
            "compact_docs": compact_docs,
            "field_vectors": {
                key: cache[text]
                for key, text in field_docs.items()
            },
            "compact_vectors": {
                key: cache[text]
                for key, text in compact_docs.items()
            },
        }

        return _doc_vectors


def _embed_query(query):
    response = _http(
        "/v1/embeddings",
        {
            "model": "corpus-embed",
            "input": query,
        },
        timeout=120,
    )

    rows = response.get("data", [])
    if not rows:
        raise RuntimeError("Corpus router query embedding empty")

    return rows[0]["embedding"]


def _semantic_candidates(query, include_answer_only):
    docs = _ensure_doc_vectors()
    qv = _embed_query(query)
    cat = _load_catalog()

    candidates = [
        name
        for name in cat["namespaces"]
        if name != "answer_only"
    ]

    if include_answer_only:
        candidates.append("answer_only")

    rows = []

    for namespace in candidates:
        if namespace == "answer_only":
            score = _cosine(
                qv,
                docs["compact_vectors"]["answer_only"],
            )
        else:
            values = [
                _cosine(
                    qv,
                    docs["field_vectors"][(namespace, field)],
                )
                for field in FIELDS
                if (namespace, field) in docs["field_vectors"]
            ]

            score = max(values) if values else -1.0

        rows.append((namespace, score))

    return sorted(
        rows,
        key=lambda item: (item[1], item[0]),
        reverse=True,
    )


def _rerank(query, candidates):
    docs = _ensure_doc_vectors()

    response = _http(
        "/v1/rerank",
        {
            "model": "corpus-rerank",
            "query": (
                query
                + "\n<Instruct>: "
                + RERANK_INSTRUCTION
            ),
            "documents": [
                docs["compact_docs"][name]
                for name in candidates
            ],
            "top_n": len(candidates),
        },
        timeout=180,
    )

    ranking = []

    for row in response.get("results", []):
        idx = int(row["index"])

        ranking.append((
            candidates[idx],
            float(row.get("relevance_score", 0.0)),
        ))

    return ranking


def _route_clause(clause, previous_clause=None, previous_namespaces=()):
    decision, reason = stage0(clause)
    forbidden = all_constraints(clause)
    effects = operational_effects(clause)
    scope = scope_profile(clause)

    previous_set = set(previous_namespaces)
    anaphoric = bool(previous_clause and is_anaphoric(clause))

    if anaphoric and "research" in previous_set and not scope["explicit_local_file"]:
        effects.discard("files")
        effects.discard("plugins")

        if decision == "act" and not effects:
            effects.add("research")

    if anaphoric and "ssh" in previous_set and not scope["explicit_local_shell"]:
        effects.discard("shell")

        if decision == "act" and not effects:
            effects.add("ssh")

    deterministic = sorted(effects - forbidden)

    if deterministic:
        return {
            "namespaces": deterministic,
            "source": "deterministic",
            "forbidden": sorted(forbidden),
            "semantic": False,
        }

    if anaphoric and previous_set and decision == "act":
        inherited = sorted(previous_set - forbidden)

        if len(inherited) == 1:
            return {
                "namespaces": inherited,
                "source": "context_inheritance",
                "forbidden": sorted(forbidden),
                "semantic": False,
            }

    if decision == "answer_only":
        return {
            "namespaces": [],
            "source": "answer_only",
            "forbidden": sorted(forbidden),
            "semantic": False,
        }

    include_answer_only = decision == "ambiguous"
    query = contextual_query(previous_clause, clause)

    candidates = [
        name
        for name, _ in _semantic_candidates(
            query,
            include_answer_only,
        )
        if name not in forbidden
    ][:4]

    if scope["public_scope"] and not scope["explicit_local_file"]:
        candidates = [
            name for name in candidates
            if name != "files"
        ]

    if scope["remote_scope"] and not scope["explicit_local_shell"]:
        candidates = [
            name for name in candidates
            if name != "shell"
        ]

    if anaphoric and "research" in previous_set and not scope["explicit_local_file"]:
        candidates = [
            name for name in candidates
            if name not in {"files", "plugins"}
        ]

    if anaphoric and "ssh" in previous_set and not scope["explicit_local_shell"]:
        candidates = [
            name for name in candidates
            if name != "shell"
        ]

    if not candidates:
        return {
            "namespaces": [],
            "source": "semantic_empty",
            "forbidden": sorted(forbidden),
            "semantic": True,
        }

    ranking = [
        row for row in _rerank(query, candidates)
        if row[0] not in forbidden
    ]

    if not ranking:
        return {
            "namespaces": [],
            "source": "rerank_empty",
            "forbidden": sorted(forbidden),
            "semantic": True,
        }

    top = ranking[0][0]

    return {
        "namespaces": [] if top == "answer_only" else [top],
        "source": "semantic_rerank",
        "forbidden": sorted(forbidden),
        "semantic": True,
    }


def route_text(text):
    parts = split_plan(text)
    routed = []
    previous_clause = None
    previous_namespaces = ()

    for part in parts:
        row = _route_clause(
            part,
            previous_clause=previous_clause,
            previous_namespaces=previous_namespaces,
        )

        routed.append(row)
        previous_clause = part

        if row["namespaces"]:
            previous_namespaces = tuple(row["namespaces"])

    selected = sorted({
        namespace
        for row in routed
        for namespace in row["namespaces"]
    })

    forbidden = sorted({
        namespace
        for row in routed
        for namespace in row["forbidden"]
    })

    selected = [
        namespace
        for namespace in selected
        if namespace not in forbidden
    ]

    return {
        "namespaces": selected,
        "forbidden": forbidden,
        "parts": routed,
        "semantic_used": any(row["semantic"] for row in routed),
    }


def _extract_text(body):
    parts = body.get("parts")

    if not isinstance(parts, list):
        return ""

    texts = []

    for part in parts:
        if (
            isinstance(part, dict)
            and part.get("type") == "text"
            and isinstance(part.get("text"), str)
        ):
            texts.append(part["text"])

    return "\n".join(texts).strip()


def _log(event):
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

    raw = (
        json.dumps(
            event,
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n"
    )

    with _log_lock:
        with LOG_FILE.open("a", encoding="utf-8") as handle:
            handle.write(raw)


def route_opencode_body(body_bytes):
    """
    Return (possibly_modified_body_bytes, receipt).

    The function never raises to local_bridge for a user-routing failure:
    enforce mode fails closed.
    """
    started = time.perf_counter()
    current_mode = mode()

    try:
        body = json.loads(body_bytes)

        if not isinstance(body, dict):
            raise ValueError("OpenCode message body is not an object")

        # Respect explicit caller-owned masks.
        if isinstance(body.get("tools"), dict):
            explicit_enabled = sorted(
                name for name, value in body["tools"].items()
                if value is True
            )
            receipt = {
                "event": "bypass_explicit_tools",
                "mode": current_mode,
                "modified": False,
                "enabled_tools": explicit_enabled,
                "enabled_count": len(explicit_enabled),
                "tool_policy": _policy_receipt(
                    current_mode, explicit_enabled, source="caller_supplied_mask"
                ),
            }

            _log({
                **receipt,
                "ts": time.time(),
            })

            return body_bytes, receipt

        # Plan agent must always remain zero-tool.
        if body.get("agent") == "corpus-plan":
            mask = zero_mask()

            if current_mode == "enforce":
                body["tools"] = mask

            receipt = {
                "event": "route",
                "mode": current_mode,
                "agent": "corpus-plan",
                "namespaces": [],
                "enabled_tools": [],
                "modified": current_mode == "enforce",
                "semantic_used": False,
                "tool_policy": _policy_receipt(current_mode, []),
            }

            _log({
                **receipt,
                "ts": time.time(),
                "latency_ms": round(
                    (time.perf_counter() - started) * 1000,
                    3,
                ),
            })

            return (
                json.dumps(
                    body,
                    ensure_ascii=False,
                    separators=(",", ":"),
                ).encode()
                if current_mode == "enforce"
                else body_bytes,
                receipt,
            )

        text = _extract_text(body)
        text_hash = hashlib.sha256(text.encode()).hexdigest()

        if current_mode == "off":
            receipt = {
                "event": "off",
                "mode": current_mode,
                "modified": False,
                "text_sha256": text_hash,
                "text_chars": len(text),
                "tool_policy": _policy_receipt(current_mode, []),
            }

            _log({
                **receipt,
                "ts": time.time(),
            })

            return body_bytes, receipt

        decision = (
            route_text(text)
            if text
            else {
                "namespaces": [],
                "forbidden": [],
                "parts": [],
                "semantic_used": False,
            }
        )

        mask = mask_for(decision["namespaces"])

        enabled = sorted(
            name for name, value in mask.items()
            if value
        )

        if current_mode == "enforce":
            body["tools"] = mask

        receipt = {
            "event": "route",
            "mode": current_mode,
            "agent": body.get("agent"),
            "namespaces": decision["namespaces"],
            "forbidden": decision["forbidden"],
            "enabled_tools": enabled,
            "enabled_count": len(enabled),
            "modified": current_mode == "enforce",
            "semantic_used": decision["semantic_used"],
            "text_sha256": text_hash,
            "text_chars": len(text),
            "latency_ms": round(
                (time.perf_counter() - started) * 1000,
                3,
            ),
            "tool_policy": _policy_receipt(
                current_mode, enabled, decision["forbidden"]
            ),
        }

        _log({
            **receipt,
            "ts": time.time(),
        })

        return (
            json.dumps(
                body,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode()
            if current_mode == "enforce"
            else body_bytes,
            receipt,
        )

    except Exception as exc:
        # Fail closed in enforcement mode.
        try:
            body = json.loads(body_bytes)
        except Exception:
            body = {}

        if not isinstance(body, dict):
            body = {}

        mask = zero_mask()

        if current_mode == "enforce":
            body["tools"] = mask

        receipt = {
            "event": "route_error",
            "mode": current_mode,
            "error": type(exc).__name__,
            "error_message": str(exc)[:500],
            "enabled_tools": [],
            "modified": current_mode == "enforce",
            "latency_ms": round(
                (time.perf_counter() - started) * 1000,
                3,
            ),
            "tool_policy": _unverified_policy_receipt(current_mode, exc),
        }

        _log({
            **receipt,
            "ts": time.time(),
        })

        return (
            json.dumps(
                body,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode()
            if current_mode == "enforce"
            else body_bytes,
            receipt,
        )
