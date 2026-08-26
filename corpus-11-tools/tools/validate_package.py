#!/usr/bin/env python3
from pathlib import Path
import csv
import json
import re
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
errors: list[str] = []
manifest = root / ".codex-plugin" / "plugin.json"
manifest_data: dict = {}
governance = root / "skills" / "corpus-11-routing" / "references" / "epistemic-governance.md"
routing_skill = root / "skills" / "corpus-11-routing" / "SKILL.md"
organism_contract = root / "skills" / "corpus-11-routing" / "references" / "organism-contract.md"
organism_state = root / "skills" / "corpus-11-routing" / "references" / "organism-state.json"
eval_file = root / "evals" / "routing-and-nonregression.jsonl"
inventory_file = root / "docs" / "inventory.json"
research_guard_checker = root / "tools" / "check_research_derived_guards.py"
release_content_checker = root / "tools" / "check_release_content.py"
inventory: dict = {}
NON_CAPABILITY_SKILLS = {
    "corpus-11-routing",
    "corpus-context-library",
    "explore-first",
    "fiction-external-generation",
    "provenance-audit",
    "confidence-convention",
    "conclusion-discipline",
    "expand-then-audit",
    "open-experiment-arena",
}
DESIGN_CANDIDATE_SKILLS = {
    "causal-identification",
    "rival-model-discrimination",
    "construct-validity-assessment",
    "transportability-assessment",
    "scale-transition-assessment",
    "evidence-dependence-audit",
    "strategic-adaptation-assessment",
    "value-of-information",
    "capability-interference-audit",
}
required_inference_evals = {
    f"inference-{family}-{number:02d}"
    for family in (
        "causal",
        "rival",
        "construct",
        "transport",
        "scale",
        "evidence",
        "strategy",
        "voi",
        "interference",
    )
    for number in (1, 2)
}

required_governance_invariants = {
    "SELECTION_CRITERION != SYSTEM_PROPERTY",
    "MODEL_PRIMITIVE != SYSTEM_INTERNAL",
    "SHORT_CODE != STRUCTURAL_COMPRESSION",
    "REVERSIBLE_CHOICE != STRUCTURAL_EVIDENCE",
    "OBSERVED_FIT != INTERNALITY",
    "PAIRWISE_WIN != UNIQUE_SELECTION",
    "EQUIVALENT_SURVIVORS != UNIQUE_WINNER",
    "AUDIT_CAN_REJECT != AUDIT_CAN_SEED_LAW",
}
required_epistemic_evals = {f"epistemic-{number:02d}" for number in range(1, 7)}

if not governance.is_file():
    errors.append("missing epistemic governance reference")
else:
    governance_text = governance.read_text(encoding="utf-8")
    for invariant in sorted(required_governance_invariants):
        if invariant not in governance_text:
            errors.append(f"epistemic governance missing invariant: {invariant}")

if not routing_skill.is_file() or "references/epistemic-governance.md" not in routing_skill.read_text(
    encoding="utf-8"
):
    errors.append("routing skill does not load epistemic governance")
if not routing_skill.is_file() or any(
    reference not in routing_skill.read_text(encoding="utf-8")
    for reference in (
        "references/organism-contract.md",
        "references/organism-state.json",
    )
):
    errors.append("routing skill does not load living-continuity state")
if not organism_contract.is_file() or not organism_state.is_file():
    errors.append("missing living-continuity contract or machine-readable state")
if not release_content_checker.is_file():
    errors.append("missing exhaustive release-content checker")

eval_ids: list[str] = []
if not eval_file.is_file():
    errors.append("missing routing eval file")
else:
    for number, line in enumerate(eval_file.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"routing eval line {number}: invalid JSON: {exc}")
            continue
        eval_id = record.get("id")
        if not isinstance(eval_id, str) or not eval_id:
            errors.append(f"routing eval line {number}: missing id")
        else:
            eval_ids.append(eval_id)
if len(eval_ids) != len(set(eval_ids)):
    errors.append("duplicate routing eval IDs")
missing_epistemic_evals = required_epistemic_evals - set(eval_ids)
if missing_epistemic_evals:
    errors.append(f"missing epistemic evals: {sorted(missing_epistemic_evals)}")
missing_inference_evals = required_inference_evals - set(eval_ids)
if missing_inference_evals:
    errors.append(f"missing inference evals: {sorted(missing_inference_evals)}")

if not inventory_file.is_file():
    errors.append("missing package inventory")
else:
    try:
        inventory = json.loads(inventory_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"invalid package inventory JSON: {exc}")
    else:
        if inventory.get("eval_count") != len(eval_ids):
            errors.append(
                "inventory eval_count does not match routing/non-regression eval file"
            )
        release_marker = inventory.get("release")
        if not isinstance(release_marker, str) or not (
            root / "docs" / f"release-content-{release_marker}.json"
        ).is_file():
            errors.append("missing exhaustive current-release content attestation")

if not research_guard_checker.is_file():
    errors.append("missing research-derived guard checker")
else:
    guard_check = subprocess.run(
        [sys.executable, str(research_guard_checker)],
        cwd=root,
        text=True,
        capture_output=True,
    )
    if guard_check.returncode != 0:
        errors.append(
            "research-derived guard contract failed: "
            + (guard_check.stdout + guard_check.stderr).strip()
        )


def parse_minimal_scalar(value: str):
    value = value.strip()
    if not value:
        raise ValueError("empty value")
    if value in ("true", "false"):
        return value == "true"
    if value.startswith('"') or value.startswith("["):
        return json.loads(value)
    if value.startswith("'"):
        if len(value) < 2 or not value.endswith("'"):
            raise ValueError("unterminated quoted scalar")
        return value[1:-1]
    if value[0] in "{]" or value[-1] in "[}":
        raise ValueError("malformed scalar")
    return value


def parse_minimal_yaml(text: str, *, nested: bool) -> dict:
    result: dict = {}
    current_section: str | None = None
    for number, raw_line in enumerate(text.splitlines(), 1):
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue
        if "\t" in raw_line:
            raise ValueError(f"line {number}: tabs are not allowed")
        indent = len(raw_line) - len(raw_line.lstrip(" "))
        if ":" not in raw_line:
            raise ValueError(f"line {number}: expected key: value")
        key, value = raw_line.strip().split(":", 1)
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_-]*", key):
            raise ValueError(f"line {number}: invalid key")
        if indent == 0:
            if key in result:
                raise ValueError(f"line {number}: duplicate key {key}")
            if nested and not value.strip():
                result[key] = {}
                current_section = key
            else:
                result[key] = parse_minimal_scalar(value)
                current_section = None
        elif nested and indent == 2 and current_section:
            section = result[current_section]
            if key in section:
                raise ValueError(f"line {number}: duplicate key {current_section}.{key}")
            section[key] = parse_minimal_scalar(value)
        else:
            raise ValueError(f"line {number}: unsupported indentation")
    return result

if not manifest.exists():
    errors.append("missing .codex-plugin/plugin.json")
else:
    try:
        manifest_data = json.loads(manifest.read_text(encoding="utf-8"))
        for key in ("name", "version", "description", "skills"):
            if not manifest_data.get(key):
                errors.append(f"manifest missing {key}")
    except Exception as exc:
        errors.append(f"invalid manifest JSON: {exc}")

names: list[str] = []
capability_ids: list[str] = []
skill_root = root / "skills"

for skill in sorted(path for path in skill_root.iterdir() if path.is_dir()):
    skill_md = skill / "SKILL.md"
    agent_yaml = skill / "agents" / "openai.yaml"
    capability_md = skill / "references" / "capability.md"

    if not skill_md.is_file():
        errors.append(f"{skill.name}: missing SKILL.md")
    else:
        text = skill_md.read_text(encoding="utf-8")
        front_matter = re.match(r"^---\n(.*?)\n---\n", text, re.S)
        if not front_matter:
            errors.append(f"{skill.name}: missing YAML front matter")
        else:
            try:
                metadata = parse_minimal_yaml(front_matter.group(1), nested=False)
            except (ValueError, json.JSONDecodeError) as exc:
                errors.append(f"{skill.name}: invalid SKILL.md YAML: {exc}")
                metadata = None
            if not isinstance(metadata, dict):
                errors.append(f"{skill.name}: SKILL.md front matter must be a mapping")
            else:
                name = metadata.get("name")
                description = metadata.get("description")
                if not isinstance(name, str) or not name.strip():
                    errors.append(f"{skill.name}: missing name")
                else:
                    names.append(name.strip())
                    if name.strip() != skill.name:
                        errors.append(f"{skill.name}: front-matter name does not match folder")
                    if len("corpus-11-tools:" + name.strip()) > 64:
                        errors.append(f"{skill.name}: combined identity > 64 chars")
                if not isinstance(description, str) or not description.strip():
                    errors.append(f"{skill.name}: missing description")
                elif len(description) > 1024:
                    errors.append(f"{skill.name}: description > 1024 chars")

    if not agent_yaml.is_file():
        errors.append(f"{skill.name}: missing agents/openai.yaml")
    else:
        try:
            agent = parse_minimal_yaml(agent_yaml.read_text(encoding="utf-8"), nested=True)
        except (ValueError, json.JSONDecodeError) as exc:
            errors.append(f"{skill.name}: invalid agents/openai.yaml: {exc}")
            agent = None
        interface = agent.get("interface") if isinstance(agent, dict) else None
        policy = agent.get("policy") if isinstance(agent, dict) else None
        if not isinstance(interface, dict):
            errors.append(f"{skill.name}: agents/openai.yaml missing interface mapping")
        else:
            for key in ("display_name", "short_description", "default_prompt"):
                if not isinstance(interface.get(key), str) or not interface[key].strip():
                    errors.append(f"{skill.name}: agents/openai.yaml missing interface.{key}")
        if not isinstance(policy, dict) or not isinstance(policy.get("allow_implicit_invocation"), bool):
            errors.append(
                f"{skill.name}: agents/openai.yaml missing boolean policy.allow_implicit_invocation"
            )

    expected_capability = "CAP." + skill.name.replace("-", "_").upper()
    if skill.name in NON_CAPABILITY_SKILLS:
        if capability_md.exists():
            errors.append(f"{skill.name}: non-capability skill must not contain references/capability.md")
    elif not capability_md.is_file():
        errors.append(f"{skill.name}: missing references/capability.md")
    else:
        capability_text = capability_md.read_text(encoding="utf-8")
        heading = re.search(
            r"^#\s+(CAP\.[A-Z0-9_]+)\s+—\s+provenance opérationnelle$",
            capability_text,
            re.M,
        )
        if not heading:
            errors.append(f"{skill.name}: references/capability.md missing canonical CAP heading")
        elif heading.group(1) != expected_capability:
            errors.append(
                f"{skill.name}: references/capability.md declares {heading.group(1)}, "
                f"expected {expected_capability}"
            )
        else:
            capability_ids.append(heading.group(1))
        if skill.name in DESIGN_CANDIDATE_SKILLS and "design_candidate_unvalidated" not in capability_text:
            errors.append(f"{skill.name}: missing design-candidate status")

design_provenance = root / "skills" / "provenance-audit" / "references" / "08_PROVENANCE_DESIGN_CANDIDATES.csv"
if not design_provenance.is_file():
    errors.append("missing design-candidate provenance register")
else:
    with design_provenance.open(encoding="utf-8", newline="") as handle:
        design_rows = list(csv.DictReader(handle))
    design_ids = {row.get("object_id") for row in design_rows}
    expected_design_ids = {
        "CAP." + name.replace("-", "_").upper() for name in DESIGN_CANDIDATE_SKILLS
    }
    if design_ids != expected_design_ids:
        errors.append(
            f"design provenance mismatch: {sorted(design_ids ^ expected_design_ids)}"
        )

if len(names) != len(set(names)):
    errors.append("duplicate skill names")
if len(capability_ids) != len(set(capability_ids)):
    errors.append("duplicate capability IDs in references/capability.md")
expected_skill_count = inventory.get("skill_count")
expected_capability_count = inventory.get("capability_skill_count")
inventory_skills = inventory.get("skills")
if expected_skill_count != len(names):
    errors.append(
        f"inventory expects {expected_skill_count} skills, found {len(names)}"
    )
if expected_capability_count != len(capability_ids):
    errors.append(
        f"inventory expects {expected_capability_count} capability references, "
        f"found {len(capability_ids)}"
    )
if not isinstance(inventory_skills, list) or set(inventory_skills) != set(names):
    inventory_skill_set = set(inventory_skills) if isinstance(inventory_skills, list) else set()
    errors.append(f"inventory skill list mismatch: {sorted(inventory_skill_set ^ set(names))}")
elif len(inventory_skills) != len(set(inventory_skills)):
    errors.append("duplicate skill names in inventory")
if manifest_data.get("version") != inventory.get("version"):
    errors.append("manifest version does not match inventory version")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"PASS: {len(names)} skills; {len(capability_ids)} unique capabilities validated")
print(
    f"PASS: epistemic governance linked; {len(eval_ids)} routing/non-regression evals validated"
)
