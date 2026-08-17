#!/usr/bin/env python3
"""Execute the frozen eight-distinction models with exact finite observables."""

from collections import defaultdict
from itertools import permutations

from finite_compatible_model_input import MODELS, TRANSPORTS


WIDTH = 8


def precedence_occurrences(facets):
    constraints = []
    for first, second, third in facets:
        constraints.extend(((first, second), (second, third), (first, third)))
    return tuple(constraints)


def minimum_violations(constraints):
    best = len(constraints)
    witnesses = []
    for ordering in permutations(range(WIDTH)):
        position = {vertex: index for index, vertex in enumerate(ordering)}
        violations = sum(position[first] >= position[second] for first, second in constraints)
        if violations < best:
            best = violations
            witnesses = [ordering]
        elif violations == best:
            witnesses.append(ordering)
    return best, tuple(witnesses)


def invariant_dimension():
    return sum(
        all(matrix[axis][axis] == 1 for matrix in TRANSPORTS)
        for axis in range(3)
    )


def composition_conflict(facets):
    outputs = defaultdict(list)
    for first, second, third in facets:
        outputs[(first, second)].append(third)
    conflicting = sum(len(values) for values in outputs.values() if len(set(values)) > 1)
    return conflicting, len(facets)


def component_count(facets):
    graph = [set() for _ in range(WIDTH)]
    for facet in facets:
        for first in facet:
            graph[first].update(second for second in facet if second != first)
    unseen = set(range(WIDTH))
    count = 0
    while unseen:
        count += 1
        reached = {unseen.pop()}
        queue = list(reached)
        for vertex in queue:
            for neighbor in graph[vertex]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    reached.add(neighbor)
                    queue.append(neighbor)
    return count


results = {}
for name, facets in MODELS.items():
    assert len(facets) == 8
    incidence = tuple(sorted((sum(vertex in facet for facet in facets) for vertex in range(WIDTH))))
    assert incidence == (3,) * WIDTH
    constraints = precedence_occurrences(facets)
    violations, witnesses = minimum_violations(constraints)
    conflict, operations = composition_conflict(facets)
    results[name] = (
        violations,
        len(constraints),
        invariant_dimension(),
        conflict,
        operations,
        component_count(facets),
        len(witnesses),
    )
    print(
        f"{name}: F_T={violations}/{len(constraints)}, D_I={invariant_dimension()}, "
        f"Delta={conflict}/{operations}, components={component_count(facets)}, "
        f"optimal_orders={len(witnesses)}"
    )

assert results["cycle8"] != results["two_cycles4"]
print("PASS: both frozen models were completely enumerated")
print("RESULT: the models are complete, but their differences track input connectivity/orientation")
print("DECISION: no exclusive emergent relation is established; suspension must remain")
