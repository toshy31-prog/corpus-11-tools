#!/usr/bin/env python3
"""Find tournaments with matched local summaries and different global frustration."""

from itertools import combinations


WIDTH = 6
PAIRS = tuple(combinations(range(WIDTH), 2))


def orientations(mask: int) -> tuple[tuple[bool, ...], ...]:
    beats = [[False] * WIDTH for _ in range(WIDTH)]
    for bit, (left, right) in enumerate(PAIRS):
        if mask & (1 << bit):
            beats[left][right] = True
        else:
            beats[right][left] = True
    return tuple(tuple(row) for row in beats)


def minimum_backward_edges(beats: tuple[tuple[bool, ...], ...]) -> int:
    limit = 1 << WIDTH
    dp = [WIDTH * WIDTH] * limit
    dp[0] = 0
    for subset in range(1, limit):
        for last in range(WIDTH):
            if subset & (1 << last):
                previous = subset ^ (1 << last)
                added = sum(
                    beats[last][earlier]
                    for earlier in range(WIDTH)
                    if previous & (1 << earlier)
                )
                dp[subset] = min(dp[subset], dp[previous] + added)
    return dp[-1]


def local_key(beats: tuple[tuple[bool, ...], ...]):
    scores = tuple(sorted((sum(row) for row in beats), reverse=True))
    cyclic_triangles = 0
    for a, b, c in combinations(range(WIDTH), 3):
        cyclic_triangles += (
            beats[a][b] and beats[b][c] and beats[c][a]
        ) or (
            beats[a][c] and beats[c][b] and beats[b][a]
        )
    return scores, cyclic_triangles


seen = {}
selected = None
discriminating_keys = set()
for mask in range(1 << len(PAIRS)):
    beats = orientations(mask)
    key = local_key(beats)
    frustration = minimum_backward_edges(beats)
    previous = seen.get(key)
    if previous is not None and previous[1] != frustration:
        discriminating_keys.add(key)
        if selected is None:
            selected = (previous, (mask, frustration), key)
    else:
        seen[key] = (mask, frustration)

assert selected is not None
(first_mask, first_frustration), (second_mask, second_frustration), key = selected
assert first_frustration != second_frustration

print(f"PASS: all {1 << len(PAIRS)} labelled tournaments searched")
print(f"matched local keys with multiple frustrations: {len(discriminating_keys)}")
print(f"matched score sequence and cyclic-triangle count: {key}")
print(f"tournament masks: {first_mask}, {second_mask}")
print(f"minimum backward edges: {first_frustration}, {second_frustration}")
print(f"F_T values: {first_frustration}/{len(PAIRS)}, {second_frustration}/{len(PAIRS)}")
print("RESULT: the declared local summaries do not determine global ordering frustration")
print("BOUND: F_T remains a standard minimum-feedback-arc quantity in this model")
