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

from corpus_paths import STATE_ROOT

HERE = Path(__file__).resolve().parent
SOURCES = (
    HERE / "corpus_gpt_mcp.py",
    HERE / "corpus_gpt_async.py",
    HERE / "blocker_resilience.py",
    HERE / "corpus_gpt_reload.py",
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
    value = {"schema_version": 1, "digest": source_digest(sources)}
    write_state(value, path)
    return value


def reload_if_changed(
    *,
    path=STATE_PATH,
    sources=SOURCES,
    runner: Callable = subprocess.run,
) -> dict:
    current = source_digest(sources)
    previous = read_state(path).get("digest")
    if previous == current:
        return {
            "changed": False,
            "restarted": False,
            "digest": current,
            "reason": "source_unchanged",
        }

    proc = runner(
        ["systemctl", "--user", "restart", "corpus-gpt-tunnel.service"],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
        timeout=30,
    )
    result = {
        "changed": True,
        "restarted": proc.returncode == 0,
        "digest": current,
        "returncode": proc.returncode,
        "output": (proc.stdout or "").strip(),
    }
    if proc.returncode == 0:
        write_state({"schema_version": 1, "digest": current}, path)
    return result


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
        previous = read_state().get("digest")
        print(json.dumps({
            "current_digest": current,
            "loaded_digest": previous,
            "reload_needed": current != previous,
        }, ensure_ascii=False, indent=2))
        return 0

    value = reload_if_changed()
    print(json.dumps(value, ensure_ascii=False, indent=2))
    return 0 if value["restarted"] or not value["changed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
