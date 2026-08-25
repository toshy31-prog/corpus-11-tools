#!/usr/bin/env python3
"""Deterministic cut-point recovery with an omitted-dependency control."""

from __future__ import annotations

from copy import deepcopy
import hashlib
import json


STEPS = ("frame", "compare", "decide", "report")


def digest(*parts: str) -> str:
    return hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()


def initial_state() -> dict[str, object]:
    return {
        "research_id": "fictional-r-29",
        "cursor": 0,
        "artifacts": [],
        "decision": "retain-two-rivals",
        "recourse": "rollback-fictional-r-29",
        "execution_dependency": "tie-break-v1",
        "journal": [],
    }


def advance(state: dict[str, object], stop: int = len(STEPS)) -> dict[str, object]:
    state = deepcopy(state)
    while state["cursor"] < stop:
        cursor = state["cursor"]
        step = STEPS[cursor]
        previous = state["artifacts"][-1] if state["artifacts"] else "root"
        dependency = state["execution_dependency"] if step in {"decide", "report"} else "stable"
        state["artifacts"].append(digest(state["research_id"], step, previous, dependency))
        if step == "decide":
            state["decision"] = (
                "retain-two-rivals"
                if state["execution_dependency"] == "tie-break-v1"
                else "collapse-to-one"
            )
        state["cursor"] += 1
    return state


def serialize(state: dict[str, object], omit_dependency: bool = False) -> str:
    snapshot = deepcopy(state)
    snapshot["journal"].append(f"stop@{snapshot['cursor']}")
    if omit_dependency:
        snapshot.pop("execution_dependency")
    return json.dumps(snapshot, sort_keys=True)


def restore(snapshot: str) -> dict[str, object]:
    state = json.loads(snapshot)
    state.setdefault("execution_dependency", "fallback")
    state["journal"].append(f"resume@{state['cursor']}")
    return state


def material_view(state: dict[str, object]) -> dict[str, object]:
    return {key: value for key, value in state.items() if key != "journal"}


def main() -> None:
    baseline = advance(initial_state())
    for cutpoint in range(len(STEPS)):
        partial = advance(initial_state(), cutpoint)
        resumed = advance(restore(serialize(partial)))
        assert material_view(resumed) == material_view(baseline), cutpoint
        assert all(len(value) == 64 for value in resumed["artifacts"])

    partial = advance(initial_state(), 2)
    incomplete = advance(restore(serialize(partial, omit_dependency=True)))
    assert incomplete["artifacts"] != baseline["artifacts"]
    assert incomplete["decision"] == "collapse-to-one"
    assert baseline["decision"] == "retain-two-rivals"

    print("PASS interruptibility: 4/4 cutpoints recover; omitted dependency diverges")


if __name__ == "__main__":
    main()
