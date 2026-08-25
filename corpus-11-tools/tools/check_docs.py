#!/usr/bin/env python3
"""Check current documentation, taxonomy, links, and package descriptions."""

from __future__ import annotations

from collections import Counter
from pathlib import Path
import json
import re
import sys


plugin_root = Path(__file__).resolve().parents[1]
repo_root = plugin_root.parent
errors: list[str] = []


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"{path.relative_to(repo_root)}: invalid JSON: {exc}")
        return {}
    if not isinstance(value, dict):
        errors.append(f"{path.relative_to(repo_root)}: expected a JSON object")
        return {}
    return value


manifest = load_json(plugin_root / ".codex-plugin" / "plugin.json")
inventory = load_json(plugin_root / "docs" / "inventory.json")
skill_root = plugin_root / "skills"
skill_dirs = sorted(path for path in skill_root.iterdir() if path.is_dir())

capability_skills: set[str] = set()
status_counts: Counter[str] = Counter()
descriptions: dict[str, str] = {}
for skill in skill_dirs:
    skill_text = (skill / "SKILL.md").read_text(encoding="utf-8")
    description_match = re.search(r"^description:\s*(.+)$", skill_text, re.M)
    if not description_match:
        errors.append(f"{skill.name}: missing SKILL.md description")
    else:
        description = description_match.group(1).strip()
        if description in descriptions:
            errors.append(
                f"duplicate skill description: {descriptions[description]} and {skill.name}"
            )
        descriptions[description] = skill.name

    capability_path = skill / "references" / "capability.md"
    if not capability_path.is_file():
        continue
    capability_skills.add(skill.name)
    capability_text = capability_path.read_text(encoding="utf-8")
    status_match = re.search(r"^- statut:\s*(\S+)\s*$", capability_text, re.M)
    if not status_match:
        errors.append(f"{skill.name}: missing canonical capability status")
    else:
        status_counts[status_match.group(1)] += 1

all_skills = {path.name for path in skill_dirs}
non_capability_skills = all_skills - capability_skills
declared_roles = inventory.get("non_capability_skill_roles", {})
if not isinstance(declared_roles, dict) or set(declared_roles) != non_capability_skills:
    declared = set(declared_roles) if isinstance(declared_roles, dict) else set()
    errors.append(
        f"non-capability taxonomy mismatch: {sorted(declared ^ non_capability_skills)}"
    )

if inventory.get("capability_status_counts") != dict(status_counts):
    errors.append(
        "capability status counts differ from inventory: "
        f"actual={dict(status_counts)} declared={inventory.get('capability_status_counts')}"
    )

expected_counts = {
    "skill_count": len(all_skills),
    "capability_skill_count": len(capability_skills),
    "family_count": 4,
    "relation_count": 88,
}
for key, actual in expected_counts.items():
    if inventory.get(key) != actual:
        errors.append(f"inventory {key}={inventory.get(key)!r}, expected {actual}")

index_path = skill_root / "corpus-11-routing" / "references" / "capability-index.md"
index_text = index_path.read_text(encoding="utf-8")
capability_section = index_text.split("## Capability skills (49)", 1)
if len(capability_section) != 2:
    errors.append("capability index missing canonical capability section")
    indexed_capabilities: set[str] = set()
else:
    capability_body, separator, operational_body = capability_section[1].partition(
        "## Operational skills without a CAP node (9)"
    )
    if not separator:
        errors.append("capability index missing canonical operational-skill section")
    indexed_capabilities = set(re.findall(r"^- `([^`]+)` —", capability_body, re.M))
    indexed_operational = set(re.findall(r"^- `([^`]+)` —", operational_body, re.M))
    if indexed_capabilities != capability_skills:
        errors.append(
            f"capability index mismatch: {sorted(indexed_capabilities ^ capability_skills)}"
        )
    if indexed_operational != non_capability_skills:
        errors.append(
            f"operational index mismatch: {sorted(indexed_operational ^ non_capability_skills)}"
        )

current_docs = [repo_root / "README.md", plugin_root / "README.md"]
release = inventory.get("release")
for path in current_docs:
    text = path.read_text(encoding="utf-8")
    for required in (
        str(release),
        f"{inventory.get('skill_count')} skills",
        f"{inventory.get('capability_skill_count')} capabilities",
        f"{inventory.get('family_count')} familles",
        f"{inventory.get('relation_count')} relations",
        f"{inventory.get('eval_count')} évaluations",
    ):
        if required not in text:
            errors.append(f"{path.relative_to(repo_root)}: missing current marker {required!r}")
    if "1.2.0-alpha" in text:
        errors.append(f"{path.relative_to(repo_root)}: stale alpha release marker")
    for match in re.finditer(r"\b(\d+)\s+(?:évaluations|evals?)\b", text, re.I):
        actual = int(match.group(1))
        if actual != inventory.get("eval_count"):
            errors.append(
                f"{path.relative_to(repo_root)}: stale current eval count {actual}, "
                f"expected {inventory.get('eval_count')}"
            )

# The stability contract is current-release documentation, but its canonical
# counts live in a table rather than prose.  Parse that table explicitly so a
# historical number cannot survive a release update merely because the prose
# elsewhere is current.
stability_contract = plugin_root / "docs" / "stability-contract.md"
if not stability_contract.is_file():
    errors.append("missing current stability contract")
else:
    stability_text = stability_contract.read_text(encoding="utf-8")
    if str(release) not in stability_text:
        errors.append("stability contract: missing current release marker")
    status_inventory = inventory.get("capability_status_counts")
    if not isinstance(status_inventory, dict):
        status_inventory = {}
    operational_roles = inventory.get("non_capability_skill_roles")
    if not isinstance(operational_roles, dict):
        operational_roles = {}
    contract_counts = {
        "Skills": inventory.get("skill_count"),
        "Wrappers de capability natifs": status_inventory.get("candidate_unvalidated"),
        "Wrappers récupérés": status_inventory.get(
            "recovered_candidate_unvalidated"
        ),
        "Wrappers de conception v1.2": status_inventory.get("design_candidate_unvalidated"),
        "Skills opérationnels sans nœud `CAP.*`": len(operational_roles),
        "Familles descriptives": inventory.get("family_count"),
        "Relations": inventory.get("relation_count"),
        "Évaluations": inventory.get("eval_count"),
    }
    for label, expected in contract_counts.items():
        match = re.search(
            rf"^\|\s*{re.escape(label)}\s*\|\s*(\d+)\s*\|",
            stability_text,
            re.M,
        )
        if not match:
            errors.append(f"stability contract: missing count row {label!r}")
            continue
        actual = int(match.group(1))
        if actual != expected:
            errors.append(
                f"stability contract: {label}={actual}, expected inventory value {expected}"
            )

release_validation = plugin_root / "docs" / "release-validation-v1.3.0.md"
if release_validation.is_file():
    release_text = release_validation.read_text(encoding="utf-8")
    for marker in (
        f"{inventory.get('eval_count')}/{inventory.get('eval_count')}",
        f"{inventory.get('capability_skill_count')}/{inventory.get('capability_skill_count')}",
    ):
        if marker not in release_text:
            errors.append(f"release validation: missing current marker {marker!r}")
    for match in re.finditer(r"\b(\d+)\s+(?:évaluations|evals?)\b", release_text, re.I):
        actual = int(match.group(1))
        if actual != inventory.get("eval_count"):
            errors.append(
                f"release validation: stale current eval count {actual}, "
                f"expected {inventory.get('eval_count')}"
            )

for required_path in (
    "corpus-11-tools/",
    "corpus-11-tools/labs/",
    "research/active/cct/",
    "research/active/corpus-hypotheses/",
    "research/completed/food-access-paris/",
    "transfers/",
):
    if required_path not in (repo_root / "README.md").read_text(encoding="utf-8"):
        errors.append(f"README.md: repository map omits {required_path}")

skip_parts = {".git", "node_modules", ".next", "__pycache__"}
for path in repo_root.rglob("*.md"):
    if any(part in skip_parts for part in path.parts):
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    without_code = re.sub(r"```.*?```", "", text, flags=re.S)
    for match in re.finditer(r"(?<!!)\[[^\]]*\]\(([^)]+)\)", without_code):
        target = match.group(1).strip().split()[0].strip("<>")
        if not target or target.startswith(("http://", "https://", "mailto:", "#", "codex://")):
            continue
        target_path = target.split("#", 1)[0]
        if not (path.parent / target_path).resolve().exists():
            line = without_code.count("\n", 0, match.start()) + 1
            errors.append(
                f"{path.relative_to(repo_root)}:{line}: broken link {target_path}"
            )

if manifest.get("version") != inventory.get("version"):
    errors.append("manifest and inventory versions differ")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)

print(
    "PASS: current docs, links, repository map, descriptions, and taxonomy are coherent; "
    f"{len(all_skills)} skills = {len(capability_skills)} capabilities + "
    f"{len(non_capability_skills)} operational skills"
)
