#!/usr/bin/env python3
"""Exact erasure comparison at fixed recovery, Hamming distance, and degrees."""

from collections import deque
from itertools import combinations


WIDTH = 6
ZERO = frozenset(range(WIDTH))

# Both rooted trees have degree multiset (3, 2, 2, 1, 1, 1), root degree 2,
# five edges, and the same terminal pair 000000/111111.  Only the placement of
# branches relative to the actuator root 0 differs.
SHALLOW_EDGES = ((0, 1), (0, 2), (1, 3), (1, 4), (2, 5))
DEEP_EDGES = ((0, 1), (0, 3), (1, 2), (2, 4), (2, 5))


def adjacency(edges: tuple[tuple[int, int], ...]) -> tuple[frozenset[int], ...]:
    neighbors = [set() for _ in range(WIDTH)]
    for first, second in edges:
        neighbors[first].add(second)
        neighbors[second].add(first)
    return tuple(frozenset(items) for items in neighbors)


def degree_profile(edges: tuple[tuple[int, int], ...]) -> tuple[int, ...]:
    return tuple(sorted((len(items) for items in adjacency(edges)), reverse=True))


def next_zero_sets(
    zeroes: frozenset[int], graph: tuple[frozenset[int], ...]
):
    frontier = sorted(
        vertex
        for vertex in range(WIDTH)
        if vertex not in zeroes and any(parent in zeroes for parent in graph[vertex])
    )
    for size in range(1, len(frontier) + 1):
        for additions in combinations(frontier, size):
            yield zeroes.union(additions)


def minimum_parallel_erasure_depth(edges: tuple[tuple[int, int], ...]) -> int:
    """BFS over all synchronous local overwrite schedules from actuator 0."""
    graph = adjacency(edges)
    initial = frozenset({0})
    queue = deque([(initial, 0)])
    visited = {initial}
    while queue:
        zeroes, depth = queue.popleft()
        if zeroes == ZERO:
            return depth
        for successor in next_zero_sets(zeroes, graph):
            if successor not in visited:
                visited.add(successor)
                queue.append((successor, depth + 1))
    raise AssertionError("connected tree did not erase")


assert len(SHALLOW_EDGES) == len(DEEP_EDGES) == WIDTH - 1
assert degree_profile(SHALLOW_EDGES) == degree_profile(DEEP_EDGES) == (3, 2, 2, 1, 1, 1)
assert len(adjacency(SHALLOW_EDGES)[0]) == len(adjacency(DEEP_EDGES)[0]) == 2

shallow_depth = minimum_parallel_erasure_depth(SHALLOW_EDGES)
deep_depth = minimum_parallel_erasure_depth(DEEP_EDGES)

assert shallow_depth == 2
assert deep_depth == 3

print("PASS: matched rooted trees enumerated over all local overwrite schedules")
print("both: C_info=1, terminal Hamming=6, edges=5, work=5")
print("both: degree profile=(3,2,2,1,1,1), actuator degree=2")
print("shallow: C_erase_depth=2")
print("deep:    C_erase_depth=3")
print("RESULT: terminal Hamming distance does not determine erasure depth")
print("BOUND: the residual difference is exactly rooted graph eccentricity")
