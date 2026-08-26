"""Graphe enrichi par références textuelles explicites, sans inférence sémantique."""

from __future__ import annotations

import re
from pathlib import Path

from build_knowledge_graph import build_graph
from kernel import material_paths


MARKDOWN_LINK = re.compile(r"\[[^\]]*\]\(([^)#]+)(?:#[^)]+)?\)")
PATH_LITERAL = re.compile(r"`((?:[\w.-]+/)+[\w.-]+\.(?:md|json|jsonl|py|txt))`")


def _resolve(root: Path, source: Path, raw: str) -> str | None:
    candidate = (source.parent / raw).resolve()
    try:
        relative = candidate.relative_to(root.resolve())
    except ValueError:
        return None
    return relative.as_posix() if candidate.is_file() else None


def enrich(root: Path) -> dict:
    base = build_graph(root)
    material = {path.relative_to(root).as_posix() for path in material_paths(root)}
    edges = list(base["edges"])
    seen = {(edge["from"], edge["type"], edge["to"]) for edge in edges}
    added = []
    for path in material_paths(root):
        if path.suffix.casefold() not in {".md", ".txt"}:
            continue
        try:
            content = path.read_text(errors="ignore")
        except OSError:
            continue
        source = path.relative_to(root).as_posix()
        references = [(value, "markdown_link") for value in MARKDOWN_LINK.findall(content)] + [(value, "path_literal") for value in PATH_LITERAL.findall(content)]
        for raw, channel in references:
            target = _resolve(root, path, raw)
            if target is None or target not in material or target == source:
                continue
            edge = {"from": f"material:{source}", "type": "references_explicitly", "to": f"material:{target}", "source": source, "channel": channel, "status": "declared_textual_reference_not_semantic_entailment"}
            key = (edge["from"], edge["type"], edge["to"])
            if key not in seen:
                seen.add(key); edges.append(edge); added.append(edge)
    return {"schema_version": 1, "base_snapshot_fingerprint": base["snapshot_fingerprint"], "node_count": base["node_count"], "base_edge_count": base["edge_count"], "edge_count": len(edges), "added_explicit_reference_count": len(added), "nodes": base["nodes"], "edges": edges, "method_boundary": {"included": ["resolvable relative Markdown links", "path literals in backticks"], "excluded": ["external URLs", "unresolved paths", "semantic similarity", "implicit conceptual relations"], "claim": "explicit textual reference extraction only"}}
