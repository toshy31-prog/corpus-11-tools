"""Partition v1.4, indépendante et étanche au test déjà observé de v1.3."""

from __future__ import annotations

import hashlib

from doctrine_split import split_documents as v1_3_split


SALT = "tiny-doctrine-ecological-v1.4"


def split_documents(documents) -> dict[str, list]:
    """Réserve un nouveau test et exclut totalement les documents du test v1.3."""
    v1_3_test_paths = {document.path for document in v1_3_split(documents)["test"]}
    partitions = {"train": [], "validation": [], "test": [], "excluded_v1_3_observed_test": []}
    for document in documents:
        if document.path in v1_3_test_paths:
            partitions["excluded_v1_3_observed_test"].append(document)
            continue
        bucket = int(hashlib.sha256(f"{SALT}:{document.path}".encode()).hexdigest()[:8], 16) % 100
        partition = "train" if bucket < 80 else "validation" if bucket < 90 else "test"
        partitions[partition].append(document)
    return partitions


def manifest(partitions: dict[str, list]) -> dict:
    active = ("train", "validation", "test")
    paths = {key: {document.path for document in partitions[key]} for key in active}
    return {
        "unit": "document path",
        "algorithm": "sha256('tiny-doctrine-ecological-v1.4:' + path) modulo 100: train <80, validation <90, test otherwise",
        "counts": {key: len(partitions[key]) for key in (*active, "excluded_v1_3_observed_test")},
        "token_counts": {key: sum(len(document.tokens) for document in partitions[key]) for key in (*active, "excluded_v1_3_observed_test")},
        "no_overlap": not bool((paths["train"] & paths["validation"]) | (paths["train"] & paths["test"]) | (paths["validation"] & paths["test"])),
        "v1_3_test_reuse": "excluded_from_all_v1_4_partitions",
        "test_status": "reserved_unobserved",
    }
