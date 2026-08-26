from __future__ import annotations

import json
from pathlib import Path

from candidate_dataset import manifest


OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/candidate-v1-partitions.json"
result = manifest()
OUTPUT.parent.mkdir(exist_ok=True)
OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(result, ensure_ascii=False, indent=2))
