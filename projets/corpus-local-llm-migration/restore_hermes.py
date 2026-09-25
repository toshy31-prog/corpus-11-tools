#!/usr/bin/env python3
"""Restaure Hermes offline avec un checkout runtime éditable auto-contenu."""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess

from corpus_paths import (
    CACHE_ROOT,
    LOCAL_APPS_ROOT,
    LOCAL_BUILD_TOOLS_ROOT,
    LOCAL_RUNTIME_ROOT,
    TOOLCHAIN_SOURCES_ROOT,
    UV_CACHE_ROOT,
    contract_environment,
)

VERSION = "hermes-agent-2026.9.21"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "--verify-copy",
    action="store_true",
    help="Restaurer dans un environnement de vérification distinct",
)
parser.add_argument(
    "--refresh-source",
    action="store_true",
    help="Rematérialiser le checkout runtime Hermes depuis TOOLCHAINS avant le sync.",
)
args = parser.parse_args()

base = LOCAL_RUNTIME_ROOT
source = TOOLCHAIN_SOURCES_ROOT / VERSION
runtime_source = LOCAL_APPS_ROOT / VERSION
target_env = base / ("hermes-restore-check" if args.verify_copy else "hermes-env")

if not (source / "pyproject.toml").is_file():
    raise SystemExit(f"Source Hermes TOOLCHAINS absente ou incomplète : {source}")
if not (source / "uv.lock").is_file():
    raise SystemExit(f"Lock Hermes absent : {source / 'uv.lock'}")

LOCAL_APPS_ROOT.mkdir(parents=True, exist_ok=True)
UV_CACHE_ROOT.mkdir(parents=True, exist_ok=True)

created_runtime_source = False
backup_runtime_source = None


def materialize_runtime_source():
    global created_runtime_source, backup_runtime_source

    if runtime_source.exists() and not args.refresh_source:
        return

    stage = LOCAL_APPS_ROOT / f".{VERSION}-stage-{os.getpid()}"
    if stage.exists():
        raise RuntimeError(f"Staging Hermes existe déjà : {stage}")

    shutil.copytree(
        source,
        stage,
        symlinks=True,
        ignore=shutil.ignore_patterns(
            ".git",
            ".venv",
            "__pycache__",
            "*.pyc",
            "*.pyo",
            "*.egg-info",
            "build",
            "dist",
        ),
    )

    required = (
        stage / "pyproject.toml",
        stage / "uv.lock",
        stage / "hermes_cli/main.py",
    )
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        shutil.rmtree(stage, ignore_errors=True)
        raise RuntimeError("Checkout runtime Hermes incomplet :\n" + "\n".join(missing))

    if runtime_source.exists():
        backup_runtime_source = LOCAL_APPS_ROOT / f".{VERSION}-backup-{os.getpid()}"
        if backup_runtime_source.exists():
            shutil.rmtree(stage, ignore_errors=True)
            raise RuntimeError(f"Backup Hermes existe déjà : {backup_runtime_source}")
        os.rename(runtime_source, backup_runtime_source)
    else:
        created_runtime_source = True

    os.rename(stage, runtime_source)


def rollback_runtime_source():
    if runtime_source.exists() and (created_runtime_source or backup_runtime_source):
        shutil.rmtree(runtime_source, ignore_errors=True)
    if backup_runtime_source and backup_runtime_source.exists():
        os.rename(backup_runtime_source, runtime_source)


def finalize_runtime_source():
    if backup_runtime_source and backup_runtime_source.exists():
        shutil.rmtree(backup_runtime_source)


materialize_runtime_source()

env = {
    **os.environ,
    "UV_PYTHON_DOWNLOADS": "never",
    "UV_CACHE_DIR": str(UV_CACHE_ROOT),
    "UV_PROJECT_ENVIRONMENT": str(target_env),
}
env.update(contract_environment())

try:
    # Upstream Hermes intentionally rejects wheel/sdist builds. The supported
    # source-checkout deployment shape is therefore an editable install. The
    # editable target is a RUNTIME-local checkout, never TOOLCHAINS directly.
    subprocess.run(
        [
            "bwrap",
            "--unshare-net",
            "--ro-bind", "/", "/",
            "--bind", str(base), str(base),
            "--bind", str(CACHE_ROOT), str(CACHE_ROOT),
            "--dev", "/dev",
            "--proc", "/proc",
            str(LOCAL_BUILD_TOOLS_ROOT / "bin/uv"),
            "sync",
            "--offline",
            "--python", "/usr/bin/python3",
            "--project", str(runtime_source),
            "--frozen",
            "--no-dev",
            "--no-default-groups",
        ],
        env=env,
        check=True,
    )
except BaseException:
    rollback_runtime_source()
    raise
else:
    finalize_runtime_source()
