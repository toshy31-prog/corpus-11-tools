#!/usr/bin/env python3
"""Enumerate order-three magmas and find a relabeling-invariant opposite pair."""

from itertools import permutations, product


ORDER = 3
ELEMENTS = tuple(range(ORDER))
PERMUTATIONS = tuple(permutations(ELEMENTS))


def opposite(table: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(table[right * ORDER + left] for left in ELEMENTS for right in ELEMENTS)


def is_isomorphic(first: tuple[int, ...], second: tuple[int, ...]) -> bool:
    for relabel in PERMUTATIONS:
        if all(
            relabel[first[left * ORDER + right]]
            == second[relabel[left] * ORDER + relabel[right]]
            for left in ELEMENTS
            for right in ELEMENTS
        ):
            return True
    return False


def signature(table: tuple[int, ...]):
    idempotents = sum(table[item * ORDER + item] == item for item in ELEMENTS)
    output_frequencies = tuple(sorted((table.count(item) for item in ELEMENTS), reverse=True))
    translation_images = []
    for fixed in ELEMENTS:
        translation_images.append(len({table[fixed * ORDER + other] for other in ELEMENTS}))
        translation_images.append(len({table[other * ORDER + fixed] for other in ELEMENTS}))
    associative = sum(
        table[table[a * ORDER + b] * ORDER + c]
        == table[a * ORDER + table[b * ORDER + c]]
        for a in ELEMENTS
        for b in ELEMENTS
        for c in ELEMENTS
    )
    return idempotents, output_frequencies, tuple(sorted(translation_images)), associative


selected = None
non_self_opposite = 0
for table in product(ELEMENTS, repeat=ORDER * ORDER):
    other = opposite(table)
    if not is_isomorphic(table, other):
        non_self_opposite += 1
        if selected is None:
            selected = (table, other)

assert selected is not None
table, other = selected
assert signature(table) == signature(other)
assert not is_isomorphic(table, other)

print(f"PASS: all {ORDER ** (ORDER * ORDER)} labelled magmas of order {ORDER} searched")
print(f"non-self-opposite labelled tables: {non_self_opposite}")
print(f"table: {table}")
print(f"opposite: {other}")
print(f"matched declared binary summaries: {signature(table)}")
print("RESULT: relabeling cannot identify the table with its opposite")
print("BOUND: this yields two relative orientation sectors, not an absolute sign or physical time arrow")
