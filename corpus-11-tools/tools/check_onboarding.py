#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]

def fail(message: str) -> None:
    print("FAIL:", message)
    raise SystemExit(1)

required_files = [
    "ONBOARDING.md",
    "AI_START_HERE.md",
    "CARTE_DES_PROJETS.md",
    "PILOTAGE_CORPUS.md",
    "AUTONOMIE_INTEGRATION_LOCALE.md",
    "projets/corpus-local-llm-migration/README.md",
    "projets/corpus-local-llm-migration/CONTEXTE_LOCAL.md",
    "projets/corpus-local-llm-migration/ETAT_LOCAL_ACTUEL.md",
    "projets/corpus-local-llm-migration/BLOCKER_RESILIENCE.md",
    "corpus-11-tools/README.md",
    "corpus-11-tools/AGENTS.md",
    "tools/corpus-gpt/README.md",
    "tools/corpus-gpt/CONTRACT.md",
    "tools/corpus-gpt/OPERATIONS.md",
]
for rel in required_files:
    if not (ROOT / rel).is_file():
        fail("missing onboarding source: " + rel)

root_readme = (ROOT / "README.md").read_text()
if "ONBOARDING.md" not in root_readme or "AI_START_HERE.md" not in root_readme:
    fail("root README does not expose both onboarding paths")

ai = (ROOT / "AI_START_HERE.md").read_text().lower()
for term in [
    "corpus local",
    "corpus 11 tools",
    "research/",
    "opencode",
    "qwen",
    "mcp corpus gpt",
    "écrit → testé → intégré → installé → lancé → observé en usage",
    "blocker_resilience.md",
]:
    if term not in ai:
        fail("AI bootstrap missing concept: " + term)

human = (ROOT / "ONBOARDING.md").read_text().lower()
for term in ["corpus local", "corpus 11 tools", "applications corpus", "recherche", "sources de vérité"]:
    if term not in human:
        fail("human onboarding missing concept: " + term)

technical = (ROOT / "corpus-11-tools/README.md").read_text()
state = technical.split("## État actuel", 1)[1].split("## ", 1)[0]
if "v1.6.2" not in state or "release publiée" not in state:
    fail("Corpus 11 Tools current state does not identify published v1.6.2")
for stale in [
    "release locale préparée : **v1.6.2**, non taguée",
    "dernière release publiée : **v1.6.1**",
    "version installée dans l’environnement de départ : **v1.5.0**",
]:
    if stale in state:
        fail("stale release claim in current-state section: " + stale)

# Local Markdown links from the two bootstrap files must resolve.
for rel in ["ONBOARDING.md", "AI_START_HERE.md"]:
    p = ROOT / rel
    text = p.read_text()
    for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
        if "://" in target or target.startswith("#"):
            continue
        if not (p.parent / target.split("#", 1)[0]).exists():
            fail(f"broken onboarding link in {rel}: {target}")

print("PASS: human and newborn-AI onboarding entrypoints are coherent")
