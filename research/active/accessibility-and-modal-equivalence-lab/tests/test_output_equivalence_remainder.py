#!/usr/bin/env python3
"""Discriminate equal outputs by one frozen synthetic threshold perturbation."""

from __future__ import annotations

from itertools import combinations
import json
from pathlib import Path

from test_functional_modal_tasks import BASE_CHANNELS, execute


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "output_equivalence_remainder_v0.3.json"


def changed_keys(left: dict[str, object], right: dict[str, object]) -> set[str]:
    assert set(left) == set(right)
    return {key for key in left if left[key] != right[key]}


def canonical_output(result: dict[str, object]) -> str:
    return json.dumps(result, sort_keys=True, separators=(",", ":"))


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["scope"] == "pipeline_verified"
    assert fixture["evidence_regime"] == "internal_synthetic_only"
    assert fixture["external_validity"] == "not_claimed"
    assert fixture["pre_registration_demonstrated"] is False
    assert fixture["independence_status"] == "independence_unknown"
    assert fixture["temporal_order_claimed"] is False

    assert fixture["source_channel"] == "voice"
    assert fixture["assisted_variant"] == {
        "evidence_loss": False,
        "load": 4,
    }
    voice = BASE_CHANNELS[fixture["source_channel"]]
    voice_assisted = dict(voice, **fixture["assisted_variant"])
    assert changed_keys(voice, voice_assisted) == {"evidence_loss", "load"}
    assert voice_assisted["evidence_loss"] is False
    assert voice_assisted["load"] == 4

    cases = fixture["threshold_cases"]
    assert [case["threshold"] for case in cases] == [3, 4, 5]
    configurations = {
        case["threshold"]: dict(voice_assisted, load_threshold=case["threshold"])
        for case in cases
    }
    for left, right in combinations(configurations, 2):
        assert changed_keys(configurations[left], configurations[right]) == {"load_threshold"}

    results = {threshold: execute(configuration) for threshold, configuration in configurations.items()}
    observations = {
        case["threshold"]: {
            "success": results[case["threshold"]]["success"],
            "failure_reasons": results[case["threshold"]]["failure_reasons"],
            "margin": case["threshold"] - configurations[case["threshold"]]["load"],
        }
        for case in cases
    }
    expected_observations = {
        case["threshold"]: {
            "success": case["expected_success"],
            "failure_reasons": case["expected_failure_reasons"],
            "margin": case["expected_margin"],
        }
        for case in cases
    }

    equal_thresholds = fixture["equal_terminal_output_thresholds"]
    assert equal_thresholds == [4, 5]
    initial_successes = all(results[threshold]["success"] for threshold in equal_thresholds)
    terminal_outputs_identical = (
        canonical_output(results[equal_thresholds[0]])
        == canonical_output(results[equal_thresholds[1]])
    )

    perturbation = fixture["common_perturbation"]
    assert perturbation["field"] == "load_threshold"
    assert perturbation["delta"] == -1
    perturbed_results: dict[int, dict[str, object]] = {}
    perturbation_observations: list[dict[str, object]] = []
    for transition in perturbation["transitions"]:
        source = transition["from"]
        target = transition["to"]
        assert target == source + perturbation["delta"]
        perturbed = dict(configurations[source], load_threshold=target)
        assert changed_keys(configurations[source], perturbed) == {"load_threshold"}
        result = execute(perturbed)
        perturbed_results[source] = result
        perturbation_observations.append({
            "transition": f"{source}->{target}",
            "success": result["success"],
            "failure_reasons": result["failure_reasons"],
        })

    transitions_match = all(
        observation["success"] == transition["expected_success"]
        and observation["failure_reasons"] == transition["expected_failure_reasons"]
        for observation, transition in zip(
            perturbation_observations,
            perturbation["transitions"],
            strict=True,
        )
    )
    common_perturbation_separates = (
        perturbed_results[4]["success"] is False
        and perturbed_results[4]["failure_reasons"] == ["load_threshold_exceeded"]
        and perturbed_results[5]["success"] is True
        and perturbed_results[5]["failure_reasons"] == []
    )

    if (
        observations == expected_observations
        and initial_successes
        and terminal_outputs_identical
        and transitions_match
        and common_perturbation_separates
    ):
        classification = fixture["admissible_classification"]["name"]
    else:
        classification = fixture["fallback_classification"]

    assert classification != "candidate_set_incomplete", classification
    assert fixture["admissible_classification"]["loser"] == "final_output_only_equivalence"
    assert set(fixture["rivals"]) == {
        "final_output_only_equivalence",
        "material_equivalence",
    }

    print(json.dumps({
        "valid": True,
        "classification": classification,
        "losing_rival": fixture["admissible_classification"]["loser"],
        "threshold_observations": observations,
        "terminal_outputs_identical_at_4_and_5": terminal_outputs_identical,
        "common_perturbation": perturbation_observations,
        "configuration_difference": ["load_threshold"],
        "scope": fixture["scope"],
        "evidence_regime": fixture["evidence_regime"],
        "external_validity": fixture["external_validity"],
        "independence_status": fixture["independence_status"],
    }, sort_keys=True))


if __name__ == "__main__":
    main()
