"""Contrôles de géométrie avant d'utiliser des embeddings pour récupérer."""

from __future__ import annotations

import math
from pathlib import Path

from doctrine_embeddings import DoctrineEmbeddings, cosine
from neural_router import tokens


def diagnostics(model: DoctrineEmbeddings, sample_limit: int = 120) -> dict:
    vectors = model.input[:sample_limit]
    similarities = [cosine(vectors[index], vectors[index + 1]) for index in range(len(vectors) - 1)]
    mean = sum(similarities) / len(similarities) if similarities else 0.0
    variance = sum((value - mean) ** 2 for value in similarities) / len(similarities) if similarities else 0.0
    status = "geometry_requires_evaluation"
    if mean > 0.90:
        status = "anisotropic_embedding_space_not_suitable_for_retrieval"
    return {"sampled_adjacent_vocabulary_pairs": len(similarities), "mean_cosine": mean, "cosine_standard_deviation": math.sqrt(variance), "status": status, "scope": "A geometric diagnostic, not an evaluation of semantic quality."}


def prototype_diagnostics(model: DoctrineEmbeddings, root: Path) -> dict:
    vectors = []
    for skill_file in sorted((root / "corpus-11-tools/skills").glob("*/SKILL.md")):
        reference = skill_file.parent / "references/capability.md"
        text = skill_file.read_text() + (reference.read_text() if reference.exists() else "")
        vectors.append(model.vector(tokens(text)))
    similarities = [cosine(vectors[index], vectors[index + 1]) for index in range(len(vectors) - 1)]
    mean = sum(similarities) / len(similarities) if similarities else 0.0
    status = "prototype_geometry_requires_evaluation"
    if mean > 0.90:
        status = "prototype_space_not_discriminant_for_retrieval"
    return {"prototype_count": len(vectors), "mean_adjacent_prototype_cosine": mean, "status": status, "scope": "Prototype geometry only; it does not measure routing accuracy."}
