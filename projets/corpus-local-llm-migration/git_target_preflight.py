"""Strict read-only Git preflight for an explicit list of repo-relative paths."""
from __future__ import annotations

from pathlib import Path, PurePosixPath
import subprocess


class GitPreflightRefusal(RuntimeError):
    pass


def _run(repo: Path, args: list[str], *, input_bytes: bytes | None = None) -> subprocess.CompletedProcess:
    cp = subprocess.run(
        ["git", "-C", str(repo), *args],
        input=input_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=10,
    )
    if cp.returncode != 0:
        msg = cp.stderr.decode("utf-8", "replace").strip() or cp.stdout.decode("utf-8", "replace").strip()
        raise GitPreflightRefusal("git read refused: " + msg)
    return cp


def _text(repo: Path, *args: str) -> str:
    return _run(repo, list(args)).stdout.decode("utf-8", "strict").rstrip("\n")


def _path(raw: str) -> str:
    if not isinstance(raw, str) or not raw or "\x00" in raw or "\\" in raw:
        raise GitPreflightRefusal("invalid path")
    value = PurePosixPath(raw)
    if value.is_absolute() or raw.endswith("/") or any(part in {"", ".", ".."} for part in value.parts):
        raise GitPreflightRefusal("invalid path")
    normalized = value.as_posix()
    if normalized != raw or value.parts[0] == ".git":
        raise GitPreflightRefusal("invalid path")
    return normalized


def _head_entry(repo: Path, head: str, path: str) -> tuple[str, str] | None:
    raw = _run(repo, ["ls-tree", "-z", head, "--", f":(literal){path}"]).stdout
    if not raw:
        return None
    rows = [row for row in raw.split(b"\0") if row]
    if len(rows) != 1 or b"\t" not in rows[0]:
        raise GitPreflightRefusal("ambiguous HEAD path")
    meta, raw_path = rows[0].split(b"\t", 1)
    if raw_path.decode("utf-8", "surrogateescape") != path:
        raise GitPreflightRefusal("HEAD path mismatch")
    mode, kind, blob = meta.decode().split()
    if kind != "blob":
        raise GitPreflightRefusal("non-blob HEAD entry")
    return mode, blob


def _index_entries(repo: Path, path: str) -> list[tuple[str, str, str]]:
    rows = _text(repo, "ls-files", "-s", "--", path).splitlines()
    exact = []
    for row in rows:
        if "\t" not in row:
            raise GitPreflightRefusal("invalid index entry")
        meta, indexed_path = row.split("\t", 1)
        if indexed_path == path:
            mode, blob, stage = meta.split()
            exact.append((mode, blob, stage))
    return exact


def git_preflight(repo_root: str | Path, paths: list[str]) -> dict:
    repo = Path(repo_root).resolve()
    if not repo.is_dir() or _text(repo, "rev-parse", "--show-toplevel") != str(repo):
        raise GitPreflightRefusal("repo root must be canonical top-level")
    if not isinstance(paths, list) or not paths or len(paths) > 100:
        raise GitPreflightRefusal("explicit non-empty path list required")
    normalized = [_path(path) for path in paths]
    if len(set(normalized)) != len(normalized):
        raise GitPreflightRefusal("duplicate path")

    head = _text(repo, "rev-parse", "HEAD")
    origin_main = _text(repo, "rev-parse", "--verify", "refs/remotes/origin/main")

    rows = []
    for path in normalized:
        head_entry = _head_entry(repo, head, path)
        index_entries = _index_entries(repo, path)
        index_entry = index_entries[0] if len(index_entries) == 1 and index_entries[0][2] == "0" else None
        conflict_entries = index_entries if index_entries and index_entry is None else []
        target = (repo / path).resolve()
        try:
            target.relative_to(repo)
        except ValueError as exc:
            raise GitPreflightRefusal("path outside repository") from exc

        worktree_blob = None
        worktree_state = "missing"
        if target.is_file():
            content = target.read_bytes()
            worktree_blob = _run(repo, ["hash-object", "--stdin"], input_bytes=content).stdout.decode().strip()
            worktree_state = "present"
        elif target.exists():
            worktree_state = "non_file"

        head_blob = head_entry[1] if head_entry else None
        index_blob = index_entry[1] if index_entry else None

        if conflict_entries:
            tracked = True
            status = "conflict"
        elif head_entry is None and index_entry is None:
            tracked = False
            status = "untracked" if worktree_state == "present" else "missing"
        else:
            tracked = True
            if worktree_state != "present":
                status = "missing_worktree"
            elif head_blob == index_blob == worktree_blob:
                status = "clean"
            elif head_blob != index_blob and index_blob == worktree_blob:
                status = "staged"
            elif head_blob == index_blob and index_blob != worktree_blob:
                status = "modified_worktree"
            else:
                status = "staged_and_modified"

        row = {
            "path": path,
            "HEAD_BLOB": head_blob,
            "INDEX_BLOB": index_blob,
            "WORKTREE_BLOB": worktree_blob,
            "tracked": tracked,
            "status": status,
        }
        if conflict_entries:
            row["INDEX_CONFLICT_ENTRIES"] = [
                {"mode": mode, "blob": blob, "stage": stage}
                for mode, blob, stage in conflict_entries
            ]
        rows.append(row)

    return {"HEAD": head, "origin_main_oid": origin_main, "paths": rows}
