"""Inspection sans GPU de la matière relationnelle v1.6."""

from __future__ import annotations
import json
from pathlib import Path
from relation_triples import manifest, split, triples

ROOT = Path(__file__).resolve().parents[4]

if __name__ == "__main__":
    partitions = split(triples(ROOT))
    print(json.dumps({"experiment": "declared-triples-v1.6", "manifest": manifest(partitions), "interpretation_limit": "This compiles declared triples and synthetic corruptions. It neither discovers relations nor establishes model understanding or organismic learning."}, ensure_ascii=False, indent=2))
