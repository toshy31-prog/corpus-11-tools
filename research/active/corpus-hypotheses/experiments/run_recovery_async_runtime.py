#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import itertools
import json
import platform
import sys
import time
from collections import Counter
from statistics import median

A_EDGES = ((0, 1), (0, 2), (0, 4), (0, 5), (1, 2), (2, 3))
B_EDGES = ((0, 1), (0, 2), (0, 3), (0, 5), (1, 4), (2, 3))
EDGES = {"A": A_EDGES, "B": B_EDGES}
RESETS = {"A": {0, 2}, "B": {0, 1}}
NODES = (1, 2, 3, 4, 5)
DELAYS_MS = (1, 2, 3, 4, 5)
REPEATS = 3


def predecessors(edges):
    result = {node: [] for node in range(6)}
    for left, right in edges:
        result[right].append(left)
    return result


def discrete_final(edges, resets, order):
    pred = predecessors(edges)
    state = [1] * 6
    for node in resets:
        state[node] = 0
    for node in order:
        if node in resets:
            state[node] = 0
        else:
            state[node] = int(any(state[parent] for parent in pred[node]))
    return tuple(state)


async def runtime_run(label, target_order, repeat):
    edges = EDGES[label]
    resets = RESETS[label]
    pred = predecessors(edges)
    state = [1] * 6
    for node in resets:
        state[node] = 0

    delay = {
        node: DELAYS_MS[index] / 1000
        for index, node in enumerate(target_order)
    }
    events = []
    start = time.perf_counter_ns()

    async def task(node):
        await asyncio.sleep(delay[node])
        stamp = time.perf_counter_ns()
        if node in resets:
            state[node] = 0
        else:
            state[node] = int(any(state[parent] for parent in pred[node]))
        events.append((stamp, node, state[node]))

    await asyncio.gather(*(task(node) for node in NODES))
    stop = time.perf_counter_ns()
    events.sort()
    actual_order = tuple(node for _, node, _ in events)
    runtime_state = tuple(state)
    model_state = discrete_final(edges, resets, actual_order)

    return {
        "label": label,
        "target_order": target_order,
        "actual_order": actual_order,
        "repeat": repeat,
        "state": runtime_state,
        "model_state": model_state,
        "residual_count": sum(runtime_state),
        "erased": not any(runtime_state),
        "duration_ns": stop - start,
        "mismatch": runtime_state != model_state,
    }


async def main():
    rows = []
    orders = tuple(itertools.permutations(NODES))
    assert len(orders) == 120

    for label in ("A", "B"):
        for target_order in orders:
            for repeat in range(REPEATS):
                rows.append(await runtime_run(label, target_order, repeat))

    assert len(rows) == 720

    summary = {}
    for label in ("A", "B"):
        selected = [row for row in rows if row["label"] == label]
        summary[label] = {
            "runs": len(selected),
            "erased": sum(row["erased"] for row in selected),
            "failed": sum(not row["erased"] for row in selected),
            "mismatches": sum(row["mismatch"] for row in selected),
            "residual_distribution": dict(sorted(Counter(row["residual_count"] for row in selected).items())),
            "distinct_actual_orders": len({row["actual_order"] for row in selected}),
            "target_order_matches": sum(row["actual_order"] == row["target_order"] for row in selected),
            "duration_ns_min": min(row["duration_ns"] for row in selected),
            "duration_ns_median": median(row["duration_ns"] for row in selected),
            "duration_ns_max": max(row["duration_ns"] for row in selected),
        }

    h1 = summary["A"]["erased"] == 360 and summary["B"]["failed"] > 0
    h2 = summary["A"]["mismatches"] == 0 and summary["B"]["mismatches"] == 0
    if h1 and h2:
        outcome = "runtime_transport"
    elif not h2:
        outcome = "runtime_model_mismatch"
    else:
        outcome = "runtime_no_separation"

    result = {
        "python": sys.version,
        "platform": platform.platform(),
        "summary": summary,
        "outcome": outcome,
        "rows": rows,
    }
    print(json.dumps(result, separators=(",", ":"), default=list))


if __name__ == "__main__":
    asyncio.run(main())
