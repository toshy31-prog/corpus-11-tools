"""FOE-001 adapter: classify whether two fictional lineages are independent."""

from __future__ import annotations


REQUIRED_FIELDS = (
    "source_ids",
    "generator_ids",
    "hypothesis_ids",
    "code_ids",
    "failure_mode_ids",
)
COMMON_MODE_FIELDS = REQUIRED_FIELDS[1:]


def classify(lineages: list[dict[str, object]]) -> str:
    if len(lineages) != 2 or any(not lineage[field] for lineage in lineages for field in REQUIRED_FIELDS):
        return "independence_unknown"
    left = set().union(*(set(lineages[0][field]) for field in COMMON_MODE_FIELDS))
    right = set().union(*(set(lineages[1][field]) for field in COMMON_MODE_FIELDS))
    return "shared_failure_mode" if left & right else "independent"


def evaluated_decision(verdict: str) -> str:
    return {"independent": "eligible", "shared_failure_mode": "not_eligible", "independence_unknown": "withhold"}[verdict]


def counted_source_decision(lineages: list[dict[str, object]]) -> str:
    source_ids = {source for lineage in lineages for source in lineage["source_ids"]}
    return "eligible" if len(source_ids) >= 2 else "not_eligible"
