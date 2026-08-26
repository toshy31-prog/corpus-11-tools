"""Inspection sans GPU de la membrane d'alimentation v0."""

from __future__ import annotations

import json
from pathlib import Path

from ecological_corpus import compile_ecological_corpus, manifest
from ecological_split import manifest as split_manifest, split_documents
from kernel import build_snapshot


ROOT = Path(__file__).resolve().parents[4]


def inspect() -> dict:
    documents = compile_ecological_corpus(ROOT)
    partitions = split_documents(documents)
    return {
        "membrane": "ecological-feed-v0",
        "environment_snapshot": build_snapshot(ROOT)["fingerprint"],
        "corpus": manifest(documents),
        "split": split_manifest(partitions),
        "method_effect_audit": {
            "protocol_effect": "The compiler selects text extensions and relation degree from the declared graph; it does not observe non-text carriers or infer undocumented relations.",
            "protected_boundary": "The corpus-open-model project, generated artifacts and virtual environments are excluded from self-training.",
            "reversal_condition": "Withdraw this representation if a comparison shows that its structural signals erase status boundaries or add no discriminable result beyond text-only MLM.",
        },
        "interpretation_limit": "This is an ingestion manifest, not evidence of ecological learning, memory, agency or emergence.",
    }


if __name__ == "__main__":
    print(json.dumps(inspect(), ensure_ascii=False, indent=2))
