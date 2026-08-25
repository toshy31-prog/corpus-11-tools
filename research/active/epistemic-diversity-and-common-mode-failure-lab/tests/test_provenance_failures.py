#!/usr/bin/env python3
"""Complete fictional provenance graph with explicit failure injection."""

from __future__ import annotations


PATHS = {
    "a": {
        "sources": {"s1"},
        "dependencies": {"source:s1", "generator:g-shared", "assumption:h-shared", "code:ca", "measurement:ma"},
        "conclusion": "retain",
    },
    "b": {
        "sources": {"s2"},
        "dependencies": {"source:s2", "generator:g-shared", "assumption:h-shared", "code:cb", "measurement:mb"},
        "conclusion": "retain",
    },
    "c": {
        "sources": {"s3"},
        "dependencies": {"source:s3", "generator:gc", "assumption:hc", "code:cc", "measurement:mc"},
        "conclusion": "revise",
    },
    "d": {
        "sources": {"s4"},
        "dependencies": {"source:s4", "generator:gd", "assumption:hd", "code:cd", "measurement:md"},
        "conclusion": "revise",
    },
}


def shared_dependencies(left: str, right: str) -> set[str]:
    return PATHS[left]["dependencies"] & PATHS[right]["dependencies"]


def impacted_paths(failed_dependency: str) -> set[str]:
    return {path_id for path_id, path in PATHS.items() if failed_dependency in path["dependencies"]}


def source_only_independent(left: str, right: str) -> bool:
    return not (PATHS[left]["sources"] & PATHS[right]["sources"])


def evidence_clusters() -> set[frozenset[str]]:
    remaining = set(PATHS)
    clusters: set[frozenset[str]] = set()
    while remaining:
        frontier = {remaining.pop()}
        cluster = set(frontier)
        while frontier:
            current = frontier.pop()
            neighbors = {
                candidate
                for candidate in remaining
                if shared_dependencies(current, candidate)
            }
            remaining -= neighbors
            frontier |= neighbors
            cluster |= neighbors
        clusters.add(frozenset(cluster))
    return clusters


def main() -> None:
    assert source_only_independent("a", "b")
    assert shared_dependencies("a", "b") == {"generator:g-shared", "assumption:h-shared"}
    assert impacted_paths("generator:g-shared") == {"a", "b"}
    assert impacted_paths("assumption:h-shared") == {"a", "b"}

    assert PATHS["c"]["conclusion"] == PATHS["d"]["conclusion"]
    assert shared_dependencies("c", "d") == set()
    assert impacted_paths("source:s3") == {"c"}
    assert impacted_paths("code:cd") == {"d"}

    clusters = evidence_clusters()
    assert clusters == {frozenset({"a", "b"}), frozenset({"c"}), frozenset({"d"})}
    assert sum(len(cluster) for cluster in clusters) == len(PATHS)
    print("PASS provenance failures: 4 paths form 3 evidence clusters; source-only proxy loses")


if __name__ == "__main__":
    main()
