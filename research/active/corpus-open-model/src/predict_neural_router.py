from __future__ import annotations

import json
from pathlib import Path
import sys

from neural_router import NeuralRouter


MODEL = Path(__file__).resolve().parents[1] / "artifacts/corpusnet-router-v0.json"
if not MODEL.exists():
    raise SystemExit("Modèle absent : exécute d'abord train_neural_router.py")
payload = json.loads(MODEL.read_text())
result = NeuralRouter.from_dict(payload["network"]).predict_or_abstain(" ".join(sys.argv[1:]))
result["model_status"] = "experimental_not_preferred"
result["warning"] = "This output is a local architecture demonstration. The internal held-out evaluation did not retain this model over the lexical baseline."
print(json.dumps(result, ensure_ascii=False, indent=2))
