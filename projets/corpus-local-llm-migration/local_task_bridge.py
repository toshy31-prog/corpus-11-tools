"""Thin bounded task bridge to the existing local OpenCode/Corpus session API.

No task identity, memory, scheduler, model router or receipt store is introduced.
The durable identity is the OpenCode session id already owned by OpenCode.
"""
from __future__ import annotations

import time

from durable_e2e import local_request

MODEL = {
    "providerID": "corpus-local",
    "modelID": "qwen3.6-35b-a3b-ud-q4-k-m",
}


def _texts(parts):
    return [
        str(part.get("text"))
        for part in parts or []
        if isinstance(part, dict)
        and part.get("type") == "text"
        and not part.get("synthetic")
        and part.get("text")
    ]


def _tool_call(part):
    state = part.get("state") if isinstance(part, dict) else None
    state = state if isinstance(state, dict) else {}
    output = state.get("output")
    if output is None and isinstance(state.get("metadata"), dict):
        output = state["metadata"].get("output")
    return {
        "tool": str(part.get("tool") or ""),
        "status": str(state.get("status") or ""),
        "output": str(output)[:1200] if output is not None else "",
    }


def _turn(messages, before_ids):
    if not isinstance(messages, list):
        return None
    users = [
        row for row in messages
        if isinstance(row, dict)
        and isinstance(row.get("info"), dict)
        and row["info"].get("role") == "user"
        and row["info"].get("id") not in before_ids
    ]
    if not users:
        return None
    user = users[-1]
    user_id = user["info"].get("id")
    assistants = [
        row for row in messages
        if isinstance(row, dict)
        and isinstance(row.get("info"), dict)
        and row["info"].get("role") == "assistant"
        and row["info"].get("parentID") == user_id
    ]
    if not assistants:
        return {"user_id": user_id, "complete": False, "text": "", "tool_calls": [], "error": None}

    text = "\n".join(
        value
        for row in assistants
        for value in _texts(row.get("parts"))
    ).strip()
    tools = [
        _tool_call(part)
        for row in assistants
        for part in row.get("parts", [])
        if isinstance(part, dict) and part.get("type") == "tool"
    ]
    last_info = assistants[-1].get("info") or {}
    error = last_info.get("error")
    finish = last_info.get("finish")
    completed = bool((last_info.get("time") or {}).get("completed")) and finish in {"stop", "end_turn"} and not error
    return {
        "user_id": user_id,
        "complete": completed,
        "text": text,
        "tool_calls": tools[:100],
        "error": error,
    }


def _classify_exception(exc):
    message = str(exc)
    lower = message.lower()
    if "http 503" in lower:
        return "model_or_backend_loading"
    if "timed out" in lower or "timeout" in lower:
        return "task_timeout"
    if "connection" in lower or "connexion" in lower or "refused" in lower:
        return "local_service_unavailable"
    return "transport_error"


def _message(objective, context_refs, constraints, *, agent, tool_scope=None):
    if not isinstance(objective, str) or not objective.strip() or len(objective) > 12000:
        raise ValueError("objective invalide")
    refs = [] if context_refs is None else context_refs
    cons = [] if constraints is None else constraints
    if not isinstance(refs, list) or not all(isinstance(x, str) and 0 < len(x) <= 500 for x in refs):
        raise ValueError("context_refs invalides")
    if not isinstance(cons, list) or not all(isinstance(x, str) and 0 < len(x) <= 1000 for x in cons):
        raise ValueError("constraints invalides")
    if agent not in {"corpus", "corpus-plan"}:
        raise ValueError("agent invalide")
    if tool_scope is not None:
        if (not isinstance(tool_scope, dict) or len(tool_scope) > 100
                or not all(isinstance(k, str) and 0 < len(k) <= 200 and type(v) is bool
                           for k, v in tool_scope.items())):
            raise ValueError("tool_scope invalide")

    parts = [{"type": "text", "text": objective.strip()}]
    if refs:
        parts.insert(0, {
            "type": "text",
            "synthetic": True,
            "text": "Références de contexte opaques utiles :\n" + "\n".join("- " + x for x in refs),
        })
    system = "Tâche déléguée bornée depuis GPT. N'élargis pas le périmètre."
    if cons:
        system += "\nContraintes :\n" + "\n".join("- " + x for x in cons)
    message = {
        "agent": agent,
        "model": dict(MODEL),
        "variant": "direct",
        "system": system,
        "parts": parts,
    }
    if tool_scope is not None:
        message["tools"] = dict(tool_scope)
    return message


def submit_local_task(
    *,
    objective,
    directory,
    context_refs=None,
    constraints=None,
    session_id=None,
    title="Tâche locale bornée",
    agent="corpus",
    tool_scope=None,
    base_url="http://127.0.0.1:18743",
    deadline=240,
    poll_delay=0.5,
    request=None,
    clock=time.monotonic,
    sleep=time.sleep,
):
    """Submit one turn to an existing OpenCode session or create one.

    The result is compact by construction: no conversation history is copied.
    """
    if not isinstance(directory, str) or not directory:
        raise ValueError("directory requis")
    if session_id is not None and (not isinstance(session_id, str) or not session_id):
        raise ValueError("session_id invalide")
    if not isinstance(deadline, (int, float)) or deadline <= 0 or deadline > 3600:
        raise ValueError("deadline invalide")
    payload = _message(objective, context_refs, constraints, agent=agent, tool_scope=tool_scope)
    if request is None:
        request = local_request(base_url)

    started = clock()
    created = session_id is None
    try:
        if created:
            session = request("POST", "/session", {"title": title}, directory)
            session_id = session.get("id") if isinstance(session, dict) else None
            if not isinstance(session_id, str) or not session_id:
                return {"status": "error", "error": "invalid_session", "session_id": None}
        else:
            request("GET", "/session/" + session_id, None, directory)

        before = request("GET", "/session/" + session_id + "/message", None, directory)
        before_ids = {
            row.get("info", {}).get("id")
            for row in before if isinstance(row, dict)
        } if isinstance(before, list) else set()

        submit_started = clock()
        request("POST", "/session/" + session_id + "/prompt_async", payload, directory)
        bridge_seconds = max(0.0, clock() - submit_started)
    except Exception as exc:
        return {
            "status": "error",
            "error": _classify_exception(exc),
            "detail": str(exc)[:1000],
            "session_id": session_id,
            "session_created": created,
            "bridge_seconds": max(0.0, clock() - started),
        }

    end = clock() + deadline
    first_useful = None
    latest = None
    while clock() < end:
        try:
            permissions = request("GET", "/permission", None, directory)
            if isinstance(permissions, list):
                pending = [
                    item for item in permissions
                    if isinstance(item, dict) and item.get("sessionID") == session_id
                ]
                if pending:
                    return {
                        "status": "error",
                        "error": "permission_required",
                        "session_id": session_id,
                        "session_created": created,
                        "permissions": [
                            {"id": str(item.get("id") or ""), "permission": str(item.get("permission") or "")}
                            for item in pending[:20]
                        ],
                        "bridge_seconds": bridge_seconds,
                        "first_useful_seconds": first_useful,
                        "total_seconds": max(0.0, clock() - started),
                    }
            messages = request("GET", "/session/" + session_id + "/message", None, directory)
        except Exception as exc:
            latest = {
                "status": "error",
                "error": _classify_exception(exc),
                "detail": str(exc)[:1000],
            }
            sleep(poll_delay)
            continue

        turn = _turn(messages, before_ids)
        if turn is not None:
            latest = turn
            if first_useful is None and (turn["text"] or turn["tool_calls"]):
                first_useful = max(0.0, clock() - submit_started)
            if turn["error"]:
                return {
                    "status": "error",
                    "error": "model_or_tool_error",
                    "detail": str(turn["error"])[:1000],
                    "session_id": session_id,
                    "session_created": created,
                    "summary": turn["text"],
                    "tool_calls": turn["tool_calls"],
                    "bridge_seconds": bridge_seconds,
                    "first_useful_seconds": first_useful,
                    "total_seconds": max(0.0, clock() - started),
                }
            if turn["complete"]:
                return {
                    "status": "completed",
                    "summary": turn["text"],
                    "session_id": session_id,
                    "session_created": created,
                    "tool_calls": turn["tool_calls"],
                    "bridge_seconds": bridge_seconds,
                    "first_useful_seconds": first_useful,
                    "total_seconds": max(0.0, clock() - started),
                }
        sleep(poll_delay)

    try:
        request("POST", "/session/" + session_id + "/abort", {}, directory)
    except Exception:
        pass
    return {
        "status": "error",
        "error": "task_timeout",
        "session_id": session_id,
        "session_created": created,
        "summary": latest.get("text", "") if isinstance(latest, dict) else "",
        "tool_calls": latest.get("tool_calls", []) if isinstance(latest, dict) else [],
        "bridge_seconds": bridge_seconds,
        "first_useful_seconds": first_useful,
        "total_seconds": max(0.0, clock() - started),
    }
