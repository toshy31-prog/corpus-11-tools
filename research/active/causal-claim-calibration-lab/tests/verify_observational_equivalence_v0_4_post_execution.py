#!/usr/bin/env python3
"""Independent post-execution verifier for v0.4 expression/table equality.

This file does not import or execute the sealed v0.4 harness and does not read
the held-out result. It validates only the already-public model fixture.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import itertools
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Mapping

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FIXTURE = ROOT / "fixtures/observational_equivalence_models_v0.4.json"
PUBLIC_FIXTURE_SHA256 = "1dc5439242ffc00dbb7d6b9a932ae514d66cb3499cf640fbdeb82bb88f188bc6"
EXPECTED_CAMPAIGN = "CCCL-OE-004"
EXPECTED_SCOPE = "internal_synthetic_only"
EXPECTED_EXTERNAL_VALIDITY = "not_claimed"
EXPECTED_INDEPENDENCE = "independence_unknown"

IDENTIFIER = r"[A-Z][A-Z0-9_]*"
ASSIGNMENT_RE = re.compile(rf"^(?P<target>{IDENTIFIER}) := (?P<rhs>.+)$")
VARIABLE_RE = re.compile(rf"^(?P<name>{IDENTIFIER})$")
BINARY_RE = re.compile(rf"^(?P<left>{IDENTIFIER}) (?P<operator>OR|AND) (?P<right>{IDENTIFIER})$")
INDICATOR_RE = re.compile(rf"^1\[(?P<name>{IDENTIFIER}) >= (?P<threshold>[0-9]+)\]$")
CALL_RE = re.compile(rf"^(?P<function>f_[A-Z][A-Z0-9_]*)\((?P<arguments>{IDENTIFIER}(?:,{IDENTIFIER})*)\)$")


class VerificationError(AssertionError):
    """A declared expression is not exactly represented by its table."""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise VerificationError(message)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def finite_f_y(x: int, u: int) -> int:
    """Post-hoc explicit semantics assigned to the v0.4 symbol f_Y."""
    return int(u >= 2 or (u == 1 and x == 0))


FUNCTIONS: dict[str, tuple[int, Callable[..., int]]] = {
    "f_Y": (2, finite_f_y),
}


@dataclass(frozen=True)
class ParsedRhs:
    canonical: str
    variables: tuple[str, ...]
    evaluator: Callable[[Mapping[str, int]], int]


def parse_rhs(rhs: str) -> ParsedRhs:
    if match := BINARY_RE.fullmatch(rhs):
        left = match.group("left")
        right = match.group("right")
        operator = match.group("operator")

        def evaluate_binary(environment: Mapping[str, int]) -> int:
            left_value = environment[left]
            right_value = environment[right]
            require(left_value in (0, 1) and right_value in (0, 1), "binary operator received non-binary input")
            if operator == "OR":
                return int(bool(left_value) or bool(right_value))
            return int(bool(left_value) and bool(right_value))

        return ParsedRhs(f"{left} {operator} {right}", tuple(dict.fromkeys((left, right))), evaluate_binary)

    if match := INDICATOR_RE.fullmatch(rhs):
        name = match.group("name")
        threshold = int(match.group("threshold"))
        return ParsedRhs(
            f"1[{name} >= {threshold}]",
            (name,),
            lambda environment: int(environment[name] >= threshold),
        )

    if match := CALL_RE.fullmatch(rhs):
        function_name = match.group("function")
        arguments = tuple(match.group("arguments").split(","))
        require(function_name in FUNCTIONS, f"unknown finite function: {function_name}")
        arity, implementation = FUNCTIONS[function_name]
        require(len(arguments) == arity, f"wrong arity for {function_name}")
        return ParsedRhs(
            f"{function_name}({','.join(arguments)})",
            tuple(dict.fromkeys(arguments)),
            lambda environment: implementation(*(environment[name] for name in arguments)),
        )

    if match := VARIABLE_RE.fullmatch(rhs):
        name = match.group("name")
        return ParsedRhs(name, (name,), lambda environment: environment[name])

    raise VerificationError(f"expression outside authorized grammar: {rhs!r}")


def parse_expression(expression: str, declared_target: str) -> ParsedRhs:
    match = ASSIGNMENT_RE.fullmatch(expression)
    require(match is not None, f"invalid assignment grammar: {expression!r}")
    require(match.group("target") == declared_target, "assignment target contradicts equation target")
    rhs_text = match.group("rhs")
    parsed = parse_rhs(rhs_text)
    require(parsed.canonical == rhs_text, "right-hand side is not in canonical grammar form")
    return parsed


def verify_equation(model_id: str, equation: dict[str, object]) -> dict[str, object]:
    require(set(equation) == {"target", "expression", "parents", "table"}, f"{model_id}: equation fields changed")
    target = equation["target"]
    expression = equation["expression"]
    parents = equation["parents"]
    table = equation["table"]
    require(isinstance(target, str) and isinstance(expression, str), f"{model_id}: target/expression type mismatch")
    require(isinstance(parents, list) and all(isinstance(item, str) for item in parents), f"{model_id}: parent type mismatch")
    require(isinstance(table, list) and table, f"{model_id}: empty equation table")
    parsed = parse_expression(expression, target)
    require(set(parsed.variables) == set(parents), f"{model_id}/{target}: expression variables contradict parents")

    rows: dict[tuple[int, ...], int] = {}
    domains: dict[str, set[int]] = {parent: set() for parent in parents}
    for row in table:
        require(isinstance(row, dict) and set(row) == {"when", "value"}, f"{model_id}/{target}: row fields changed")
        when = row["when"]
        value = row["value"]
        require(isinstance(when, dict) and set(when) == set(parents), f"{model_id}/{target}: row parent mismatch")
        require(value in (0, 1), f"{model_id}/{target}: non-binary table output")
        key = tuple(when[parent] for parent in parents)
        require(key not in rows, f"{model_id}/{target}: duplicate table row")
        rows[key] = value
        for parent in parents:
            require(isinstance(when[parent], int), f"{model_id}/{target}: non-integer parent value")
            domains[parent].add(when[parent])

    expected_keys = set(itertools.product(*(sorted(domains[parent]) for parent in parents)))
    require(set(rows) == expected_keys, f"{model_id}/{target}: table is not exhaustive over observed parent domains")
    checked_rows = 0
    for key in sorted(expected_keys):
        environment = dict(zip(parents, key))
        reconstructed = parsed.evaluator(environment)
        declared = rows[key]
        require(
            reconstructed == declared,
            f"{model_id}/{target}: expression/table contradiction at {environment}: expression={reconstructed}, table={declared}",
        )
        checked_rows += 1
    return {
        "model_id": model_id,
        "target": target,
        "canonical_rhs": parsed.canonical,
        "rows_checked": checked_rows,
    }


def load_public_fixture() -> dict[str, object]:
    require(sha256(PUBLIC_FIXTURE) == PUBLIC_FIXTURE_SHA256, "public v0.4 fixture digest changed")
    fixture = json.loads(PUBLIC_FIXTURE.read_text(encoding="utf-8"))
    require(fixture["campaign_id"] == EXPECTED_CAMPAIGN, "campaign changed")
    require(fixture["scope"] == EXPECTED_SCOPE, "scope changed")
    require(fixture["independence_status"] == EXPECTED_INDEPENDENCE, "independence status changed")
    return fixture


def verify_public_fixture(fixture: dict[str, object]) -> list[dict[str, object]]:
    checks = []
    models = fixture["models"]
    require(isinstance(models, list) and len(models) == 2, "expected exactly two frozen models")
    for model in models:
        require(isinstance(model, dict) and isinstance(model.get("model_id"), str), "invalid model declaration")
        for equation in model["equations"]:
            checks.append(verify_equation(model["model_id"], equation))
    require(len(checks) == 4, "expected exactly four frozen equations")
    return checks


def contradictory_fixture(fixture: dict[str, object]) -> dict[str, object]:
    changed = copy.deepcopy(fixture)
    changed["models"][0]["equations"][1]["expression"] = "Y := X AND U_Y"
    return changed


def verify_negative_rejection(fixture: dict[str, object]) -> str:
    try:
        verify_public_fixture(contradictory_fixture(fixture))
    except VerificationError as error:
        require("expression/table contradiction" in str(error), f"negative case failed for wrong reason: {error}")
        return str(error)
    raise VerificationError("negative contradiction was incorrectly accepted")


def run_positive() -> None:
    fixture = load_public_fixture()
    checks = verify_public_fixture(fixture)
    negative_error = verify_negative_rejection(fixture)
    print(
        json.dumps(
            {
                "valid": True,
                "campaign_id": EXPECTED_CAMPAIGN,
                "scope": EXPECTED_SCOPE,
                "external_validity": EXPECTED_EXTERNAL_VALIDITY,
                "independence_status": EXPECTED_INDEPENDENCE,
                "equations_checked": checks,
                "negative_case": {"expression": "Y := X AND U_Y", "rejected": True, "reason": negative_error},
            },
            indent=2,
            sort_keys=True,
        )
    )
    print("PASS v0.4 post-execution expression verifier: 4 equations exact, negative contradiction rejected")


def run_expected_failure() -> None:
    fixture = load_public_fixture()
    try:
        verify_public_fixture(contradictory_fixture(fixture))
    except VerificationError as error:
        print(f"EXPECTED FAIL negative expression/table contradiction: {error}", file=sys.stderr)
        raise SystemExit(1)
    raise VerificationError("negative contradiction was incorrectly accepted")


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--verify", action="store_true")
    mode.add_argument("--negative", action="store_true")
    arguments = parser.parse_args()
    if arguments.negative:
        run_expected_failure()
    else:
        run_positive()


if __name__ == "__main__":
    main()
