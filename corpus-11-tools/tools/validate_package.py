#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

root = Path(__file__).resolve().parents[1]
errors: list[str] = []
manifest = root / ".codex-plugin" / "plugin.json"
NON_CAPABILITY_SKILLS = {
    "corpus-11-routing",
    "corpus-context-library",
    "explore-first",
    "fiction-external-generation",
    "provenance-audit",
}


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
        if not isinstance(policy, dict) or not isinstance(policy.get("products"), list):
            errors.append(f"{skill.name}: agents/openai.yaml missing policy.products list")
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
        heading = re.search(
            r"^#\s+(CAP\.[A-Z0-9_]+)\s+—\s+provenance opérationnelle$",
            capability_md.read_text(encoding="utf-8"),
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
