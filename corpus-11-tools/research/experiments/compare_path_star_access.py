#!/usr/bin/env python3
"""Exact access-cost comparison for path and star trace architectures."""

from __future__ import annotations

import argparse
from collections import deque
import json


Graph = tuple[tuple[int, ...], ...]
SearchState = tuple[int, int]


def path_graph(size: int) -> Graph:
    adjacency = [set() for _ in range(size)]
    for node in range(size - 1):
        adjacency[node].add(node + 1)
        adjacency[node + 1].add(node)
    return tuple(tuple(sorted(neighbors)) for neighbors in adjacency)


def star_graph(size: int) -> Graph:
    adjacency = [set() for _ in range(size)]
    for node in range(1, size):
        adjacency[0].add(node)
        adjacency[node].add(0)
    return tuple(tuple(sorted(neighbors)) for neighbors in adjacency)


def access_depth(graph: Graph, root: int = 0) -> int:
    distances = {root: 0}
    queue = deque([root])
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in distances:
                distances[neighbor] = distances[node] + 1
                queue.append(neighbor)
    if len(distances) != len(graph):
        raise ValueError("graph must be connected")
    return max(distances.values())


def minimal_erasure(
    graph: Graph, root: int = 0, *, require_return_to_root: bool = False
) -> dict[str, object]:
    size = len(graph)
    start: SearchState = (root, (1 << size) - 1)
    queue = deque([start])
    distance = {start: 0}
    predecessor: dict[SearchState, tuple[SearchState, str]] = {}
    goal: SearchState | None = None

    while queue:
        state = queue.popleft()
        position, mask = state
        if mask == 0 and (not require_return_to_root or position == root):
            goal = state
            break
        successors: list[tuple[SearchState, str]] = []
        if mask & (1 << position):
            successors.append(((position, mask & ~(1 << position)), f"RESET {position}"))
        successors.extend(
            ((neighbor, mask), f"MOVE {position}->{neighbor}")
            for neighbor in graph[position]
        )
        for successor, action in successors:
            if successor not in distance:
                distance[successor] = distance[state] + 1
                predecessor[successor] = (state, action)
                queue.append(successor)

    if goal is None:
        raise AssertionError("connected graph unexpectedly has no erasure path")

    actions: list[str] = []
    cursor = goal
    while cursor != start:
        cursor, action = predecessor[cursor]
        actions.append(action)
    actions.reverse()
    reset_count = sum(action.startswith("RESET") for action in actions)
    move_count = sum(action.startswith("MOVE") for action in actions)
    return {
        "erase_work": distance[goal],
        "move_count": move_count,
        "reset_count": reset_count,
        "end_position": goal[0],
        "witness_actions": actions,
        "searched_state_count": len(distance),
    }


def enumerate_size(size: int) -> dict[str, object]:
    path = path_graph(size)
    star = star_graph(size)
    path_result = minimal_erasure(path)
    star_result = minimal_erasure(star)
    path_return_control = minimal_erasure(path, require_return_to_root=True)
    star_return_control = minimal_erasure(star, require_return_to_root=True)
    return {
        "nodes": size,
        "edge_count_each": size - 1,
        "trace_count_each": size,
        "hamming_distance_each": size,
        "read_cost_each": 1,
        "path_access_depth": access_depth(path),
        "star_access_depth": access_depth(star),
        "path": path_result,
        "star": star_result,
        "erase_work_difference_star_minus_path": (
            star_result["erase_work"] - path_result["erase_work"]
        ),
        "return_to_root_control": {
            "path_erase_work": path_return_control["erase_work"],
            "star_erase_work": star_return_control["erase_work"],
            "difference": (
                star_return_control["erase_work"] - path_return_control["erase_work"]
            ),
        },
    }


def verify(rows: list[dict[str, object]]) -> None:
    for row in rows:
        size = row["nodes"]
        assert row["trace_count_each"] == row["hamming_distance_each"] == size
        assert row["read_cost_each"] == 1
        assert row["path_access_depth"] == size - 1
        assert row["star_access_depth"] == 1
        assert row["path"]["reset_count"] == row["star"]["reset_count"] == size
        assert row["path"]["move_count"] == size - 1
        assert row["star"]["move_count"] == 2 * size - 3
        assert row["path"]["erase_work"] == 2 * size - 1
        assert row["star"]["erase_work"] == 3 * size - 3
        assert row["erase_work_difference_star_minus_path"] == size - 2
        assert row["return_to_root_control"]["path_erase_work"] == 3 * size - 2
        assert row["return_to_root_control"]["star_erase_work"] == 3 * size - 2
        assert row["return_to_root_control"]["difference"] == 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-nodes", type=int, default=9)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--include-witnesses", action="store_true")
    args = parser.parse_args()
    if args.max_nodes < 3:
        parser.error("--max-nodes must be at least 3")
    rows = [enumerate_size(size) for size in range(3, args.max_nodes + 1)]
    if args.verify:
        verify(rows)
    if not args.include_witnesses:
        for row in rows:
            row["path"].pop("witness_actions")
            row["star"].pop("witness_actions")
    result = {
        "scope": "finite graph-access toy; no physical inference",
        "shared_actions": ["MOVE along one edge: cost 1", "RESET current node: cost 1"],
        "start_position": 0,
        "end_position": "unconstrained",
        "erasure_target": "all trace bits equal zero",
        "results": rows,
        "verification": "PASS" if args.verify else "not requested",
    }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
