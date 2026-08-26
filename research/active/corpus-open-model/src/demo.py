from pathlib import Path
import json

from kernel import route


ROOT = Path(__file__).resolve().parents[4]
print(json.dumps(route("Évaluer une affirmation causale et la provenance de ses sources.", ROOT), ensure_ascii=False, indent=2))
