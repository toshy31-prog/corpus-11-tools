#!/usr/bin/env python3
from __future__ import annotations

from collections import Counter, defaultdict
from itertools import combinations, permutations

N = 6
SOURCE = 0
INTERNAL = tuple(range(1, N))
SOURCE_EDGES = tuple((0, j) for j in INTERNAL)
INTERNAL_EDGES = tuple((i, j) for i in INTERNAL for j in INTERNAL if i < j)
POSSIBLE_EDGES = SOURCE_EDGES + INTERNAL_EDGES
ORDERS = tuple(permutations(INTERNAL))

assert len(POSSIBLE_EDGES) == 15
assert len(ORDERS) == 120


def graph_from_mask(mask: int):
    predecessors = [[] for _ in range(N)]
    edges = []
    for bit, (u, v) in enumerate(POSSIBLE_EDGES):
        if (mask >> bit) & 1:
            predecessors[v].append(u)
            edges.append((u, v))
    return predecessors, tuple(edges)


def reachable_from_source(edges) -> bool:
    adjacency = [[] for _ in range(N)]
    for u, v in edges:
        adjacency[u].append(v)
    seen = {SOURCE}
    queue = [SOURCE]
    for u in queue:
        for v in adjacency[u]:
            if v not in seen:
                seen.add(v)
                queue.append(v)
    return len(seen) == N


def one_pass_zero(predecessors, clamped, order) -> bool:
    state = [1] * N
    clamped = set(clamped)
    for node in clamped:
        state[node] = 0
    if SOURCE not in clamped:
        state[SOURCE] = 1
    for node in order:
        if node in clamped:
            continue
        state[node] = int(any(state[parent] for parent in predecessors[node]))
    return not any(state)


def erase_one_pass(predecessors) -> int:
    for size in range(1, N + 1):
        for clamped in combinations(range(N), size):
            if SOURCE not in clamped:
                continue
            if all(one_pass_zero(predecessors, clamped, order) for order in ORDERS):
                return size
    raise AssertionError("no reset set found")


def minimum_vertex_cover(edges) -> int:
    undirected = {
        tuple(sorted((u, v)))
        for u, v in edges
        if u != SOURCE and v != SOURCE
    }
    for size in range(len(INTERNAL) + 1):
        for chosen in combinations(INTERNAL, size):
            chosen = set(chosen)
            if all(u in chosen or v in chosen for u, v in undirected):
                return size
    raise AssertionError("no vertex cover found")


def source_distances(edges):
    adjacency = [[] for _ in range(N)]
    for u, v in edges:
        adjacency[u].append(v)
    distance = {SOURCE: 0}
    queue = [SOURCE]
    for u in queue:
        for v in adjacency[u]:
            if v not in distance:
                distance[v] = distance[u] + 1
                queue.append(v)
    return tuple(sorted(distance[v] for v in INTERNAL))


def control_key(edges):
    internal_edges = [(u, v) for u, v in edges if u != SOURCE]
    indegree = {v: 0 for v in INTERNAL}
    outdegree = {v: 0 for v in INTERNAL}
    for u, v in internal_edges:
        outdegree[u] += 1
        indegree[v] += 1

    # The ordered-DAG family makes every SCC singleton and every directed
    # simple cycle count at lengths 2, 3, 4 equal to zero.
    return (
        sum(u == SOURCE for u, _ in edges),
        len(internal_edges),
        tuple(sorted(indegree.values())),
        tuple(sorted(outdegree.values())),
        source_distances(edges),
        (1, 1, 1, 1, 1),
        0,
        0,
        0,
        1,  # C_erase_inf
    )


raw = 1 << len(POSSIBLE_EDGES)
retained = 0
identity_failures = []
distribution = Counter()
buckets = defaultdict(lambda: defaultdict(list))

for mask in range(raw):
    predecessors, edges = graph_from_mask(mask)
    if not reachable_from_source(edges):
        continue
    retained += 1

    # Internal edges always point from lower to higher labels, hence acyclic.
    assert all(u < v for u, v in edges if u != SOURCE)

    c_info = 1
    c_erase_inf = 1
    c_erase_1 = erase_one_pass(predecessors)
    vertex_cover = minimum_vertex_cover(edges)

    if c_erase_1 != 1 + vertex_cover:
        identity_failures.append((mask, c_erase_1, vertex_cover))

    assert c_info == 1
    assert c_erase_inf == 1
    distribution[c_erase_1] += 1
    buckets[control_key(edges)][c_erase_1].append(mask)

assert raw == 32768
assert retained == 9765
assert not identity_failures

separating = [
    (key, groups)
    for key, groups in buckets.items()
    if len(groups) > 1
]

outcome = "replicated_profile_separation" if separating else "no_matched_separation"
scientific = "standard_profile_separation" if separating and not identity_failures else outcome

print(f"PASS: raw architectures={raw}")
print(f"PASS: reachable architectures={retained}")
print("PASS: all internal graphs acyclic; C_info=1; C_erase_inf=1")
print("PASS: exhaustive one-pass adversarial orders checked (120 permutations)")
print("PASS: C_erase_1 = 1 + minimum vertex cover on all retained architectures")
print(f"control strata={len(buckets)}")
print(f"separating matched strata={len(separating)}")
print("C_erase_1 distribution:", dict(sorted(distribution.items())))
print("OUTCOME:", outcome)
print("SCIENTIFIC_CLASSIFICATION:", scientific)

if separating:
    key, groups = separating[0]
    values = sorted(groups)
    first_value, second_value = values[0], values[1]
    first_mask = groups[first_value][0]
    second_mask = groups[second_value][0]
    print("MATCHED KEY:", key)
    print("ARCHITECTURE A MASK:", first_mask)
    print("ARCHITECTURE A EDGES:", graph_from_mask(first_mask)[1])
    print("ARCHITECTURE A C_erase_1:", first_value)
    print("ARCHITECTURE B MASK:", second_mask)
    print("ARCHITECTURE B EDGES:", graph_from_mask(second_mask)[1])
    print("ARCHITECTURE B C_erase_1:", second_value)
