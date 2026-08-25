from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "scripts"))
from check_initial_protocols import check_lab

check_lab("research-interruptibility-and-recovery-lab")
print("PASS research-interruptibility-and-recovery-lab initial protocol")
