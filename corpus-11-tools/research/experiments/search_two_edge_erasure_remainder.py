#!/usr/bin/env python3
"""Search rooted trees for a two-edge erasure remainder after one-edge matching."""

from itertools import combinations, product
import sys


WIDTH = int(sys.argv[1]) if len(sys.argv) > 1 else 7
ROOT = 0


def tree_from_prufer(sequence: tuple[int, ...]) -> tuple[tuple[int, int], ...]:
    degree = [1] * WIDTH
    for vertex in sequence:
        degree[vertex] += 1
    edges = []
    for vertex in sequence:
        leaf = next(index for index, value in enumerate(degree) if value == 1)
        edges.append(tuple(sorted((leaf, vertex))))
        degree[leaf] -= 1
        degree[vertex] -= 1
    edges.append(tuple(sorted(index for index, value in enumerate(degree) if value == 1)))
    return tuple(sorted(edges))


def adjacency(edges: tuple[tuple[int, int], ...], removed=()) -> tuple[tuple[int, ...], ...]:
    removed_set = set(removed)
    graph = [set() for _ in range(WIDTH)]
    for edge in edges:
        if edge not in removed_set:
            first, second = edge
            graph[first].add(second)
            graph[second].add(first)
    return tuple(tuple(sorted(items)) for items in graph)


def unreachable_count(edges: tuple[tuple[int, int], ...], removed) -> int:
    graph = adjacency(edges, removed)
    reached = {ROOT}
    queue = [ROOT]
    for vertex in queue:
        for neighbor in graph[vertex]:
            if neighbor not in reached:
                reached.add(neighbor)
                queue.append(neighbor)
    return WIDTH - len(reached)


def profiles(edges: tuple[tuple[int, int], ...]):
    graph = adjacency(edges)
    distance = [-1] * WIDTH
    distance[ROOT] = 0
    queue = [ROOT]
    for vertex in queue:
        for neighbor in graph[vertex]:
            if distance[neighbor] == -1:
                distance[neighbor] = distance[vertex] + 1
                queue.append(neighbor)
    one_edge = tuple(sorted((unreachable_count(edges, (edge,)) for edge in edges), reverse=True))
    two_edge = tuple(
        sorted(
            (unreachable_count(edges, removed) for removed in combinations(edges, 2)),
            reverse=True,
        )
    )
    matched = (
        tuple(sorted((len(items) for items in graph), reverse=True)),
        len(graph[ROOT]),
        max(distance),
        one_edge,
    )
    return matched, two_edge


seen = {}
selected = None
searched = 0
for sequence in product(range(WIDTH), repeat=WIDTH - 2):
    searched += 1
    edges = tree_from_prufer(sequence)
    matched, two_edge = profiles(edges)
    previous = seen.get(matched)
    if previous is not None and previous[1] != two_edge:
        selected = (previous, (edges, two_edge), matched)
        break
    seen[matched] = (edges, two_edge)

if selected is None:
    print(f"NO_PAIR: all {WIDTH ** (WIDTH - 2)} labelled rooted trees were searched")
    print("RESULT: no two-edge remainder exists under the preregistered matching at this width")
else:
    (first_edges, first_two), (second_edges, second_two), matched = selected
    assert first_two != second_two
    print(f"PASS: discriminating pair found after {searched} of {WIDTH ** (WIDTH - 2)} Prüfer sequences")
    print(f"matched degree/root/eccentricity/one-edge profile: {matched}")
    print(f"tree A: {first_edges}")
    print(f"tree B: {second_edges}")
    print(f"two-edge residual profile A: {first_two}")
    print(f"two-edge residual profile B: {second_two}")
    print("RESULT: the complete one-edge profile does not determine the two-edge profile")
    print("BOUND: the remainder is still an exact multi-cut invariant of the rooted tree")
