from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "scripts"))
from check_initial_protocols import check_lab

check_lab("user-capacity-and-dependence-lab")
print("PASS user-capacity-and-dependence-lab initial protocol")
