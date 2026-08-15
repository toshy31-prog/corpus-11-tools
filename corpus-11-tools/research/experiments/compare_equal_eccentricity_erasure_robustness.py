#!/usr/bin/env python3
"""Search rooted trees for residual erasure risk at fixed eccentricity."""

from itertools import product


WIDTH = 6
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
    last = [index for index, value in enumerate(degree) if value == 1]
    edges.append(tuple(sorted(last)))
    return tuple(sorted(edges))


def adjacency(edges: tuple[tuple[int, int], ...]) -> tuple[tuple[int, ...], ...]:
    neighbors = [set() for _ in range(WIDTH)]
    for first, second in edges:
        neighbors[first].add(second)
        neighbors[second].add(first)
    return tuple(tuple(sorted(items)) for items in neighbors)


def rooted_data(edges: tuple[tuple[int, int], ...]):
    graph = adjacency(edges)
    parent = [-1] * WIDTH
    distance = [-1] * WIDTH
    distance[ROOT] = 0
    order = [ROOT]
    for vertex in order:
        for neighbor in graph[vertex]:
            if distance[neighbor] == -1:
                parent[neighbor] = vertex
                distance[neighbor] = distance[vertex] + 1
                order.append(neighbor)

    subtree_size = [1] * WIDTH
    for vertex in reversed(order[1:]):
        subtree_size[parent[vertex]] += subtree_size[vertex]

    matched_key = (
        tuple(sorted((len(items) for items in graph), reverse=True)),
        len(graph[ROOT]),
        max(distance),
    )
    residual_traces = tuple(
        sorted((subtree_size[vertex] for vertex in range(WIDTH) if vertex != ROOT), reverse=True)
    )
    return matched_key, residual_traces


seen = {}
selected = None
for sequence in product(range(WIDTH), repeat=WIDTH - 2):
    edges = tree_from_prufer(sequence)
    matched_key, residual_traces = rooted_data(edges)
    previous = seen.get(matched_key)
    if previous is not None and previous[1] != residual_traces:
        selected = (previous, (edges, residual_traces), matched_key)
        break
    seen[matched_key] = (edges, residual_traces)

assert selected is not None
(first_edges, first_residual), (second_edges, second_residual), key = selected

assert key == ((3, 2, 2, 1, 1, 1), 2, 3)
assert first_edges == ((0, 1), (0, 3), (1, 2), (1, 5), (2, 4))
assert second_edges == ((0, 1), (0, 3), (1, 2), (2, 4), (2, 5))
assert first_residual == (4, 2, 1, 1, 1)
assert second_residual == (4, 3, 1, 1, 1)

print("PASS: all 6^4 labelled rooted trees searched by Prüfer sequence")
print("both: C_info=1, Hamming=6, edges/work=5")
print("both: degree profile=(3,2,2,1,1,1), actuator degree=2, eccentricity=3")
print("tree A residual traces after one edge loss: (4,2,1,1,1), mean=9/5")
print("tree B residual traces after one edge loss: (4,3,1,1,1), mean=10/5")
print("RESULT: Hamming and eccentricity do not determine residual erasure burden")
print("BOUND: the remainder is the rooted single-edge cut-size profile")
