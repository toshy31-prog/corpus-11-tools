"""Embeddings skip-gram reproductibles, sans dépendance externe."""

from __future__ import annotations

from collections import Counter
import math
import random

from doctrine_corpus import DoctrineDocument


class DoctrineEmbeddings:
    def __init__(self, vocabulary: dict[str, int], dimension: int = 24, seed: int = 37):
        self.vocabulary, self.dimension = vocabulary, dimension
        randomizer = random.Random(seed)
        self.input = [[randomizer.uniform(-0.04, 0.04) for _ in range(dimension)] for _ in vocabulary]
        self.output = [[0.0] * dimension for _ in vocabulary]

    @classmethod
    def vocabulary_from(cls, documents: list[DoctrineDocument], limit: int = 1200) -> dict[str, int]:
        counts = Counter(token for document in documents for token in document.tokens)
        return {token: index for index, (token, _) in enumerate(counts.most_common(limit))}

    def vector(self, text_tokens: list[str]) -> list[float]:
        indices = [self.vocabulary[token] for token in text_tokens if token in self.vocabulary]
        return [sum(self.input[index][dim] for index in indices) / len(indices) if indices else 0.0 for dim in range(self.dimension)]

    def _pairs(self, documents: list[DoctrineDocument], per_document: int = 24):
        for document in documents:
            ids = [self.vocabulary[token] for token in document.tokens if token in self.vocabulary]
            if len(ids) < 2:
                continue
            stride = max(1, len(ids) // per_document)
            centres = range(0, len(ids), stride)
            emitted = 0
            for centre in centres:
                for context in range(max(0, centre - 2), min(len(ids), centre + 3)):
                    if centre != context:
                        yield ids[centre], ids[context]
                        emitted += 1
                        if emitted >= per_document * 4:
                            break
                if emitted >= per_document * 4:
                    break

    def train(self, documents: list[DoctrineDocument], epochs: int = 1, negatives: int = 3, per_document: int = 24, learning_rate: float = 0.035) -> dict:
        counts = Counter(token for document in documents for token in document.tokens if token in self.vocabulary)
        table = [index for token, index in self.vocabulary.items() for _ in range(max(1, int((counts[token] ** 0.75) / max(counts.values()) ** 0.75 * 60)))]
        randomizer = random.Random(41)
        pair_count = 0
        total_loss = 0.0
        for _ in range(epochs):
            for centre, context in self._pairs(documents, per_document):
                for target, value in [(context, 1.0)] + [(randomizer.choice(table), 0.0) for _ in range(negatives)]:
                    score = sum(self.input[centre][d] * self.output[target][d] for d in range(self.dimension))
                    probability = 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, score))))
                    gradient = probability - value
                    old_output = self.output[target][:]
                    for d in range(self.dimension):
                        self.output[target][d] -= learning_rate * gradient * self.input[centre][d]
                        self.input[centre][d] -= learning_rate * gradient * old_output[d]
                    total_loss += -(value * math.log(max(probability, 1e-9)) + (1 - value) * math.log(max(1 - probability, 1e-9)))
                    pair_count += 1
        return {"updates": pair_count, "mean_binary_cross_entropy": total_loss / pair_count if pair_count else 0.0, "epochs": epochs, "negative_samples": negatives, "pair_budget_per_document": per_document}

    def to_dict(self) -> dict:
        return {"schema_version": 1, "architecture": "skip-gram negative sampling", "vocabulary": self.vocabulary, "dimension": self.dimension, "input": self.input, "output": self.output}

    @classmethod
    def from_dict(cls, payload: dict) -> "DoctrineEmbeddings":
        model = cls(payload["vocabulary"], payload["dimension"])
        model.input, model.output = payload["input"], payload["output"]
        return model


def cosine(left: list[float], right: list[float]) -> float:
    numerator = sum(a * b for a, b in zip(left, right))
    norm = math.sqrt(sum(a * a for a in left)) * math.sqrt(sum(b * b for b in right))
    return numerator / norm if norm else 0.0
