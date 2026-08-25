#!/usr/bin/env python3
"""Exhaustively audit identification in small binary SCMs."""

from __future__ import annotations

from fractions import Fraction
from itertools import combinations, product
import json
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "scm_campaign_v0.2.json"


def powerset(values: list[str]) -> list[tuple[str, ...]]:
    return [subset for size in range(len(values) + 1) for subset in combinations(values, size)]


def subset_key(values: tuple[str, ...]) -> str:
    return "[" + ",".join(values) + "]"


def evaluate_model(model: str, exogenous: dict[str, int], intervention: int | None = None) -> dict[str, int]:
    if model == "measured_confounder":
        c = exogenous["U_C"]
        x = intervention if intervention is not None else int(exogenous["U_X"] or (c and exogenous["U_V"]))
        return {"C": c, "X": x, "Y": int(x or c)}
    if model == "latent_confounder":
        latent = exogenous["U_L"]
        x = intervention if intervention is not None else int(exogenous["U_X"] or (latent and exogenous["U_V"]))
        return {"Z": exogenous["U_Z"], "X": x, "Y": int(x or latent)}
    if model == "collider":
        x = intervention if intervention is not None else exogenous["U_X"]
        y = int(x or exogenous["U_Y"])
        return {"K": x ^ y, "X": x, "Y": y}
    if model == "mediator":
        x = intervention if intervention is not None else exogenous["U_X"]
        mediator = int(x or exogenous["U_M"])
        return {"M": mediator, "X": x, "Y": int(mediator or exogenous["U_Y"])}
    if model == "randomized":
        c = exogenous["U_C"]
        x = intervention if intervention is not None else exogenous["U_X"]
        return {"C": c, "X": x, "Y": int(x or c)}
    if model == "positivity_violated":
        c = exogenous["U_C"]
        x = intervention if intervention is not None else c
        return {"C": c, "X": x, "Y": int(x or c)}
    raise AssertionError(f"unknown SCM: {model}")


def enumerate_rows(scenario: dict[str, object], intervention: int | None = None) -> list[dict[str, int]]:
    names = scenario["exogenous"]
    return [
        evaluate_model(scenario["model"], dict(zip(names, bits)), intervention)
        for bits in product((0, 1), repeat=len(names))
    ]


def exact_do_effect(scenario: dict[str, object]) -> Fraction:
    treated = enumerate_rows(scenario, intervention=1)
    control = enumerate_rows(scenario, intervention=0)
    return sum(Fraction(a["Y"] - b["Y"], len(treated)) for a, b in zip(treated, control))


def descendants(node: str, edges: set[tuple[str, str]]) -> set[str]:
    found: set[str] = set()
    frontier = [node]
    while frontier:
        parent = frontier.pop()
        for source, target in edges:
            if source == parent and target not in found:
                found.add(target)
                frontier.append(target)
    return found


def ancestors(nodes: set[str], edges: set[tuple[str, str]]) -> set[str]:
    found = set(nodes)
    frontier = list(nodes)
    while frontier:
        child = frontier.pop()
        for source, target in edges:
            if target == child and source not in found:
                found.add(source)
                frontier.append(source)
    return found


def backdoor_blocked(adjustment: tuple[str, ...], edges: set[tuple[str, str]]) -> bool:
    """Use the moralized ancestral backdoor graph for a binary DAG."""
    if set(adjustment).intersection(descendants("X", edges)):
        return False
    backdoor = {(a, b) for a, b in edges if a != "X"}
    retained = ancestors({"X", "Y", *adjustment}, backdoor)
    induced = {(a, b) for a, b in backdoor if a in retained and b in retained}
    undirected: dict[str, set[str]] = {node: set() for node in retained}
    for source, target in induced:
        undirected[source].add(target)
        undirected[target].add(source)
    for child in retained:
        parents = sorted(source for source, target in induced if target == child)
        for left, right in combinations(parents, 2):
            undirected[left].add(right)
            undirected[right].add(left)
    blocked = set(adjustment)
    frontier = ["X"]
    seen = {"X", *blocked}
    while frontier:
        node = frontier.pop()
        for neighbor in undirected[node]:
            if neighbor == "Y":
                return False
            if neighbor not in seen:
                seen.add(neighbor)
                frontier.append(neighbor)
    return True


def has_positivity(rows: list[dict[str, int]], adjustment: tuple[str, ...]) -> bool:
    strata = {tuple(row[name] for name in adjustment) for row in rows}
    return all(
        {row["X"] for row in rows if tuple(row[name] for name in adjustment) == stratum} == {0, 1}
        for stratum in strata
    )


def standardized_effect(rows: list[dict[str, int]], adjustment: tuple[str, ...]) -> Fraction | None:
    if not has_positivity(rows, adjustment):
        return None
    total = len(rows)
    result = Fraction(0)
    for stratum in sorted({tuple(row[name] for name in adjustment) for row in rows}):
        members = [row for row in rows if tuple(row[name] for name in adjustment) == stratum]
        treated = [row["Y"] for row in members if row["X"] == 1]
        control = [row["Y"] for row in members if row["X"] == 0]
        result += Fraction(len(members), total) * (
            Fraction(sum(treated), len(treated)) - Fraction(sum(control), len(control))
        )
    return result


def show(value: Fraction | None) -> str | None:
    if value is None:
        return None
    return str(value.numerator) if value.denominator == 1 else f"{value.numerator}/{value.denominator}"


def assessment(scenario: dict[str, object]) -> dict[str, object]:
    rows = enumerate_rows(scenario)
    edges = {tuple(edge) for edge in scenario["edges"]}
    oracle = exact_do_effect(scenario)
    subsets: dict[str, dict[str, object]] = {}
    for adjustment in powerset(scenario["observable_adjustment_variables"]):
        graph_valid = backdoor_blocked(adjustment, edges)
        positivity = has_positivity(rows, adjustment)
        estimate = standardized_effect(rows, adjustment)
        if set(adjustment).intersection(descendants("X", edges)):
            verdict = "invalid_descendant_adjustment"
        elif not graph_valid:
            verdict = "not_identified_backdoor_open"
        elif not positivity:
            verdict = "not_identified_positivity_violated"
        else:
            verdict = "identified_under_assumptions"
            assert estimate == oracle, (scenario["id"], adjustment, estimate, oracle)
        subsets[subset_key(adjustment)] = {
            "verdict": verdict,
            "positivity": positivity,
            "estimate": show(estimate),
        }
    return {"do_effect": show(oracle), "subsets": subsets}


def legacy_label_verdict(label: str) -> str:
    return "identified_under_assumptions" if label == "randomized" else "not_identified"


def main() -> None:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["protocol_fixed_before_execution"] is True
    observed: dict[str, dict[str, object]] = {}
    subset_count = 0
    for scenario in fixture["scenarios"]:
        result = assessment(scenario)
        assert result == scenario["expected"], f"{scenario['id']}: {result}"
        subset_count += len(result["subsets"])
        observed[scenario["id"]] = result
    randomized = next(item for item in fixture["scenarios"] if item["id"] == "randomized")
    rival = next(item for item in fixture["scenarios"] if item["id"] == "label_rival")
    assert enumerate_rows(randomized) == enumerate_rows(rival)
    assert observed["randomized"] == observed["label_rival"]
    assert legacy_label_verdict(randomized["design_label"]) != legacy_label_verdict(rival["design_label"])
    assert subset_count == 14
    print("PASS causal SCM campaign v0.2: 7 SCMs, 14 adjustment subsets")


if __name__ == "__main__":
    main()
