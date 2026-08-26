"""Encodeur Transformer compact, activable uniquement avec PyTorch installé."""

from __future__ import annotations

try:
    import torch
    from torch import nn
except ImportError:  # Le reste du laboratoire demeure utilisable sans PyTorch.
    torch = None
    nn = None


if nn is not None:
    class TinyDoctrineEncoder(nn.Module):
        def __init__(self, vocabulary_size: int = 16_384, hidden_size: int = 384, layers: int = 6, heads: int = 6, feedforward_size: int = 1_536, sequence_length: int = 256):
            super().__init__()
            self.token_embedding = nn.Embedding(vocabulary_size, hidden_size)
            self.position_embedding = nn.Embedding(sequence_length, hidden_size)
            layer = nn.TransformerEncoderLayer(d_model=hidden_size, nhead=heads, dim_feedforward=feedforward_size, batch_first=True, norm_first=True, activation="gelu")
            self.encoder = nn.TransformerEncoder(layer, num_layers=layers, enable_nested_tensor=False)
            self.norm = nn.LayerNorm(hidden_size)
            self.mlm_head = nn.Linear(hidden_size, vocabulary_size, bias=False)
            self.mlm_head.weight = self.token_embedding.weight
            self.apply(self._initialize)

        @staticmethod
        def _initialize(module):
            if isinstance(module, nn.Linear):
                nn.init.normal_(module.weight, mean=0.0, std=0.02)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
            elif isinstance(module, nn.Embedding):
                nn.init.normal_(module.weight, mean=0.0, std=0.02)
            elif isinstance(module, nn.LayerNorm):
                nn.init.ones_(module.weight)
                nn.init.zeros_(module.bias)

        def encode(self, token_ids, attention_mask=None):
            positions = torch.arange(token_ids.shape[1], device=token_ids.device).unsqueeze(0)
            hidden = self.token_embedding(token_ids) + self.position_embedding(positions)
            padding = None if attention_mask is None else ~attention_mask.bool()
            return self.norm(self.encoder(hidden, src_key_padding_mask=padding))

        def forward(self, token_ids, attention_mask=None):
            return self.mlm_head(self.encode(token_ids, attention_mask))
else:
    TinyDoctrineEncoder = None
