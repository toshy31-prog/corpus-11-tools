#!/usr/bin/env python3
"""Minimal stdio MCP bridge for the safe observation subset of Corpus Runtime."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from corpus_runtime import ROOT, load_registry, run_step, workspace  # noqa: E402


TOOLS = [
    {
        "name": "corpus_runtime_list_capabilities",
        "description": "List declared local capabilities and their directly observed executable presence.",
        "inputSchema": {"type": "object", "additionalProperties": False, "properties": {}},
    },
    {
        "name": "corpus_runtime_observe",
        "description": "Run only a declared read-only capability. It cannot run arbitrary shell commands or write the workspace.",
        "inputSchema": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "capability": {"type": "string", "enum": ["workspace.status", "workspace.search"]},
                "query": {"type": "string"},
                "path": {"type": "string"},
            },
            "required": ["capability"],
        },
    },
    {
        "name": "corpus_runtime_prepare_execution",
        "description": "Describe a declared write-capable operation and its recovery path. It never executes it; the user must explicitly run the local CLI with --approve-execution.",
        "inputSchema": {
            "type": "object", "additionalProperties": False,
            "properties": {"capability": {"type": "string", "enum": ["workspace.verify"]}},
            "required": ["capability"],
        },
    },
]


def response(request_id: Any, result: dict[str, Any]) -> None:
    print(json.dumps({"jsonrpc": "2.0", "id": request_id, "result": result}, ensure_ascii=False), flush=True)


def error(request_id: Any, code: int, message: str) -> None:
    print(json.dumps({"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}), flush=True)


def text_result(data: Any) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": json.dumps(data, ensure_ascii=False, indent=2)}]}


def handle(request: dict[str, Any]) -> None:
    request_id = request.get("id")
    method = request.get("method")
    if method == "notifications/initialized":
        return
    if method == "initialize":
        response(request_id, {"protocolVersion": request.get("params", {}).get("protocolVersion", "2024-11-05"),
                              "capabilities": {"tools": {}},
                              "serverInfo": {"name": "corpus-local-runtime", "version": "0.1.0"}})
        return
    if method == "tools/list":
        response(request_id, {"tools": TOOLS})
        return
    if method != "tools/call":
        error(request_id, -32601, f"Unsupported method: {method}")
        return
    params = request.get("params", {})
    name = params.get("name")
    arguments = params.get("arguments", {})
    registry = load_registry()
    if name == "corpus_runtime_list_capabilities":
        data = []
        for capability in registry.values():
            import shutil
            data.append({"id": capability.id, "kind": capability.kind,
                         "requires_approval": capability.requires_approval,
                         "writes_workspace": capability.writes_workspace,
                         "executable": shutil.which(capability.command[0]) is not None})
        response(request_id, text_result({"capabilities": data}))
        return
    capability_id = arguments.get("capability")
    capability = registry.get(capability_id)
    if capability is None:
        error(request_id, -32602, "Unknown capability")
        return
    if name == "corpus_runtime_prepare_execution":
        if not capability.requires_approval:
            error(request_id, -32602, "This capability is observational and does not need preparation")
            return
        response(request_id, text_result({"capability": capability.id, "command": capability.command,
                                           "requires_user_command": ["python3", "runtime/corpus_runtime.py", "run", capability.id, "--approve-execution"],
                                           "recovery": capability.recovery}))
        return
    if name == "corpus_runtime_observe":
        if capability.kind != "observe" or capability.writes_workspace:
            error(request_id, -32602, "Only declared read-only capabilities can be observed through MCP")
            return
        step_arguments = {key: value for key, value in arguments.items() if key != "capability"}
        try:
            result = run_step(capability, step_arguments, workspace(str(ROOT)), False, None)
        except SystemExit:
            error(request_id, -32602, "Invalid capability arguments")
            return
        response(request_id, text_result(result))
        return
    error(request_id, -32602, "Unknown tool")


for line in sys.stdin:
    try:
        message = json.loads(line)
        handle(message)
    except (json.JSONDecodeError, TypeError) as exc:
        error(None, -32700, f"Invalid JSON-RPC request: {exc}")
    except Exception as exc:  # Keep server protocol alive; do not leak a traceback.
        error(None, -32603, f"Runtime failure: {exc}")
