#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

import yaml

root = Path(__file__).resolve().parents[1]
errors: list[str] = []
manifest = root / ".codex-plugin" / "plugin.json"

if not manifest.exists():
    errors.append("missing .codex-plugin/plugin.json")
else:
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
        for key in ("name", "version", "description", "skills"):
            if not data.get(key):
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
                metadata = yaml.safe_load(front_matter.group(1))
            except yaml.YAMLError as exc:
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
            agent = yaml.safe_load(agent_yaml.read_text(encoding="utf-8"))
        except yaml.YAMLError as exc:
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
        if not isinstance(policy, dict) or not isinstance(policy.get("products"), list):
            errors.append(f"{skill.name}: agents/openai.yaml missing policy.products list")
        if not isinstance(policy, dict) or not isinstance(policy.get("allow_implicit_invocation"), bool):
            errors.append(
                f"{skill.name}: agents/openai.yaml missing boolean policy.allow_implicit_invocation"
            )

    if capability_md.is_file():
        heading = re.search(
            r"^#\s+(CAP\.[A-Z0-9_]+)\s+—\s+provenance opérationnelle$",
            capability_md.read_text(encoding="utf-8"),
            re.M,
        )
        if not heading:
            errors.append(f"{skill.name}: references/capability.md missing canonical CAP heading")
        else:
            capability_ids.append(heading.group(1))

if len(names) != len(set(names)):
    errors.append("duplicate skill names")
if len(capability_ids) != len(set(capability_ids)):
    errors.append("duplicate capability IDs in references/capability.md")
if len(capability_ids) != 31:
    errors.append(f"expected 31 capability references, found {len(capability_ids)}")

if errors:
    print("FAIL")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print(f"PASS: {len(names)} skills; {len(capability_ids)} unique capabilities validated")
