#!/usr/bin/env python3
"""Fictional cross-modal task execution beyond identifier equality."""

from __future__ import annotations


BASE_CHANNELS = {
    "text": {
        "action": "contest-decision",
        "evidence": "receipt-17",
        "recourse": "appeal-17",
        "evidence_loss": False,
        "step_budget": 3,
        "load": 3,
        "load_threshold": 5,
        "shortcut": False,
    },
    "voice": {
        "action": "contest-decision",
        "evidence": "receipt-17",
        "recourse": "appeal-17",
        "evidence_loss": True,
        "step_budget": 3,
        "load": 3,
        "load_threshold": 5,
        "shortcut": False,
    },
    "constrained": {
        "action": "contest-decision",
        "evidence": "receipt-17",
        "recourse": "appeal-17",
        "evidence_loss": False,
        "step_budget": 2,
        "load": 3,
        "load_threshold": 5,
        "shortcut": False,
    },
}

TASK = {
    "action": "contest-decision",
    "evidence": "receipt-17",
    "recourse": "appeal-17",
}


def execute(channel: dict[str, object]) -> dict[str, object]:
    steps = 2 if channel["shortcut"] else 3
    action_performed = channel["action"] == TASK["action"]
    evidence_present = channel["evidence"] == TASK["evidence"]
    evidence_preserved = evidence_present and not channel["evidence_loss"]
    recourse_available = channel["recourse"] == TASK["recourse"]
    steps_within_budget = steps <= channel["step_budget"]
    load_within_threshold = channel["load"] <= channel["load_threshold"]
    operation_results = {
        "action_performed": action_performed,
        "evidence_preserved": evidence_preserved,
        "recourse_available": recourse_available,
        "steps_within_budget": steps_within_budget,
        "load_within_threshold": load_within_threshold,
    }
    reason_by_operation = {
        "action_performed": "action_unavailable_or_changed",
        "evidence_preserved": (
            "evidence_lost_by_transformation" if evidence_present else "evidence_missing_or_changed"
        ),
        "recourse_available": "recourse_missing_or_changed",
        "steps_within_budget": "step_threshold_exceeded",
        "load_within_threshold": "load_threshold_exceeded",
    }
    reasons = [reason_by_operation[name] for name, passed in operation_results.items() if not passed]
    recourse_reached = all(operation_results.values())
    return {
        "success": recourse_reached,
        "steps": steps,
        "action_performed": action_performed,
        "evidence_preserved": evidence_preserved,
        "recourse_reached": recourse_reached,
        "operation_results": operation_results,
        "failure_reasons": reasons,
    }


def main() -> None:
    for field in ("action", "evidence", "recourse"):
        assert len({channel[field] for channel in BASE_CHANNELS.values()}) == 1

    base = {name: execute(channel) for name, channel in BASE_CHANNELS.items()}
    assert base["text"]["success"]
    assert base["voice"]["failure_reasons"] == ["evidence_lost_by_transformation"]
    assert base["constrained"]["failure_reasons"] == ["step_threshold_exceeded"]

    voice_assisted = dict(BASE_CHANNELS["voice"], evidence_loss=False, load=4)
    constrained_assisted = dict(BASE_CHANNELS["constrained"], shortcut=True)
    assert execute(voice_assisted)["success"]
    assert execute(constrained_assisted)["success"]

    # The three identifiers are executable task requirements, not descriptive
    # metadata. Mutating any one must destroy the corresponding operation.
    identifier_mutations = {
        "action": ("forbidden", "action_unavailable_or_changed"),
        "evidence": ("", "evidence_missing_or_changed"),
        "recourse": ("", "recourse_missing_or_changed"),
    }
    for field, (value, expected_reason) in identifier_mutations.items():
        mutant = dict(BASE_CHANNELS["text"], **{field: value})
        result = execute(mutant)
        assert not result["success"]
        assert not result["recourse_reached"]
        assert expected_reason in result["failure_reasons"]

    combined_mutant = dict(BASE_CHANNELS["text"], action="forbidden", evidence="", recourse="")
    combined = execute(combined_mutant)
    assert not combined["success"]
    assert combined["failure_reasons"] == [
        "action_unavailable_or_changed",
        "evidence_missing_or_changed",
        "recourse_missing_or_changed",
    ]

    print(
        "PASS modal tasks: 1/3 base successes, 2/2 repairs, "
        "4/4 identifier-loss mutations rejected"
    )


if __name__ == "__main__":
    main()
