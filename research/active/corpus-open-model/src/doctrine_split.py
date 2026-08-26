"""Partition stable par document pour l'entraînement doctrinal auto-supervisé."""

from __future__ import annotations

import hashlib


def split_documents(documents) -> dict[str, list]:
    partitions = {"train": [], "validation": [], "test": []}
    for document in documents:
        bucket = int(hashlib.sha256(document.path.encode()).hexdigest()[:8], 16) % 100
        partition = "train" if bucket < 85 else "validation" if bucket < 93 else "test"
        partitions[partition].append(document)
    return partitions


def manifest(partitions: dict[str, list]) -> dict:
    paths = {key: {document.path for document in value} for key, value in partitions.items()}
    return {"unit": "document path", "algorithm": "sha256(path) modulo 100: train <85, validation <93, test otherwise", "counts": {key: len(value) for key, value in partitions.items()}, "token_counts": {key: sum(len(document.tokens) for document in value) for key, value in partitions.items()}, "no_overlap": not bool((paths["train"] & paths["validation"]) | (paths["train"] & paths["test"]) | (paths["validation"] & paths["test"])), "test_status": "reserved_unobserved"}
