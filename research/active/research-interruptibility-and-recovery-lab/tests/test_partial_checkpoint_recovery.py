#!/usr/bin/env python3
"""Classify one partial-checkpoint recovery with the existing v0.2 executor."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path

from test_cutpoint_recovery import (
    STEPS,
    advance,
    digest,
    initial_state,
    material_view,
    restore,
    serialize,
)


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "partial_checkpoint_recovery_v0.3.json"


def qualifies_complete_recovery(observation: dict[str, object]) -> bool:
    """Require process, restored-state integrity and final equivalence together."""
    return all(
        observation.get(field) is True
        for field in (
            "process_resumed",
            "restored_state_integrity",
            "final_result_equivalence",
        )
    )


def artifact_chain(research_id: str, steps: list[str], dependency: str) -> list[str]:
    """Reconstruct hashes for an explicitly observed order of pipeline steps."""
    artifacts: list[str] = []
    for step in steps:
        previous = artifacts[-1] if artifacts else "root"
        active_dependency = dependency if step in {"decide", "report"} else "stable"
        artifacts.append(digest(research_id, step, previous, active_dependency))
    return artifacts


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["scope"] == "pipeline_verified"
    assert fixture["evidence_regime"] == "internal_synthetic_only"
    assert fixture["external_validity"] == "not_claimed"
    assert fixture["independence_status"] == "independence_unknown"
    assert fixture["decision_match_alone_is_complete_recovery"] is False

    cutpoint = fixture["cutpoint"]
    assert cutpoint == 2
    assert fixture["completed_steps_before_mutation"] == list(STEPS[:cutpoint])

    baseline = advance(initial_state())
    partial = advance(initial_state(), cutpoint)
    valid_snapshot = serialize(partial)
    valid_document = json.loads(valid_snapshot)

    valid_restored = restore(valid_snapshot)
    valid_resumed = advance(valid_restored)
    assert material_view(valid_resumed) == material_view(baseline)
    assert valid_resumed["journal"] == ["stop@2", "resume@2"]

    mutation = fixture["mutation"]
    assert mutation == {
        "operation": "remove_artifact",
        "artifact_index": 1,
        "artifact_step": "compare",
        "allowed_changed_top_level_keys": ["artifacts"],
    }
    mutated_document = deepcopy(valid_document)
    removed_artifact = mutated_document["artifacts"].pop(mutation["artifact_index"])

    expected_compare_artifact = digest(
        partial["research_id"],
        "compare",
        partial["artifacts"][0],
        "stable",
    )
    assert removed_artifact == expected_compare_artifact
    assert set(mutated_document) == set(valid_document)
    changed_top_level_keys = sorted(
        key for key in valid_document if valid_document[key] != mutated_document[key]
    )
    assert changed_top_level_keys == mutation["allowed_changed_top_level_keys"]
    assert mutated_document["artifacts"] == (
        valid_document["artifacts"][: mutation["artifact_index"]]
        + valid_document["artifacts"][mutation["artifact_index"] + 1 :]
    )
    for key in valid_document:
        if key != "artifacts":
            assert mutated_document[key] == valid_document[key]

    partial_snapshot = json.dumps(mutated_document, sort_keys=True)
    observation: dict[str, object] = {
        "restore_status": None,
        "restore_error": None,
        "restored_cursor": None,
        "restored_decision": None,
        "restored_artifact_count": None,
        "restored_artifacts": None,
        "restored_chain_matches_cursor_prefix": None,
        "restored_journal": None,
        "advance_status": "not_started",
        "advance_error": None,
        "final_cursor": None,
        "final_decision": None,
        "final_artifact_count": None,
        "final_artifact_steps": None,
        "final_artifacts": None,
        "final_chain_matches_observed_order": None,
        "final_chain_matches_baseline": None,
        "final_journal": None,
        "process_resumed": False,
        "restored_state_integrity": False,
        "final_result_equivalence": False,
        "decision_matches_baseline": False,
        "complete_recovery": False,
    }

    try:
        restored = restore(partial_snapshot)
    except Exception as error:  # The rejected branch is an admissible observation.
        observation["restore_status"] = "rejected"
        observation["restore_error"] = {
            "type": type(error).__name__,
            "message": str(error),
        }
        classification = "rejected_before_resume"
    else:
        observation.update({
            "restore_status": "accepted",
            "restored_cursor": restored["cursor"],
            "restored_decision": restored["decision"],
            "restored_artifact_count": len(restored["artifacts"]),
            "restored_artifacts": list(restored["artifacts"]),
            "restored_chain_matches_cursor_prefix": (
                restored["artifacts"] == baseline["artifacts"][: restored["cursor"]]
            ),
            "restored_journal": list(restored["journal"]),
        })
        observation["restored_state_integrity"] = (
            observation["restored_artifact_count"] == observation["restored_cursor"]
            and observation["restored_chain_matches_cursor_prefix"] is True
        )

        try:
            resumed = advance(restored)
        except Exception as error:  # An unpredicted execution failure stays explicit.
            observation["advance_status"] = "failed"
            observation["advance_error"] = {
                "type": type(error).__name__,
                "message": str(error),
            }
            classification = fixture["fallback_classification"]
        else:
            observed_steps = ["frame", "decide", "report"]
            expected_observed_chain = artifact_chain(
                resumed["research_id"], observed_steps, resumed["execution_dependency"]
            )
            observation.update({
                "advance_status": "completed",
                "final_cursor": resumed["cursor"],
                "final_decision": resumed["decision"],
                "final_artifact_count": len(resumed["artifacts"]),
                "final_artifact_steps": observed_steps,
                "final_artifacts": list(resumed["artifacts"]),
                "final_chain_matches_observed_order": resumed["artifacts"] == expected_observed_chain,
                "final_chain_matches_baseline": resumed["artifacts"] == baseline["artifacts"],
                "final_journal": list(resumed["journal"]),
                "process_resumed": resumed["cursor"] == len(STEPS),
                "final_result_equivalence": material_view(resumed) == material_view(baseline),
                "decision_matches_baseline": resumed["decision"] == baseline["decision"],
            })
            observation["complete_recovery"] = qualifies_complete_recovery(observation)
            if observation["process_resumed"] is True and observation["final_result_equivalence"] is False:
                classification = "resumed_with_material_divergence"
            else:
                classification = fixture["fallback_classification"]

    decision_only_terminal = {
        "process_resumed": True,
        "restored_state_integrity": False,
        "final_result_equivalence": False,
        "decision_matches_baseline": True,
    }
    assert qualifies_complete_recovery(decision_only_terminal) is False

    admissible = fixture["admissible_classifications"]
    assert classification in admissible, classification
    loser = admissible[classification]["loser"]
    assert loser in fixture["rivals"]
    if classification == "rejected_before_resume":
        assert observation["restore_status"] == "rejected"
        assert observation["advance_status"] == "not_started"
    else:
        assert observation["restore_status"] == "accepted"
        assert observation["process_resumed"] is True
        assert observation["final_result_equivalence"] is False
        assert observation["complete_recovery"] is False

    print(json.dumps({
        "valid": True,
        "classification": classification,
        "losing_rival": loser,
        "observation": observation,
        "negative_control_decision_only_rejected": True,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
