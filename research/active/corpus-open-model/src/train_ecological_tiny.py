"""Entraînement MLM v1.4 : texte + statut déclaré + relations déclarées."""

from __future__ import annotations

import argparse
from dataclasses import asdict
import hashlib
import json
from pathlib import Path
import random

from compute_profile import TinyDoctrineProfile, hardware_status
from ecological_corpus import compile_ecological_corpus, manifest
from ecological_split import manifest as split_manifest, split_documents
from ecological_tiny_encoder import EcologicalTinyEncoder, torch


ROOT = Path(__file__).resolve().parents[4]
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
OUTPUT = ARTIFACTS / "ecological-tiny-encoder-v1.4.pt"
BEST_OUTPUT = ARTIFACTS / "ecological-tiny-encoder-v1.4-best.pt"


def token_id(token: str, vocabulary_size: int) -> int:
    return int(hashlib.sha256(token.encode()).hexdigest()[:8], 16) % vocabulary_size


def batches(documents, profile: TinyDoctrineProfile):
    """Émet des segments d'un seul document ; aucun segment ne traverse un carrier."""
    for document in documents:
        header = ["<document>", f"<surface:{document.surface}>", f"<status:{document.status}>", f"<declared-relations:{document.relation_bucket}>"]
        stream = [token_id(token, profile.vocabulary_size) for token in header + document.tokens]
        for start in range(0, len(stream), profile.sequence_length):
            sequence = stream[start : start + profile.sequence_length]
            attention = [True] * len(sequence)
            sequence += [0] * (profile.sequence_length - len(sequence))
            attention += [False] * (profile.sequence_length - len(attention))
            yield sequence, attention, document.status_id, document.relation_bucket


def validation_loss(model, documents, profile: TinyDoctrineProfile, device, batch_limit: int = 20) -> float:
    model.eval()
    values = []
    generator = torch.Generator(device=device).manual_seed(149)
    with torch.no_grad():
        for index, (sequence, attention, status, relation_bucket) in enumerate(batches(documents, profile)):
            if index >= batch_limit:
                break
            input_ids = torch.tensor([sequence], device=device)
            attention_mask = torch.tensor([attention], device=device)
            labels = input_ids.clone()
            mask = (torch.rand(input_ids.shape, device=device, generator=generator) < 0.15) & attention_mask
            labels[~mask] = -100
            input_ids[mask] = torch.randint(profile.vocabulary_size, (int(mask.sum()),), device=device, generator=generator)
            with torch.autocast(device_type="cuda", dtype=torch.float16):
                logits = model(input_ids, torch.tensor([status], device=device), torch.tensor([relation_bucket], device=device), attention_mask)
                values.append(torch.nn.functional.cross_entropy(logits.view(-1, profile.vocabulary_size), labels.view(-1), ignore_index=-100).item())
    model.train()
    return sum(values) / len(values) if values else float("nan")


def train(steps: int = 200, eval_every: int = 200) -> dict:
    if not hardware_status()["ready_for_gpu_training"] or EcologicalTinyEncoder is None:
        raise RuntimeError("GPU training unavailable: activate the CUDA-enabled local PyTorch environment first.")
    profile = TinyDoctrineProfile()
    documents = compile_ecological_corpus(ROOT)
    partitions = split_documents(documents)
    if not all(partitions[name] for name in ("train", "validation", "test")):
        raise RuntimeError("Ecological v1.4 partition is incomplete; do not train.")
    device = torch.device("cuda")
    config = {key: getattr(profile, key) for key in ("vocabulary_size", "hidden_size", "layers", "heads", "feedforward_size", "sequence_length")}
    model = EcologicalTinyEncoder(**config).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=0.01)
    scaler = torch.amp.GradScaler("cuda")
    iterator = iter(batches(partitions["train"], profile))
    randomizer = random.Random(149)
    optimizer.zero_grad(set_to_none=True)
    losses, validation_history = [], []
    best_validation = float("inf")
    for step in range(steps):
        sequences = []
        while len(sequences) < profile.micro_batch_size:
            try:
                sequences.append(next(iterator))
            except StopIteration:
                iterator = iter(batches(partitions["train"], profile))
        input_ids = torch.tensor([row[0] for row in sequences], device=device)
        attention_mask = torch.tensor([row[1] for row in sequences], device=device)
        status_ids = torch.tensor([row[2] for row in sequences], device=device)
        relation_buckets = torch.tensor([row[3] for row in sequences], device=device)
        labels = input_ids.clone()
        mask = (torch.rand(input_ids.shape, device=device) < 0.15) & attention_mask
        labels[~mask] = -100
        input_ids[mask] = randomizer.randrange(profile.vocabulary_size)
        with torch.autocast(device_type="cuda", dtype=torch.float16):
            logits = model(input_ids, status_ids, relation_buckets, attention_mask)
            loss = torch.nn.functional.cross_entropy(logits.view(-1, profile.vocabulary_size), labels.view(-1), ignore_index=-100) / profile.gradient_accumulation
        losses.append(loss.item() * profile.gradient_accumulation)
        scaler.scale(loss).backward()
        if (step + 1) % profile.gradient_accumulation == 0:
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
            optimizer.zero_grad(set_to_none=True)
        if (step + 1) % eval_every == 0:
            current = validation_loss(model, partitions["validation"], profile, device)
            validation_history.append({"step": step + 1, "masked_language_loss": current})
            if current < best_validation:
                best_validation = current
                ARTIFACTS.mkdir(exist_ok=True)
                torch.save({"model": "EcologicalTinyEncoder v1.4", "state_dict": model.state_dict(), "profile": asdict(profile), "step": step + 1, "validation_masked_language_loss": current}, BEST_OUTPUT)
    if not validation_history or validation_history[-1]["step"] != steps:
        current = validation_loss(model, partitions["validation"], profile, device)
        validation_history.append({"step": steps, "masked_language_loss": current})
        if current < best_validation:
            best_validation = current
            ARTIFACTS.mkdir(exist_ok=True)
            torch.save({"model": "EcologicalTinyEncoder v1.4", "state_dict": model.state_dict(), "profile": asdict(profile), "step": steps, "validation_masked_language_loss": current}, BEST_OUTPUT)
    ARTIFACTS.mkdir(exist_ok=True)
    checkpoint = {"model": "EcologicalTinyEncoder v1.4", "state_dict": model.state_dict(), "profile": asdict(profile), "parameter_count": sum(parameter.numel() for parameter in model.parameters()), "corpus": manifest(documents), "split": split_manifest(partitions), "steps": steps, "mean_masked_language_loss": sum(losses) / len(losses), "initial_masked_language_loss": sum(losses[:20]) / min(20, len(losses)), "final_masked_language_loss": sum(losses[-20:]) / min(20, len(losses)), "validation_history": validation_history, "validation_masked_language_loss": validation_history[-1]["masked_language_loss"], "status": "locally_trained_validation_observed_test_reserved"}
    torch.save(checkpoint, OUTPUT)
    return {key: value for key, value in checkpoint.items() if key != "state_dict"} | {"checkpoint": str(OUTPUT), "best_checkpoint": str(BEST_OUTPUT)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int, default=200)
    parser.add_argument("--eval-every", type=int, default=200)
    arguments = parser.parse_args()
    try:
        print(json.dumps(train(arguments.steps, arguments.eval_every), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
