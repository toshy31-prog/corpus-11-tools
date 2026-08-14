#!/usr/bin/env python3
from pathlib import Path
import csv, sys
root = Path(__file__).resolve().parents[1]
csv_path = root/"skills"/"provenance-audit"/"references"/"05_PROVENANCE_CAPABILITIES_11.csv"
cap = sys.argv[1] if len(sys.argv) > 1 else None
if not cap:
    print("usage: show_provenance.py CAPABILITY_ID")
    raise SystemExit(2)
with csv_path.open(encoding="utf-8") as f:
    rows = [r for r in csv.DictReader(f) if r["capability_id"] == cap]
for r in rows:
    print(f"{r['capability_id']} M{int(r['module']):02d} {r['block']} {r['projection']} "
          f"{r['line_start']}-{r['line_end']} {r['projection_id']}")
print(f"{len(rows)} backlink rows")
