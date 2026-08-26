from pathlib import Path
import json

from kernel import build_snapshot


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/corpus-snapshot.json"

snapshot = build_snapshot(ROOT)
OUTPUT.parent.mkdir(exist_ok=True)
OUTPUT.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n")
print(f"snapshot={snapshot['fingerprint']} materials={snapshot['material_count']} output={OUTPUT}")
