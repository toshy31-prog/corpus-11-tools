"""Persistent asynchronous execution for registered Corpus GPT jobs."""
from __future__ import annotations

import fcntl
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
CAUSAL_SCALAR_KEYS = ("decision_ref", "authorization_ref", "parent_ref")
CAUSAL_LIST_KEYS = ("evidence_refs", "verification_refs")


def normalize_causal_refs(value, *, allow_verification=True) -> dict:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError("causal_refs invalide")
    unknown = sorted(set(value) - set(CAUSAL_SCALAR_KEYS) - set(CAUSAL_LIST_KEYS))
    if unknown:
        raise ValueError("causal_refs inconnues: " + ",".join(unknown))
    if not allow_verification and "verification_refs" in value:
        raise ValueError("verification_refs sont produites par l'exécution, pas fournies au lancement")
    out = {}
    for key in CAUSAL_SCALAR_KEYS:
        if key not in value:
            continue
        ref = value[key]
        if not isinstance(ref, str) or not ref.strip() or len(ref) > 500:
            raise ValueError(key + " invalide")
        out[key] = ref.strip()
    for key in CAUSAL_LIST_KEYS:
        if key not in value:
            continue
        refs = value[key]
        if not isinstance(refs, list) or len(refs) > 100:
            raise ValueError(key + " invalide")
        cleaned = []
        for ref in refs:
            if not isinstance(ref, str) or not ref.strip() or len(ref) > 500:
                raise ValueError(key + " invalide")
            cleaned.append(ref.strip())
        out[key] = sorted(set(cleaned))
    return out


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

    value["previous_status"] = value.get("status", "unknown")
    value["status"] = "unknown_after_process_exit"
    value["completion_known"] = False
    value["termination_reason"] = "unknown"
    value["termination_source"] = "unknown"
    value["termination_mechanism"] = "unknown"
    value["updated_at_unix"] = time.time()
    if isinstance(token, str) and TOKEN_RE.fullmatch(token):
        _atomic_json(_state_path(bb, token), value)
    return value


def find_states_by_causal_ref(bb, ref: str, limit: int = 20) -> list[dict]:
    if not isinstance(ref, str) or not ref.strip() or len(ref) > 500:
        raise ValueError("causal ref invalide")
    if type(limit) is not int or limit < 1 or limit > 200:
        raise ValueError("limit causal invalide")
    needle = ref.strip()
    root = _root(bb)
    rows = []
    if not root.is_dir():
        return rows
    paths = sorted(
        (path for path in root.glob("*.json") if not path.name.endswith(".result.json")),
        key=lambda path: path.name,
    )
    for path in paths:
        try:
            state = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(state, dict):
            continue
        refs = normalize_causal_refs(state.get("causal_refs"))
        values = [refs.get(key) for key in CAUSAL_SCALAR_KEYS]
        values += [item for key in CAUSAL_LIST_KEYS for item in refs.get(key, [])]
        if needle in values:
            rows.append(state)
    rows.sort(key=lambda state: (float(state.get("created_at_unix", 0.0)), str(state.get("token", ""))))
    return [refresh_state(bb, state) for state in rows[:limit]]


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


def _child_env(entry: Path, bb: Path, job_kind="browser") -> dict[str, str]:
    env = os.environ.copy()
    env["CORPUS_GPT_BIN"] = str(entry)
    env["CORPUS_BB_RUNNER_ROOT"] = str(bb)
    env["CORPUS_BB_SKIP_GPT"] = "1"
    if job_kind == "local": env["CORPUS_BB_SKIP_INFRA"] = "1"
    return env


def existing_active_job(job: str, *, bb, causal_refs=None) -> dict | None:
    """Return the async-owned idempotence verdict without starting new work."""
    causal_refs = normalize_causal_refs(causal_refs, allow_verification=False)
    for state in recent_states(bb, 100):
        if state.get("job") == job and state.get("status") in {"starting", "waiting_for_runner", "running"}:
            existing_refs = normalize_causal_refs(state.get("causal_refs"))
            if existing_refs != causal_refs:
                raise ValueError("job actif avec causal_refs différents")
            return {
                "started": False,
                "existing": True,
                "token": state.get("token"),
                "job": job,
                "pid": state.get("pid"),
                "status": state.get("status"),
                "causal_refs": existing_refs,
            }
    return None


def start_job(job: str, *, allowed_jobs: list[str], entry, bb, repo, job_kind="browser", visual_target="", causal_refs=None, wait_for_runner=False, runner_lock=None) -> dict:
    if not isinstance(job, str) or job not in allowed_jobs:
        raise ValueError("job non enregistré")
    causal_refs = normalize_causal_refs(causal_refs, allow_verification=False)
    if type(wait_for_runner) is not bool: raise ValueError("wait_for_runner invalide")

    bb = Path(bb)
    entry = Path(entry)
    repo = Path(repo)

    existing = existing_active_job(job, bb=bb, causal_refs=causal_refs)
    if existing is not None:
        return existing

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
        "job_kind": job_kind,
        "visual_target": visual_target if job_kind in {"browser-visible", "browser-hybrid"} else "",
        "wait_for_runner": wait_for_runner,
    }
    if wait_for_runner:
        state["runner_lock"] = str(Path(runner_lock) if runner_lock is not None else bb / "state" / "runner-v2.lock")
        state["resource_wait"] = "runner"
    if causal_refs:
        state["causal_refs"] = causal_refs
    _atomic_json(_state_path(bb, token), state)

    unit = "corpus-gpt-async-" + token + ".service"
    command = [
        "systemd-run", "--user", "--unit", unit, "--collect", "--quiet",
        "--working-directory", str(repo),
        "--setenv", "CORPUS_GPT_BIN=" + str(entry),
        "--setenv", "CORPUS_BB_RUNNER_ROOT=" + str(bb),
        "--setenv", "CORPUS_BB_SKIP_GPT=1",
        *(["--setenv", "CORPUS_BB_SKIP_INFRA=1"] if job_kind in {"local", "browser-headless"} else []),
        *(["--setenv", "CORPUS_BB_VISUAL_TARGET=" + visual_target] if job_kind in {"browser-visible", "browser-hybrid"} and visual_target else []),
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
    state["status"] = "waiting_for_runner" if wait_for_runner else "running"
    state["updated_at_unix"] = time.time()
    _atomic_json(_state_path(bb, token), state)
    return {
        "started": True,
        "existing": False,
        "token": token,
        "job": job,
        "pid": state["pid"],
        "unit": unit,
        "status": state["status"],
        "causal_refs": causal_refs,
    }


def cancel_job(token: str, *, bb, reason="explicit cancel_job request", source="mcp.cancel_job", actor="requesting_client", mechanism="explicit_cancel") -> dict:
    if not isinstance(token, str) or not TOKEN_RE.fullmatch(token):
        raise ValueError("token async invalide")
    state = read_state(bb, token)
    if state is None:
        raise ValueError("token async inconnu")
    state = refresh_state(bb, state)
    if state.get("status") not in {"starting", "waiting_for_runner", "running"}:
        raise ValueError("job async non actif")
    expected = "corpus-gpt-async-" + token + ".service"
    unit = state.get("unit")
    if unit != expected:
        raise ValueError("unité async incohérente")
    previous_status = state.get("status", "unknown")
    state["previous_status"] = previous_status
    state["status"] = "cancelling"
    state["cancel_reason"] = str(reason or "unknown")
    state["cancel_source"] = str(source or "unknown")
    state["cancel_actor"] = str(actor or "unknown")
    state["cancel_mechanism"] = str(mechanism or "unknown")
    state["cancel_requested_at_unix"] = time.time()
    state["updated_at_unix"] = time.time()
    _atomic_json(_state_path(bb, token), state)
    proc = subprocess.run(["systemctl", "--user", "stop", unit], text=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False, timeout=15)
    if proc.returncode != 0:
        raise RuntimeError("arrêt async refusé: " + (proc.stdout or "").strip())
    state["status"] = "cancelled"
    state["completion_known"] = True
    state["exit_code"] = None
    state["cancel_reason"] = state.get("cancel_reason", "unknown")
    state["cancel_source"] = state.get("cancel_source", "unknown")
    state["cancel_actor"] = state.get("cancel_actor", "unknown")
    state["cancel_mechanism"] = state.get("cancel_mechanism", "unknown")
    state["previous_status"] = state.get("previous_status", "unknown")
    state["cancelled_at_unix"] = time.time()
    log = _log_path(bb, token)
    if log.is_file():
        lines = log.read_text(errors="replace").splitlines()
        if lines:
            state["output_tail"] = "\n".join(lines[-200:])
            state["output_tail_persisted"] = True
    state["updated_at_unix"] = time.time()
    _atomic_json(_state_path(bb, token), state)
    return state


def job_status(token: str, *, bb, tail_lines: int = 24) -> dict:
    state = read_state(bb, token)
    if state is None:
        raise ValueError("token async inconnu")
    state = refresh_state(bb, state)
    if state.get("status") == "cancelled":
        state = dict(state)
        state.setdefault("cancel_reason", "unknown")
        state.setdefault("cancel_source", "unknown")
        state.setdefault("cancel_actor", "unknown")
        state.setdefault("cancel_mechanism", "unknown")
        state.setdefault("previous_status", "unknown")
    log = _log_path(bb, token)
    if log.is_file():
        try:
            lines = log.read_text(errors="replace").splitlines()
        except OSError:
            lines = []
        if lines and tail_lines:
            state = dict(state)
            state["output_tail"] = "\n".join(lines[-tail_lines:])
    return state


def worker(token: str, job: str, entry, bb, repo) -> int:
    bb = Path(bb)
    entry = Path(entry)
    repo = Path(repo)
    state = read_state(bb, token)
    if state is None or state.get("job") != job:
        return 2

    started = time.time()
    runner_lock_file = None
    try:
        if state.get("wait_for_runner"):
            lock_path = Path(state.get("runner_lock") or (bb / "state" / "runner-v2.lock"))
            lock_path.parent.mkdir(parents=True, exist_ok=True)
            runner_lock_file = lock_path.open("a+b")
            fcntl.flock(runner_lock_file.fileno(), fcntl.LOCK_EX)
            current = read_state(bb, token) or state
            if current.get("status") in {"cancelling", "cancelled"}: return 0
            state.update(current); state["status"] = "running"; state["runner_acquired_at_unix"] = time.time(); state["updated_at_unix"] = time.time()
            _atomic_json(_state_path(bb, token), state)
        log_path = _log_path(bb, token)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with log_path.open("w", encoding="utf-8", errors="replace") as log:
            proc = subprocess.Popen(
                [str(entry), "run", job],
                cwd=str(repo),
                env={**_child_env(entry, bb), **({"CORPUS_BB_LOCK_HELD_FD": str(runner_lock_file.fileno())} if runner_lock_file is not None else {})},
                pass_fds=((runner_lock_file.fileno(),) if runner_lock_file is not None else ()),
                text=True,
                stdout=log,
                stderr=subprocess.STDOUT,
            )
            code = proc.wait()
    except Exception as exc:
        code = 125
        with _log_path(bb, token).open("a", encoding="utf-8", errors="replace") as log:
            log.write("ASYNC_WORKER_EXCEPTION=" + repr(exc) + "\n")
    finally:
        if runner_lock_file is not None: runner_lock_file.close()
    execution_evidence = {}
    try:
        log_text = _log_path(bb, token).read_text(errors="replace")
    except OSError:
        log_text = ""
    run_ids = re.findall(r"(?m)^RUN_ID=([^\s]+)$", log_text)
    reports = re.findall(r"(?m)^REPORT=(.+)$", log_text)
    verification_refs = sorted(set(re.findall(r"(?m)^VERIFICATION_REF=(.+)$", log_text)))
    if run_ids:
        # The runner emits its own RUN_ID before the managed job can write stdout.
        execution_evidence["run_id"] = run_ids[0].strip()
        execution_evidence["run_id_source"] = "runner_stdout_prefix"
    if reports:
        # The runner emits REPORT only after the managed job has completed.
        execution_evidence["report_ref"] = reports[-1].strip()
        execution_evidence["report_ref_source"] = "runner_stdout_suffix"
    if verification_refs:
        refs = normalize_causal_refs(state.get("causal_refs"))
        refs["verification_refs"] = sorted({x.strip() for x in verification_refs if x.strip()})
        state["causal_refs"] = refs
        execution_evidence["verification_ref_source"] = "managed_job_stdout"
    final = {
        "status": "completed",
        "completion_known": True,
        "exit_code": code,
        "started_at_unix": started,
        "completed_at_unix": time.time(),
        "updated_at_unix": time.time(),
    }
    if execution_evidence:
        final["execution_evidence"] = execution_evidence
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
