#!/usr/bin/env python3
"""Attest every distributed plugin byte except the self-referential manifest."""
from __future__ import annotations

from hashlib import sha256
from pathlib import Path
import argparse
import json
import subprocess
from typing import Any


PLUGIN_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PLUGIN_ROOT.parent


def release_identity() -> str:
    inventory = json.loads(
        (PLUGIN_ROOT / "docs" / "inventory.json").read_text(encoding="utf-8")
    )
    release = inventory.get("release")
    if not isinstance(release, str) or not release.startswith("v"):
        raise ValueError(f"invalid release identity: {release!r}")
    return release


def manifest_path(release: str) -> Path:
    return PLUGIN_ROOT / "docs" / f"release-content-{release}.json"


def package_paths(excluded: Path) -> list[Path]:
    proc = subprocess.run(
        [
            "git",
            "ls-files",
            "--cached",
            "--others",
            "--exclude-standard",
            "-z",
            "--",
            PLUGIN_ROOT.name,
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        check=True,
    )
    result: list[Path] = []
    for raw in proc.stdout.split(b"\0"):
        if not raw:
            continue
        path = REPO_ROOT / raw.decode("utf-8")
        if path == excluded:
            continue
        if path.is_symlink():
            raise ValueError(
                f"symbolic link requires an explicit release policy: "
                f"{path.relative_to(REPO_ROOT)}"
            )
        if not path.is_file():
            raise ValueError(f"listed package path is not a file: {path}")
        result.append(path)
    return sorted(result, key=lambda path: path.relative_to(PLUGIN_ROOT).as_posix())


def build_attestation(release: str) -> dict[str, Any]:
    target = manifest_path(release)
    files: list[dict[str, Any]] = []
    total_bytes = 0
    for path in package_paths(target):
        payload = path.read_bytes()
        total_bytes += len(payload)
        files.append(
            {
                "path": path.relative_to(PLUGIN_ROOT).as_posix(),
                "bytes": len(payload),
                "sha256": sha256(payload).hexdigest(),
            }
        )
    return {
        "schema_version": 1,
        "release": release,
        "scope": f"{PLUGIN_ROOT.name}/",
        "excluded_paths": [target.relative_to(PLUGIN_ROOT).as_posix()],
        "exclusion_reason": (
            "The attestation cannot contain its own digest without circularity; "
            "the annotated Git tag covers the attestation itself."
        ),
        "file_count": len(files),
        "total_bytes": total_bytes,
        "files": files,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--write",
        action="store_true",
        help="rewrite the current release attestation from package bytes",
    )
    args = parser.parse_args()
    try:
        release = release_identity()
        target = manifest_path(release)
        observed = build_attestation(release)
        if args.write:
            target.write_text(
                json.dumps(observed, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(
                f"WROTE: {target.relative_to(REPO_ROOT)}; "
                f"{observed['file_count']} files, {observed['total_bytes']} bytes"
            )
            return 0
        expected = json.loads(target.read_text(encoding="utf-8"))
    except (
        OSError,
        UnicodeDecodeError,
        ValueError,
        json.JSONDecodeError,
        subprocess.SubprocessError,
    ) as exc:
        print("FAIL")
        print(" -", exc)
        return 1
    if expected != observed:
        print("FAIL")
        print(
            " - release content differs from the attestation; review the change "
            "and run tools/check_release_content.py --write"
        )
        return 1
    print(
        f"PASS: {observed['file_count']} plugin files and "
        f"{observed['total_bytes']} bytes match {target.name}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
