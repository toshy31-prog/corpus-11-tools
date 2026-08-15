#!/usr/bin/env python3
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
errors: list[str] = []
reference_roots = [
    root / "skills" / "provenance-audit" / "references",
    root / "skills" / "corpus-11-routing" / "references",
]
dsl_paths = [path / "06_GRAPH_11_OPTIMIZED_v4.dsl" for path in reference_roots]
runtime_paths = [path / "02_RUNTIME_GRAPH_11_v4.md" for path in reference_roots]

dsl_texts = [path.read_text(encoding="utf-8") for path in dsl_paths]
runtime_texts = [path.read_text(encoding="utf-8") for path in runtime_paths]
if dsl_texts[0] != dsl_texts[1]:
    errors.append("DSL copies are not synchronized")
if runtime_texts[0] != runtime_texts[1]:
    errors.append("runtime graph copies are not synchronized")

dsl = dsl_texts[0]
runtime = runtime_texts[0]
caps = set(re.findall(r"@cap\s+(CAP\.[A-Z0-9_]+)", dsl))
families = set(re.findall(r"^//\s+(FAM\.[A-Z0-9_]+):", dsl, re.M))
relations = re.findall(
    r"^(CAP\.[A-Z0-9_]+|FAM\.[A-Z0-9_]+)\s+([a-z_]+)\s+->\s+"
    r"(CAP\.[A-Z0-9_]+|FAM\.[A-Z0-9_]+)\s+\{\s*criticality:\s*([a-z_]+);\s*\};",
    dsl,
    re.M,
)

for source, _, target, _ in relations:
    if source.startswith("CAP.") and source not in caps:
        errors.append(f"undeclared CAP relation source: {source}")
    if target.startswith("CAP.") and target not in caps:
        errors.append(f"undeclared CAP relation target: {target}")
    if source.startswith("FAM.") and source not in families:
        errors.append(f"undeclared FAM relation source: {source}")
    if target.startswith("FAM.") and target not in families:
        errors.append(f"undeclared FAM relation target: {target}")

connected = {endpoint for relation in relations for endpoint in (relation[0], relation[2])}
for orphan in sorted((caps | families) - connected):
    errors.append(f"orphan graph endpoint: {orphan}")

runtime_caps = set(re.findall(r"^###\s+(CAP\.[A-Z0-9_]+)$", runtime, re.M))
runtime_families = set(re.findall(r"^-\s+(FAM\.[A-Z0-9_]+):", runtime, re.M))
runtime_relations = set(
    re.findall(
        r"^-\s+(CAP\.[A-Z0-9_]+|FAM\.[A-Z0-9_]+)\s+--([a-z_]+)\[([a-z_]+)\]-->\s+"
        r"(CAP\.[A-Z0-9_]+|FAM\.[A-Z0-9_]+)",
        runtime,
        re.M,
    )
)
dsl_relations = {(source, relation, criticality, target) for source, relation, target, criticality in relations}
if caps != runtime_caps:
    errors.append(f"DSL/runtime CAP mismatch: {sorted(caps ^ runtime_caps)}")
if families != runtime_families:
    errors.append(f"DSL/runtime FAM mismatch: {sorted(families ^ runtime_families)}")
if dsl_relations != runtime_relations:
    errors.append("DSL/runtime pertinent relations mismatch")

folder_caps = set()
for capability_file in (root / "skills").glob("*/references/capability.md"):
    match = re.search(r"^#\s+(CAP\.[A-Z0-9_]+)\s+—", capability_file.read_text(encoding="utf-8"), re.M)
    if match:
        folder_caps.add(match.group(1))
if caps != folder_caps:
    errors.append(f"DSL/capability-folder mismatch: {sorted(caps ^ folder_caps)}")

historical_mapping = {
    "CAP.ATTRIBUTION_GROUNDING": "FAM.ATTRIBUTION_GROUNDING",
    "CAP.DISCRIMINANT_COMPARISON": "FAM.DISCRIMINANT_COMPARISON",
    "CAP.INDIRECT_POWER_ANALYSIS": "FAM.INDIRECT_POWER_ANALYSIS",
}
for legacy_cap, family in historical_mapping.items():
    if legacy_cap in caps or legacy_cap in folder_caps or legacy_cap in runtime_caps:
        errors.append(f"historical family reintroduced as executable capability: {legacy_cap}")
    if family not in families or family not in runtime_families:
        errors.append(f"historical mapping target missing: {legacy_cap} -> {family}")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(
    f"PASS: {len(caps)} CAP, {len(families)} FAM and {len(relations)} relations; "
    "DSL/runtime/folders synchronized; no orphans"
)
