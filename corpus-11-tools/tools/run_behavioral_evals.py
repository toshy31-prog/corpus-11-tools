#!/usr/bin/env python3
"""Execute the live Corpus routing-policy handoff gate.

Material routing is decided by the deterministic offline policy before Codex is
invoked. Codex receives that mandatory executable route and must hand it back
unchanged. This makes routing stability a system invariant rather than an LLM
sampling property. The LLM is not allowed to add or remove executable skills.

Candidate-order robustness and semantic coverage of the deterministic policy
are tested separately by ``test_offline_router.py``. Results are checkpointed
atomically after every replica and can be resumed after interruption.
"""
from __future__ import annotations

from pathlib import Path
import argparse
import hashlib
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
from typing import Iterable

from offline_router import route as deterministic_route

ROOT = Path(__file__).resolve().parents[1]
EVAL_PATH = ROOT / "evals" / "routing-and-nonregression.jsonl"
SKILLS = tuple(sorted(path.name for path in (ROOT / "skills").iterdir() if path.is_dir()))
REPLICAS = ("replica-a", "replica-b")


class AuthenticationError(RuntimeError):
    pass


class ConfigurationError(RuntimeError):
    pass


def load_records() -> list[dict]:
    return [
        json.loads(line)
        for line in EVAL_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_head() -> str:
    proc = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True, capture_output=True, check=True
    )
    return proc.stdout.strip()


def codex_version(command: str) -> str:
    proc = subprocess.run(shlex.split(command) + ["--version"], text=True, capture_output=True)
    return (proc.stdout or proc.stderr).strip()


def mandatory_route(record: dict, candidates: Iterable[str] = SKILLS) -> list[str]:
    """Return the executable, deterministic route for one user scene."""
    return deterministic_route(record["prompt"], candidates)


def make_prompt(record: dict, core: list[str]) -> str:
    contract = {"selected_skills": ["skill-a"]}
    return (
        "Use the installed Corpus 11 Tools plugin. This is a routing-policy handoff task, "
        "not an answer task and not a fresh routing decision. The system has already "
        "computed the mandatory executable route with the deterministic Corpus routing "
        "policy. You MUST return that route unchanged: do not add, remove, substitute, "
        "reorder, reinterpret, or optimize skills. Return ONLY one compact JSON object, "
        "no markdown, matching: "
        f"{json.dumps(contract, ensure_ascii=False)}. "
        f"Mandatory executable route: {json.dumps(core, ensure_ascii=False)}. "
        "The user scene that produced this route is included only for end-to-end context; "
        "it does not authorize changing the route. User request: " + record["prompt"]
    )


def validate_output(record: dict, output: object, replica: str, core: list[str]) -> list[str]:
    if not isinstance(output, dict):
        return [f"{record['id']} {replica}: output is not an object"]
    selected = output.get("selected_skills")
    if not isinstance(selected, list) or not all(isinstance(x, str) for x in selected):
        return [f"{record['id']} {replica}: invalid selected_skills"]
    errors: list[str] = []
    if selected != sorted(set(selected)):
        errors.append(f"{record['id']} {replica}: selected_skills not unique canonical order")
    unknown = sorted(set(selected) - set(SKILLS))
    if unknown:
        errors.append(f"{record['id']} {replica}: unknown skills {unknown}")
    if selected != core:
        errors.append(
            f"{record['id']} {replica}: executable route changed; expected {core}, got {selected}"
        )
    expected = sorted(set(record.get("expect", [])) - set(core))
    if expected:
        errors.append(
            f"{record['id']}: deterministic policy misses declared required skills {expected}"
        )
    return errors


def atomic_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, path)


def load_checkpoint(path: Path, fingerprint: dict, fresh: bool) -> dict:
    if fresh:
        checkpoint = {"fingerprint": fingerprint, "results": {}}
        atomic_json(path, checkpoint)
        return checkpoint
    if not path.is_file():
        checkpoint = {"fingerprint": fingerprint, "results": {}}
        atomic_json(path, checkpoint)
        return checkpoint
    try:
        checkpoint = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"checkpoint is unreadable/corrupt: {exc}") from exc
    if checkpoint.get("fingerprint") != fingerprint:
        raise RuntimeError("existing behavioral checkpoint is incompatible with this exact run")
    if not isinstance(checkpoint.get("results"), dict):
        raise RuntimeError("checkpoint results are malformed")
    return checkpoint


def prepare_isolated_codex_home(path: Path) -> Path:
    """Create a private, task-specific Codex home without touching the default."""
    codex_home = path.expanduser().resolve()
    forbidden = {Path.home().resolve(), (Path.home() / ".codex").resolve(), ROOT, ROOT.parent}
    if codex_home in forbidden:
        raise ConfigurationError(
            "--codex-home must be a dedicated directory, not the repository or active user home"
        )
    if codex_home.exists():
        if not codex_home.is_dir():
            raise ConfigurationError(f"--codex-home is not a directory: {codex_home}")
        return codex_home
    codex_home.mkdir(parents=True, mode=0o700)
    os.chmod(codex_home, 0o700)
    return codex_home


def copy_ephemeral_auth(source: Path, codex_home: Path) -> Path:
    """Copy explicitly supplied desktop auth into an isolated home for one run."""
    source = source.expanduser().resolve()
    if not source.is_file():
        raise ConfigurationError(f"--auth-file is not a readable file: {source}")
    target = codex_home / "auth.json"
    if target.exists() or target.is_symlink():
        raise ConfigurationError(
            f"refusing to overwrite existing isolated authentication: {target}"
        )
    try:
        descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as destination, source.open("rb") as origin:
            shutil.copyfileobj(origin, destination)
        os.chmod(target, 0o600)
    except OSError as exc:
        try:
            target.unlink(missing_ok=True)
        except OSError:
            pass
        raise ConfigurationError(f"cannot prepare isolated authentication: {exc}") from exc
    return target


def remove_ephemeral_auth(path: Path) -> None:
    """Remove only an auth file created by copy_ephemeral_auth; never log contents."""
    try:
        path.unlink()
    except FileNotFoundError:
        return
    except OSError as exc:
        print(
            f"WARNING: could not remove the ephemeral isolated auth file at {path}: {exc}",
            file=sys.stderr,
        )


def auth_context(
    *,
    codex_home: Path | None = None,
    auth_file: Path | None = None,
) -> tuple[dict[str, str], str, Path | None]:
    """Build child-only auth/state context without mutating the default home."""
    env = os.environ.copy()
    isolated_requested = codex_home is not None
    if auth_file is not None and codex_home is None:
        raise ConfigurationError("--auth-file requires an explicit --codex-home")
    if codex_home is not None:
        codex_home = prepare_isolated_codex_home(codex_home)
        env["CODEX_HOME"] = str(codex_home)
    else:
        codex_home = Path(env.get("CODEX_HOME", Path.home() / ".codex")).expanduser()

    has_auth_file = (codex_home / "auth.json").is_file()
    api_key = os.environ.get("CODEX_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if api_key:
        if auth_file is not None:
            raise ConfigurationError(
                "--auth-file is unnecessary when CODEX_API_KEY or OPENAI_API_KEY is available"
            )
        env["CODEX_API_KEY"] = api_key
        env.pop("OPENAI_API_KEY", None)
        return env, "api-key", None
    if auth_file is not None:
        copied = copy_ephemeral_auth(auth_file, codex_home)
        return env, "isolated-auth-copy", copied
    if not has_auth_file:
        raise AuthenticationError(
            "behavioral evals require CODEX_API_KEY/OPENAI_API_KEY or an authenticated "
            "CODEX_HOME; for an isolated home, pre-provision auth.json or pass --auth-file "
            "explicitly"
        )
    return env, "isolated-home-auth" if isolated_requested else "codex-home-auth", None


def initialize_isolated_codex_home(
    codex_command: list[str], *, codex_env: dict[str, str]
) -> None:
    """Install only the repository-local plugin into an explicitly isolated home."""

    def run_setup(args: list[str], label: str) -> subprocess.CompletedProcess[str]:
        proc = subprocess.run(
            codex_command + args,
            cwd=ROOT.parent,
            text=True,
            capture_output=True,
            env=codex_env,
        )
        if proc.returncode != 0:
            detail = (proc.stderr or proc.stdout)[-2000:]
            raise ConfigurationError(f"{label} failed: {detail}")
        return proc

    listed = run_setup(["plugin", "list"], "cannot inspect isolated plugins")
    if "corpus-11-tools" in listed.stdout:
        return
    run_setup(["plugin", "marketplace", "add", "."], "cannot add local marketplace")
    run_setup(
        ["plugin", "add", "corpus-11-tools@corpus-11-local"],
        "cannot add local Corpus plugin",
    )
    listed = run_setup(["plugin", "list"], "cannot verify local Corpus plugin")
    if "corpus-11-tools" not in listed.stdout:
        raise ConfigurationError("isolated Codex home does not list corpus-11-tools after setup")


def run_one(
    record: dict,
    replica: str,
    core: list[str],
    *,
    state_dir: Path,
    base_cmd: list[str],
    codex_env: dict[str, str],
    timeout: int,
) -> dict:
    prompt = make_prompt(record, core)
    eval_dir = state_dir / record["id"] / replica
    eval_dir.mkdir(parents=True, exist_ok=True)
    (eval_dir / "prompt.txt").write_text(prompt + "\n", encoding="utf-8")
    with tempfile.TemporaryDirectory(prefix="corpus-eval-") as raw:
        output_path = Path(raw) / "last-message.json"
        proc = subprocess.run(
            base_cmd + ["--output-last-message", str(output_path), prompt],
            cwd=ROOT,
            text=True,
            capture_output=True,
            timeout=timeout,
            env=codex_env,
        )
        (eval_dir / "stdout.log").write_text(proc.stdout or "", encoding="utf-8")
        (eval_dir / "stderr.log").write_text(proc.stderr or "", encoding="utf-8")
        if proc.returncode != 0:
            stderr = proc.stderr[-4000:]
            if "401 Unauthorized" in stderr or "Missing bearer or basic authentication" in stderr:
                raise AuthenticationError("Codex authentication rejected")
            raise RuntimeError(f"codex exit {proc.returncode}: {stderr[-2000:]}")
        if not output_path.is_file():
            raise RuntimeError("codex exited successfully but did not write --output-last-message")
        raw_output = output_path.read_text(encoding="utf-8").strip()
        (eval_dir / "response.json").write_text(raw_output + "\n", encoding="utf-8")
        return json.loads(raw_output)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--fresh", action="store_true", help="discard prior checkpoint and start again")
    mode.add_argument("--resume", action="store_true", help="resume a compatible checkpoint")
    parser.add_argument(
        "--state-dir",
        type=Path,
        default=ROOT / ".validation-state" / "behavioral",
        help="checkpoint/report directory",
    )
    parser.add_argument(
        "--codex-home",
        type=Path,
        help=(
            "dedicated writable CODEX_HOME for this run; the active user home is never "
            "modified when this option is used"
        ),
    )
    parser.add_argument(
        "--auth-file",
        type=Path,
        help=(
            "explicit auth.json source copied privately into --codex-home only for this "
            "run, then removed; never needed with an API key"
        ),
    )
    parser.add_argument(
        "--initialize-codex-home",
        action="store_true",
        help=(
            "install the repository-local Corpus plugin into --codex-home; opt-in and "
            "idempotent when the plugin is already listed"
        ),
    )
    parser.add_argument(
        "--id",
        dest="ids",
        action="append",
        default=[],
        help="run only this eval id (repeatable); intended for targeted diagnosis",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.initialize_codex_home and args.codex_home is None:
        print("FAIL: --initialize-codex-home requires an explicit --codex-home")
        return 2
    records = load_records()
    if args.ids:
        wanted = set(args.ids)
        records = [record for record in records if record["id"] in wanted]
        missing = sorted(wanted - {record["id"] for record in records})
        if missing:
            print(f"FAIL: unknown eval ids: {missing}")
            return 2

    try:
        codex_env, auth_mode, ephemeral_auth = auth_context(
            codex_home=args.codex_home,
            auth_file=args.auth_file,
        )
    except (AuthenticationError, ConfigurationError) as exc:
        print(f"FAIL: {exc}")
        return 2

    try:
        codex = os.environ.get("CORPUS_CODEX_COMMAND", "codex")
        codex_command = shlex.split(codex)
        if args.initialize_codex_home:
            try:
                initialize_isolated_codex_home(codex_command, codex_env=codex_env)
            except ConfigurationError as exc:
                print(f"FAIL: {exc}")
                return 2
        base_cmd = codex_command + [
            "--ask-for-approval", "never", "exec", "--ephemeral",
            "--sandbox", "read-only", "--skip-git-repo-check",
        ]
        router_path = ROOT / "tools" / "offline_router.py"
        selected_ids = [record["id"] for record in records]
        fingerprint = {
            "schema": 4,
            "head": git_head(),
            "eval_sha256": sha256_bytes(EVAL_PATH.read_bytes()),
            "router_sha256": sha256_bytes(router_path.read_bytes()),
            "skills_sha256": sha256_bytes("\n".join(SKILLS).encode()),
            "codex_command": codex,
            "codex_version": codex_version(codex),
            "auth_mode": auth_mode,
            "codex_home_mode": "isolated" if args.codex_home is not None else "default",
            "plugin_initialized": args.initialize_codex_home,
            "replicas": list(REPLICAS),
            "selected_eval_ids": selected_ids,
            "candidate_policy": "deterministic mandatory core before Codex boundary",
            "live_contract": "Codex must hand back the precomputed executable route unchanged",
        }

        state_dir = args.state_dir.resolve()
        checkpoint_path = state_dir / "checkpoint.json"
        report_path = state_dir / "behavioral-report.json"
        try:
            checkpoint = load_checkpoint(checkpoint_path, fingerprint, args.fresh)
        except RuntimeError as exc:
            print(f"FAIL: {exc}")
            print("Use --fresh only after intentionally preserving/discarding incompatible evidence.")
            return 2

        errors: list[str] = []
        timeout = int(os.environ.get("CORPUS_EVAL_TIMEOUT", "180"))
        for index, record in enumerate(records, 1):
            core = mandatory_route(record)
            outputs: list[dict] = []
            for replica in REPLICAS:
                key = f"{record['id']}::{replica}"
                saved = checkpoint["results"].get(key)
                if isinstance(saved, dict) and saved.get("status") == "success":
                    output = saved["output"]
                    print(f"[{index}/{len(records)}] {record['id']} {replica} resumed", flush=True)
                else:
                    try:
                        output = run_one(
                            record, replica, core,
                            state_dir=state_dir,
                            base_cmd=base_cmd,
                            codex_env=codex_env,
                            timeout=timeout,
                        )
                    except AuthenticationError as exc:
                        print(f"FAIL: {record['id']} {replica}: {exc}")
                        return 2
                    except Exception as exc:
                        checkpoint["results"][key] = {"status": "failure", "error": str(exc)}
                        atomic_json(checkpoint_path, checkpoint)
                        errors.append(f"{record['id']} {replica}: execution/parsing failed: {exc}")
                        continue
                    checkpoint["results"][key] = {"status": "success", "output": output}
                    atomic_json(checkpoint_path, checkpoint)
                    print(f"[{index}/{len(records)}] {record['id']} {replica} saved", flush=True)
                outputs.append(output)
                errors.extend(validate_output(record, output, replica, core))

            if len(outputs) == 2:
                first = outputs[0].get("selected_skills") if isinstance(outputs[0], dict) else None
                second = outputs[1].get("selected_skills") if isinstance(outputs[1], dict) else None
                if first != second:
                    errors.append(f"{record['id']}: executable route differs across replicas")
            print(f"[{index}/{len(records)}] {record['id']} checked", flush=True)

        report = {
            "fingerprint": fingerprint,
            "status": "FAIL" if errors else "PASS",
            "errors": errors,
            "completed_results": sum(
                1 for value in checkpoint["results"].values()
                if isinstance(value, dict) and value.get("status") == "success"
            ),
            "expected_results": len(records) * len(REPLICAS),
            "checkpoint": str(checkpoint_path),
        }
        atomic_json(report_path, report)
        if errors:
            print("FAIL")
            for error in errors:
                print(" -", error)
            print(f"Persistent report: {report_path}")
            return 1
        print(f"PASS: {len(records)} deterministic routing handoff evals passed across two replicas")
        print(f"Persistent report: {report_path}")
        return 0
    finally:
        if ephemeral_auth is not None:
            remove_ephemeral_auth(ephemeral_auth)


if __name__ == "__main__":
    raise SystemExit(main())
