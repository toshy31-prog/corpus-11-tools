"""Entraîne TinyDoctrineEncoder v1 par MLM sur le corpus doctrinal compilé."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import random
from dataclasses import asdict
import argparse

from compute_profile import TinyDoctrineProfile, hardware_status, parameter_estimate
from doctrine_corpus import compile_corpus, manifest
from doctrine_split import split_documents, manifest as split_manifest
from tiny_doctrine_encoder import TinyDoctrineEncoder, torch


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/tiny-doctrine-encoder-v1.3.pt"
BEST_OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/tiny-doctrine-encoder-v1.3-best.pt"


def token_id(token: str, vocabulary_size: int) -> int:
    return int(hashlib.sha256(token.encode()).hexdigest()[:8], 16) % vocabulary_size


def batches(documents, profile: TinyDoctrineProfile):
    stream = [token_id(token, profile.vocabulary_size) for document in documents for token in document.tokens]
    for start in range(0, len(stream) - profile.sequence_length, profile.sequence_length):
        yield stream[start : start + profile.sequence_length]


def validation_loss(model, documents, profile: TinyDoctrineProfile, device, batch_limit: int = 20) -> float:
    model.eval()
    values = []
    generator = torch.Generator(device=device).manual_seed(97)
    with torch.no_grad():
        for index, sequence in enumerate(batches(documents, profile)):
            if index >= batch_limit:
                break
            input_ids = torch.tensor([sequence], device=device)
            labels = input_ids.clone()
            mask = torch.rand(input_ids.shape, device=device, generator=generator) < 0.15
            labels[~mask] = -100
            input_ids[mask] = torch.randint(profile.vocabulary_size, (int(mask.sum()),), device=device, generator=generator)
            with torch.autocast(device_type="cuda", dtype=torch.float16):
                logits = model(input_ids)
                values.append(torch.nn.functional.cross_entropy(logits.view(-1, profile.vocabulary_size), labels.view(-1), ignore_index=-100).item())
    model.train()
    return sum(values) / len(values) if values else float("nan")


def train(steps: int = 200, eval_every: int = 200) -> dict:
    hardware = hardware_status()
    if not hardware["ready_for_gpu_training"] or TinyDoctrineEncoder is None:
        raise RuntimeError("GPU training unavailable: install a matching NVIDIA driver and CUDA-enabled PyTorch on the local machine first.")
    profile = TinyDoctrineProfile()
    documents = compile_corpus(ROOT)
    partitions = split_documents(documents)
    device = torch.device("cuda")
    model = TinyDoctrineEncoder(**{key: getattr(profile, key) for key in ("vocabulary_size", "hidden_size", "layers", "heads", "feedforward_size", "sequence_length")}).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=0.01)
    scaler = torch.amp.GradScaler("cuda")
    iterator = iter(batches(partitions["train"], profile))
    randomizer = random.Random(71)
    model.train()
    optimizer.zero_grad(set_to_none=True)
    losses = []
    validation_history = []
    best_validation = float("inf")
    for step in range(steps):
        try:
            sequences = [next(iterator) for _ in range(profile.micro_batch_size)]
        except StopIteration:
            iterator = iter(batches(partitions["train"], profile))
            sequences = [next(iterator) for _ in range(profile.micro_batch_size)]
        input_ids = torch.tensor(sequences, device=device)
        labels = input_ids.clone()
        mask = torch.rand(input_ids.shape, device=device) < 0.15
        labels[~mask] = -100
        input_ids[mask] = randomizer.randrange(profile.vocabulary_size)
        with torch.autocast(device_type="cuda", dtype=torch.float16):
            logits = model(input_ids)
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
            current_validation = validation_loss(model, partitions["validation"], profile, device)
            validation_history.append({"step": step + 1, "masked_language_loss": current_validation})
            if current_validation < best_validation:
                best_validation = current_validation
                BEST_OUTPUT.parent.mkdir(exist_ok=True)
                torch.save({"model": "TinyDoctrineEncoder v1.3", "state_dict": model.state_dict(), "profile": asdict(profile), "step": step + 1, "validation_masked_language_loss": current_validation}, BEST_OUTPUT)
    if not validation_history or validation_history[-1]["step"] != steps:
        current_validation = validation_loss(model, partitions["validation"], profile, device)
        validation_history.append({"step": steps, "masked_language_loss": current_validation})
        if current_validation < best_validation:
            best_validation = current_validation
            BEST_OUTPUT.parent.mkdir(exist_ok=True)
            torch.save({"model": "TinyDoctrineEncoder v1.3", "state_dict": model.state_dict(), "profile": asdict(profile), "step": steps, "validation_masked_language_loss": current_validation}, BEST_OUTPUT)
    OUTPUT.parent.mkdir(exist_ok=True)
    checkpoint = {"model": "TinyDoctrineEncoder v1.3", "state_dict": model.state_dict(), "profile": asdict(profile), "parameter_estimate": parameter_estimate(profile), "corpus": manifest(documents), "split": split_manifest(partitions), "steps": steps, "mean_masked_language_loss": sum(losses) / len(losses), "initial_masked_language_loss": sum(losses[:20]) / min(20, len(losses)), "final_masked_language_loss": sum(losses[-20:]) / min(20, len(losses)), "validation_history": validation_history, "validation_masked_language_loss": validation_history[-1]["masked_language_loss"], "status": "locally_trained_validation_observed_test_reserved"}
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
