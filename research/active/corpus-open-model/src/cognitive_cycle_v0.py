"""Cycle local borné : observer → intégrer → proposer à l'humain.

Ce programme n'entraîne aucun modèle et ne modifie aucun matériau de Corpus.
Il transforme seulement une transition réellement observée en proposition
structurelle, conservée dans les artefacts locaux pour revue humaine.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from corpus_state_kernel import advance as advance_kernel
from temporal_relation_ledger import record as record_observation


PROJECT = Path(__file__).resolve().parents[1]
QUEUE = PROJECT / "artifacts" / "cognitive-proposal-queue-v0.jsonl"
RUNTIME_PREFIX = "research/active/corpus-open-model/"


def proposal_for(event: dict, kernel_transition: dict) -> dict:
    difference = event["difference"]
    materials, relations = difference["materials"], difference["relations"]
    key = json.dumps({"before": event["before_fingerprint"], "after": event["after_fingerprint"]}, sort_keys=True)
    proposal_id = hashlib.sha256(key.encode()).hexdigest()
    parts = []
    if materials["added"]: parts.append(f"{materials['added']} matériau(x) ajouté(s)")
    if materials["changed"]: parts.append(f"{materials['changed']} matériau(x) modifié(s)")
    if materials["removed"]: parts.append(f"{materials['removed']} matériau(x) retiré(s)")
    if relations["added"]: parts.append(f"{relations['added']} relation(s) ajoutée(s)")
    if relations["removed"]: parts.append(f"{relations['removed']} relation(s) retirée(s)")
    return {
        "schema_version": 1,
        "proposal_id": proposal_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending_human_review",
        "trigger": {"before_fingerprint": event["before_fingerprint"], "after_fingerprint": event["after_fingerprint"], "difference": difference},
        "kernel_transition": kernel_transition["transition"],
        "question": "Une transition de Corpus a été observée : faut-il la qualifier, relier des matériaux nouvellement présents, ou l'exclure de tout futur entraînement ?",
        "observation": ", ".join(parts) or "Transition signalée sans compte exploitable.",
        "allowed_human_decisions": ["qualify", "defer", "exclude_from_learning"],
        "authorization_boundary": {
            "automatic_training": False,
            "automatic_product_write": False,
            "automatic_semantic_interpretation": False,
            "claim": "A structural review proposal, not a conclusion, intention, or autonomous action.",
        },
    }


def seen(proposal_id: str) -> bool:
    if not QUEUE.exists():
        return False
    return any(json.loads(line).get("proposal_id") == proposal_id for line in QUEUE.read_text().splitlines() if line.strip())


def is_runtime_only_change(event: dict) -> bool:
    paths = [path for group in event.get("material_paths", {}).values() for path in group]
    return bool(paths) and all(path.startswith(RUNTIME_PREFIX) for path in paths) and not any(event["difference"]["relations"].values())


def has_observable_change(event: dict) -> bool:
    difference = event["difference"]
    counts = (*difference["materials"].values(), *difference["relations"].values())
    return event["before_fingerprint"] != event["after_fingerprint"] and any(counts)


def run() -> dict:
    event = record_observation()
    if event["difference"]["kind"] != "transition" or not has_observable_change(event):
        return {"cycle": "cognitive-v0", "status": "observed_no_new_transition", "observation": event, "authorization": {"automatic_training": False, "automatic_product_write": False}}
    if is_runtime_only_change(event):
        return {"cycle": "cognitive-v0", "status": "ignored_self_runtime_change", "observation": event, "kernel_synchronization": advance_kernel(), "scope_limit": "Changes confined to the observer/runtime project are not treated as Corpus events by this cycle.", "authorization": {"automatic_training": False, "automatic_product_write": False}}
    kernel_transition = advance_kernel()
    proposal = proposal_for(event, kernel_transition)
    if seen(proposal["proposal_id"]):
        status = "transition_already_queued"
    else:
        QUEUE.parent.mkdir(exist_ok=True)
        with QUEUE.open("a") as handle:
            handle.write(json.dumps(proposal, ensure_ascii=False) + "\n")
        status = "proposal_queued_for_human_review"
    return {"cycle": "cognitive-v0", "status": status, "proposal": proposal, "authorization": proposal["authorization_boundary"]}


if __name__ == "__main__":
    print(json.dumps(run(), ensure_ascii=False, indent=2))
