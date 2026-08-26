"""Entraîne DoctrineCorpusNet v1 sur les textes Corpus compilés."""

from __future__ import annotations

import json
from pathlib import Path

from doctrine_corpus import compile_corpus, manifest
from doctrine_embeddings import DoctrineEmbeddings
from doctrine_diagnostics import diagnostics, prototype_diagnostics


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/doctrine-corpusnet-v1.json"


def train(root: Path = ROOT) -> tuple[DoctrineEmbeddings, dict]:
    documents = compile_corpus(root)
    model = DoctrineEmbeddings(DoctrineEmbeddings.vocabulary_from(documents))
    training = model.train(documents)
    geometry = diagnostics(model)
    prototypes = prototype_diagnostics(model, root)
    status = "written_and_locally_trained_not_selected"
    if prototypes["status"] == "prototype_space_not_discriminant_for_retrieval":
        status = "locally_trained_retrieval_not_selected"
    metadata = {"model": "DoctrineCorpusNet v1", "training_type": "self_supervised_skip_gram", "corpus": manifest(documents), "training": training, "geometry": geometry, "prototype_geometry": prototypes, "status": status, "scope_limit": "Embeddings model textual cooccurrence only; they do not make research active product doctrine or establish semantic validity."}
    return model, metadata


if __name__ == "__main__":
    model, metadata = train()
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps({"metadata": metadata, "network": model.to_dict()}, ensure_ascii=False))
    print(json.dumps(metadata, ensure_ascii=False, indent=2))
