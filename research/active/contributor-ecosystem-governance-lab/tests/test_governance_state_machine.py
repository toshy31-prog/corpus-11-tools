#!/usr/bin/env python3
"""Finite governance state machine with explicit authority and recourse."""

from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "initial_cases.json"
ROLES = ("proposer", "reviewer", "challenger", "maintainer")
TRANSITIONS = {
    ("start", "propose", "proposer"): "proposed",
    ("proposed", "review", "reviewer"): "reviewed",
    ("reviewed", "contest", "challenger"): "contested",
    ("contested", "amend", "proposer"): "amended",
    ("amended", "resolve", "challenger"): "resolved",
    ("resolved", "accept", "reviewer"): "accepted",
    ("accepted", "appeal", "challenger"): "appealed",
    ("appealed", "withdraw", "maintainer"): "withdrawn",
}
for active_state in ("proposed", "reviewed", "contested", "amended", "resolved", "accepted"):
    TRANSITIONS[(active_state, "veto", "maintainer")] = "withdrawn"

GOOD_TRACE = [
    {"time": 1, "action": "propose", "actor": "proposer"},
    {"time": 2, "action": "review", "actor": "reviewer"},
    {"time": 3, "action": "contest", "actor": "challenger"},
    {"time": 4, "action": "amend", "actor": "proposer"},
    {"time": 5, "action": "resolve", "actor": "challenger"},
    {"time": 6, "action": "accept", "actor": "reviewer"},
    {"time": 7, "action": "appeal", "actor": "challenger"},
    {"time": 8, "action": "withdraw", "actor": "maintainer"},
]


def validate(events: list[dict[str, object]]) -> tuple[bool, str]:
    state = "start"
    previous_time = 0
    for event in events:
        if "time" not in event or not isinstance(event["time"], int) or event["time"] <= previous_time:
            return False, "invalid_time"
        previous_time = event["time"]
        key = (state, event["action"], event["actor"])
        if key not in TRANSITIONS:
            return False, "unauthorized_or_invalid_transition"
        state = TRANSITIONS[key]
    if state != "withdrawn":
        return False, state
    actions = [event["action"] for event in events]
    if actions[-1] == "veto":
        return True, "withdrawn_by_veto"
    required_recourse = {"contest", "resolve", "appeal", "withdraw"}
    if not required_recourse.issubset(actions):
        return False, "recourse_path_incomplete"
    return True, "withdrawn_after_appeal"


def main() -> None:
    assert validate(GOOD_TRACE) == (True, "withdrawn_after_appeal")

    rejected_role_mutations = 0
    for index, event in enumerate(GOOD_TRACE):
        for role in ROLES:
            if role == event["actor"]:
                continue
            mutant = [dict(row) for row in GOOD_TRACE]
            mutant[index]["actor"] = role
            assert not validate(mutant)[0]
            rejected_role_mutations += 1
    assert rejected_role_mutations == 24

    # A declared veto must be usable from every active state without pretending
    # that the separate contest/appeal path was traversed.
    accepted_veto_positions = 0
    rejected_veto_role_mutations = 0
    for prefix_length in range(1, 7):
        prefix = [dict(row) for row in GOOD_TRACE[:prefix_length]]
        veto = {"time": prefix[-1]["time"] + 1, "action": "veto", "actor": "maintainer"}
        veto_trace = [*prefix, veto]
        assert validate(veto_trace) == (True, "withdrawn_by_veto")
        accepted_veto_positions += 1
        for wrong_role in ("proposer", "reviewer", "challenger"):
            mutant = [dict(row) for row in veto_trace]
            mutant[-1]["actor"] = wrong_role
            assert validate(mutant) == (False, "unauthorized_or_invalid_transition")
            rejected_veto_role_mutations += 1
    assert accepted_veto_positions == 6
    assert rejected_veto_role_mutations == 18

    # An incomplete ordinary recourse path remains invalid; conditional veto
    # validity must not make every early stop acceptable.
    assert validate(GOOD_TRACE[:3]) == (False, "contested")

    old_events = json.loads(FIXTURE.read_text(encoding="utf-8"))["events"]
    assert validate(old_events) == (False, "invalid_time")

    print(
        "PASS governance state machine: appeal path + 6/6 veto positions accepted; "
        "42/42 role mutations rejected"
    )


if __name__ == "__main__":
    main()
