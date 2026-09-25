"""Canonical physical-path contract for the local Corpus organism.

Importing this module never creates, moves, or deletes anything.
`.dev-local` is a migration compatibility link, not a canonical API.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import shlex
import sys

REPO_ROOT = Path(__file__).resolve().parents[2]

def _absolute(value, name):
    path = Path(value).expanduser()
    if not path.is_absolute():
        raise RuntimeError(f"{name} doit être un chemin absolu : {value!r}")
    return path.resolve(strict=False)

def resolve_contract(environ=None, *, home=None, repo_root=None):
    env = dict(os.environ if environ is None else environ)
    repository = _absolute(repo_root or REPO_ROOT, "repo_root")
    host_home = _absolute(
        env.get("CORPUS_HOST_HOME")
        or (str(home) if home is not None else None)
        or env.get("HOME")
        or str(Path.home()),
        "CORPUS_HOST_HOME",
    )
    xdg_data = _absolute(env.get("XDG_DATA_HOME", host_home / ".local/share"), "XDG_DATA_HOME")
    xdg_state = _absolute(env.get("XDG_STATE_HOME", host_home / ".local/state"), "XDG_STATE_HOME")
    xdg_cache = _absolute(env.get("XDG_CACHE_HOME", host_home / ".cache"), "XDG_CACHE_HOME")
    xdg_config = _absolute(env.get("XDG_CONFIG_HOME", host_home / ".config"), "XDG_CONFIG_HOME")

    runtime = _absolute(env.get("CORPUS_RUNTIME_ROOT", xdg_data / "corpus/runtime"), "CORPUS_RUNTIME_ROOT")
    models = _absolute(env.get("CORPUS_MODELS_ROOT", xdg_data / "corpus/models/hot"), "CORPUS_MODELS_ROOT")
    toolchains = _absolute(env.get("CORPUS_TOOLCHAINS_ROOT", xdg_data / "corpus/toolchains"), "CORPUS_TOOLCHAINS_ROOT")
    data = _absolute(env.get("CORPUS_DATA_ROOT", xdg_data / "corpus/data"), "CORPUS_DATA_ROOT")
    state = _absolute(env.get("CORPUS_STATE_ROOT", xdg_state / "corpus"), "CORPUS_STATE_ROOT")
    cache = _absolute(env.get("CORPUS_CACHE_ROOT", xdg_cache / "corpus"), "CORPUS_CACHE_ROOT")
    config = _absolute(env.get("CORPUS_CONFIG_ROOT", xdg_config / "corpus"), "CORPUS_CONFIG_ROOT")
    vault_raw = env.get("CORPUS_VAULT_ROOT")
    vault = _absolute(vault_raw, "CORPUS_VAULT_ROOT") if vault_raw else None

    return {
        "repo": repository,
        "host_home": host_home,
        "runtime": runtime,
        "models": models,
        "toolchains": toolchains,
        "data": data,
        "state": state,
        "cache": cache,
        "config": config,
        "vault": vault,
        "local_runtime": runtime / "corpus-local",
        "capabilities_runtime": runtime / "corpus-capabilities",
        "media_runtime": runtime / "corpus-media",
        "office_runtime": runtime / "corpus-office",
        "updates_runtime": runtime / "corpus-updates",
        "build_cache": cache / "build",
        "maintenance_state": state / "maintenance",
        "compat_dev_local": repository / ".dev-local",
    }

_PATHS = resolve_contract()
HOST_HOME = _PATHS["host_home"]
RUNTIME_ROOT = _PATHS["runtime"]
MODELS_ROOT = _PATHS["models"]
TOOLCHAINS_ROOT = _PATHS["toolchains"]
DATA_ROOT = _PATHS["data"]
STATE_ROOT = _PATHS["state"]
CACHE_ROOT = _PATHS["cache"]
CONFIG_ROOT = _PATHS["config"]
VAULT_ROOT = _PATHS["vault"]

LOCAL_RUNTIME_ROOT = _PATHS["local_runtime"]
CAPABILITIES_RUNTIME_ROOT = _PATHS["capabilities_runtime"]
MEDIA_RUNTIME_ROOT = _PATHS["media_runtime"]
OFFICE_RUNTIME_ROOT = _PATHS["office_runtime"]
UPDATES_RUNTIME_ROOT = _PATHS["updates_runtime"]
BUILD_CACHE_ROOT = _PATHS["build_cache"]
MAINTENANCE_STATE_ROOT = _PATHS["maintenance_state"]
COMPAT_DEV_LOCAL_ROOT = _PATHS["compat_dev_local"]

def contract_environment():
    values = {
        "CORPUS_HOST_HOME": HOST_HOME,
        "CORPUS_RUNTIME_ROOT": RUNTIME_ROOT,
        "CORPUS_MODELS_ROOT": MODELS_ROOT,
        "CORPUS_TOOLCHAINS_ROOT": TOOLCHAINS_ROOT,
        "CORPUS_DATA_ROOT": DATA_ROOT,
        "CORPUS_STATE_ROOT": STATE_ROOT,
        "CORPUS_CACHE_ROOT": CACHE_ROOT,
        "CORPUS_CONFIG_ROOT": CONFIG_ROOT,
    }
    if VAULT_ROOT is not None:
        values["CORPUS_VAULT_ROOT"] = VAULT_ROOT
    return {key: str(value) for key, value in values.items()}

def compatibility_status():
    link = COMPAT_DEV_LOCAL_ROOT
    target = link.resolve(strict=False) if link.is_symlink() else None
    return {
        "path": str(link),
        "is_symlink": link.is_symlink(),
        "target": str(target) if target else None,
        "matches_runtime": bool(target is not None and target == RUNTIME_ROOT.resolve(strict=False)),
    }

def _main(argv):
    command = argv[1] if len(argv) > 1 else "json"
    if command == "runtime-root":
        print(RUNTIME_ROOT)
        return 0
    if command == "json":
        payload = {k: (str(v) if isinstance(v, Path) else v) for k, v in _PATHS.items()}
        payload["compatibility"] = compatibility_status()
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0
    if command == "shell":
        for key, value in contract_environment().items():
            print(f"export {key}={shlex.quote(value)}")
        return 0
    raise SystemExit("usage: corpus_paths.py [json|runtime-root|shell]")

if __name__ == "__main__":
    raise SystemExit(_main(sys.argv))
