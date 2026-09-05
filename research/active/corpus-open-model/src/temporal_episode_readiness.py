"""Vérifier si le registre d'épisodes réels est assez grand pour le benchmark v1.

Ce contrôle est délibérément non-mutant : il ne gèle pas encore de partition,
n'entraîne aucun modèle et ne lit aucun contenu de matériau. Le gel sera une
commande distincte, demandant une revue humaine, lorsque le seuil est atteint.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Iterable


PROJECT = Path(__file__).resolve().parents[1]
DEFAULT_EVENTS = PROJECT / "artifacts" / "ecosystem-episodes-v0.jsonl"
MINIMUM_ELIGIBLE_EPISODES = 30
EXCLUDED_PREFIXES = (
    "research/active/corpus-open-model/",
    ".pytest_cache/",
    "research/active/model-response-comparison-harness/runtime/",
    "research/active/model-response-comparison-harness/native_surface/runtime/",
)


def _admitted_path(path: str) -> bool:
    return bool(path) and not path.startswith(EXCLUDED_PREFIXES)


def _paths(episode: dict) -> Iterable[str]:
    for change in episode.get("materials", {}).get("added", []):
        yield change.get("path", "")
    for change in episode.get("materials", {}).get("removed", []):
        yield change.get("path", "")
    for change in episode.get("materials", {}).get("changed", []):
        yield change.get("before", {}).get("path", "")
        yield change.get("after", {}).get("path", "")


def is_eligible(episode: dict) -> bool:
    """Un épisode est admis s'il comporte au moins un changement hors runtime/cache."""
    paths = [path for path in _paths(episode) if path]
    if not paths:
        return bool(episode.get("relations", {}).get("added") or episode.get("relations", {}).get("removed") or episode.get("relations", {}).get("changed"))
    return any(_admitted_path(path) for path in paths)


def surface_signature(episode: dict) -> str:
    """Résumé structural destiné à une future cible, sans texte ni signification inférée."""
    surfaces: set[str] = set()
    materials = episode.get("materials", {})
    for row in materials.get("added", []) + materials.get("removed", []):
        if _admitted_path(row.get("path", "")) and row.get("surface"):
            surfaces.add(row["surface"])
    for row in materials.get("changed", []):
        for side in ("before", "after"):
            if _admitted_path(row.get(side, {}).get("path", "")) and row.get(side, {}).get("surface"):
                surfaces.add(row[side]["surface"])
    relation_change = any(episode.get("relations", {}).get(key) for key in ("added", "removed", "changed"))
    return "+".join(sorted(surfaces) + (["relations"] if relation_change else [])) or "structural_empty"


def load_episodes(events: Path) -> list[dict]:
    if not events.exists():
        return []
    episodes = []
    for number, line in enumerate(events.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            episodes.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(f"registre illisible à la ligne {number}: {error.msg}") from error
    return episodes


def readiness(events: Path = DEFAULT_EVENTS) -> dict:
    episodes = load_episodes(events)
    eligible = [episode for episode in episodes if is_eligible(episode)]
    signatures = Counter(surface_signature(episode) for episode in eligible)
    remaining = max(0, MINIMUM_ELIGIBLE_EPISODES - len(eligible))
    return {
        "benchmark": "temporal-episode-v1",
        "events": str(events),
        "episodes_recorded": len(episodes),
        "eligible_episodes": len(eligible),
        "excluded_episodes": len(episodes) - len(eligible),
        "minimum_eligible_episodes": MINIMUM_ELIGIBLE_EPISODES,
        "episodes_remaining_before_freeze": remaining,
        "signature_counts": dict(sorted(signatures.items())),
        "status": "ready_for_human_review_to_freeze_partition" if remaining == 0 else "not_ready_collect_real_episodes",
        "next_action": "Human review may freeze the chronological partition; training remains disabled." if remaining == 0 else "Continue passive observation of real Corpus changes; do not train yet.",
        "authorization": {
            "automatic_training": False,
            "automatic_product_write": False,
            "automatic_partition_freeze": False,
            "claim": "Readiness only; not a model result or evidence of emergence.",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--events", type=Path, default=DEFAULT_EVENTS)
    args = parser.parse_args()
    print(json.dumps(readiness(args.events.resolve()), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
