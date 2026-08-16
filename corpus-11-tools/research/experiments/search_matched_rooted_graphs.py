#!/usr/bin/env python3
"""Exhaustively search rooted graphs with matched coarse invariants and unequal cover cost."""

from __future__ import annotations

import argparse
from collections import defaultdict, deque
import json


Graph = tuple[tuple[int, ...], ...]


def edge_slots(size: int) -> tuple[tuple[int, int], ...]:
    return tuple((left, right) for left in range(size) for right in range(left + 1, size))


def decode_graph(size: int, code: int) -> Graph:
    adjacency = [set() for _ in range(size)]
    for bit, (left, right) in enumerate(edge_slots(size)):
        if code & (1 << bit):
            adjacency[left].add(right)
            adjacency[right].add(left)
    return tuple(tuple(sorted(neighbors)) for neighbors in adjacency)


def edges(graph: Graph) -> list[list[int]]:
    return [
        [node, neighbor]
        for node, neighbors in enumerate(graph)
        for neighbor in neighbors
        if node < neighbor
    ]


def root_distances(graph: Graph, root: int = 0) -> dict[int, int]:
    distances = {root: 0}
    queue = deque([root])
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in distances:
                distances[neighbor] = distances[node] + 1
                queue.append(neighbor)
    return distances


def minimum_cover_walk(graph: Graph, root: int = 0) -> tuple[int, list[int], int]:
    full_mask = (1 << len(graph)) - 1
    start = (root, 1 << root)
    queue = deque([start])
    distance = {start: 0}
    predecessor: dict[tuple[int, int], tuple[int, int]] = {}
    goal: tuple[int, int] | None = None
    while queue:
        state = queue.popleft()
        position, visited = state
        if visited == full_mask:
            goal = state
            break
        for neighbor in graph[position]:
            successor = (neighbor, visited | (1 << neighbor))
            if successor not in distance:
                distance[successor] = distance[state] + 1
                predecessor[successor] = state
                queue.append(successor)
    if goal is None:
        raise ValueError("cover walk requires a connected graph")
    path = [goal[0]]
    cursor = goal
    while cursor != start:
        cursor = predecessor[cursor]
        path.append(cursor[0])
    path.reverse()
    return distance[goal], path, len(distance)


def graph_record(size: int, code: int) -> dict[str, object] | None:
    graph = decode_graph(size, code)
    distances = root_distances(graph)
    if len(distances) != size:
        return None
    move_cost, witness, searched_states = minimum_cover_walk(graph)
    degree_sequence = tuple(sorted(len(neighbors) for neighbors in graph))
    root_distance_profile = tuple(sorted(distances.values()))
    edge_count = sum(degree_sequence) // 2
    eccentricity = max(distances.values())
    return {
        "size": size,
        "code": code,
        "edges": edges(graph),
        "edge_count": edge_count,
        "degree_sequence": degree_sequence,
        "root_degree": len(graph[0]),
        "root_distance_profile": root_distance_profile,
        "root_eccentricity": eccentricity,
        "cover_move_cost": move_cost,
        "erase_work": size + move_cost,
        "witness_node_path": witness,
        "searched_cover_states": searched_states,
    }


def differing_groups(records: list[dict[str, object]], *, strict: bool):
    groups: dict[tuple[object, ...], list[dict[str, object]]] = defaultdict(list)
    for record in records:
        signature: tuple[object, ...] = (
            record["size"],
            record["edge_count"],
            record["root_eccentricity"],
        )
        if strict:
            signature += (record["degree_sequence"],)
        groups[signature].append(record)
    return {
        signature: group
        for signature, group in groups.items()
        if len({record["cover_move_cost"] for record in group}) > 1
    }


def choose_pair(group: list[dict[str, object]]) -> tuple[dict[str, object], dict[str, object]]:
    minimum_cost = min(record["cover_move_cost"] for record in group)
    maximum_cost = max(record["cover_move_cost"] for record in group)
    minimum = min(
        (record for record in group if record["cover_move_cost"] == minimum_cost),
        key=lambda record: record["code"],
    )
    maximum = min(
        (record for record in group if record["cover_move_cost"] == maximum_cost),
        key=lambda record: record["code"],
    )
    return minimum, maximum


def stricter_control_groups(records: list[dict[str, object]]):
    groups: dict[tuple[object, ...], list[dict[str, object]]] = defaultdict(list)
    for record in records:
        signature = (
            record["size"],
            record["edge_count"],
            record["root_eccentricity"],
            record["degree_sequence"],
            record["root_degree"],
            record["root_distance_profile"],
        )
        groups[signature].append(record)
    return {
        signature: group
        for signature, group in groups.items()
        if len({record["cover_move_cost"] for record in group}) > 1
    }


def search(max_nodes: int) -> dict[str, object]:
    summaries: list[dict[str, int]] = []
    relaxed_candidates: list[tuple[tuple[object, ...], list[dict[str, object]]]] = []
    selection = None

    for size in range(3, max_nodes + 1):
        possible_edges = len(edge_slots(size))
        records = []
        for code in range(1 << possible_edges):
            record = graph_record(size, code)
            if record is not None:
                records.append(record)
        strict_groups = differing_groups(records, strict=True)
        relaxed_groups = differing_groups(records, strict=False)
        summaries.append(
            {
                "nodes": size,
                "labeled_graphs_examined": 1 << possible_edges,
                "connected_graphs": len(records),
                "strict_differing_classes": len(strict_groups),
                "relaxed_differing_classes": len(relaxed_groups),
            }
        )
        relaxed_candidates.extend(sorted(relaxed_groups.items()))
        if strict_groups:
            signature = min(strict_groups)
            low, high = choose_pair(strict_groups[signature])
            selection = {
                "match_level": "strict_with_degree_sequence",
                "signature": list(signature[:-1]) + [list(signature[-1])],
                "low_cost_graph": low,
                "high_cost_graph": high,
            }
            control_groups = stricter_control_groups(records)
            if control_groups:
                control_signature = min(control_groups)
                control_low, control_high = choose_pair(control_groups[control_signature])
                selection["post_result_stricter_control"] = {
                    "status": "exploratory_after_primary_result",
                    "additional_matches": ["root degree", "root distance profile"],
                    "signature": [
                        control_signature[0],
                        control_signature[1],
                        control_signature[2],
                        list(control_signature[3]),
                        control_signature[4],
                        list(control_signature[5]),
                    ],
                    "low_cost_graph": control_low,
                    "high_cost_graph": control_high,
                }
            break

    if selection is None and relaxed_candidates:
        signature, group = min(relaxed_candidates, key=lambda item: item[0])
        low, high = choose_pair(group)
        selection = {
            "match_level": "required_without_degree_sequence",
            "signature": list(signature),
            "low_cost_graph": low,
            "high_cost_graph": high,
        }

    return {
        "root": 0,
        "trace_count_rule": "all N nodes carry one trace",
        "read_cost_each": 1,
        "termination": "free endpoint",
        "summaries": summaries,
        "selection": selection,
    }


def verify_graph(record: dict[str, object]) -> None:
    size = record["size"]
    graph = decode_graph(size, record["code"])
    path = record["witness_node_path"]
    assert path[0] == 0
    assert set(path) == set(range(size))
    assert all(right in graph[left] for left, right in zip(path, path[1:]))
    move_cost, direct_path, _ = minimum_cover_walk(graph)
    assert move_cost == record["cover_move_cost"] == len(path) - 1
    assert direct_path == path
    assert record["erase_work"] == size + move_cost


def verify(result: dict[str, object]) -> None:
    selection = result["selection"]
    assert selection is not None
    low = selection["low_cost_graph"]
    high = selection["high_cost_graph"]
    verify_graph(low)
    verify_graph(high)
    for key in ("size", "edge_count", "root_eccentricity"):
        assert low[key] == high[key]
    if selection["match_level"] == "strict_with_degree_sequence":
        assert low["degree_sequence"] == high["degree_sequence"]
    assert low["cover_move_cost"] < high["cover_move_cost"]
    control = selection.get("post_result_stricter_control")
    if control:
        control_low = control["low_cost_graph"]
        control_high = control["high_cost_graph"]
        verify_graph(control_low)
        verify_graph(control_high)
        for key in (
            "size",
            "edge_count",
            "root_eccentricity",
            "degree_sequence",
            "root_degree",
            "root_distance_profile",
        ):
            assert control_low[key] == control_high[key]
        assert control_low["cover_move_cost"] < control_high["cover_move_cost"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-nodes", type=int, default=6)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if not 3 <= args.max_nodes <= 6:
        parser.error("--max-nodes must be between 3 and 6")
    result = search(args.max_nodes)
    if args.verify:
        verify(result)
    result["verification"] = "PASS" if args.verify else "not requested"
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
