#!/usr/bin/env python3
from pathlib import Path
import json, re, sys

root = Path(__file__).resolve().parents[1]
errors = []
manifest = root / ".codex-plugin" / "plugin.json"
if not manifest.exists():
    errors.append("missing .codex-plugin/plugin.json")
else:
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
        for k in ("name","version","description","skills"):
            if not data.get(k):
                errors.append(f"manifest missing {k}")
    except Exception as e:
        errors.append(f"invalid manifest JSON: {e}")

names = []
for skill in sorted((root/"skills").iterdir()):
    if not skill.is_dir():
        continue
    sm = skill/"SKILL.md"
    if not sm.exists():
        errors.append(f"{skill.name}: missing SKILL.md")
        continue
    text = sm.read_text(encoding="utf-8")
    fm = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not fm:
        errors.append(f"{skill.name}: missing YAML front matter")
        continue
    name = re.search(r"^name:\s*(.+)$", fm.group(1), re.M)
    desc = re.search(r"^description:\s*(.+)$", fm.group(1), re.M)
    if not name or not desc:
        errors.append(f"{skill.name}: missing name/description")
        continue
    n = name.group(1).strip()
    d = desc.group(1).strip()
    names.append(n)
    if len(d) > 1024:
        errors.append(f"{skill.name}: description > 1024 chars")
    if len("corpus-11-tools:"+n) > 64:
        errors.append(f"{skill.name}: combined identity > 64 chars")
    agent = skill/"agents"/"openai.yaml"
    if not agent.exists():
        errors.append(f"{skill.name}: missing agents/openai.yaml")
if len(names) != len(set(names)):
    errors.append("duplicate skill names")

if errors:
    print("FAIL")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print(f"PASS: {len(names)} skills validated")
