from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]

required = [
    root / "sources",
    root / "notes",
    root / "hypotheses",
    root / "reports",
    root / "state" / "current_state.md",
    root / "experiments",
]

missing = [str(p) for p in required if not p.exists()]

if missing:
    print("FAIL")
    for p in missing:
        print("missing:", p)
    sys.exit(1)

print("PASS: research workspace valid")
