"""FOE-001 adapter: classify exact declared transitions."""

from __future__ import annotations


def classify(case: dict[str, object]) -> str:
    before = case["before"]
    after = case["after"]
    changes = {(field, before[field], after[field]) for field in before if before[field] != after[field]}
    if not changes:
        return "stable"
    declared = {tuple(rule) for rule in case["declared"]}
    return "declared_rule_change" if changes.issubset(declared) else "unexplained_drift"
