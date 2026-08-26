"""Récupère des capabilities par similarité avec DoctrineCorpusNet v1."""

from __future__ import annotations

import json
from pathlib import Path
import sys

from doctrine_embeddings import DoctrineEmbeddings, cosine
from neural_router import tokens


ROOT = Path(__file__).resolve().parents[4]
MODEL = Path(__file__).resolve().parents[1] / "artifacts/doctrine-corpusnet-v1.json"

if not MODEL.exists():
    raise SystemExit("Modèle absent : exécute d'abord train_doctrine.py")
payload = json.loads(MODEL.read_text())
model = DoctrineEmbeddings.from_dict(payload["network"])
query = " ".join(sys.argv[1:])
query_vector = model.vector(tokens(query))
prototypes = []
for skill_file in sorted((ROOT / "corpus-11-tools/skills").glob("*/SKILL.md")):
    reference = skill_file.parent / "references/capability.md"
    text = skill_file.read_text() + (reference.read_text() if reference.exists() else "")
    prototypes.append((skill_file.parent.name, cosine(query_vector, model.vector(tokens(text)))))
ranked = sorted(prototypes, key=lambda item: item[1], reverse=True)[:5]
print(json.dumps({"model_status": "experimental_not_selected", "query": query, "recommendations": [{"capability": name, "similarity": round(score, 6)} for name, score in ranked], "warning": "Similarity is not a conclusion, a route authorization, or evidence that a capability is established."}, ensure_ascii=False, indent=2))
