"""FOE-001 adapter: preserve common and unknown evidence clusters."""

from __future__ import annotations


from typing import Iterable


def cluster(lineages: Iterable[dict[str, object]], verdict: str) -> frozenset[str]:
    """A shared or incomplete lineage remains one unresolved cluster."""
    identifiers = frozenset(str(lineage["id"]) for lineage in lineages)
    if verdict == "independent":
        return frozenset({"independent", *identifiers})
    return frozenset({"unresolved", *identifiers})
