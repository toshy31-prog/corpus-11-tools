#!/usr/bin/env python3
"""Fictional population separating transfer capacity from support dependence."""

from __future__ import annotations


POPULATION = {
    "generalizer": {"learned_operation": "add", "recorded_procedures": {}},
    "procedure_bound": {"learned_operation": None, "recorded_procedures": {"t1": "add"}},
    "assistance_only": {"learned_operation": None, "recorded_procedures": {}},
}

TASKS = {
    "familiar": {"template": "t1", "left": 2, "right": 3, "required_operation": "add", "expected": 5},
    "novel": {"template": "t2", "left": 8, "right": 3, "required_operation": "add", "expected": 11},
    "novel_variant": {"template": "t3", "left": -1, "right": 6, "required_operation": "add", "expected": 5},
    "template_collision": {"template": "t1", "left": 2, "right": 3, "required_operation": "multiply", "expected": 6},
}


def apply_operation(operation: str, task: dict[str, object]) -> int:
    if operation == "add":
        return task["left"] + task["right"]
    if operation == "multiply":
        return task["left"] * task["right"]
    raise AssertionError(f"unknown operation: {operation}")


def perform(
    profile: dict[str, object], task: dict[str, object], *, help_available: bool, procedure_available: bool
) -> dict[str, object]:
    predicted = None
    operation_used = None
    support = "none"
    if help_available:
        predicted = task["expected"]
        support = "assistance"
    elif profile["learned_operation"] is not None:
        operation_used = profile["learned_operation"]
        predicted = apply_operation(operation_used, task)
        support = "learned_operation"
    elif procedure_available:
        operation_used = profile["recorded_procedures"].get(task["template"])
        if operation_used is not None:
            predicted = apply_operation(operation_used, task)
            support = "recorded_procedure"
    mechanism_matches = support == "assistance" or operation_used == task["required_operation"]
    success = predicted == task["expected"] and mechanism_matches
    return {
        "success": success,
        "predicted": predicted,
        "operation_used": operation_used,
        "support": support,
        "template": task["template"],
    }


def trace(profile: dict[str, object]) -> dict[str, bool]:
    return {
        "assisted": perform(profile, TASKS["familiar"], help_available=True, procedure_available=False)["success"],
        "withdrawal": perform(profile, TASKS["familiar"], help_available=False, procedure_available=False)["success"],
        "novel_transfer": perform(profile, TASKS["novel"], help_available=False, procedure_available=False)["success"],
        "novel_variant": perform(
            profile, TASKS["novel_variant"], help_available=False, procedure_available=False
        )["success"],
        "recovery_with_record": perform(
            profile, TASKS["familiar"], help_available=False, procedure_available=True
        )["success"],
    }


def classify(result: dict[str, bool]) -> str:
    if result["withdrawal"] and result["novel_transfer"] and result["novel_variant"]:
        return "autonomous_capacity_in_model"
    if result["recovery_with_record"]:
        return "recorded_procedure_dependence"
    return "assistance_dependence"


def main() -> None:
    traces = {agent: trace(profile) for agent, profile in POPULATION.items()}
    assert all(result["assisted"] for result in traces.values())
    verdicts = {agent: classify(result) for agent, result in traces.items()}
    assert verdicts == {
        "generalizer": "autonomous_capacity_in_model",
        "procedure_bound": "recorded_procedure_dependence",
        "assistance_only": "assistance_dependence",
    }
    assert not traces["procedure_bound"]["novel_transfer"]
    assert traces["procedure_bound"]["recovery_with_record"]

    # Minimal mutations that exposed the former proxy: template was ignored and
    # a boolean `general_rule` flag directly forced success.
    renamed_template = dict(TASKS["novel"], template="t-unseen")
    assert perform(
        POPULATION["generalizer"], renamed_template, help_available=False, procedure_available=False
    )["success"]
    wrong_target = dict(TASKS["novel"], expected=12)
    assert not perform(
        POPULATION["generalizer"], wrong_target, help_available=False, procedure_available=False
    )["success"]
    assert not perform(
        POPULATION["generalizer"], TASKS["template_collision"], help_available=False, procedure_available=False
    )["success"]
    assert not perform(
        POPULATION["procedure_bound"], TASKS["template_collision"], help_available=False, procedure_available=True
    )["success"]
    latent_label_mutant = dict(POPULATION["assistance_only"], general_rule=True)
    assert not perform(
        latent_label_mutant, TASKS["novel"], help_available=False, procedure_available=False
    )["success"]
    print(
        "PASS fictional capacity: 3 classes from computed tasks; "
        "5/5 template/oracle/latent-label mutations discriminated"
    )


if __name__ == "__main__":
    main()
