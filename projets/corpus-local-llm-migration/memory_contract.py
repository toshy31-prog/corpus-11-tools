"""Inspectable, proposal-only memory tiers for local Corpus projects.

This module never edits notes, an index, a checkpoint, or project configuration.
It inventories regular Markdown/text files and returns deterministic classification
candidates. A person must explicitly choose any note included in a resume packet.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path

SCHEMA_VERSION = 1
MAX_FILES = 500
MAX_FILE_BYTES = 1024 * 1024
CORE_RECOMMENDED_CHARS = 2200
LEVELS = {
    "core": {
        "label": "Noyau",
        "purpose": "Décisions et contraintes durables, compactes et relues.",
        "injection": "Seulement après sélection explicite dans une reprise.",
    },
    "recall": {
        "label": "Rappel",
        "purpose": "Notes de travail ou contexte à retrouver selon la tâche.",
        "injection": "À rechercher ou sélectionner à la demande.",
    },
    "archive": {
        "label": "Archive",
        "purpose": "Historique conservé, non injecté par défaut.",
        "injection": "Consultation explicite uniquement.",
    },
    "procedural": {
        "label": "Procédural",
        "purpose": "Méthodes, contrats, guides et procédures reproductibles.",
        "injection": "Sélection explicite lorsque la procédure est nécessaire.",
    },
}

_SKIP_DIRS = {".git", ".cache", ".venv", "node_modules", "__pycache__", "dist", "build"}
_PROCEDURAL = ("readme", "agents", "plan", "procedure", "process", "workflow", "guide", "contract", "runbook", "instructions", "checklist")
_CORE = ("contexte", "context", "decision", "etat", "state", "profile", "princip", "preference", "constraint")
_ARCHIVE = ("archive", "legacy", "histor", "old", "backup", "handoff")


def _relative(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def _candidate_level(relative: str) -> str:
    name = relative.lower()
    # A procedure is more useful as such than as generic project state.
    if any(token in name for token in _PROCEDURAL):
        return "procedural"
    if any(token in name for token in _ARCHIVE):
        return "archive"
    if any(token in name for token in _CORE):
        return "core"
    return "recall"


def _regular_notes(root: Path):
    count = 0
    for current, dirs, names in os.walk(root, followlinks=False):
        dirs[:] = [entry for entry in dirs if entry not in _SKIP_DIRS and not entry.startswith(".")]
        for name in sorted(names):
            if count >= MAX_FILES:
                return
            if name.startswith(".") or Path(name).suffix.lower() not in (".md", ".txt"):
                continue
            path = Path(current) / name
            try:
                if path.is_symlink() or not path.is_file() or path.stat().st_nlink != 1:
                    continue
                size = path.stat().st_size
            except OSError:
                continue
            count += 1
            yield path, size


def inspect(project) -> dict:
    """Return a bounded, read-only inventory and classification proposals."""
    root = Path(project).resolve(strict=True)
    if not root.is_dir():
        raise ValueError("Dossier de projet requis.")
    rows = []
    duplicates: dict[str, list[str]] = {}
    unreadable = 0
    oversized = 0
    for path, size in _regular_notes(root):
        relative = _relative(root, path)
        digest = None
        if size <= MAX_FILE_BYTES:
            try:
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
            except OSError:
                unreadable += 1
                continue
            duplicates.setdefault(digest, []).append(relative)
        else:
            oversized += 1
        rows.append({
            "path": relative,
            "bytes": size,
            "chars": None,
            "sha256": digest,
            "candidate_level": _candidate_level(relative),
            "proposal": "review_required",
        })
    # Character counts are only needed for core budget suggestions. Do not return text.
    for row in rows:
        if row["candidate_level"] == "core" and row["bytes"] <= MAX_FILE_BYTES:
            try:
                row["chars"] = len((root / row["path"]).read_text(encoding="utf-8"))
            except (OSError, UnicodeDecodeError):
                row["chars"] = None
    by_level = {level: [] for level in LEVELS}
    for row in rows:
        by_level[row["candidate_level"]].append(row)
    core_chars = sum(row["chars"] or 0 for row in by_level["core"])
    duplicate_groups = [paths for paths in duplicates.values() if len(paths) > 1]
    proposals = []
    for level, items in by_level.items():
        for row in items:
            proposals.append({"path": row["path"], "level": level, "action": "review_before_classification"})
    if core_chars > CORE_RECOMMENDED_CHARS:
        proposals.append({"level": "core", "action": "review_for_compaction", "chars": core_chars,
                          "recommended_max_chars": CORE_RECOMMENDED_CHARS})
    for group in duplicate_groups:
        proposals.append({"paths": group, "action": "review_duplicate_notes"})
    return {
        "schema_version": SCHEMA_VERSION,
        "mode": "proposal_only",
        "writes_performed": False,
        "project": str(root),
        "contract": {"levels": LEVELS, "core_recommended_chars": CORE_RECOMMENDED_CHARS,
                     "automatic_injection": False, "automatic_reclassification": False},
        "inventory": {"notes": rows, "by_level": {level: len(items) for level, items in by_level.items()},
                      "duplicate_groups": duplicate_groups, "unreadable": unreadable,
                      "oversized_for_digest": oversized, "scan_limit": MAX_FILES,
                      "scan_complete": len(rows) < MAX_FILES},
        "proposals": proposals,
        "limits": [
            "Les niveaux sont des candidats déterministes issus des chemins, pas une compréhension du contenu.",
            "Aucune note, index, reprise ou configuration n’est modifié.",
            "Une note reste transmise seulement après sélection explicite dans une reprise.",
        ],
    }
