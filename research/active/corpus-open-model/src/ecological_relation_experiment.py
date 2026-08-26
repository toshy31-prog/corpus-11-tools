"""Entrées et métriques partagées pour l'ablation relationnelle v1.5."""

from __future__ import annotations

import hashlib

from compute_profile import TinyDoctrineProfile
from ecological_tiny_encoder import torch
from relation_stratified_split import stratum


def token_id(token: str, vocabulary_size: int) -> int:
    return int(hashlib.sha256(token.encode()).hexdigest()[:8], 16) % vocabulary_size


def batches(documents, profile: TinyDoctrineProfile, relation_context: str):
    """Conserve le document ; l'ablation neutralise le token ET l'embedding relationnels."""
    if relation_context not in {"declared", "ablated"}:
        raise ValueError("relation_context must be 'declared' or 'ablated'")
    for document in documents:
        relation_token = f"<declared-relations:{document.relation_bucket}>" if relation_context == "declared" else "<relation-context:ablated>"
        relation_bucket = document.relation_bucket if relation_context == "declared" else 0
        header = ["<document>", f"<surface:{document.surface}>", f"<status:{document.status}>", relation_token]
        stream = [token_id(token, profile.vocabulary_size) for token in header + document.tokens]
        for start in range(0, len(stream), profile.sequence_length):
            sequence = stream[start : start + profile.sequence_length]
            attention = [True] * len(sequence)
            sequence += [0] * (profile.sequence_length - len(sequence))
            attention += [False] * (profile.sequence_length - len(attention))
            yield sequence, attention, document.status_id, relation_bucket


def masked_loss(model, documents, profile: TinyDoctrineProfile, device, relation_context: str, seed: int = 251) -> float:
    """Évalue toutes les séquences du groupe, par lots, avec masque reproductible."""
    model.eval()
    values, weights = [], []
    generator = torch.Generator(device=device).manual_seed(seed)
    rows = iter(batches(documents, profile, relation_context))
    with torch.no_grad():
        while True:
            group = []
            try:
                for _ in range(profile.micro_batch_size):
                    group.append(next(rows))
            except StopIteration:
                pass
            if not group:
                break
            input_ids = torch.tensor([row[0] for row in group], device=device)
            attention_mask = torch.tensor([row[1] for row in group], device=device)
            labels = input_ids.clone()
            mask = (torch.rand(input_ids.shape, device=device, generator=generator) < 0.15) & attention_mask
            labels[~mask] = -100
            input_ids[mask] = torch.randint(profile.vocabulary_size, (int(mask.sum()),), device=device, generator=generator)
            with torch.autocast(device_type="cuda", dtype=torch.float16):
                logits = model(input_ids, torch.tensor([row[2] for row in group], device=device), torch.tensor([row[3] for row in group], device=device), attention_mask)
                loss = torch.nn.functional.cross_entropy(logits.view(-1, profile.vocabulary_size), labels.view(-1), ignore_index=-100, reduction="sum")
            count = int(mask.sum())
            values.append(loss.item())
            weights.append(count)
    model.train()
    return sum(values) / sum(weights) if sum(weights) else float("nan")


def metrics_by_stratum(model, documents, profile: TinyDoctrineProfile, device, relation_context: str) -> dict:
    related = [document for document in documents if stratum(document) == "has_declared_relation"]
    unrelated = [document for document in documents if stratum(document) == "no_declared_relation"]
    return {
        "all": masked_loss(model, documents, profile, device, relation_context, seed=251),
        "has_declared_relation": masked_loss(model, related, profile, device, relation_context, seed=252),
        "no_declared_relation": masked_loss(model, unrelated, profile, device, relation_context, seed=253),
        "document_counts": {"has_declared_relation": len(related), "no_declared_relation": len(unrelated)},
    }
