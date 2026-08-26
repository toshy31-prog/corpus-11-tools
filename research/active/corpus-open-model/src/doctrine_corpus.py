"""Compilation statutaire des textes utilisables par DoctrineCorpusNet."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from kernel import EXCLUDED_PARTS, surface_for
from neural_router import tokens


TEXT_EXTENSIONS = {".md", ".json", ".jsonl", ".csv", ".txt"}
PROJECT_PREFIX = "research/active/corpus-open-model/"


@dataclass(frozen=True)
class DoctrineDocument:
    path: str
    surface: str
    status: str
    tokens: list[str]


def status_for(surface: str, path: str) -> str:
    if surface == "product":
        return "product_declared_not_established"
    if surface == "research":
        return "research_bounded_not_product_runtime"
    if surface == "transfer":
        return "transfer_record_not_active_rule"
    if surface == "archive":
        return "historical_memory_non_executable"
    return "workspace_context"


def compile_corpus(root: Path) -> list[DoctrineDocument]:
    documents = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        rel = relative.as_posix()
        if rel.startswith(PROJECT_PREFIX) or path.suffix.casefold() not in TEXT_EXTENSIONS:
            continue
        if any(part in EXCLUDED_PARTS or part == ".git" or part.startswith(".venv") for part in relative.parts):
            continue
        try:
            content = path.read_text(errors="ignore")
        except OSError:
            continue
        document_tokens = tokens(content)
        if document_tokens:
            surface = surface_for(rel)
            documents.append(DoctrineDocument(rel, surface, status_for(surface, rel), document_tokens))
    return documents


def manifest(documents: list[DoctrineDocument]) -> dict:
    counts = {}
    for document in documents:
        counts[document.surface] = counts.get(document.surface, 0) + 1
    return {"document_count": len(documents), "token_count": sum(len(document.tokens) for document in documents), "documents_by_surface": counts, "self_training_excluded_prefix": PROJECT_PREFIX}
