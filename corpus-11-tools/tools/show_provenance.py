#!/usr/bin/env python3
from pathlib import Path
import csv, sys
root = Path(__file__).resolve().parents[1]
csv_path = root/"skills"/"provenance-audit"/"references"/"05_PROVENANCE_CAPABILITIES_11.csv"
legacy_path = root/"skills"/"provenance-audit"/"references"/"07_PROVENANCE_RECOVERED_LEGACY.csv"
design_path = root/"skills"/"provenance-audit"/"references"/"08_PROVENANCE_DESIGN_CANDIDATES.csv"
cap = sys.argv[1] if len(sys.argv) > 1 else None
if not cap:
    print("usage: show_provenance.py CAPABILITY_ID")
    raise SystemExit(2)
with csv_path.open(encoding="utf-8") as f:
    rows = [r for r in csv.DictReader(f) if r["capability_id"] == cap]
for r in rows:
    print(f"{r['capability_id']} M{int(r['module']):02d} {r['block']} {r['projection']} "
          f"{r['line_start']}-{r['line_end']} {r['projection_id']}")
with legacy_path.open(encoding="utf-8") as f:
    legacy_rows = [r for r in csv.DictReader(f) if r["object_id"] == cap]
for r in legacy_rows:
    print(f"{r['object_id']} {r['source_artifact']} {r['source_locator']} "
          f"{r['support_type']} {r['source_sha256']}")
with design_path.open(encoding="utf-8") as f:
    design_rows = [r for r in csv.DictReader(f) if r["object_id"] == cap]
for r in design_rows:
    print(f"{r['object_id']} {r['source_kind']} {r['source_locator']} "
          f"{r['status']} {r['date']}")
print(
    f"{len(rows)} 10.x backlink rows; {len(legacy_rows)} recovered-legacy rows; "
    f"{len(design_rows)} design-candidate rows"
)
