"""Deux variantes contrôlées v1.5 : contexte relationnel déclaré ou neutralisé."""

from __future__ import annotations

import argparse
from dataclasses import asdict
import json
from pathlib import Path

from compute_profile import TinyDoctrineProfile, hardware_status
from ecological_corpus import compile_ecological_corpus, manifest
from ecological_relation_experiment import batches, masked_loss, metrics_by_stratum
from ecological_tiny_encoder import EcologicalTinyEncoder, torch
from relation_stratified_split import manifest as split_manifest, split_documents, stratum


ROOT = Path(__file__).resolve().parents[4]
ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"


def paths(relation_context: str) -> tuple[Path, Path]:
    stem = f"ecological-relation-{relation_context}-v1.5"
    return ARTIFACTS / f"{stem}.pt", ARTIFACTS / f"{stem}-best.pt"


def train(relation_context: str, steps: int = 1_000, eval_every: int = 200) -> dict:
    if relation_context not in {"declared", "ablated"}:
        raise RuntimeError("relation context must be declared or ablated")
    if not hardware_status()["ready_for_gpu_training"] or EcologicalTinyEncoder is None:
        raise RuntimeError("GPU training unavailable: activate the CUDA-enabled local PyTorch environment first.")
    torch.manual_seed(251)
    torch.cuda.manual_seed_all(251)
    profile = TinyDoctrineProfile()
    documents = compile_ecological_corpus(ROOT)
    partitions = split_documents(documents)
    split = split_manifest(partitions)
    if min(split["strata"][partition]["has_declared_relation"] for partition in ("validation", "test")) < 5:
        raise RuntimeError("Stratification failed to reserve five relation-bearing documents in validation and test.")
    device = torch.device("cuda")
    config = {key: getattr(profile, key) for key in ("vocabulary_size", "hidden_size", "layers", "heads", "feedforward_size", "sequence_length")}
    model = EcologicalTinyEncoder(**config).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=0.01)
    scaler = torch.amp.GradScaler("cuda")
    iterator = iter(batches(partitions["train"], profile, relation_context))
    mask_generator = torch.Generator(device=device).manual_seed(251)
    optimizer.zero_grad(set_to_none=True)
    losses, validation_history = [], []
    best_validation = float("inf")
    _, best_output = paths(relation_context)
    relation_validation = [document for document in partitions["validation"] if stratum(document) == "has_declared_relation"]
    for step in range(steps):
        group = []
        while len(group) < profile.micro_batch_size:
            try:
                group.append(next(iterator))
            except StopIteration:
                iterator = iter(batches(partitions["train"], profile, relation_context))
        input_ids = torch.tensor([row[0] for row in group], device=device)
        attention_mask = torch.tensor([row[1] for row in group], device=device)
        status_ids = torch.tensor([row[2] for row in group], device=device)
        relation_buckets = torch.tensor([row[3] for row in group], device=device)
        labels = input_ids.clone()
        mask = (torch.rand(input_ids.shape, device=device, generator=mask_generator) < 0.15) & attention_mask
        labels[~mask] = -100
        input_ids[mask] = torch.randint(profile.vocabulary_size, (int(mask.sum()),), device=device, generator=mask_generator)
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
            current = masked_loss(model, relation_validation, profile, device, relation_context, seed=252)
            validation_history.append({"step": step + 1, "related_document_masked_language_loss": current})
            if current < best_validation:
                best_validation = current
                ARTIFACTS.mkdir(exist_ok=True)
                torch.save({"model": "EcologicalRelationAblation v1.5", "relation_context": relation_context, "state_dict": model.state_dict(), "profile": asdict(profile), "step": step + 1, "validation_related_masked_language_loss": current}, best_output)
    output, _ = paths(relation_context)
    final_validation = metrics_by_stratum(model, partitions["validation"], profile, device, relation_context)
    checkpoint = {"model": "EcologicalRelationAblation v1.5", "relation_context": relation_context, "state_dict": model.state_dict(), "profile": asdict(profile), "parameter_count": sum(parameter.numel() for parameter in model.parameters()), "corpus": manifest(documents), "split": split, "steps": steps, "mean_masked_language_loss": sum(losses) / len(losses), "initial_masked_language_loss": sum(losses[:20]) / min(20, len(losses)), "final_masked_language_loss": sum(losses[-20:]) / min(20, len(losses)), "validation_related_history": validation_history, "final_validation_by_stratum": final_validation, "selection_metric": "validation related_document_masked_language_loss", "status": "locally_trained_validation_observed_test_reserved"}
    ARTIFACTS.mkdir(exist_ok=True)
    torch.save(checkpoint, output)
    return {key: value for key, value in checkpoint.items() if key != "state_dict"} | {"checkpoint": str(output), "best_checkpoint": str(best_output)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--relation-context", choices=("declared", "ablated"), required=True)
    parser.add_argument("--steps", type=int, default=1_000)
    parser.add_argument("--eval-every", type=int, default=200)
    arguments = parser.parse_args()
    try:
        print(json.dumps(train(arguments.relation_context, arguments.steps, arguments.eval_every), ensure_ascii=False, indent=2))
    except RuntimeError as error:
        raise SystemExit(str(error))
