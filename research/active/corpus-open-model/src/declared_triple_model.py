"""Scoreur neuronal de triplets, fondé sur les descriptions déclarées des nœuds."""

from __future__ import annotations

import hashlib
import re

try:
    import torch
    from torch import nn
except ImportError:
    torch = None
    nn = None


TOKEN = re.compile(r"[^\W\d_]+", re.UNICODE)


def token_ids(text: str, vocabulary_size: int = 8192) -> list[int]:
    values = TOKEN.findall(text.casefold()) or ["<empty>"]
    return [int(hashlib.sha256(value.encode()).hexdigest()[:8], 16) % vocabulary_size for value in values]


if nn is not None:
    class DeclaredTripleModel(nn.Module):
        def __init__(self, relation_count: int, vocabulary_size: int = 8192, hidden_size: int = 128):
            super().__init__()
            self.token_embedding = nn.Embedding(vocabulary_size, hidden_size)
            self.relation_embedding = nn.Embedding(relation_count, hidden_size)
            self.scorer = nn.Sequential(nn.Linear(hidden_size * 4, hidden_size), nn.GELU(), nn.Linear(hidden_size, 1))
            self.apply(self._initialize)

        @staticmethod
        def _initialize(module):
            if isinstance(module, (nn.Embedding, nn.Linear)):
                nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if isinstance(module, nn.Linear) and module.bias is not None:
                nn.init.zeros_(module.bias)

        def encode(self, ids, mask):
            vectors = self.token_embedding(ids)
            return (vectors * mask.unsqueeze(-1)).sum(dim=1) / mask.sum(dim=1, keepdim=True).clamp_min(1)

        def forward(self, source_ids, source_mask, relation_ids, target_ids, target_mask):
            source = self.encode(source_ids, source_mask)
            target = self.encode(target_ids, target_mask)
            relation = self.relation_embedding(relation_ids)
            return self.scorer(torch.cat((source, relation, target, source * target), dim=1)).squeeze(1)
else:
    DeclaredTripleModel = None
