#!/usr/bin/env python3
"""Component-wise footprint accounting from generated decision-state logs."""

from __future__ import annotations

from copy import deepcopy


LOGS = {
    "baseline": {
        "question_id": "question-retain-a-v1",
        "events": [
            {"before": "undecided", "after": "undecided", "tokens": 600, "minutes": 20, "calls": 3, "output": "shared-analysis", "load_bearer": "compute-a"},
            {"before": "undecided", "after": "retain-a", "tokens": 300, "minutes": 10, "calls": 2, "output": "decision-a", "load_bearer": "compute-a"},
            {"before": "retain-a", "after": "retain-a", "tokens": 300, "minutes": 8, "calls": 1, "output": "decision-a", "load_bearer": "review-buffer"},
        ],
    },
    "structured": {
        "question_id": "question-retain-a-v1",
        "events": [
            {"before": "undecided", "after": "undecided", "tokens": 600, "minutes": 20, "calls": 3, "output": "shared-analysis", "load_bearer": "compute-b"},
            {"before": "undecided", "after": "retain-a", "tokens": 300, "minutes": 12, "calls": 2, "output": "decision-a", "load_bearer": "compute-b"},
        ],
    },
}


def metrics(log: dict[str, object]) -> dict[str, object]:
    assert isinstance(log["question_id"], str) and log["question_id"]
    events = log["events"]
    assert events
    seen_outputs: set[str] = set()
    zero_yield_events = 0
    decisions_changed = 0
    by_bearer: dict[str, int] = {}
    for event in events:
        changed = event["before"] != event["after"]
        novel_output = event["output"] not in seen_outputs
        decisions_changed += int(changed)
        zero_yield_events += int(not changed and not novel_output)
        seen_outputs.add(event["output"])
        by_bearer[event["load_bearer"]] = by_bearer.get(event["load_bearer"], 0) + event["tokens"]
    return {
        "question_id": log["question_id"],
        "initial_state": events[0]["before"],
        "final_state": events[-1]["after"],
        "tokens": sum(event["tokens"] for event in events),
        "minutes": sum(event["minutes"] for event in events),
        "calls": sum(event["calls"] for event in events),
        "decisions_changed": decisions_changed,
        "unique_outputs": len(seen_outputs),
        "output_ids": sorted(seen_outputs),
        "zero_yield_events": zero_yield_events,
        "tokens_by_bearer": by_bearer,
    }


def matched_for_comparison(left: dict[str, object], right: dict[str, object]) -> bool:
    return all(
        left[field] == right[field]
        for field in ("question_id", "initial_state", "final_state", "output_ids")
    )


def main() -> None:
    baseline = metrics(LOGS["baseline"])
    structured = metrics(LOGS["structured"])
    assert baseline == {
        "question_id": "question-retain-a-v1",
        "initial_state": "undecided",
        "final_state": "retain-a",
        "tokens": 1200,
        "minutes": 38,
        "calls": 6,
        "decisions_changed": 1,
        "unique_outputs": 2,
        "output_ids": ["decision-a", "shared-analysis"],
        "zero_yield_events": 1,
        "tokens_by_bearer": {"compute-a": 900, "review-buffer": 300},
    }
    assert structured["tokens"] == 900
    assert structured["minutes"] == 32
    assert structured["calls"] == 5
    assert structured["decisions_changed"] == baseline["decisions_changed"]
    assert structured["unique_outputs"] == baseline["unique_outputs"]
    assert structured["zero_yield_events"] == 0
    assert matched_for_comparison(baseline, structured)
    assert all(structured[key] <= baseline[key] for key in ("tokens", "minutes", "calls"))

    question_mutant = deepcopy(LOGS["structured"])
    question_mutant["question_id"] = "question-other-v1"
    assert not matched_for_comparison(baseline, metrics(question_mutant))
    output_mutant = deepcopy(LOGS["structured"])
    output_mutant["events"][0]["output"] = "different-analysis"
    assert not matched_for_comparison(baseline, metrics(output_mutant))
    print(
        "PASS generated footprint logs: exact question/outcome match enforced; "
        "zero-yield retained; three cost components dominate"
    )


if __name__ == "__main__":
    main()
