"""Noyau déterministe et sans dépendance du projet Corpus Open Model.

Ce module ne prétend pas comprendre le texte. Il rend les carriers, leur
intégrité et un premier routage inspectables avant d'ajouter un adaptateur de
langage ou un mécanisme d'apprentissage.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import hashlib
import json
from typing import Iterable


EXCLUDED_PARTS = {".git", ".venv", "node_modules", "__pycache__", "artifacts", "output"}
SURFACE_PREFIXES = (
    ("corpus-11-tools/archives/", "archive"),
    ("corpus-11-tools/", "product"),
    ("research/", "research"),
    ("transfers/", "transfer"),
)
ROUTING_SIGNALS = {
    "causal": "causal-identification",
    "cause": "causal-identification",
    "source": "source-environment-assessment",
    "provenance": "provenance-audit",
    "robust": "protocol-robustness",
    "coût": "hidden-cost-assessment",
    "cout": "hidden-cost-assessment",
    "révision": "identify-reversal-condition",
    "revision": "identify-reversal-condition",
}


@dataclass(frozen=True)
class Material:
    path: str
    surface: str
    sha256: str
    size: int


def surface_for(path: str) -> str:
    for prefix, surface in SURFACE_PREFIXES:
        if path.startswith(prefix):
            return surface
    return "workspace"


def material_paths(root: Path) -> Iterable[Path]:
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if not path.is_file() or any(part in EXCLUDED_PARTS or part.startswith(".venv") for part in relative.parts):
            continue
        yield path


def build_snapshot(root: Path) -> dict:
    """Retourne un instantané reproductible des fichiers Corpus observables."""
    materials = []
    for path in material_paths(root):
        payload = path.read_bytes()
        rel = path.relative_to(root).as_posix()
        materials.append(Material(rel, surface_for(rel), hashlib.sha256(payload).hexdigest(), len(payload)))
    canonical = [{"path": item.path, "surface": item.surface, "sha256": item.sha256, "size": item.size} for item in materials]
    fingerprint = hashlib.sha256(json.dumps(canonical, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
    return {"schema_version": 1, "material_count": len(canonical), "fingerprint": fingerprint, "materials": canonical}


def declared_skills(root: Path) -> set[str]:
    inventory = json.loads((root / "corpus-11-tools/docs/inventory.json").read_text())
    return set(inventory["skills"])


def route(query: str, root: Path) -> dict:
    """Route des signaux déclarés, sans inférence implicite ni exécution."""
    normalized = query.casefold()
    skills = declared_skills(root)
    selected = []
    for signal, capability in ROUTING_SIGNALS.items():
        if signal in normalized and capability in skills and capability not in selected:
            selected.append(capability)
    return {
        "schema_version": 1,
        "query": query,
        "recommended_capabilities": selected,
        "scope_limit": "Recommandations déterministes à partir de signaux explicites ; aucune compréhension ou validation du monde n'est inférée.",
        "reversal_condition": "Réviser le routage si les signaux explicites ne correspondent pas au besoin observé ou si l'inventaire déclaré change.",
        "execution": "none",
    }
