"""Adaptation reproductible des triplets déclarés au modèle neuronal v1.6."""

from __future__ import annotations

from build_knowledge_graph import build_graph


def descriptors(root):
    graph = build_graph(root)
    result = {}
    for node in graph["nodes"]:
        result[node["id"]] = " ".join(str(node.get(key, "")) for key in ("kind", "path", "name", "description", "prompt", "surface", "status", "source"))
    return result


def relation_index(rows):
    return {name: index for index, name in enumerate(sorted({row["relation"] for row in rows}))}
