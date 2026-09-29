"""Pure declarative source-ownership compatibility for Corpus.

PAR1 V1 does not reserve files, mutate Git, persist state, authorize actions,
or schedule work.  It only validates small work declarations and computes a
deterministic compatibility verdict before any writer is launched.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import PurePosixPath
import re
from typing import Any

_FULL_OID = re.compile(r"^[0-9a-f]{40,64}$")
_REQUIRED = {"frontier_id", "baseline_head", "read_set", "write_set"}
_OPTIONAL = {"purpose"}


class OwnershipDeclarationError(ValueError):
    """A declaration is ambiguous or outside the V1 path contract."""


@dataclass(frozen=True)
class WorkDeclaration:
    frontier_id: str
    baseline_head: str
    read_set: tuple[str, ...]
    write_set: tuple[str, ...]
    purpose: str | None = None


def _frontier_id(value: Any) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > 200:
        raise OwnershipDeclarationError("frontier_id invalide")
    return value.strip()


def _baseline(value: Any) -> str:
    if not isinstance(value, str) or not _FULL_OID.fullmatch(value):
        raise OwnershipDeclarationError("baseline_head doit être un OID complet canonique")
    return value


def _path(value: Any) -> str:
    if not isinstance(value, str) or not value or "\x00" in value or "\\" in value:
        raise OwnershipDeclarationError("path invalide")
    p = PurePosixPath(value)
    if p.is_absolute() or value.endswith("/"):
        raise OwnershipDeclarationError("path non relatif ou ambigu")
    if any(part in {"", ".", "..", ".git"} for part in p.parts):
        raise OwnershipDeclarationError("path protégé ou traversal")
    normalized = p.as_posix()
    if normalized != value:
        raise OwnershipDeclarationError("path non canonique")
    return normalized


def _path_set(value: Any, field: str) -> tuple[str, ...]:
    if not isinstance(value, (list, tuple)):
        raise OwnershipDeclarationError(field + " doit être une liste")
    rows = [_path(item) for item in value]
    if len(rows) != len(set(rows)):
        raise OwnershipDeclarationError(field + " contient un doublon")
    return tuple(sorted(rows))


def normalize_declaration(value: Any) -> WorkDeclaration:
    """Validate and canonicalize one caller-supplied declaration."""
    if isinstance(value, WorkDeclaration):
        value = {
            "frontier_id": value.frontier_id,
            "baseline_head": value.baseline_head,
            "read_set": list(value.read_set),
            "write_set": list(value.write_set),
            "purpose": value.purpose,
        }
    if not isinstance(value, dict):
        raise OwnershipDeclarationError("déclaration objet requise")
    keys = set(value)
    if not _REQUIRED.issubset(keys) or keys - _REQUIRED - _OPTIONAL:
        raise OwnershipDeclarationError("champs déclaration incomplets ou inconnus")
    read_set = _path_set(value["read_set"], "read_set")
    write_set = _path_set(value["write_set"], "write_set")
    overlap = sorted(set(read_set) & set(write_set))
    if overlap:
        raise OwnershipDeclarationError(
            "un même path ne peut pas être déclaré simultanément read/write: "
            + ",".join(overlap)
        )
    purpose = value.get("purpose")
    if purpose is not None:
        if not isinstance(purpose, str) or not purpose.strip() or len(purpose) > 500:
            raise OwnershipDeclarationError("purpose invalide")
        purpose = purpose.strip()
    return WorkDeclaration(
        frontier_id=_frontier_id(value["frontier_id"]),
        baseline_head=_baseline(value["baseline_head"]),
        read_set=read_set,
        write_set=write_set,
        purpose=purpose,
    )


def _invalid(side: str, exc: Exception) -> dict:
    return {
        "status": "invalid_declaration",
        "invalid_side": side,
        "error": str(exc),
        "conflict_paths": [],
        "conflicts": {},
        "stale_frontiers": [],
    }


def compare_declarations(left: Any, right: Any, *, current_head: str | None = None) -> dict:
    """Return compatible/conflict/stale_baseline/invalid_declaration.

    Baseline mismatch between two otherwise disjoint declarations is not itself
    a conflict.  When current_head is supplied, declarations based on another
    HEAD are surfaced as stale so the caller can re-check assumptions before
    mutation.  A path conflict takes precedence while still reporting staleness.
    """
    try:
        a = normalize_declaration(left)
    except OwnershipDeclarationError as exc:
        return _invalid("left", exc)
    try:
        b = normalize_declaration(right)
    except OwnershipDeclarationError as exc:
        return _invalid("right", exc)

    if current_head is not None:
        try:
            current_head = _baseline(current_head)
        except OwnershipDeclarationError as exc:
            return _invalid("current_head", exc)

    aw, ar = set(a.write_set), set(a.read_set)
    bw, br = set(b.write_set), set(b.read_set)
    conflicts = {
        "write_write": sorted(aw & bw),
        "left_write_right_read": sorted(aw & br),
        "left_read_right_write": sorted(ar & bw),
    }
    conflicts = {kind: paths for kind, paths in conflicts.items() if paths}
    conflict_paths = sorted({path for paths in conflicts.values() for path in paths})

    stale = []
    if current_head is not None:
        if a.baseline_head != current_head:
            stale.append(a.frontier_id)
        if b.baseline_head != current_head:
            stale.append(b.frontier_id)

    if conflict_paths:
        status = "conflict"
    elif stale:
        status = "stale_baseline"
    else:
        status = "compatible"

    return {
        "status": status,
        "left": a.frontier_id,
        "right": b.frontier_id,
        "baseline_relation": "same" if a.baseline_head == b.baseline_head else "different",
        "conflict_paths": conflict_paths,
        "conflicts": conflicts,
        "stale_frontiers": sorted(stale),
    }
