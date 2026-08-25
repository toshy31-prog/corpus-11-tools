#!/usr/bin/env python3
"""Verify the deterministic B3 certificate used by the factorization ledger."""

from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
SCRIPT = ROOT / "analyze_b3_fixed_space_orbits.py"
EXPECTED_SHA256 = "dab9d6dc6675bee415f4ae2efa769010624d26c7168500c1a3a4595c3c537885"


def group_mean(cells: list[dict[str, object]], d3: int) -> Fraction:
    selected = [cell for cell in cells if int(cell["d3"]) == d3]
    numerator = sum(int(cell["d4"]) * int(cell["count"]) for cell in selected)
    denominator = sum(int(cell["count"]) for cell in selected)
    return Fraction(numerator, denominator)


environment = dict(os.environ)
environment["PYTHONDONTWRITEBYTECODE"] = "1"
completed = subprocess.run(
    [sys.executable, str(SCRIPT)],
    cwd=ROOT,
    env=environment,
    check=True,
    capture_output=True,
)
digest = hashlib.sha256(completed.stdout).hexdigest()
assert digest == EXPECTED_SHA256

certificate = json.loads(completed.stdout)
assert certificate["qualifying_triples"] == 84
assert certificate["qualifying_d3_counts"] == {"0": 68, "1": 16}
assert certificate["extension_count"] == 3780
assert len(certificate["matched_strata"]) == 5

contrasts = sorted(
    group_mean(stratum["cells"], 1) - group_mean(stratum["cells"], 0)
    for stratum in certificate["matched_strata"]
)
assert contrasts == [Fraction(0), Fraction(0), Fraction(0), Fraction(1, 8), Fraction(1)]
assert sum(contrast > 0 for contrast in contrasts) == 2
assert contrasts[len(contrasts) // 2] == 0

print("PASS: B3 certificate hash, counts, contrasts and median verified")
