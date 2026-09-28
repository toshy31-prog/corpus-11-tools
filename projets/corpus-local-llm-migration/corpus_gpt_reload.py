"""Content-hash guarded reload of the Corpus GPT tunnel after MCP source changes."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from typing import Callable
import sys

from corpus_paths import STATE_ROOT

HERE = Path(__file__).resolve().parent
SOURCES = (
    HERE / "corpus_gpt_mcp.py",
    HERE / "corpus_gpt_async.py",
    HERE / "blocker_resilience.py",
    HERE / "corpus_gpt_reload.py",
    HERE / "capability_handoff.py",
    HERE / "context_algebra.py",
)
STATE_PATH = STATE_ROOT / "corpus-gpt" / "source-reload.json"


def source_digest(paths=SOURCES) -> str:
    h = hashlib.sha256()
    for path in paths:
        path = Path(path)
        h.update(str(path.name).encode())
        h.update(b"\0")
        if path.is_file():
            h.update(path.read_bytes())
        else:
            h.update(b"<missing>")
        h.update(b"\0")
    return h.hexdigest()


def read_state(path=STATE_PATH) -> dict:
    path = Path(path)
    if not path.is_file():
        return {}
    try:
        value = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def write_state(value: dict, path=STATE_PATH) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, raw = tempfile.mkstemp(prefix=".corpus-gpt-reload-", dir=str(path.parent))
    os.close(fd)
    tmp = Path(raw)
    try:
        tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
        tmp.replace(path)
    finally:
        if tmp.exists():
            tmp.unlink()


def prime(path=STATE_PATH, sources=SOURCES) -> dict:
    current = source_digest(sources)
    previous = read_state(path)
    loaded = previous.get("loaded_digest", previous.get("digest"))
    value = {"schema_version": 2, "source_digest": current,
             "validated_digest": previous.get("validated_digest"),
             "reload_requested_digest": previous.get("reload_requested_digest"),
             "loaded_digest": loaded if loaded is not None else current}
    write_state(value, path)
    return value


def confirm_loaded_runtime(path=STATE_PATH, sources=SOURCES) -> dict:
    current=source_digest(sources); state=read_state(path)
    requested=state.get("reload_requested_digest"); validated=state.get("validated_digest")
    if requested == current and validated == current:
        state.update({"schema_version":2,"source_digest":current,"loaded_digest":current})
        write_state(state,path)
        return {"confirmed":True,"loaded_digest":current}
    return {"confirmed":False,"loaded_digest":state.get("loaded_digest",state.get("digest")),
            "source_digest":current,"reason":"requested_or_validated_digest_mismatch"}

def validate_sources(runner: Callable = subprocess.run) -> dict:
    commands = [
        [sys.executable, "-m", "py_compile", *[str(p) for p in SOURCES]],
        [sys.executable, "-m", "unittest", "-q", "test_corpus_gpt_reload.py", "test_capability_handoff.py"],
    ]
    outputs=[]
    for cmd in commands:
        proc=runner(cmd,cwd=HERE,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=False,timeout=60)
        outputs.append((proc.stdout or "").strip())
        if proc.returncode != 0:
            return {"ok":False,"returncode":proc.returncode,"output":"\n".join(outputs)}
    return {"ok":True,"returncode":0,"output":"\n".join(outputs)}

def reload_if_changed(
    *,
    path=STATE_PATH,
    sources=SOURCES,
    runner: Callable = subprocess.run,
    validator: Callable = validate_sources,
) -> dict:
    current = source_digest(sources)
    state = read_state(path)
    previous = state.get("loaded_digest", state.get("digest"))
    if previous == current:
        return {
            "changed": False,
            "restarted": False,
            "source_digest": current,
            "loaded_digest": previous,
            "reason": "source_unchanged",
        }

    validation = validator()
    if not validation.get("ok"):
        write_state({"schema_version": 2, "source_digest": current,
                     "validated_digest": state.get("validated_digest"),
                     "reload_requested_digest": state.get("reload_requested_digest"),
                     "loaded_digest": previous}, path)
        return {"changed":True,"restarted":False,"source_digest":current,
                "loaded_digest":previous,"reason":"validation_failed",
                "validation":validation}
    write_state({"schema_version": 2, "source_digest": current,
                 "validated_digest": current,
                 "reload_requested_digest": current, "loaded_digest": previous}, path)
    proc = runner(
        ["systemctl", "--user", "restart", "corpus-gpt-tunnel.service"],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
        timeout=30,
    )
    after = read_state(path)
    return {
        "changed": True,
        "restart_requested": True,
        "restarted": proc.returncode == 0,
        "source_digest": current,
        "validated_digest": current,
        "reload_requested_digest": current,
        "loaded_digest": after.get("loaded_digest", previous),
        "load_confirmed": after.get("loaded_digest") == current,
        "returncode": proc.returncode,
        "output": (proc.stdout or "").strip(),
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("prime")
    sub.add_parser("status")
    sub.add_parser("reload")
    args = parser.parse_args(argv)

    if args.command == "prime":
        value = prime()
        print(json.dumps({"primed": True, **value}, ensure_ascii=False))
        return 0
    if args.command == "status":
        current = source_digest()
        state = read_state()
        previous = state.get("loaded_digest", state.get("digest"))
        print(json.dumps({
            "current_digest": current, "source_digest": current,
            "validated_digest": state.get("validated_digest"),
            "reload_requested_digest": state.get("reload_requested_digest"),
            "loaded_digest": previous,
            "reload_needed": current != previous,
        }, ensure_ascii=False, indent=2))
        return 0

    value = reload_if_changed()
    print(json.dumps(value, ensure_ascii=False, indent=2))
    return 0 if value["restarted"] or not value["changed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
