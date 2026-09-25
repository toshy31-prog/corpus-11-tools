#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from corpus_paths import CAPABILITIES_RUNTIME_ROOT, DOCLING_MODELS_ROOT

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

CAP = CAPABILITIES_RUNTIME_ROOT
VENV = CAP / "venvs/docling"
PYTHON = VENV / "bin/python"
ARTIFACTS = DOCLING_MODELS_ROOT

HELPER = HERE / "docling_extract.py"
REQ = HERE / "requirements-docling.txt"

# Revisions ayant servi à l'état Corpus validé.
HERON_REPO = "docling-project/docling-layout-heron"
HERON_REV = "8f39ad3c0b4c58e9c2d2c84a38465abf757272d8"

MODELS_REPO = "docling-project/docling-models"
MODELS_REV = "fc0f2d45e2218ea24bce5045f58a389aed16dc23"


def run(*args: str) -> None:
    print("+", *args)
    subprocess.run(args, check=True)


def install_python() -> None:
    CAP.mkdir(parents=True, exist_ok=True)
    if not PYTHON.exists():
        run(sys.executable, "-m", "venv", str(VENV))

    run(str(PYTHON), "-m", "pip", "install", "--upgrade", "pip")
    run(str(PYTHON), "-m", "pip", "install", "-r", str(REQ))


def download_hf(repo: str, revision: str, destination: Path) -> None:
    code = r"""
from huggingface_hub import snapshot_download
import sys

repo, revision, destination = sys.argv[1:4]

snapshot_download(
    repo_id=repo,
    revision=revision,
    local_dir=destination,
)
"""
    run(
        str(PYTHON),
        "-c",
        code,
        repo,
        revision,
        str(destination),
    )


def install_models() -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    heron = ARTIFACTS / HERON_REPO.replace("/", "--")
    models = ARTIFACTS / MODELS_REPO.replace("/", "--")
    rapid = ARTIFACTS / "RapidOcr"

    if not (heron / "model.safetensors").is_file():
        download_hf(HERON_REPO, HERON_REV, heron)

    if not (
        models
        / "model_artifacts/tableformer/accurate/tableformer_accurate.safetensors"
    ).is_file():
        download_hf(MODELS_REPO, MODELS_REV, models)

    required_rapid = (
        "PP-OCRv6_det_small.pth",
        "ch_ptocr_mobile_v2.0_cls_mobile.pth",
        "PP-OCRv6_rec_small.pth",
        "ppocrv6_dict.txt",
    )

    if not all((rapid / name).is_file() for name in required_rapid):
        run(
            str(VENV / "bin/docling-tools"),
            "models",
            "download",
            "rapidocr",
            "--rapidocr-backend-lang",
            "torch:ch",
            "--output-dir",
            str(ARTIFACTS),
        )


def verify() -> None:
    required = (
        ARTIFACTS
        / "docling-project--docling-layout-heron"
        / "model.safetensors",
        ARTIFACTS
        / "docling-project--docling-models"
        / "model_artifacts/tableformer/accurate/tableformer_accurate.safetensors",
        ARTIFACTS / "RapidOcr/PP-OCRv6_det_small.pth",
        ARTIFACTS / "RapidOcr/ch_ptocr_mobile_v2.0_cls_mobile.pth",
        ARTIFACTS / "RapidOcr/PP-OCRv6_rec_small.pth",
        ARTIFACTS / "RapidOcr/ppocrv6_dict.txt",
        HELPER,
    )

    missing = [p for p in required if not p.is_file()]
    if missing:
        print("Installation incomplète :", file=sys.stderr)
        for path in missing:
            print(" -", path, file=sys.stderr)
        raise SystemExit(1)

    run(str(PYTHON), "-m", "pip", "check")

    print()
    print("DOCLING_BOOTSTRAP=PASS")
    print("PYTHON=", PYTHON)
    print("HELPER=", HELPER)
    print("ARTIFACTS=", ARTIFACTS)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Vérifier l'installation existante sans installer ni télécharger.",
    )
    args = parser.parse_args()

    if not args.verify_only:
        install_python()
        install_models()

    verify()


if __name__ == "__main__":
    main()
