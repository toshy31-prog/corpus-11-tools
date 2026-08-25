#!/usr/bin/env python3
"""Exact finite option tree with costs, delay, reuse and correlation."""

from __future__ import annotations

from fractions import Fraction


UTILITY_UNIT = "synthetic_decision_utility"
UTILITY_WEIGHTS = {
    "information_unit": Fraction(1),
    "execution": -Fraction(1, 5),
    "delay_event": -Fraction(1, 5),
    "reusable_output": Fraction(1, 20),
}

WORLDS = {
    "correlated_redundant": {
        "joint": {(0, 0): Fraction(1, 10), (0, 1): 0, (1, 0): 0, (1, 1): Fraction(9, 10)},
        "b_redundant_when_a": True,
    },
    "independent_nonredundant": {
        "joint": {outcome: Fraction(1, 4) for outcome in ((0, 0), (0, 1), (1, 0), (1, 1))},
        "b_redundant_when_a": False,
    },
}


def covariance(joint: dict[tuple[int, int], Fraction]) -> Fraction:
    ea = sum(probability * a for (a, _), probability in joint.items())
    eb = sum(probability * b for (_, b), probability in joint.items())
    eab = sum(probability * a * b for (a, b), probability in joint.items())
    return eab - ea * eb


def evaluate(world: dict[str, object], policy: str) -> dict[str, object]:
    raw = {
        key: Fraction(0)
        for key in ("information_units", "executions", "delay_events", "reusable_outputs")
    }
    for (a, b), probability in world["joint"].items():
        execute_b = policy == "uniform" or (policy == "option_preserving" and a == 0)
        executions = 1 + int(execute_b)
        if world["b_redundant_when_a"] and a == 1:
            information = Fraction(1)
        else:
            information = Fraction(a + (b if execute_b else 0))
        # The sequential policy pays delay whenever B is executed after A,
        # including when B also fails. Delay is a protocol cost, not a reward
        # conditional on a positive B outcome.
        delay_event = int(policy == "option_preserving" and a == 0)
        raw["information_units"] += probability * information
        raw["executions"] += probability * executions
        raw["reusable_outputs"] += probability * executions
        raw["delay_events"] += probability * delay_event
    utility_components = {
        "information": raw["information_units"] * UTILITY_WEIGHTS["information_unit"],
        "execution_cost": raw["executions"] * UTILITY_WEIGHTS["execution"],
        "delay_cost": raw["delay_events"] * UTILITY_WEIGHTS["delay_event"],
        "reuse_value": raw["reusable_outputs"] * UTILITY_WEIGHTS["reusable_output"],
    }
    return {
        "raw": raw,
        "utility_unit": UTILITY_UNIT,
        "utility_components": utility_components,
        "net_model_utility": sum(utility_components.values(), Fraction(0)),
    }


def main() -> None:
    correlated = WORLDS["correlated_redundant"]
    independent = WORLDS["independent_nonredundant"]
    assert sum(correlated["joint"].values()) == 1
    assert sum(independent["joint"].values()) == 1
    assert covariance(correlated["joint"]) == Fraction(9, 100)
    assert covariance(independent["joint"]) == 0

    correlated_uniform = evaluate(correlated, "uniform")
    correlated_option = evaluate(correlated, "option_preserving")
    independent_uniform = evaluate(independent, "uniform")
    independent_option = evaluate(independent, "option_preserving")

    for result in (correlated_uniform, correlated_option, independent_uniform, independent_option):
        assert result["utility_unit"] == "synthetic_decision_utility"
        assert result["net_model_utility"] == sum(result["utility_components"].values(), Fraction(0))

    assert correlated_option["raw"] == {
        "information_units": Fraction(9, 10),
        "executions": Fraction(11, 10),
        "delay_events": Fraction(1, 10),
        "reusable_outputs": Fraction(11, 10),
    }
    assert independent_option["raw"]["delay_events"] == Fraction(1, 2)
    assert correlated_option["net_model_utility"] == Fraction(143, 200)
    assert correlated_uniform["net_model_utility"] == Fraction(3, 5)
    assert correlated_option["net_model_utility"] > correlated_uniform["net_model_utility"]
    assert independent_uniform["net_model_utility"] == Fraction(7, 10)
    assert independent_option["net_model_utility"] == Fraction(17, 40)
    assert independent_uniform["net_model_utility"] > independent_option["net_model_utility"]

    print(
        "PASS option tree: raw units separated, explicit model utility applied; "
        "each policy loses one world"
    )


if __name__ == "__main__":
    main()
