#!/usr/bin/env python3
"""Bounded local execution runtime for Corpus.

It executes only named capabilities from capabilities.json. It never invokes a
shell, accepts arbitrary commands, retains prompts, or modifies Corpus logic.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = Path(__file__).with_name("capabilities.json")


@dataclass(frozen=True)
class Capability:
    id: str
    kind: str
    command: list[str]
    requires_approval: bool
    writes_workspace: bool
    recovery: str
    required_arguments: tuple[str, ...] = ()
    optional_arguments: tuple[str, ...] = ()


def fail(message: str) -> None:
    print(json.dumps({"ok": False, "error": message}), file=sys.stderr)
    raise SystemExit(2)


def load_registry() -> dict[str, Capability]:
    data = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    if data.get("schema_version") != 1:
        fail("Unsupported capability registry schema.")
    capabilities: dict[str, Capability] = {}
    for item in data.get("capabilities", []):
        capability = Capability(
            id=item["id"], kind=item["kind"], command=item["command"],
            requires_approval=item["requires_approval"],
            writes_workspace=item["writes_workspace"], recovery=item["recovery"],
            required_arguments=tuple(item.get("required_arguments", [])),
            optional_arguments=tuple(item.get("optional_arguments", [])),
        )
        if capability.id in capabilities:
            fail(f"Duplicate capability id: {capability.id}")
        capabilities[capability.id] = capability
    return capabilities


def workspace(path: str | None) -> Path:
    candidate = Path(path).resolve() if path else ROOT
    if not candidate.is_dir():
        fail(f"Workspace is not a directory: {candidate}")
    return candidate


def workspace_relative_path(value: str, workdir: Path) -> str:
    """Return a path that cannot escape the explicitly selected workspace."""
    candidate = (workdir / value).resolve() if not Path(value).is_absolute() else Path(value).resolve()
    try:
        relative = candidate.relative_to(workdir)
    except ValueError:
        fail(f"Path must stay inside the workspace: {value}")
    return str(relative) if str(relative) else "."


def expand_command(capability: Capability, arguments: dict[str, Any], workdir: Path) -> list[str]:
    permitted = set(capability.required_arguments) | set(capability.optional_arguments)
    unknown = set(arguments) - permitted
    if unknown:
        fail(f"Unsupported arguments for {capability.id}: {sorted(unknown)}")
    missing = [name for name in capability.required_arguments if not arguments.get(name)]
    if missing:
        fail(f"Missing arguments for {capability.id}: {missing}")
    values = {"path": ".", **arguments}
    if "path" in capability.optional_arguments or "path" in capability.required_arguments:
        path_value = values["path"]
        if not isinstance(path_value, str) or not path_value:
            fail(f"Invalid path argument for {capability.id}")
        values["path"] = workspace_relative_path(path_value, workdir)
    expanded: list[str] = []
    for token in capability.command:
        if token.startswith("{") and token.endswith("}"):
            value = values.get(token[1:-1])
            if not isinstance(value, str) or not value:
                fail(f"Invalid argument {token} for {capability.id}")
            expanded.append(value)
        else:
            expanded.append(token)
    return expanded


def effective_presence(capability: Capability) -> dict[str, Any]:
    executable = shutil.which(capability.command[0])
    return {
        "id": capability.id,
        "described": True,
        "packaged": REGISTRY_PATH.is_file(),
        "context_accessible": executable is not None,
        "executable_path": executable,
        "verified": False,
    }


def emit_trace(trace_path: Path | None, event: dict[str, Any]) -> None:
    if trace_path is None:
        return
    trace_path.parent.mkdir(parents=True, exist_ok=True)
    with trace_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False, sort_keys=True) + "\n")


def run_step(capability: Capability, arguments: dict[str, Any], workdir: Path,
             approved: bool, trace_path: Path | None) -> dict[str, Any]:
    if capability.requires_approval and not approved:
        fail(f"{capability.id} requires --approve-execution.")
    command = expand_command(capability, arguments, workdir)
    run_id = str(uuid.uuid4())
    started = time.time()
    emit_trace(trace_path, {"event": "started", "run_id": run_id, "capability": capability.id,
                            "command": command, "writes_workspace": capability.writes_workspace,
                            "recovery": capability.recovery, "time": started})
    try:
        completed = subprocess.run(command, cwd=workdir, shell=False, text=True,
                                   capture_output=True, timeout=900, check=False)
        result = {
            "ok": completed.returncode == 0, "run_id": run_id, "capability": capability.id,
            "command": command, "returncode": completed.returncode, "stdout": completed.stdout,
            "stderr": completed.stderr, "recovery": capability.recovery,
        }
    except subprocess.TimeoutExpired as error:
        result = {"ok": False, "run_id": run_id, "capability": capability.id, "command": command,
                  "error": "timeout", "stdout": error.stdout or "", "stderr": error.stderr or "",
                  "recovery": capability.recovery}
    emit_trace(trace_path, {"event": "finished", "time": time.time(), **result})
    return result


def read_plan(path: Path, registry: dict[str, Capability], workdir: Path) -> list[tuple[Capability, dict[str, Any]]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"Plan file not found: {path}")
    except json.JSONDecodeError as error:
        fail(f"Invalid plan JSON: {error.msg}")
    if not isinstance(data, dict):
        fail("A plan must be a JSON object.")
    if set(data) != {"steps"} or not isinstance(data["steps"], list) or not data["steps"]:
        fail("A plan must contain a non-empty steps array and no other fields.")
    steps: list[tuple[Capability, dict[str, Any]]] = []
    for index, step in enumerate(data["steps"]):
        if set(step) - {"capability", "arguments"} or "capability" not in step:
            fail(f"Invalid plan step at index {index}.")
        capability = registry.get(step["capability"])
        if capability is None:
            fail(f"Unknown capability at step {index}: {step['capability']}")
        arguments = step.get("arguments", {})
        if not isinstance(arguments, dict):
            fail(f"Arguments at step {index} must be an object.")
        expand_command(capability, arguments, workdir)
        steps.append((capability, arguments))
    return steps


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", help="Workspace directory; defaults to the repository root.")
    parser.add_argument("--trace", help="Optional JSONL trace path, chosen explicitly by the user.")
    subparsers = parser.add_subparsers(dest="action", required=True)
    subparsers.add_parser("list", help="List declared capabilities and their presence levels.")
    run_parser = subparsers.add_parser("run", help="Run one named capability.")
    run_parser.add_argument("capability")
    run_parser.add_argument("--arguments", default="{}", help="JSON object of named arguments.")
    run_parser.add_argument("--approve-execution", action="store_true")
    plan_parser = subparsers.add_parser("run-plan", help="Run a declared JSON plan, in order.")
    plan_parser.add_argument("plan", type=Path)
    plan_parser.add_argument("--approve-execution", action="store_true")
    inspect_parser = subparsers.add_parser("inspect-plan", help="Show declared steps without executing them.")
    inspect_parser.add_argument("plan", type=Path)
    arguments = parser.parse_args()

    registry = load_registry()
    workdir = workspace(arguments.workspace)
    trace_path = Path(arguments.trace).resolve() if arguments.trace else None
    if arguments.action == "list":
        print(json.dumps({"ok": True, "capabilities": [effective_presence(item) for item in registry.values()]},
                         ensure_ascii=False, indent=2))
        return
    if arguments.action == "run":
        capability = registry.get(arguments.capability)
        if capability is None:
            fail(f"Unknown capability: {arguments.capability}")
        try:
            capability_arguments = json.loads(arguments.arguments)
        except json.JSONDecodeError as error:
            fail(f"Invalid --arguments JSON: {error.msg}")
        if not isinstance(capability_arguments, dict):
            fail("--arguments must be a JSON object.")
        print(json.dumps(run_step(capability, capability_arguments, workdir,
                                  arguments.approve_execution, trace_path), ensure_ascii=False, indent=2))
        return
    steps = read_plan(arguments.plan, registry, workdir)
    if arguments.action == "inspect-plan":
        preview = [{"capability": capability.id,
                    "command": expand_command(capability, step_arguments, workdir),
                    "requires_approval": capability.requires_approval,
                    "writes_workspace": capability.writes_workspace,
                    "recovery": capability.recovery}
                   for capability, step_arguments in steps]
        print(json.dumps({"ok": True, "steps": preview}, ensure_ascii=False, indent=2))
        return
    if any(capability.requires_approval for capability, _ in steps) and not arguments.approve_execution:
        fail("This plan contains write-capable steps and requires --approve-execution before anything runs.")
    results = []
    for capability, step_arguments in steps:
        result = run_step(capability, step_arguments, workdir, arguments.approve_execution, trace_path)
        results.append(result)
        if not result["ok"]:
            break
    print(json.dumps({"ok": all(item["ok"] for item in results), "results": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
