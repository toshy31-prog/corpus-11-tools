"""Petit réseau neuronal multi-étiquette, écrit avec la bibliothèque standard.

Le but est l'auditabilité du premier modèle, non la performance : sac de mots
→ couche cachée tanh → sigmoïdes de capabilities. Aucun poids pré-entraîné ni
service externe n'est utilisé.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import math
import random
import re


TOKEN = re.compile(r"[^\W\d_]+", re.UNICODE)


def tokens(text: str) -> list[str]:
    return TOKEN.findall(text.casefold())


@dataclass
class Example:
    text: str
    labels: list[str]
    origin: str


def vocabulary(examples: list[Example], limit: int = 700) -> dict[str, int]:
    counts = Counter(token for example in examples for token in tokens(example.text))
    return {token: index for index, (token, _) in enumerate(counts.most_common(limit))}


class NeuralRouter:
    def __init__(self, vocab: dict[str, int], labels: list[str], hidden: int = 32, seed: int = 11):
        self.vocab, self.labels, self.hidden = vocab, labels, hidden
        randomizer = random.Random(seed)
        self.w1 = [[randomizer.uniform(-0.08, 0.08) for _ in range(hidden)] for _ in vocab]
        self.b1 = [0.0] * hidden
        self.w2 = [[randomizer.uniform(-0.08, 0.08) for _ in labels] for _ in range(hidden)]
        self.b2 = [0.0] * len(labels)

    def encoded(self, text: str) -> list[tuple[int, float]]:
        counts = Counter(self.vocab[token] for token in tokens(text) if token in self.vocab)
        total = sum(counts.values())
        return [] if not total else [(index, value / total) for index, value in counts.items()]

    def forward(self, text: str):
        encoded = self.encoded(text)
        hidden = [self.b1[j] + sum(weight * self.w1[index][j] for index, weight in encoded) for j in range(self.hidden)]
        hidden = [math.tanh(value) for value in hidden]
        logits = [self.b2[k] + sum(hidden[j] * self.w2[j][k] for j in range(self.hidden)) for k in range(len(self.labels))]
        probabilities = [1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, value)))) for value in logits]
        return encoded, hidden, probabilities

    def train(self, examples: list[Example], epochs: int = 160, learning_rate: float = 0.16) -> list[float]:
        label_index = {label: index for index, label in enumerate(self.labels)}
        history = []
        for _ in range(epochs):
            loss = 0.0
            for example in examples:
                encoded, hidden, probabilities = self.forward(example.text)
                targets = [0.0] * len(self.labels)
                for label in example.labels:
                    targets[label_index[label]] = 1.0
                gradients = [probability - target for probability, target in zip(probabilities, targets)]
                loss += sum(-(target * math.log(max(probability, 1e-9)) + (1 - target) * math.log(max(1 - probability, 1e-9))) for target, probability in zip(targets, probabilities))
                hidden_gradient = [sum(gradients[k] * self.w2[j][k] for k in range(len(self.labels))) * (1 - hidden[j] ** 2) for j in range(self.hidden)]
                for j in range(self.hidden):
                    for k in range(len(self.labels)):
                        self.w2[j][k] -= learning_rate * hidden[j] * gradients[k]
                for k in range(len(self.labels)):
                    self.b2[k] -= learning_rate * gradients[k]
                for index, weight in encoded:
                    for j in range(self.hidden):
                        self.w1[index][j] -= learning_rate * weight * hidden_gradient[j]
                for j in range(self.hidden):
                    self.b1[j] -= learning_rate * hidden_gradient[j]
            history.append(loss / len(examples))
        return history

    def predict(self, text: str, threshold: float = 0.20, limit: int = 5) -> list[dict]:
        _, _, probabilities = self.forward(text)
        ordered = sorted(enumerate(probabilities), key=lambda item: item[1], reverse=True)
        return [{"capability": self.labels[index], "score": round(score, 6)} for index, score in ordered[:limit] if score >= threshold]

    def predict_or_abstain(self, text: str, threshold: float = 0.20, limit: int = 3, minimum_coverage: float = 0.35) -> dict:
        input_tokens = tokens(text)
        coverage = 0.0 if not input_tokens else sum(token in self.vocab for token in input_tokens) / len(input_tokens)
        if coverage < minimum_coverage:
            return {"decision": "abstain", "reason": "insufficient_known_vocabulary", "known_token_coverage": round(coverage, 6), "predictions": []}
        predictions = self.predict(text, threshold=threshold, limit=limit)
        if not predictions:
            return {"decision": "abstain", "reason": "no_score_above_threshold", "known_token_coverage": round(coverage, 6), "predictions": []}
        return {"decision": "route", "reason": "model_scores_above_threshold", "known_token_coverage": round(coverage, 6), "predictions": predictions}

    def to_dict(self) -> dict:
        return {"schema_version": 1, "architecture": "bag-of-words -> tanh(32) -> sigmoid multi-label", "vocabulary": self.vocab, "labels": self.labels, "hidden": self.hidden, "w1": self.w1, "b1": self.b1, "w2": self.w2, "b2": self.b2}

    @classmethod
    def from_dict(cls, payload: dict) -> "NeuralRouter":
        model = cls(payload["vocabulary"], payload["labels"], payload["hidden"])
        model.w1, model.b1, model.w2, model.b2 = payload["w1"], payload["b1"], payload["w2"], payload["b2"]
        return model
