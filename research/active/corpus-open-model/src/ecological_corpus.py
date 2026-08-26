"""Compilation documentaire du milieu Corpus pour la variante écologique v1.4.

La compilation conserve des signaux de contexte observables. Ils ne sont pas
des labels de vérité ni des relations inférées : surface, statut déclaré,
empreinte de source et degré dans le graphe déclaré restent distincts du texte.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
from pathlib import Path

from build_knowledge_graph import build_graph, material_status
from doctrine_corpus import PROJECT_PREFIX, TEXT_EXTENSIONS
from kernel import EXCLUDED_PARTS, surface_for
from neural_router import tokens


SURFACES = ("workspace", "product", "research", "transfer", "archive")
STATUS_TO_ID = {
    "workspace_context": 0,
    "product_material_declared": 1,
    "research_bounded": 2,
    "transfer_candidate": 3,
    "transfer_accepted": 4,
    "transfer_rejected": 5,
    "historical_memory_non_executable": 6,
}


@dataclass(frozen=True)
class EcologicalDocument:
    path: str
    surface: str
    status: str
    sha256: str
    relation_count: int
    tokens: list[str]

    @property
    def status_id(self) -> int:
        return STATUS_TO_ID[self.status]

    @property
    def relation_bucket(self) -> int:
        return min(self.relation_count, 8)


def compile_ecological_corpus(root: Path) -> list[EcologicalDocument]:
    """Lit les textes admissibles sans traverser les frontières documentaires."""
    graph = build_graph(root)
    relation_counts: dict[str, int] = {}
    for edge in graph["edges"]:
        for endpoint in (edge["from"], edge["to"]):
            if endpoint.startswith("material:"):
                path = endpoint.removeprefix("material:")
                relation_counts[path] = relation_counts.get(path, 0) + 1
    documents = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        rel = relative.as_posix()
        if rel.startswith(PROJECT_PREFIX) or path.suffix.casefold() not in TEXT_EXTENSIONS:
            continue
        if any(part in EXCLUDED_PARTS or part.startswith(".venv") for part in relative.parts):
            continue
        try:
            content = path.read_text(errors="ignore")
        except OSError:
            continue
        document_tokens = tokens(content)
        if document_tokens:
            surface = surface_for(rel)
            documents.append(EcologicalDocument(
                path=rel,
                surface=surface,
                status=material_status(surface, rel),
                sha256=hashlib.sha256(content.encode()).hexdigest(),
                relation_count=relation_counts.get(rel, 0),
                tokens=document_tokens,
            ))
    return documents


def manifest(documents: list[EcologicalDocument]) -> dict:
    by_surface: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for document in documents:
        by_surface[document.surface] = by_surface.get(document.surface, 0) + 1
        by_status[document.status] = by_status.get(document.status, 0) + 1
    return {
        "document_count": len(documents),
        "token_count": sum(len(document.tokens) for document in documents),
        "documents_by_surface": by_surface,
        "documents_by_status": by_status,
        "documents_with_declared_relations": sum(document.relation_count > 0 for document in documents),
        "self_training_excluded_prefix": PROJECT_PREFIX,
        "structural_signals": ["surface", "declared_status", "declared_graph_relation_count", "document_boundary"],
    }
