"""Partition v1.5 stratifiée par présence d'une relation déclarée."""

from __future__ import annotations

import hashlib

from doctrine_split import split_documents as v1_3_split
from ecological_split import split_documents as v1_4_split


SALT = "ecological-relation-ablation-v1.5"
ACTIVE = ("train", "validation", "test")


def stratum(document) -> str:
    return "has_declared_relation" if document.relation_count else "no_declared_relation"


def split_documents(documents) -> dict[str, list]:
    """Réserve des relations déclarées dans chaque partition nouvelle."""
    excluded = ({document.path for document in v1_3_split(documents)["test"]}
                | {document.path for document in v1_4_split(documents)["test"]})
    partitions = {key: [] for key in (*ACTIVE, "excluded_observed_v1_3_or_v1_4_test")}
    eligible = []
    for document in documents:
        if document.path in excluded:
            partitions["excluded_observed_v1_3_or_v1_4_test"].append(document)
            continue
        eligible.append(document)
    for group in ("has_declared_relation", "no_declared_relation"):
        members = sorted((document for document in eligible if stratum(document) == group), key=lambda document: hashlib.sha256(f"{SALT}:{group}:{document.path}".encode()).hexdigest())
        if group == "has_declared_relation":
            # Le corpus ne comporte que 53 documents relationnels éligibles :
            # cinq par fenêtre est un compromis explicite, non une puissance élevée.
            reserve = min(5, len(members) // 3)
            partitions["train"].extend(members[: len(members) - 2 * reserve])
            partitions["validation"].extend(members[len(members) - 2 * reserve : len(members) - reserve])
            partitions["test"].extend(members[len(members) - reserve :])
            continue
        for document in members:
            bucket = int(hashlib.sha256(f"{SALT}:{group}:{document.path}".encode()).hexdigest()[:8], 16) % 100
            partition = "train" if bucket < 80 else "validation" if bucket < 90 else "test"
            partitions[partition].append(document)
    return partitions


def _counts(documents) -> dict[str, int]:
    return {name: sum(stratum(document) == name for document in documents) for name in ("has_declared_relation", "no_declared_relation")}


def manifest(partitions: dict[str, list]) -> dict:
    paths = {key: {document.path for document in partitions[key]} for key in ACTIVE}
    strata = {key: _counts(partitions[key]) for key in ACTIVE}
    return {
        "unit": "document path",
        "algorithm": "relation stratum: stable sha256 rank with five validation and five test documents when available; non-relation stratum: sha256('ecological-relation-ablation-v1.5:' + stratum + ':' + path) modulo 100: train <80, validation <90, test otherwise",
        "counts": {key: len(value) for key, value in partitions.items()},
        "strata": strata,
        "no_overlap": not bool((paths["train"] & paths["validation"]) | (paths["train"] & paths["test"]) | (paths["validation"] & paths["test"])),
        "observed_test_reuse": "v1_3_and_v1_4_tests_excluded_from_all_v1_5_partitions",
        "test_status": "reserved_unobserved",
    }
