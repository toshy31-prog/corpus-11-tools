"""Triplets déclarés du graphe Corpus et contre-exemples explicitement corrompus."""

from __future__ import annotations

from collections import Counter, defaultdict
import hashlib
from pathlib import Path

from build_knowledge_graph import build_graph


SALT = "corpus-declared-triples-v1.6"
ACTIVE = ("train", "validation", "test")


def triples(root: Path) -> list[dict]:
    graph = build_graph(root)
    nodes = {node["id"]: node for node in graph["nodes"]}
    positives = [{"source": edge["from"], "relation": edge["type"], "target": edge["to"], "label": 1} for edge in graph["edges"]]
    existing = {(row["source"], row["relation"], row["target"]) for row in positives}
    by_kind = defaultdict(list)
    for node_id, node in nodes.items():
        by_kind[node["kind"]].append(node_id)
    rows = []
    for positive in positives:
        rows.append(positive)
        candidates = sorted(by_kind[nodes[positive["target"]]["kind"]])
        offset = int(hashlib.sha256(f"{SALT}:{positive['source']}:{positive['relation']}:{positive['target']}".encode()).hexdigest()[:8], 16) % len(candidates)
        for index in range(len(candidates)):
            target = candidates[(offset + index) % len(candidates)]
            candidate = (positive["source"], positive["relation"], target)
            if candidate not in existing:
                rows.append({"source": positive["source"], "relation": positive["relation"], "target": target, "label": 0, "corruption": "target_same_node_kind"})
                break
        else:
            raise RuntimeError(f"Unable to corrupt triple {positive}")
    return rows


def split(rows: list[dict]) -> dict[str, list[dict]]:
    """Même partition pour un positif et son négatif, stratifiée par relation."""
    grouped = defaultdict(list)
    for row in rows:
        key = (row["source"], row["relation"])
        grouped[key].append(row)
    partitions = {name: [] for name in ACTIVE}
    for key, pair in grouped.items():
        bucket = int(hashlib.sha256(f"{SALT}:{key[0]}:{key[1]}".encode()).hexdigest()[:8], 16) % 100
        partition = "train" if bucket < 80 else "validation" if bucket < 90 else "test"
        partitions[partition].extend(pair)
    return partitions


def manifest(partitions: dict[str, list[dict]]) -> dict:
    return {"triple_count": {name: len(rows) for name, rows in partitions.items()}, "positive_count": {name: sum(row["label"] for row in rows) for name, rows in partitions.items()}, "relations": {name: dict(Counter(row["relation"] for row in rows if row["label"])) for name, rows in partitions.items()}, "negative_construction": "replace target with a node of same declared kind, reject an existing declared triple", "split": "sha256(source + relation), paired positive/negative remain together", "scope_limit": "Declared graph edges only; a negative is a synthetic corruption, not evidence that the relation is false in the world."}
