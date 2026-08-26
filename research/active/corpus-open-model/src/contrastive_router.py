"""Encodeur contrastif passage-capability, initialisé par embeddings doctrinaux."""

from __future__ import annotations

import math
import random


class ContrastiveRouter:
    def __init__(self, vocabulary: dict[str, int], word_vectors: list[list[float]], labels: list[str], seed: int = 53):
        self.vocabulary, self.word, self.labels = vocabulary, [row[:] for row in word_vectors], labels
        self.dimension = len(word_vectors[0])
        randomizer = random.Random(seed)
        self.label = [[randomizer.uniform(-0.05, 0.05) for _ in range(self.dimension)] for _ in labels]
        self.bias = [0.0] * len(labels)
        self.index = {label: index for index, label in enumerate(labels)}

    def vector(self, words: list[str]) -> tuple[list[int], list[float]]:
        indices = [self.vocabulary[word] for word in words if word in self.vocabulary]
        vector = [sum(self.word[index][dim] for index in indices) / len(indices) if indices else 0.0 for dim in range(self.dimension)]
        return indices, vector

    def train(self, pairs: list[dict], epochs: int = 8, negatives: int = 5, learning_rate: float = 0.05) -> dict:
        randomizer = random.Random(59)
        updates, loss = 0, 0.0
        for _ in range(epochs):
            for pair in pairs:
                indices, vector = self.vector(pair["tokens"])
                positive = self.index[pair["label"]]
                negatives_indices = []
                while len(negatives_indices) < negatives:
                    candidate = randomizer.randrange(len(self.labels))
                    if candidate != positive:
                        negatives_indices.append(candidate)
                for target, value in [(positive, 1.0)] + [(item, 0.0) for item in negatives_indices]:
                    score = self.bias[target] + sum(vector[dim] * self.label[target][dim] for dim in range(self.dimension))
                    probability = 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, score))))
                    gradient = probability - value
                    old_label = self.label[target][:]
                    for dim in range(self.dimension):
                        self.label[target][dim] -= learning_rate * gradient * vector[dim]
                    self.bias[target] -= learning_rate * gradient
                    if indices:
                        for index in indices:
                            for dim in range(self.dimension):
                                self.word[index][dim] -= learning_rate * gradient * old_label[dim] / len(indices)
                    loss += -(value * math.log(max(probability, 1e-9)) + (1 - value) * math.log(max(1 - probability, 1e-9)))
                    updates += 1
        return {"updates": updates, "mean_binary_cross_entropy": loss / updates if updates else 0.0, "epochs": epochs, "negative_labels_per_positive": negatives}

    def predict(self, words: list[str], limit: int = 3) -> list[dict]:
        _, vector = self.vector(words)
        scores = [1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, self.bias[index] + sum(vector[dim] * self.label[index][dim] for dim in range(self.dimension)))))) for index in range(len(self.labels))]
        return [{"capability": self.labels[index], "score": round(score, 6)} for index, score in sorted(enumerate(scores), key=lambda item: item[1], reverse=True)[:limit]]

    def to_dict(self) -> dict:
        return {"schema_version": 1, "architecture": "doctrine-initialized average word encoder -> contrastive capability embeddings", "vocabulary": self.vocabulary, "word": self.word, "labels": self.labels, "label": self.label, "bias": self.bias}
