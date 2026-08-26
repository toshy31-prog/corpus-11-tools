"""Profil de calcul borné pour le portable cible."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
import subprocess


@dataclass(frozen=True)
class TinyDoctrineProfile:
    vocabulary_size: int = 16_384
    hidden_size: int = 384
    layers: int = 6
    heads: int = 6
    feedforward_size: int = 1_536
    sequence_length: int = 256
    micro_batch_size: int = 4
    gradient_accumulation: int = 8
    gradient_checkpointing: bool = False


def parameter_estimate(profile: TinyDoctrineProfile = TinyDoctrineProfile()) -> int:
    embeddings = profile.vocabulary_size * profile.hidden_size * 2  # input + MLM head
    transformer = profile.layers * (4 * profile.hidden_size * profile.hidden_size + 2 * profile.hidden_size * profile.feedforward_size)
    return embeddings + transformer


def hardware_status() -> dict:
    try:
        result = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"], capture_output=True, text=True, timeout=5)
        gpus = [line for line in result.stdout.splitlines() if line.strip()] if result.returncode == 0 else []
    except (FileNotFoundError, subprocess.TimeoutExpired):
        gpus = []
    try:
        import torch  # type: ignore
        torch_status = {"installed": True, "version": torch.__version__, "cuda_available": torch.cuda.is_available()}
    except ImportError:
        torch_status = {"installed": False, "cuda_available": False}
    return {"nvidia_smi_gpus": gpus, "torch": torch_status, "ready_for_gpu_training": bool(gpus) and torch_status["cuda_available"]}


if __name__ == "__main__":
    profile = TinyDoctrineProfile()
    print(json.dumps({"profile": asdict(profile), "parameter_estimate": parameter_estimate(profile), "hardware": hardware_status()}, ensure_ascii=False, indent=2))
