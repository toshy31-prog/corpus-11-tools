"""Thin in-process orchestration over the existing GIT1 owner.

This module does not duplicate Git mechanics.  It only composes
build_candidate -> validate_candidate -> create_commit into one preparatory
operation and keeps local-ref publication explicit and separate.

It intentionally does NOT push remotes, update the checked-out branch, persist
prepared state, expose MCP, or treat a client-serialized receipt as authority.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

import bounded_single_commit_publication as git1


@dataclass(frozen=True)
class PreparedPublication:
    candidate: git1.Candidate
    validation: git1.ValidationReceipt
    commit: git1.CommitReceipt


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
