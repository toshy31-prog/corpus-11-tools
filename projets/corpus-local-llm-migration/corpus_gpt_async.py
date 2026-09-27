"""Persistent asynchronous execution for registered Corpus GPT jobs."""
from __future__ import annotations

import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import uuid

TOKEN_RE = re.compile(r"^[a-f0-9]{16}$")


def _root(bb) -> Path:
    return Path(bb) / "async-jobs"


def _state_path(bb, token: str) -> Path:
    return _root(bb) / f"{token}.json"


def _result_path(bb, token: str) -> Path:
    return _root(bb) / f"{token}.result.json"


def _log_path(bb, token: str) -> Path:
    return _root(bb) / f"{token}.log"


def _atomic_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, raw = tempfile.mkstemp(prefix=".async-state-", dir=str(path.parent))
    os.close(fd)
    tmp = Path(raw)
    try:
        tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
        tmp.replace(path)
    finally:
        if tmp.exists():
            tmp.unlink()


def _pid_alive(pid) -> bool:
    if type(pid) is not int or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except (ProcessLookupError, PermissionError):
        return False
    return True


def read_state(bb, token: str) -> dict | None:
    if not isinstance(token, str) or not TOKEN_RE.fullmatch(token):
        return None
    path = _state_path(bb, token)
    if not path.is_file():
        return None
    try:
        value = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def refresh_state(bb, value: dict) -> dict:
    value = dict(value)
    token = value.get("token")
    if value.get("status") not in {"starting", "running"}:
        return value

    if isinstance(token, str):
        result_path = _result_path(bb, token)
        if result_path.is_file():
            try:
                final = json.loads(result_path.read_text())
            except (OSError, json.JSONDecodeError):
                final = None
            if isinstance(final, dict):
                value.update(final)
                _atomic_json(_state_path(bb, token), value)
                return value

    unit = value.get("unit")
    if isinstance(unit, str) and unit:
        proc = subprocess.run(
            ["systemctl", "--user", "show", unit, "-p", "ActiveState", "--value"],
            text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            check=False, timeout=5,
        )
        if proc.returncode == 0 and proc.stdout.strip() in {"activating", "active", "deactivating"}:
            return value

    if _pid_alive(value.get("pid")):
        return value

    value["status"] = "unknown_after_process_exit"
    value["completion_known"] = False
    value["updated_at_unix"] = time.time()
    if isinstance(token, str) and TOKEN_RE.fullmatch(token):
        _atomic_json(_state_path(bb, token), value)
    return value


def recent_states(bb, limit: int = 20) -> list[dict]:
    root = _root(bb)
    if not root.is_dir():
        return []
    rows = []
    paths = [
        path for path in root.glob("*.json")
        if not path.name.endswith(".result.json")
    ]
    for path in sorted(paths, key=lambda item: item.stat().st_mtime, reverse=True):
        try:
            value = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(value, dict):
            rows.append(refresh_state(bb, value))
        if len(rows) >= limit:
            break
    return rows


def _child_env(entry: Path, bb: Path) -> dict[str, str]:
    env = os.environ.copy()
    env["CORPUS_GPT_BIN"] = str(entry)
    env["CORPUS_BB_RUNNER_ROOT"] = str(bb)
    env["CORPUS_BB_SKIP_GPT"] = "1"
    return env


def start_job(job: str, *, allowed_jobs: list[str], entry, bb, repo) -> dict:
    if not isinstance(job, str) or job not in allowed_jobs:
        raise ValueError("job non enregistré")

    bb = Path(bb)
    entry = Path(entry)
    repo = Path(repo)

    for state in recent_states(bb, 100):
        if state.get("job") == job and state.get("status") in {"starting", "running"}:
            return {
                "started": False,
                "existing": True,
                "token": state.get("token"),
                "job": job,
                "pid": state.get("pid"),
                "status": state.get("status"),
            }

    token = uuid.uuid4().hex[:16]
    state = {
        "schema_version": 1,
        "token": token,
        "job": job,
        "status": "starting",
        "completion_known": False,
        "created_at_unix": time.time(),
        "updated_at_unix": time.time(),
        "pid": None,
        "log": str(_log_path(bb, token)),
    }
    _atomic_json(_state_path(bb, token), state)

    unit = "corpus-gpt-async-" + token + ".service"
    command = [
        "systemd-run", "--user", "--unit", unit, "--collect", "--quiet",
        "--working-directory", str(repo),
        "--setenv", "CORPUS_GPT_BIN=" + str(entry),
        "--setenv", "CORPUS_BB_RUNNER_ROOT=" + str(bb),
        "--setenv", "CORPUS_BB_SKIP_GPT=1",
        sys.executable,
        str(Path(__file__).resolve()),
        "--worker", token, job, str(entry), str(bb), str(repo),
    ]
    launched = subprocess.run(
        command, cwd=str(repo), text=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        check=False, timeout=15,
    )
    if launched.returncode != 0:
        state["status"] = "launch_failed"
        state["completion_known"] = True
        state["exit_code"] = launched.returncode
        state["launch_output"] = (launched.stdout or "").strip()
        state["updated_at_unix"] = time.time()
        _atomic_json(_state_path(bb, token), state)
        raise RuntimeError("lancement systemd async refusé: " + state["launch_output"])

    pid_proc = subprocess.run(
        ["systemctl", "--user", "show", unit, "-p", "MainPID", "--value"],
        text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        check=False, timeout=5,
    )
    try:
        pid = int(pid_proc.stdout.strip()) if pid_proc.returncode == 0 else 0
    except ValueError:
        pid = 0
    state["pid"] = pid or None
    state["unit"] = unit
    state["status"] = "running"
    state["updated_at_unix"] = time.time()
    _atomic_json(_state_path(bb, token), state)
    return {
        "started": True,
        "existing": False,
        "token": token,
        "job": job,
        "pid": state["pid"],
        "unit": unit,
        "status": "running",
    }


def job_status(token: str, *, bb, tail_lines: int = 120) -> dict:
    state = read_state(bb, token)
    if state is None:
        raise ValueError("token async inconnu")
    state = refresh_state(bb, state)
    log = _log_path(bb, token)
    if log.is_file():
        try:
            lines = log.read_text(errors="replace").splitlines()
        except OSError:
            lines = []
        if lines:
            state = dict(state)
            state["output_tail"] = "\n".join(lines[-max(1, tail_lines):])
    return state


def worker(token: str, job: str, entry, bb, repo) -> int:
    bb = Path(bb)
    entry = Path(entry)
    repo = Path(repo)
    state = read_state(bb, token)
    if state is None or state.get("job") != job:
        return 2

    started = time.time()
    try:
        proc = subprocess.run(
            [str(entry), "run", job],
            cwd=str(repo),
            env=_child_env(entry, bb),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        code = proc.returncode
        output = proc.stdout or ""
    except Exception as exc:
        code = 125
        output = "ASYNC_WORKER_EXCEPTION=" + repr(exc) + "\n"

    _log_path(bb, token).write_text(output)
    final = {
        "status": "completed",
        "completion_known": True,
        "exit_code": code,
        "started_at_unix": started,
        "completed_at_unix": time.time(),
        "updated_at_unix": time.time(),
    }
    _atomic_json(_result_path(bb, token), final)
    state.update(final)
    _atomic_json(_state_path(bb, token), state)
    return code


def main(argv: list[str]) -> int:
    if len(argv) == 7 and argv[1] == "--worker":
        return worker(argv[2], argv[3], argv[4], argv[5], argv[6])
    raise SystemExit("usage interne uniquement")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
