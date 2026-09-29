"""Thin in-process orchestration over the existing GIT1 owner.

This module does not duplicate Git mechanics.  It only composes
build_candidate -> validate_candidate -> create_commit into one preparatory
operation and keeps local-ref publication explicit and separate.

It intentionally does NOT push remotes, update the checked-out branch, persist
prepared state, expose MCP, or treat a client-serialized receipt as authority.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import bounded_single_commit_publication as git1


@dataclass(frozen=True)
class PreparedPublication:
    candidate: git1.Candidate
    validation: git1.ValidationReceipt
    commit: git1.CommitReceipt


@dataclass(frozen=True)
class WorktreeSelection:
    path: str
    expected_head_blob: str
    expected_worktree_blob: str


@dataclass(frozen=True)
class PreparedWorktreeCommit:
    candidate: git1.Candidate
    validation: git1.ValidationReceipt
    selections: tuple[WorktreeSelection, ...]
    message: str


def _worktree_file_selection(repo: Path, base: str, item: WorktreeSelection) -> git1.FileSelection:
    if not isinstance(item, WorktreeSelection):
        raise git1.PublicationRefusal("worktree selection required")
    path = git1._normalize_path(item.path)
    entry = git1._base_entry(repo, base, path)
    if entry is None:
        raise git1.PublicationRefusal("tracked target required")
    mode, kind, head_blob = entry
    if kind != "blob" or mode not in git1.ALLOWED_MODES:
        raise git1.PublicationRefusal("regular tracked target required")
    if head_blob != item.expected_head_blob:
        raise git1.PublicationRefusal("unexpected head blob")
    target = (repo / path).resolve()
    try:
        target.relative_to(repo)
    except ValueError as exc:
        raise git1.PublicationRefusal("target outside repository") from exc
    if not target.is_file():
        raise git1.PublicationRefusal("target missing")
    content = target.read_bytes()
    worktree_blob = git1._run(repo, ["hash-object", "--stdin"], input_bytes=content).stdout.decode().strip()
    if worktree_blob != item.expected_worktree_blob:
        raise git1.PublicationRefusal("unexpected worktree blob")
    return git1.FileSelection(path=path, mode=mode, content=content)


def prepare_worktree_commit(
    repo,
    *,
    source_branch: str,
    expected_base: str,
    files: list[WorktreeSelection],
    validator: Callable,
    message: str,
) -> PreparedWorktreeCommit:
    repo = git1._repo(repo)
    base = git1._full_oid(repo, expected_base, "commit")
    if not isinstance(files, list) or not files:
        raise git1.PublicationRefusal("non-empty explicit worktree selection required")
    selections = [_worktree_file_selection(repo, base, item) for item in files]
    candidate = git1.build_candidate(
        repo,
        source_branch=source_branch,
        expected_base=base,
        selections=selections,
    )
    validation = git1.validate_candidate(candidate, validator)
    return PreparedWorktreeCommit(
        candidate=candidate,
        validation=validation,
        selections=tuple(files),
        message=message,
    )


def commit_prepared_worktree(value: PreparedWorktreeCommit) -> git1.CommitReceipt:
    if not isinstance(value, PreparedWorktreeCommit):
        raise git1.PublicationRefusal("prepared worktree commit required")
    git1._assert_source(
        value.candidate.repo,
        value.candidate.source_branch,
        value.candidate.base,
        value.candidate.base_tree,
    )
    current = [
        _worktree_file_selection(value.candidate.repo, value.candidate.base, item)
        for item in value.selections
    ]
    current_paths = tuple(item.path for item in current)
    if current_paths != value.candidate.selected_paths:
        raise git1.PublicationRefusal("target selection drift")
    return git1.create_commit(value.candidate, value.validation, message=value.message)


def cas_checked_out_source_branch(
    prepared: PreparedWorktreeCommit,
    commit: git1.CommitReceipt,
    *,
    expected_old: str,
) -> git1.PublicationReceipt:
    if not isinstance(prepared, PreparedWorktreeCommit):
        raise git1.PublicationRefusal("prepared worktree commit required")
    if not isinstance(commit, git1.CommitReceipt):
        raise git1.PublicationRefusal("commit receipt required")

    candidate = prepared.candidate
    repo = candidate.repo
    git1._assert_source(repo, candidate.source_branch, candidate.base, candidate.base_tree)

    if expected_old != candidate.base:
        raise git1.PublicationRefusal("expected old must equal prepared base")
    if prepared.validation.candidate_tree != candidate.tree:
        raise git1.PublicationRefusal("prepared validation does not attest candidate tree")
    if commit.parent != candidate.base:
        raise git1.PublicationRefusal("commit parent mismatch")
    if commit.tree != candidate.tree:
        raise git1.PublicationRefusal("commit tree mismatch")
    git1._full_oid(repo, commit.commit, "commit")
    if git1._text(repo, "rev-parse", f"{commit.commit}^{{tree}}") != commit.tree:
        raise git1.PublicationRefusal("commit object tree mismatch")
    parents = git1._text(repo, "rev-list", "--parents", "-n", "1", commit.commit).split()
    if len(parents) != 2 or parents[1] != candidate.base:
        raise git1.PublicationRefusal("commit object parent mismatch")

    current = [
        _worktree_file_selection(repo, candidate.base, item)
        for item in prepared.selections
    ]
    if tuple(item.path for item in current) != candidate.selected_paths:
        raise git1.PublicationRefusal("target selection drift")

    ref = git1._ref_for_branch(repo, candidate.source_branch)
    symbolic = git1._text(repo, "symbolic-ref", "-q", "HEAD")
    if symbolic != ref:
        raise git1.PublicationRefusal("HEAD no longer points to prepared branch")
    current_old = git1._text(repo, "rev-parse", ref)
    if current_old != candidate.base:
        raise git1.PublicationRefusal("source branch stale")

    # Exact atomic compare-and-swap of the checked-out source ref only.
    git1._run(repo, ["update-ref", ref, commit.commit, candidate.base])

    if git1._text(repo, "rev-parse", "HEAD") != commit.commit:
        raise git1.PublicationRefusal("HEAD did not converge to new commit")
    if git1._text(repo, "rev-parse", ref) != commit.commit:
        raise git1.PublicationRefusal("source branch did not converge to new commit")

    return git1.PublicationReceipt(
        ref=ref,
        old=candidate.base,
        new=commit.commit,
        source_head=commit.commit,
        human_index_tree=candidate.human_index_tree,
    )


def reconcile_published_target_index(
    prepared: PreparedWorktreeCommit,
    commit: git1.CommitReceipt,
    cas_receipt: git1.PublicationReceipt,
) -> dict:
    if not isinstance(prepared, PreparedWorktreeCommit):
        raise git1.PublicationRefusal("prepared worktree commit required")
    if not isinstance(commit, git1.CommitReceipt):
        raise git1.PublicationRefusal("commit receipt required")
    if not isinstance(cas_receipt, git1.PublicationReceipt):
        raise git1.PublicationRefusal("CAS receipt required")

    candidate = prepared.candidate
    repo = candidate.repo
    ref = git1._ref_for_branch(repo, candidate.source_branch)
    if cas_receipt.ref != ref or cas_receipt.old != candidate.base or cas_receipt.new != commit.commit:
        raise git1.PublicationRefusal("CAS receipt mismatch")
    if commit.parent != candidate.base or commit.tree != candidate.tree:
        raise git1.PublicationRefusal("commit receipt mismatch")
    if prepared.validation.candidate_tree != candidate.tree:
        raise git1.PublicationRefusal("validation/candidate mismatch")
    if git1._text(repo, "symbolic-ref", "-q", "HEAD") != ref:
        raise git1.PublicationRefusal("HEAD no longer points to prepared branch")
    if git1._text(repo, "rev-parse", "HEAD") != commit.commit:
        raise git1.PublicationRefusal("published HEAD mismatch")
    if git1._text(repo, "rev-parse", ref) != commit.commit:
        raise git1.PublicationRefusal("published source ref mismatch")

    targets = set(candidate.selected_paths)
    before_entries = git1._text(repo, "ls-files", "-s").splitlines()
    before_foreign = [line for line in before_entries if line.split("	",1)[-1] not in targets]
    worktree_before = {}
    updates = []

    for item in prepared.selections:
        path = git1._normalize_path(item.path)
        rows = git1._text(repo, "ls-files", "-s", "--", path).splitlines()
        if len(rows) != 1:
            raise git1.PublicationRefusal("target index entry missing or ambiguous")
        meta, indexed_path = rows[0].split("	", 1)
        mode, index_blob, stage = meta.split()
        if indexed_path != path or stage != "0":
            raise git1.PublicationRefusal("target index entry invalid")
        if index_blob != item.expected_head_blob:
            raise git1.PublicationRefusal("target index changed since prepare")

        published = git1._base_entry(repo, commit.commit, path)
        if published is None:
            raise git1.PublicationRefusal("published target missing")
        published_mode, kind, published_blob = published
        if kind != "blob" or published_mode not in git1.ALLOWED_MODES:
            raise git1.PublicationRefusal("published target invalid")

        target = (repo / path).resolve()
        worktree_before[path] = target.read_bytes()
        updates.append(f"{published_mode} {published_blob}\t{path}\n")

    git1._run(repo, ["update-index", "--index-info"], input_bytes="".join(updates).encode())

    after_entries = git1._text(repo, "ls-files", "-s").splitlines()
    after_foreign = [line for line in after_entries if line.split("	",1)[-1] not in targets]
    if after_foreign != before_foreign:
        raise git1.PublicationRefusal("foreign index entries changed")

    reconciled = {}
    for item in prepared.selections:
        path = item.path
        published_mode, _, published_blob = git1._base_entry(repo, commit.commit, path)
        rows = git1._text(repo, "ls-files", "-s", "--", path).splitlines()
        mode, index_blob, stage = rows[0].split("	",1)[0].split()
        if mode != published_mode or index_blob != published_blob or stage != "0":
            raise git1.PublicationRefusal("target index reconciliation failed")
        target = (repo / path).resolve()
        if target.read_bytes() != worktree_before[path]:
            raise git1.PublicationRefusal("target worktree changed during reconciliation")
        reconciled[path] = published_blob

    return {
        "ref": ref,
        "commit": commit.commit,
        "targets": reconciled,
        "foreign_index_entries_preserved": True,
        "worktree_preserved": True,
    }


def prepare_bounded_publication(
    repo,
    *,
    source_branch: str,
    expected_base: str,
    selections: list[git1.FileSelection],
    validator: Callable,
    message: str,
) -> PreparedPublication:
    """Build T, validate exact T, then create K(parent=B, tree=T).

    No reference is moved and no remote is contacted.
    """
    candidate = git1.build_candidate(
        repo,
        source_branch=source_branch,
        expected_base=expected_base,
        selections=selections,
    )
    validation = git1.validate_candidate(candidate, validator)
    commit = git1.create_commit(candidate, validation, message=message)
    return PreparedPublication(
        candidate=candidate,
        validation=validation,
        commit=commit,
    )


def _check_prepared(value: Any) -> PreparedPublication:
    if not isinstance(value, PreparedPublication):
        raise git1.PublicationRefusal("prepared publication required")
    if value.validation.candidate_tree != value.candidate.tree:
        raise git1.PublicationRefusal("prepared validation does not attest candidate tree")
    if value.commit.tree != value.candidate.tree:
        raise git1.PublicationRefusal("prepared commit tree mismatch")
    if value.commit.parent != value.candidate.base:
        raise git1.PublicationRefusal("prepared commit parent mismatch")
    return value


def publish_prepared(
    prepared: PreparedPublication,
    *,
    destination_branch: str,
    expected_old: str,
) -> git1.PublicationReceipt:
    """CAS-publish an in-process prepared K to a non-checked-out local branch.

    This deliberately delegates every refusal to GIT1 and performs no push.
    """
    value = _check_prepared(prepared)
    return git1.publish_ref(
        value.candidate,
        value.commit,
        destination_branch=destination_branch,
        expected_old=expected_old,
    )
