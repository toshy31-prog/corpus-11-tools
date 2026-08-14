#!/usr/bin/env python3
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
dsl = (root/"skills"/"provenance-audit"/"references"/"06_GRAPH_11_OPTIMIZED_v4.dsl").read_text(encoding="utf-8")
caps = set(re.findall(r"@cap\s+(CAP\.[A-Z0-9_]+)", dsl))
targets = set(re.findall(r"->\s+(CAP\.[A-Z0-9_]+)", dsl))
sources = set(re.findall(r"^(CAP\.[A-Z0-9_]+)\s+\w+\s+->", dsl, re.M))
missing = (targets | sources) - caps
if missing:
    print("FAIL missing cap declarations:")
    for item in sorted(missing):
        print(" -", item)
    raise SystemExit(1)
print(f"PASS: {len(caps)} capability declarations; all CAP relation endpoints declared")
