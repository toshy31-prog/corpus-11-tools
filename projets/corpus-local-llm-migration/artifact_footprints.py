"""Passive, post-hoc artifact observability for existing OpenCode sessions.

This module never opens the observed artifact.  It only inspects metadata already
present in an existing OpenCode session and deliberately returns no prompt,
tool input payload, tool output, secret, or reasoning content.
"""
from __future__ import annotations

import re
from pathlib import PurePosixPath

from corpus_paths import REPO_ROOT
from durable_e2e import local_request


_SESSION_ID = re.compile(r"^ses_[A-Za-z0-9_-]{1,96}$")
_DIRECT_READ_TOOLS = {
    "read": "filePath",
    "corpus-tools_document_extract": "path",
}
_MUTATION_TOOLS = {
    "edit": "filePath",
    "write": "filePath",
}
_MAX_MESSAGES = 10_000
_MAX_EVENTS = 200


def _artifact_path(value: str) -> str:
    if not isinstance(value, str) or not value or len(value) > 500:
        raise ValueError("artifact_path invalide")
    if "\\" in value:
        raise ValueError("artifact_path non canonique")
    path = PurePosixPath(value)
    parts = path.parts
    if path.is_absolute() or not parts or value != path.as_posix():
        raise ValueError("artifact_path doit être relatif et canonique")
    if any(part in {"", ".", ".."} for part in parts) or parts[0] == ".git":
        raise ValueError("artifact_path hors contrat")
    return path.as_posix()


def _matches_target(value, *, relative: str, absolute: str) -> bool:
    if not isinstance(value, str) or not value:
        return False
    if value == relative or value == absolute:
        return True
    if value.startswith("./"):
        try:
            return PurePosixPath(value).as_posix() == relative
        except (TypeError, ValueError):
            return False
    return False


def _timestamp(info, state):
    for source in (
        state.get("time") if isinstance(state, dict) else None,
        info.get("time") if isinstance(info, dict) else None,
    ):
        if isinstance(source, dict):
            for key in ("end", "completed", "start", "created"):
                value = source.get(key)
                if isinstance(value, (int, float)):
                    return value
    return None


def _text_exposes_target(parts, *, relative: str, absolute: str) -> bool:
    for part in parts or []:
        if not isinstance(part, dict) or part.get("type") != "text":
            continue
        text = part.get("text")
        if not isinstance(text, str):
            continue
        if relative in text or absolute in text:
            return True
    return False


def analyze_messages(messages, *, session_id: str, artifact_path: str) -> dict:
    if not isinstance(session_id, str) or not _SESSION_ID.fullmatch(session_id):
        raise ValueError("session_id invalide")
    relative = _artifact_path(artifact_path)
    absolute = (REPO_ROOT / relative).as_posix()
    if not isinstance(messages, list) or len(messages) > _MAX_MESSAGES:
        raise ValueError("messages de session invalides ou trop volumineux")

    events = []
    exposure_seen = False
    exposure_before_first_read = False
    discovery_index = None
    participation = False
    terminal = False

    for row_index, row in enumerate(messages):
        if not isinstance(row, dict):
            continue
        info = row.get("info")
        info = info if isinstance(info, dict) else {}
        role = info.get("role")
        parts = row.get("parts")
        parts = parts if isinstance(parts, list) else []

        if role == "user" and _text_exposes_target(parts, relative=relative, absolute=absolute):
            exposure_seen = True
            if len(events) < _MAX_EVENTS:
                events.append({
                    "kind": "artifact_reference_observed",
                    "artifact": relative,
                    "surface": "opencode_user_message",
                    "session_id": session_id,
                    "message_id": str(info.get("id") or ""),
                    "timestamp": _timestamp(info, {}),
                })

        if role != "assistant":
            continue

        finish = info.get("finish")
        if (info.get("time") or {}).get("completed") and finish in {"stop", "end_turn"} and not info.get("error"):
            terminal = True

        for part in parts:
            if not isinstance(part, dict) or part.get("type") != "tool":
                continue
            tool = str(part.get("tool") or "")
            state = part.get("state")
            state = state if isinstance(state, dict) else {}
            inputs = state.get("input")
            inputs = inputs if isinstance(inputs, dict) else {}
            status = str(state.get("status") or "")
            field = _DIRECT_READ_TOOLS.get(tool)
            operation = "read"
            if field is None:
                field = _MUTATION_TOOLS.get(tool)
                operation = "mutation"
            if field is None or not _matches_target(
                inputs.get(field), relative=relative, absolute=absolute
            ):
                continue

            completed = status == "completed"
            if operation == "read" and completed:
                if discovery_index is None:
                    discovery_index = row_index
                    exposure_before_first_read = exposure_seen
                kind = "artifact_access_observed"
            elif operation == "mutation" and completed:
                kind = "artifact_mutation_observed"
                if discovery_index is not None and row_index >= discovery_index:
                    participation = True
            else:
                kind = "artifact_tool_attempt_observed"

            if len(events) < _MAX_EVENTS:
                events.append({
                    "kind": kind,
                    "artifact": relative,
                    "surface": "opencode_tool",
                    "session_id": session_id,
                    "message_id": str(info.get("id") or ""),
                    "call_id": str(part.get("callID") or ""),
                    "tool": tool,
                    "status": status,
                    "timestamp": _timestamp(info, state),
                })

    discovery_attested = discovery_index is not None
    if discovery_attested and exposure_before_first_read:
        provenance = "EXPOSED"
        basis = "exact artifact reference observed earlier in this session"
    elif discovery_attested:
        provenance = "INDETERMINATE"
        basis = "no prior exposure observed on covered session surfaces"
    else:
        provenance = "INDETERMINATE"
        basis = "no covered completed direct read was observed"

    return {
        "schema_version": 1,
        "kind": "artifact_footprints_observation",
        "artifact": relative,
        "session_id": session_id,
        "raw_events": events,
        "attribution": {
            "surface": "opencode_session",
            "session_id": session_id,
            "agent_identity": "unknown",
            "session_terminal_observed": terminal,
        },
        "provenance": {
            "classification": provenance,
            "basis": basis,
            "spontaneous_candidate": bool(discovery_attested and not exposure_before_first_read),
            "spontaneous_attested": False,
            "seed_status": "not_derived",
        },
        "interpretation": {
            "discovery": "DISCOVERY_ATTESTED" if discovery_attested else "NOT_ATTESTED",
            "read_silent": "NOT_ESTABLISHED",
            "participation": "PARTICIPATION" if participation else "NOT_ATTESTED",
        },
        "coverage": {
            "mode": "post_hoc_existing_opencode_session",
            "exact_path_read_tools": sorted(_DIRECT_READ_TOOLS),
            "exact_path_mutation_tools": sorted(_MUTATION_TOOLS),
            "not_observable": [
                "bash_internal_file_reads",
                "delegated_subagent_child_reads",
                "registered_job_internal_reads",
                "external_editor_or_shell_reads",
                "browser_reads_without_canonical_artifact_mapping",
                "deleted_or_unavailable_session_history",
            ],
            "observer_reads_target_content": False,
            "observer_writes_session_or_target": False,
        },
        "limits": [
            "absence of an observed event is not proof of absence",
            "SPONTANEOUS is never auto-attested by this v1 surface",
            "READ_SILENT is not established",
            "path matching is lexical and intentionally does not follow symlinks",
            "tool outputs, prompts, secrets and reasoning are not returned",
        ],
    }


def observe_session(
    *,
    session_id: str,
    artifact_path: str,
    base_url: str = "http://127.0.0.1:18743",
    request=None,
) -> dict:
    if not isinstance(session_id, str) or not _SESSION_ID.fullmatch(session_id):
        raise ValueError("session_id invalide")
    relative = _artifact_path(artifact_path)
    request = local_request(base_url) if request is None else request
    directory = str(REPO_ROOT)

    # GET only: do not resume, prompt, abort, or otherwise modify the observed session.
    session = request("GET", "/session/" + session_id, None, directory)
    if not isinstance(session, dict):
        raise ValueError("session OpenCode introuvable ou invalide")
    messages = request("GET", "/session/" + session_id + "/message", None, directory)
    return analyze_messages(messages, session_id=session_id, artifact_path=relative)
