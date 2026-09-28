"""Bounded single-commit publication over an isolated Git candidate tree.

GIT1 V1 deliberately does not expose arbitrary Git or shell execution.  It
constructs one candidate tree from exact bytes, validates a plain sibling
materialization of that tree, creates one commit object, then may publish that
commit to an explicit *non-checked-out* local branch via compare-and-swap.

The checked-out branch, worktree and human index are never rewritten.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tempfile
from typing import Callable, Any


FULL_OID = re.compile(r"^[0-9a-f]{40,64}$")
ALLOWED_MODES = {"100644", "100755"}


class PublicationRefusal(RuntimeError):
    """A requested operation is outside the GIT1 V1 contract."""


@dataclass(frozen=True)
class FileSelection:
    path: str
    mode: str
    content: bytes | None = None
    delete: bool = False


@dataclass(frozen=True)
class Candidate:
    repo: Path
    source_branch: str
    base: str
    base_tree: str
    tree: str
    selection_digest: str
    selected_paths: tuple[str, ...]
    human_index_tree: str
    materialization_contract: str = "sibling_plain_exact_blobs"


@dataclass(frozen=True)
class ValidationReceipt:
    candidate_tree: str
    manifest_digest: str
    file_count: int
    materialization_contract: str
    validator_result: Any


@dataclass(frozen=True)
class CommitReceipt:
    commit: str
    tree: str
    parent: str


@dataclass(frozen=True)
class PublicationReceipt:
    ref: str
    old: str
    new: str
    source_head: str
    human_index_tree: str


def _run(repo: Path, args: list[str], *, input_bytes: bytes | None = None,
         env: dict[str, str] | None = None, check: bool = True) -> subprocess.CompletedProcess:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    cp = subprocess.run(
        ["git", "-C", str(repo), *args],
        input=input_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=merged,
        check=False,
        timeout=30,
    )
    if check and cp.returncode != 0:
        msg = cp.stderr.decode("utf-8", "replace").strip() or cp.stdout.decode("utf-8", "replace").strip()
        raise PublicationRefusal(f"git {' '.join(args[:3])} refused: {msg}")
    return cp


def _text(repo: Path, *args: str, env: dict[str, str] | None = None) -> str:
    return _run(repo, list(args), env=env).stdout.decode("utf-8", "strict").rstrip("\n")


def _repo(path: str | Path) -> Path:
    repo = Path(path).resolve()
    if not repo.is_dir():
        raise PublicationRefusal("repository missing")
    if _text(repo, "rev-parse", "--is-inside-work-tree") != "true":
        raise PublicationRefusal("not a normal worktree")
    return repo


def _git_path(repo: Path, name: str) -> Path:
    raw = _text(repo, "rev-parse", "--git-path", name)
    p = Path(raw)
    return p if p.is_absolute() else (repo / p).resolve()


def _ref_for_branch(repo: Path, branch: str) -> str:
    if not isinstance(branch, str) or not branch.strip():
        raise PublicationRefusal("branch required")
    cp = _run(repo, ["check-ref-format", "--branch", branch], check=False)
    if cp.returncode:
        raise PublicationRefusal("invalid branch")
    return "refs/heads/" + branch


def _full_oid(repo: Path, oid: str, kind: str = "commit") -> str:
    if not isinstance(oid, str) or not FULL_OID.fullmatch(oid):
        raise PublicationRefusal("full object id required")
    resolved = _text(repo, "rev-parse", "--verify", f"{oid}^{{{kind}}}")
    if resolved != oid:
        raise PublicationRefusal("object id must be canonical and exact")
    return resolved


def _current_branch(repo: Path) -> str:
    cp = _run(repo, ["symbolic-ref", "--quiet", "--short", "HEAD"], check=False)
    if cp.returncode:
        raise PublicationRefusal("detached HEAD refused")
    return cp.stdout.decode().strip()


def _operation_in_progress(repo: Path) -> str | None:
    markers = (
        "MERGE_HEAD",
        "CHERRY_PICK_HEAD",
        "REVERT_HEAD",
        "REBASE_HEAD",
        "rebase-apply",
        "rebase-merge",
        "BISECT_LOG",
    )
    for marker in markers:
        if _git_path(repo, marker).exists():
            return marker
    return None


def _assert_supported_repo_state(repo: Path) -> None:
    active = _operation_in_progress(repo)
    if active:
        raise PublicationRefusal(f"git operation in progress: {active}")
    if _git_path(repo, "index.lock").exists():
        raise PublicationRefusal("index lock present")
    sparse = _run(repo, ["config", "--bool", "--get", "core.sparseCheckout"], check=False)
    if sparse.returncode == 0 and sparse.stdout.decode().strip().lower() == "true":
        raise PublicationRefusal("sparse checkout refused")
    if _text(repo, "ls-files", "-u"):
        raise PublicationRefusal("unmerged index refused")


def _human_index_tree(repo: Path) -> str:
    """Compute the human index tree without letting Git rewrite that index."""
    index = _git_path(repo, "index")
    if not index.is_file():
        raise PublicationRefusal("human index missing")
    git_dir = Path(_text(repo, "rev-parse", "--git-dir"))
    if not git_dir.is_absolute():
        git_dir = (repo / git_dir).resolve()
    fd, raw = tempfile.mkstemp(prefix="git1-human-index-copy-", dir=str(git_dir))
    os.close(fd)
    tmp = Path(raw)
    try:
        shutil.copyfile(index, tmp)
        return _text(repo, "write-tree", env={"GIT_INDEX_FILE": str(tmp)})
    finally:
        try:
            tmp.unlink()
        except FileNotFoundError:
            pass


def _assert_human_index_equals(repo: Path, expected_tree: str) -> str:
    tree = _human_index_tree(repo)
    if tree != expected_tree:
        raise PublicationRefusal("human index contains staging foreign to expected HEAD")
    return tree


def _assert_source(repo: Path, source_branch: str, base: str, base_tree: str) -> None:
    _assert_supported_repo_state(repo)
    current = _current_branch(repo)
    if current != source_branch:
        raise PublicationRefusal("source branch changed")
    head = _text(repo, "rev-parse", "HEAD")
    if head != base:
        raise PublicationRefusal("base/head drift")
    branch_head = _text(repo, "rev-parse", _ref_for_branch(repo, source_branch))
    if branch_head != base:
        raise PublicationRefusal("source branch ref drift")
    _assert_human_index_equals(repo, base_tree)


def _normalize_path(raw: str) -> str:
    if not isinstance(raw, str) or not raw or "\x00" in raw or "\\" in raw:
        raise PublicationRefusal("invalid path")
    p = PurePosixPath(raw)
    if p.is_absolute() or raw.endswith("/") or any(part in {"", ".", ".."} for part in p.parts):
        raise PublicationRefusal("invalid path")
    normalized = p.as_posix()
    if normalized != raw or p.parts[0] == ".git":
        raise PublicationRefusal("non-canonical or protected path")
    return normalized


def _base_entry(repo: Path, base: str, path: str) -> tuple[str, str, str] | None:
    cp = _run(repo, ["ls-tree", "-z", base, "--", f":(literal){path}"])
    raw = cp.stdout
    if not raw:
        return None
    rows = [r for r in raw.split(b"\0") if r]
    if len(rows) != 1 or b"\t" not in rows[0]:
        raise PublicationRefusal("ambiguous base path")
    meta, raw_path = rows[0].split(b"\t", 1)
    if raw_path.decode("utf-8", "surrogateescape") != path:
        raise PublicationRefusal("base path mismatch")
    mode, kind, oid = meta.decode().split()
    return mode, kind, oid


def _selection_digest(rows: list[dict[str, str]]) -> str:
    payload = json.dumps(rows, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def _hash_blob(repo: Path, content: bytes) -> str:
    cp = _run(repo, ["hash-object", "-w", "--stdin"], input_bytes=content)
    return cp.stdout.decode().strip()


def build_candidate(repo: str | Path, *, source_branch: str, expected_base: str,
                    selections: list[FileSelection]) -> Candidate:
    """Construct one candidate tree from exact caller-supplied bytes/modes.

    The real worktree and index are not used as candidate content.
    """
    repo = _repo(repo)
    base = _full_oid(repo, expected_base, "commit")
    base_tree = _text(repo, "rev-parse", f"{base}^{{tree}}")
    if _current_branch(repo) != source_branch:
        raise PublicationRefusal("explicit source branch does not match HEAD")
    _assert_source(repo, source_branch, base, base_tree)
    if not isinstance(selections, list) or not selections:
        raise PublicationRefusal("non-empty explicit selection required")

    seen: set[str] = set()
    normalized: list[tuple[FileSelection, str, tuple[str, str, str] | None]] = []
    digest_rows: list[dict[str, str]] = []
    for item in selections:
        if not isinstance(item, FileSelection):
            raise PublicationRefusal("selection object required")
        path = _normalize_path(item.path)
        if path in seen:
            raise PublicationRefusal("duplicate/ambiguous path selection")
        seen.add(path)
        if item.mode not in ALLOWED_MODES:
            raise PublicationRefusal("unsupported file mode")
        if item.delete:
            if item.content is not None:
                raise PublicationRefusal("delete selection cannot contain bytes")
        else:
            if not isinstance(item.content, bytes):
                raise PublicationRefusal("exact candidate bytes required")
        entry = _base_entry(repo, base, path)
        if entry is not None:
            mode, kind, _ = entry
            if kind != "blob" or mode not in ALLOWED_MODES:
                raise PublicationRefusal("symlink/gitlink/non-regular base entry refused")
        if item.delete:
            if entry is None:
                raise PublicationRefusal("delete target absent in base")
            if entry[0] != item.mode:
                raise PublicationRefusal("delete expected mode does not match base")
            digest_rows.append({"path": path, "action": "delete", "mode": item.mode})
        else:
            content_sha = hashlib.sha256(item.content).hexdigest()
            digest_rows.append({"path": path, "action": "write", "mode": item.mode, "sha256": content_sha})
        normalized.append((item, path, entry))

    git_dir = Path(_text(repo, "rev-parse", "--git-dir"))
    if not git_dir.is_absolute():
        git_dir = (repo / git_dir).resolve()
    fd, raw_index = tempfile.mkstemp(prefix="git1-index-", dir=str(git_dir))
    os.close(fd)
    os.unlink(raw_index)
    index_path = Path(raw_index)
    env = {"GIT_INDEX_FILE": str(index_path)}
    try:
        _text(repo, "read-tree", base, env=env)
        for item, path, _entry in normalized:
            if item.delete:
                _text(repo, "update-index", "--force-remove", "--", path, env=env)
            else:
                blob = _hash_blob(repo, item.content)
                cacheinfo = f"{item.mode},{blob},{path}"
                _text(repo, "update-index", "--add", "--cacheinfo", cacheinfo, env=env)
        tree = _text(repo, "write-tree", env=env)
    finally:
        try:
            index_path.unlink()
        except FileNotFoundError:
            pass

    changed_raw = _run(repo, ["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", base, tree]).stdout
    changed = tuple(sorted(x.decode("utf-8", "surrogateescape") for x in changed_raw.split(b"\0") if x))
    wanted = tuple(sorted(seen))
    if changed != wanted:
        raise PublicationRefusal("selection must map exactly to non-empty candidate delta")

    _assert_source(repo, source_branch, base, base_tree)
    return Candidate(
        repo=repo,
        source_branch=source_branch,
        base=base,
        base_tree=base_tree,
        tree=tree,
        selection_digest=_selection_digest(digest_rows),
        selected_paths=wanted,
        human_index_tree=base_tree,
    )


def _tree_entries(repo: Path, tree: str) -> list[tuple[str, str, str, str]]:
    raw = _run(repo, ["ls-tree", "-r", "-z", tree]).stdout
    result = []
    for row in (x for x in raw.split(b"\0") if x):
        if b"\t" not in row:
            raise PublicationRefusal("invalid tree entry")
        meta, path_raw = row.split(b"\t", 1)
        mode, kind, oid = meta.decode().split()
        path = path_raw.decode("utf-8", "surrogateescape")
        if kind != "blob" or mode not in ALLOWED_MODES:
            raise PublicationRefusal("candidate tree contains unsupported symlink/gitlink/mode")
        result.append((path, mode, kind, oid))
    return result


def _materialize_exact_tree(repo: Path, tree: str, root: Path) -> tuple[str, int]:
    manifest: list[dict[str, str]] = []
    for path, mode, _kind, oid in _tree_entries(repo, tree):
        rel = _normalize_path(path)
        target = (root / rel).resolve()
        try:
            target.relative_to(root.resolve())
        except ValueError:
            raise PublicationRefusal("tree path escapes validation root")
        target.parent.mkdir(parents=True, exist_ok=True)
        blob = _run(repo, ["cat-file", "blob", oid]).stdout
        target.write_bytes(blob)
        target.chmod(0o755 if mode == "100755" else 0o644)
        rehash = _run(repo, ["hash-object", "--stdin"], input_bytes=target.read_bytes()).stdout.decode().strip()
        if rehash != oid:
            raise PublicationRefusal("materialized bytes do not match candidate tree")
        manifest.append({"path": rel, "mode": mode, "blob": oid, "sha256": hashlib.sha256(blob).hexdigest()})
    digest = hashlib.sha256(
        json.dumps(manifest, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    return digest, len(manifest)


def validate_candidate(candidate: Candidate, validator: Callable[[Path], Any]) -> ValidationReceipt:
    """Validate an exact plain-file materialization of T in a sibling directory.

    V1 intentionally provides no .git directory and no original repository path.
    Validators requiring those contexts are outside the contract and must not be
    passed here.
    """
    if not isinstance(candidate, Candidate):
        raise PublicationRefusal("candidate required")
    if not callable(validator):
        raise PublicationRefusal("validator callable required")
    repo = _repo(candidate.repo)
    _assert_source(repo, candidate.source_branch, candidate.base, candidate.base_tree)

    raw = tempfile.mkdtemp(prefix=".git1-validate-", dir=str(repo.parent))
    root = Path(raw)
    try:
        manifest_digest, count = _materialize_exact_tree(repo, candidate.tree, root)
        result = validator(root)
        if result is False:
            raise PublicationRefusal("validator returned false")
    finally:
        shutil.rmtree(root, ignore_errors=True)

    _assert_source(repo, candidate.source_branch, candidate.base, candidate.base_tree)
    return ValidationReceipt(
        candidate_tree=candidate.tree,
        manifest_digest=manifest_digest,
        file_count=count,
        materialization_contract=candidate.materialization_contract,
        validator_result=result,
    )


def create_commit(candidate: Candidate, validation: ValidationReceipt, *, message: str) -> CommitReceipt:
    """Create one commit object K with parent B; does not move any reference."""
    if not isinstance(candidate, Candidate) or not isinstance(validation, ValidationReceipt):
        raise PublicationRefusal("candidate and validation receipt required")
    if validation.candidate_tree != candidate.tree:
        raise PublicationRefusal("validation receipt does not attest candidate tree")
    if not isinstance(message, str) or not message.strip() or "\x00" in message:
        raise PublicationRefusal("commit message required")
    repo = _repo(candidate.repo)
    _assert_source(repo, candidate.source_branch, candidate.base, candidate.base_tree)

    cp = _run(
        repo,
        ["commit-tree", candidate.tree, "-p", candidate.base],
        input_bytes=(message.rstrip() + "\n").encode("utf-8"),
    )
    commit = cp.stdout.decode().strip()
    if _text(repo, "rev-parse", f"{commit}^{{tree}}") != candidate.tree:
        raise PublicationRefusal("commit tree mismatch")
    parents = _text(repo, "show", "-s", "--format=%P", commit).split()
    if parents != [candidate.base]:
        raise PublicationRefusal("commit parent mismatch")
    _assert_source(repo, candidate.source_branch, candidate.base, candidate.base_tree)
    return CommitReceipt(commit=commit, tree=candidate.tree, parent=candidate.base)


def publish_ref(candidate: Candidate, commit: CommitReceipt, *,
                destination_branch: str, expected_old: str) -> PublicationReceipt:
    """CAS-publish K to one explicit non-checked-out local branch.

    Keeping the destination off the checked-out branch is the V1 mechanism that
    preserves both the bytes and the meaning of the human index.
    """
    if not isinstance(candidate, Candidate) or not isinstance(commit, CommitReceipt):
        raise PublicationRefusal("candidate and commit receipt required")
    if commit.tree != candidate.tree or commit.parent != candidate.base:
        raise PublicationRefusal("commit receipt does not belong to candidate")
    repo = _repo(candidate.repo)
    _assert_source(repo, candidate.source_branch, candidate.base, candidate.base_tree)

    old = _full_oid(repo, expected_old, "commit")
    if old != candidate.base:
        raise PublicationRefusal("destination old value must equal candidate base")
    current_branch = _current_branch(repo)
    if destination_branch == current_branch:
        raise PublicationRefusal("publishing to checked-out branch is outside GIT1 V1")
    ref = _ref_for_branch(repo, destination_branch)
    cp = _run(repo, ["rev-parse", "--verify", ref], check=False)
    if cp.returncode != 0:
        raise PublicationRefusal("destination branch must already exist at expected base")
    observed = cp.stdout.decode().strip()
    if observed != old:
        raise PublicationRefusal("destination branch drift")

    update = _run(repo, ["update-ref", ref, commit.commit, old], check=False)
    if update.returncode != 0:
        raise PublicationRefusal("destination branch moved concurrently; publication refused")
    if _text(repo, "rev-parse", ref) != commit.commit:
        raise PublicationRefusal("published ref verification failed")

    _assert_source(repo, candidate.source_branch, candidate.base, candidate.base_tree)
    return PublicationReceipt(
        ref=ref,
        old=old,
        new=commit.commit,
        source_head=_text(repo, "rev-parse", "HEAD"),
        human_index_tree=_human_index_tree(repo),
    )
