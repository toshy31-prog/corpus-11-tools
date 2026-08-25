#!/usr/bin/env python3
from __future__ import annotations

import itertools
import json
import multiprocessing as mp
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
DELAYS_MS = (2, 4, 6, 8, 10)
REPEATS = 2


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


def worker(node, queue, result_queue, start_event, state, lock):
    while True:
        command = queue.get()
        if command is None:
            return
        run_id, delay_s, pred, clamped = command
        start_event.wait()
        time.sleep(delay_s)
        stamp = time.perf_counter_ns()
        with lock:
            if clamped:
                state[node] = 0
            else:
                state[node] = int(any(state[parent] for parent in pred))
            output = int(state[node])
        result_queue.put((run_id, stamp, node, output))


def main():
    ctx = mp.get_context("fork")
    state = ctx.Array("i", 6, lock=False)
    lock = ctx.Lock()
    start_event = ctx.Event()
    result_queue = ctx.Queue()
    queues = {node: ctx.Queue() for node in NODES}
    processes = [
        ctx.Process(
            target=worker,
            args=(node, queues[node], result_queue, start_event, state, lock),
            daemon=True,
        )
        for node in NODES
    ]
    for process in processes:
        process.start()

    rows = []
    run_id = 0
    try:
        for label in ("A", "B"):
            pred = predecessors(EDGES[label])
            resets = RESETS[label]
            for target_order in itertools.permutations(NODES):
                delay = {
                    node: DELAYS_MS[index] / 1000
                    for index, node in enumerate(target_order)
                }
                for repeat in range(REPEATS):
                    run_id += 1
                    start_event.clear()
                    with lock:
                        for index in range(6):
                            state[index] = 1
                        for node in resets:
                            state[node] = 0

                    for node in NODES:
                        queues[node].put(
                            (run_id, delay[node], tuple(pred[node]), node in resets)
                        )

                    start = time.perf_counter_ns()
                    start_event.set()
                    events = []
                    while len(events) < 5:
                        item = result_queue.get(timeout=2)
                        if item[0] != run_id:
                            raise RuntimeError(("unexpected run id", item[0], run_id))
                        events.append(item)
                    stop = time.perf_counter_ns()
                    start_event.clear()
                    events.sort(key=lambda item: item[1])
                    actual_order = tuple(item[2] for item in events)
                    with lock:
                        runtime_state = tuple(int(state[index]) for index in range(6))
                    model_state = discrete_final(EDGES[label], resets, actual_order)
                    rows.append(
                        {
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
                    )
    finally:
        for node in NODES:
            queues[node].put(None)
        for process in processes:
            process.join(timeout=2)

    assert len(rows) == 480
    summary = {}
    for label in ("A", "B"):
        selected = [row for row in rows if row["label"] == label]
        summary[label] = {
            "runs": len(selected),
            "erased": sum(row["erased"] for row in selected),
            "failed": sum(not row["erased"] for row in selected),
            "mismatches": sum(row["mismatch"] for row in selected),
            "residual_distribution": dict(
                sorted(Counter(row["residual_count"] for row in selected).items())
            ),
            "distinct_actual_orders": len({row["actual_order"] for row in selected}),
            "target_order_matches": sum(
                row["actual_order"] == row["target_order"] for row in selected
            ),
            "duration_ns_min": min(row["duration_ns"] for row in selected),
            "duration_ns_median": median(row["duration_ns"] for row in selected),
            "duration_ns_max": max(row["duration_ns"] for row in selected),
        }

    h1 = summary["A"]["erased"] == 240 and summary["B"]["failed"] > 0
    h2 = summary["A"]["mismatches"] == 0 and summary["B"]["mismatches"] == 0
    if h1 and h2:
        outcome = "multiprocess_transport"
    elif not h2:
        outcome = "multiprocess_model_mismatch"
    else:
        outcome = "multiprocess_no_separation"

    result = {
        "python": sys.version,
        "platform": platform.platform(),
        "summary": summary,
        "outcome": outcome,
        "rows": rows,
    }
    print(json.dumps(result, separators=(",", ":"), default=list))


if __name__ == "__main__":
    main()
