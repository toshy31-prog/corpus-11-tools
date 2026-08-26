"""Routeur neuronal à embeddings avec propagation sur le graphe Corpus.

Chaque requête est encodée par la moyenne de ses embeddings de mots. Les
représentations de capabilities sont ensuite mélangées avec celles de leurs
voisins déclarés (`requires`/`uses`) avant la prédiction. Les relations restent
inspectables : ce n'est pas un LLM ni une inférence opaque sur les archives.
"""

from __future__ import annotations

from collections import Counter
import math
import random

from neural_router import Example, tokens, vocabulary


class GraphNeuralRouter:
    def __init__(self, vocab: dict[str, int], labels: list[str], adjacency: dict[str, set[str]], embedding: int = 20, hidden: int = 24, seed: int = 29):
        self.vocab, self.labels, self.adjacency = vocab, labels, adjacency
        self.embedding, self.hidden = embedding, hidden
        randomizer = random.Random(seed)
        self.word = [[randomizer.uniform(-0.08, 0.08) for _ in range(embedding)] for _ in vocab]
        self.query = [[randomizer.uniform(-0.08, 0.08) for _ in range(hidden)] for _ in range(embedding)]
        self.label = [[randomizer.uniform(-0.08, 0.08) for _ in range(hidden)] for _ in labels]
        self.bias = [0.0] * len(labels)
        self.index = {label: position for position, label in enumerate(labels)}

    def encoded(self, text: str) -> list[int]:
        return [self.vocab[token] for token in tokens(text) if token in self.vocab]

    def graph_labels(self) -> list[list[float]]:
        vectors = []
        for label in self.labels:
            neighbors = [self.index[item] for item in self.adjacency.get(label, set()) if item in self.index]
            own = self.label[self.index[label]]
            if not neighbors:
                vectors.append(own[:])
                continue
            vectors.append([0.85 * own[d] + 0.15 * sum(self.label[n][d] for n in neighbors) / len(neighbors) for d in range(self.hidden)])
        return vectors

    def forward(self, text: str):
        indices = self.encoded(text)
        average = [sum(self.word[index][d] for index in indices) / len(indices) if indices else 0.0 for d in range(self.embedding)]
        pre_hidden = [sum(average[d] * self.query[d][h] for d in range(self.embedding)) for h in range(self.hidden)]
        hidden = [math.tanh(value) for value in pre_hidden]
        labels = self.graph_labels()
        logits = [self.bias[k] + sum(hidden[h] * labels[k][h] for h in range(self.hidden)) for k in range(len(self.labels))]
        probabilities = [1 / (1 + math.exp(-max(-30.0, min(30.0, value)))) for value in logits]
        return indices, average, hidden, labels, probabilities

    def train(self, examples: list[Example], epochs: int = 140, learning_rate: float = 0.10) -> list[float]:
        history = []
        for _ in range(epochs):
            loss = 0.0
            for example in examples:
                indices, average, hidden, graph_labels, probabilities = self.forward(example.text)
                targets = [float(label in example.labels) for label in self.labels]
                gradients = [probability - target for probability, target in zip(probabilities, targets)]
                loss += sum(-(target * math.log(max(probability, 1e-9)) + (1 - target) * math.log(max(1 - probability, 1e-9))) for target, probability in zip(targets, probabilities))
                hidden_gradient = [sum(gradients[k] * graph_labels[k][h] for k in range(len(self.labels))) * (1 - hidden[h] ** 2) for h in range(self.hidden)]
                label_gradient = [[gradients[k] * hidden[h] for h in range(self.hidden)] for k in range(len(self.labels))]
                base_gradient = [[0.0] * self.hidden for _ in self.labels]
                for k, label in enumerate(self.labels):
                    neighbors = [self.index[item] for item in self.adjacency.get(label, set()) if item in self.index]
                    for h in range(self.hidden):
                        base_gradient[k][h] += (0.85 if neighbors else 1.0) * label_gradient[k][h]
                        if neighbors:
                            for neighbor in neighbors:
                                base_gradient[neighbor][h] += 0.15 * label_gradient[k][h] / len(neighbors)
                average_gradient = [sum(hidden_gradient[h] * self.query[d][h] for h in range(self.hidden)) for d in range(self.embedding)]
                for d in range(self.embedding):
                    for h in range(self.hidden):
                        self.query[d][h] -= learning_rate * average[d] * hidden_gradient[h]
                for k in range(len(self.labels)):
                    self.bias[k] -= learning_rate * gradients[k]
                    for h in range(self.hidden):
                        self.label[k][h] -= learning_rate * base_gradient[k][h]
                if indices:
                    for index in indices:
                        for d in range(self.embedding):
                            self.word[index][d] -= learning_rate * average_gradient[d] / len(indices)
            history.append(loss / len(examples))
        return history

    def predict(self, text: str, limit: int = 3) -> list[dict]:
        _, _, _, _, probabilities = self.forward(text)
        ranked = sorted(enumerate(probabilities), key=lambda item: item[1], reverse=True)[:limit]
        return [{"capability": self.labels[index], "score": round(score, 6)} for index, score in ranked]


def graph_adjacency(graph: dict) -> dict[str, set[str]]:
    adjacency: dict[str, set[str]] = {}
    for edge in graph["edges"]:
        if edge["type"].startswith(("requires_", "uses_")):
            source = edge["from"].removeprefix("capability:")
            target = edge["to"].removeprefix("capability:")
            adjacency.setdefault(source, set()).add(target)
            adjacency.setdefault(target, set()).add(source)
    return adjacency
