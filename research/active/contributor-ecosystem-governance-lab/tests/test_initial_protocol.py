from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "scripts"))
from check_initial_protocols import check_lab

check_lab("contributor-ecosystem-governance-lab")
print("PASS contributor-ecosystem-governance-lab initial protocol")
