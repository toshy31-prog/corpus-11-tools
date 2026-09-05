"""Conserver des épisodes structurels réels du milieu Corpus.

Un épisode est une différence vérifiable entre deux états observés : fichiers,
surfaces et relations explicites avant/après. Le registre ne conserve jamais le
contenu brut des fichiers, n'entraîne aucun modèle et n'écrit pas dans Corpus.
Il constitue seulement le jeu d'expériences local nécessaire à une future
comparaison honnête entre une règle simple et un noyau appris.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from typing import Iterable

from enriched_relation_graph import enrich
from kernel import build_snapshot


ROOT = Path(__file__).resolve().parents[4]
PROJECT = Path(__file__).resolve().parents[1]
ARTIFACTS = PROJECT / "artifacts"
STATE_NAME = "ecosystem-episode-state-v0.json"
EVENTS_NAME = "ecosystem-episodes-v0.jsonl"
DEFAULT_EXCLUDED_PREFIXES = ("research/active/corpus-open-model/",)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _material_record(row: dict) -> dict:
    """Retourne seulement des métadonnées structurelles, jamais le contenu."""
    return {
        "path": row["path"],
        "surface": row["surface"],
        "sha256": row["sha256"],
        "size": row["size"],
        "suffix": Path(row["path"]).suffix.casefold(),
    }


def _edge_record(edge: dict) -> dict:
    """Normalise une relation déclarée pour comparaison stable."""
    return {
        "from": edge["from"],
        "type": edge["type"],
        "to": edge["to"],
        "source": edge.get("source"),
        "channel": edge.get("channel"),
        "status": edge.get("status"),
    }


def _included(path: str, excluded_prefixes: Iterable[str]) -> bool:
    return not any(path.startswith(prefix) for prefix in excluded_prefixes)


def _edge_is_included(edge: dict, excluded_prefixes: Iterable[str]) -> bool:
    for endpoint in (edge.get("from", ""), edge.get("to", ""), edge.get("source", "")):
        if not isinstance(endpoint, str):
            continue
        if endpoint.startswith("material:"):
            endpoint = endpoint.removeprefix("material:")
        if not _included(endpoint, excluded_prefixes):
            return False
    return True


def _canonical_hash(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


def build_observation(root: Path = ROOT, excluded_prefixes: Iterable[str] = DEFAULT_EXCLUDED_PREFIXES) -> dict:
    """Construit un état structurel filtré, sans retenir le contenu des fichiers."""
    excluded_prefixes = tuple(excluded_prefixes)
    snapshot, graph = build_snapshot(root), enrich(root)
    all_materials = {_material_record(row)["path"]: _material_record(row) for row in snapshot["materials"]}
    materials = {path: row for path, row in all_materials.items() if _included(path, excluded_prefixes)}
    all_edges = {_canonical_hash(_edge_record(edge)): _edge_record(edge) for edge in graph["edges"]}
    edges = {key: row for key, row in all_edges.items() if _edge_is_included(row, excluded_prefixes)}
    structure = {"materials": materials, "relations": edges}
    return {
        "schema_version": 1,
        "ledger": "EcosystemEpisodeLedger v0",
        "observed_at": _now(),
        "structural_fingerprint": _canonical_hash(structure),
        "materials": materials,
        "relations": edges,
        "observation_boundary": {
            "content_retention": "none",
            "excluded_prefixes": list(excluded_prefixes),
            "automatic_training": False,
            "automatic_product_write": False,
            "automatic_semantic_interpretation": False,
            "claim": "Structural before/after facts and explicit relations only; no raw text or inferred meaning.",
        },
        "filtered_counts": {
            "materials": {"included": len(materials), "excluded": len(all_materials) - len(materials)},
            "relations": {"included": len(edges), "excluded": len(all_edges) - len(edges)},
        },
    }


def _changes(before: dict, after: dict, key: str) -> tuple[list[str], list[str], list[str]]:
    old, new = before[key], after[key]
    added = sorted(new.keys() - old.keys())
    removed = sorted(old.keys() - new.keys())
    changed = sorted(item for item in old.keys() & new.keys() if old[item] != new[item])
    return added, removed, changed


def difference(before: dict | None, after: dict) -> dict:
    if before is None:
        return {"kind": "initial_observation", "materials": {"added": len(after["materials"]), "removed": 0, "changed": 0}, "relations": {"added": len(after["relations"]), "removed": 0, "changed": 0}}
    material_added, material_removed, material_changed = _changes(before, after, "materials")
    relation_added, relation_removed, relation_changed = _changes(before, after, "relations")
    return {
        "kind": "transition",
        "materials": {"added": len(material_added), "removed": len(material_removed), "changed": len(material_changed)},
        "relations": {"added": len(relation_added), "removed": len(relation_removed), "changed": len(relation_changed)},
    }


def episode_from(before: dict, after: dict) -> dict:
    material_added, material_removed, material_changed = _changes(before, after, "materials")
    relation_added, relation_removed, relation_changed = _changes(before, after, "relations")
    return {
        "schema_version": 1,
        "episode_id": _canonical_hash({"before": before["structural_fingerprint"], "after": after["structural_fingerprint"]}),
        "observed_at": after["observed_at"],
        "before_structural_fingerprint": before["structural_fingerprint"],
        "after_structural_fingerprint": after["structural_fingerprint"],
        "difference": difference(before, after),
        "materials": {
            "added": [after["materials"][path] for path in material_added],
            "removed": [before["materials"][path] for path in material_removed],
            "changed": [{"before": before["materials"][path], "after": after["materials"][path]} for path in material_changed],
        },
        "relations": {
            "added": [after["relations"][key] for key in relation_added],
            "removed": [before["relations"][key] for key in relation_removed],
            "changed": [{"before": before["relations"][key], "after": after["relations"][key]} for key in relation_changed],
        },
        "authorization": after["observation_boundary"],
        "scope_limit": "An episode records only a structural difference. It is not a learning event, causal explanation, semantic conclusion, or evidence of emergence.",
    }


def _recorded_episode_ids(events_path: Path) -> set[str]:
    """Lit les identifiants déjà écrits afin de préserver l'append-only sans doublon."""
    if not events_path.exists():
        return set()
    episode_ids = set()
    for number, line in enumerate(events_path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            episode_ids.add(json.loads(line)["episode_id"])
        except (KeyError, json.JSONDecodeError) as error:
            raise ValueError(f"registre d'épisodes illisible à la ligne {number}") from error
    return episode_ids


def record(root: Path = ROOT, artifacts: Path = ARTIFACTS, excluded_prefixes: Iterable[str] = DEFAULT_EXCLUDED_PREFIXES) -> dict:
    """Met à jour l'état local et ajoute un épisode seulement si le milieu change."""
    artifacts.mkdir(parents=True, exist_ok=True)
    state_path, events_path = artifacts / STATE_NAME, artifacts / EVENTS_NAME
    before = json.loads(state_path.read_text()) if state_path.exists() else None
    after = build_observation(root, excluded_prefixes)
    state_path.write_text(json.dumps(after, ensure_ascii=False, indent=2) + "\n")
    if before is None:
        return {"ledger": "ecosystem-episode-v0", "status": "baseline_recorded", "state": str(state_path), "difference": difference(None, after), "authorization": after["observation_boundary"]}
    if before["structural_fingerprint"] == after["structural_fingerprint"]:
        return {"ledger": "ecosystem-episode-v0", "status": "no_included_change", "state": str(state_path), "difference": difference(before, after), "authorization": after["observation_boundary"]}
    episode = episode_from(before, after)
    if episode["episode_id"] in _recorded_episode_ids(events_path):
        return {
            "ledger": "ecosystem-episode-v0",
            "status": "duplicate_episode_ignored",
            "episode": episode,
            "state": str(state_path),
            "events": str(events_path),
            "authorization": after["observation_boundary"],
        }
    with events_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(episode, ensure_ascii=False) + "\n")
    return {"ledger": "ecosystem-episode-v0", "status": "episode_recorded", "episode": episode, "state": str(state_path), "events": str(events_path), "authorization": after["observation_boundary"]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT, help="racine Corpus à observer")
    parser.add_argument("--artifacts", type=Path, default=ARTIFACTS, help="répertoire local des états et épisodes")
    args = parser.parse_args()
    print(json.dumps(record(args.root.resolve(), args.artifacts.resolve()), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
