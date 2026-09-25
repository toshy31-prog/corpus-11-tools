#!/usr/bin/env python3
"""Reconstruit et, sur demande, promeut les runtimes llama locaux hors réseau."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

from corpus_paths import (
    LOCAL_BUILD_CACHE_ROOT,
    LOCAL_RUNTIME_ROOT,
    TOOLCHAIN_SOURCES_ROOT,
)

BASE = LOCAL_RUNTIME_ROOT
SOURCE = TOOLCHAIN_SOURCES_ROOT / "llama.cpp-b10964"
CMAKE = BASE / "build-env/bin/cmake"
VERSIONS = BASE / "versions"

PROFILES = {
    "cpu": {
        "build": LOCAL_BUILD_CACHE_ROOT / "llama-cpu",
        "runtime": VERSIONS / "llama-b10964-cpu-local",
        "cmake": ["-DGGML_CUDA=OFF", "-DLLAMA_OPENSSL=OFF"],
    },
    "cuda": {
        "build": LOCAL_BUILD_CACHE_ROOT / "llama-cuda",
        "runtime": VERSIONS / "llama-b10964-cuda-local",
        "cmake": ["-DGGML_CUDA=ON", "-DLLAMA_OPENSSL=ON"],
    },
}


def command(args, *, check=True, timeout=7200, env=None):
    result = subprocess.run(
        [str(x) for x in args],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        timeout=timeout,
        env=env,
    )
    if check and result.returncode:
        raise RuntimeError(
            f"Commande échouée ({result.returncode}): {' '.join(map(str,args))}\n"
            + "\n".join(result.stdout.splitlines()[-100:])
        )
    return result


def cached_source(build: Path):
    cache = build / "CMakeCache.txt"
    if not cache.is_file():
        return None
    for line in cache.read_text(errors="ignore").splitlines():
        if line.startswith("CMAKE_HOME_DIRECTORY:") and "=" in line:
            return Path(line.split("=", 1)[1])
    return None


def reset_if_source_drift(build: Path):
    previous = cached_source(build)
    if previous is None:
        return False
    expected = SOURCE.absolute()
    try:
        same = previous.resolve(strict=False) == expected.resolve(strict=False)
    except OSError:
        same = str(previous) == str(expected)
    if same:
        return False
    print(f"CACHE SOURCE DRIFT: {previous} -> {expected}", flush=True)
    shutil.rmtree(build)
    return True


def is_elf(path: Path):
    try:
        if not path.is_file():
            return False
        with path.open("rb") as stream:
            return stream.read(4) == b"\x7fELF"
    except OSError:
        return False


def dynamic(path: Path):
    if not is_elf(path):
        return []
    result = command(["readelf", "-d", str(path)], check=False, timeout=30)
    return [
        line.strip()
        for line in result.stdout.splitlines()
        if "RPATH" in line or "RUNPATH" in line or "NEEDED" in line
    ]


def validate_bin(bin_dir: Path):
    server = bin_dir / "llama-server"
    if not server.is_file():
        raise RuntimeError(f"llama-server absent : {server}")

    forbidden = (
        ".dev-local",
        str(BASE / "build"),
        str(LOCAL_BUILD_CACHE_ROOT),
    )
    bad = []
    elf_count = 0
    for path in bin_dir.iterdir():
        if path.is_symlink() or not is_elf(path):
            continue
        elf_count += 1
        for line in dynamic(path):
            if ("RPATH" in line or "RUNPATH" in line) and any(x in line for x in forbidden):
                bad.append((path, line))

    if bad:
        raise RuntimeError(
            "RUNPATH non relocatable :\n"
            + "\n".join(f"{path}: {line}" for path, line in bad[:50])
        )

    linked = command(["ldd", str(server)], check=False, timeout=30)
    missing = [line for line in linked.stdout.splitlines() if "not found" in line]
    if missing:
        raise RuntimeError("Dépendances ELF absentes :\n" + "\n".join(missing))

    version = command([str(server), "--version"], check=False, timeout=30)
    if version.returncode:
        raise RuntimeError("llama-server --version échoue :\n" + version.stdout)

    return {
        "server": str(server),
        "elf_count": elf_count,
        "version": version.stdout.strip(),
    }


def build_profile(name: str, *, clean=False):
    profile = PROFILES[name]
    build = profile["build"]

    if clean and build.exists():
        print("CLEAN", build, flush=True)
        shutil.rmtree(build)
    else:
        reset_if_source_drift(build)

    LOCAL_BUILD_CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    build.parent.mkdir(parents=True, exist_ok=True)

    env = dict(os.environ)
    env["GIT_CEILING_DIRECTORIES"] = str(TOOLCHAIN_SOURCES_ROOT)

    prefix = [
        "bwrap",
        "--unshare-net",
        "--ro-bind", "/", "/",
        "--bind", str(BASE), str(BASE),
        "--bind", str(LOCAL_BUILD_CACHE_ROOT), str(LOCAL_BUILD_CACHE_ROOT),
        "--tmpfs", "/tmp",
        "--dev", "/dev",
        "--proc", "/proc",
    ]

    configure = [
        str(CMAKE),
        "-S", str(SOURCE),
        "-B", str(build),
        "-DCMAKE_BUILD_TYPE=Release",
        "-DCMAKE_BUILD_RPATH_USE_ORIGIN=ON",
        "-DCMAKE_INSTALL_RPATH=$ORIGIN",
        "-DCMAKE_SKIP_RPATH=NO",
        "-DGGML_NATIVE=ON",
        "-DGGML_VULKAN=OFF",
        "-DLLAMA_BUILD_TESTS=OFF",
        "-DLLAMA_BUILD_EXAMPLES=OFF",
        "-DLLAMA_BUILD_TOOLS=ON",
        *profile["cmake"],
    ]

    command(prefix + configure, env=env, timeout=1200)

    jobs = max(2, min(8, os.cpu_count() or 4))
    command(
        prefix + [str(CMAKE), "--build", str(build), "--target", "llama-server", "-j", str(jobs)],
        env=env,
        timeout=7200,
    )
    return validate_bin(build / "bin")


def promote(name: str):
    profile = PROFILES[name]
    source = profile["build"] / "bin"
    final = profile["runtime"]
    validate_bin(source)

    stage = final.with_name("." + final.name + f"-stage-{os.getpid()}")
    backup = final.with_name("." + final.name + f"-backup-{os.getpid()}")

    if stage.exists() or backup.exists():
        raise RuntimeError("Staging/backup runtime existe déjà.")

    stage.mkdir(parents=True)
    shutil.copytree(source, stage / "bin", symlinks=True)
    (stage / "PROMOTION.json").write_text(
        json.dumps({
            "profile": name,
            "source": str(SOURCE),
            "build": str(profile["build"]),
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "rpath": "$ORIGIN",
        }, ensure_ascii=False, indent=2) + "\n"
    )
    validate_bin(stage / "bin")

    moved_old = False
    try:
        if final.exists():
            os.rename(final, backup)
            moved_old = True
        os.rename(stage, final)
        validate_bin(final / "bin")
    except BaseException:
        if final.exists() and final != backup:
            shutil.rmtree(final, ignore_errors=True)
        if moved_old and backup.exists():
            os.rename(backup, final)
        shutil.rmtree(stage, ignore_errors=True)
        raise
    else:
        if backup.exists():
            shutil.rmtree(backup)

    return validate_bin(final / "bin")


def selected_profiles(selected):
    return ("cpu", "cuda") if selected == "both" else (selected,)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=("cpu", "cuda", "both"), default="cpu")
    parser.add_argument("--clean", action="store_true")
    parser.add_argument("--promote", action="store_true")
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Valide les builds/runtimes présents sans reconstruire.",
    )
    args = parser.parse_args()

    if not SOURCE.joinpath("CMakeLists.txt").is_file():
        raise SystemExit(f"Source llama absente : {SOURCE}")
    if not CMAKE.is_file():
        raise SystemExit(f"CMake Corpus absent : {CMAKE}")

    result = {}
    for name in selected_profiles(args.profile):
        profile = PROFILES[name]
        if args.validate_only:
            previous = cached_source(profile["build"])
            row = {
                "cached_source": str(previous) if previous else None,
                "expected_source": str(SOURCE),
                "source_drift": bool(previous and previous.resolve(strict=False) != SOURCE.resolve(strict=False)),
                "build": validate_bin(profile["build"] / "bin") if (profile["build"] / "bin/llama-server").is_file() else None,
                "runtime": validate_bin(profile["runtime"] / "bin") if (profile["runtime"] / "bin/llama-server").is_file() else None,
            }
        else:
            row = {"build": build_profile(name, clean=args.clean)}
            if args.promote:
                row["runtime"] = promote(name)
        result[name] = row

    print(json.dumps(result, ensure_ascii=False, indent=2))
    print("CORPUS_REBUILD_RUNTIME=PASS")


if __name__ == "__main__":
    main()
