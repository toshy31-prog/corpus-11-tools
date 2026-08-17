#!/usr/bin/env python3
"""Démonstration autonome de la CLI, sans réseau ni dépendance tierce."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).parents[1]
ENTRY = ROOT / "cct.py"
BASE = datetime(2035, 1, 1, tzinfo=timezone.utc)


def stamp(minute: int) -> str:
    return (BASE + timedelta(minutes=minute)).isoformat().replace("+00:00", "Z")


def call(data: Path, minute: int, *parts: str, expected: int = 0) -> dict:
    command = [
        sys.executable,
        str(ENTRY),
        "--data-dir",
        str(data),
        "--at",
        stamp(minute),
        *parts,
    ]
    completed = subprocess.run(command, text=True, capture_output=True, check=False)
    if completed.returncode != expected:
        raise RuntimeError(completed.stderr or completed.stdout)
    return json.loads(completed.stdout if expected == 0 else completed.stderr)


def main() -> int:
    data = Path(tempfile.mkdtemp(prefix="cct-ops-demo-"))
    call(data, 0, "init", "--bootstrap-id", "registry", "--bootstrap-name", "Registre")
    actors = [
        ("alice", "Alice", "appellant", "proposer"),
        ("decider", "Collège", "decision_maker"),
        ("mandator", "Octroi", "mandate_granter"),
        ("delegate", "Délégué", "mandate_holder"),
        ("crisis-board", "Contrôle de crise", "emergency_granter"),
        ("crisis-team", "Équipe de crise", "emergency_holder"),
        ("reviewer", "Recours", "appeal_reviewer"),
    ]
    minute = 1
    for actor_id, name, *roles in actors:
        call(
            data,
            minute,
            "actor-add",
            "--by",
            "registry",
            "--id",
            actor_id,
            "--name",
            name,
            "--roles",
            *roles,
        )
        minute += 1
    proposal = call(
        data,
        minute,
        "proposal-create",
        "--by",
        "alice",
        "--title",
        "Continuité de l'eau",
        "--body",
        "Réparer le puits et ouvrir une réserve bornée.",
        "--kind",
        "mandate_authorization",
        "--requested-holder",
        "delegate",
        "--authorized-scopes",
        "Commander les pièces du puits",
        "--not-after",
        stamp(minute + 30),
    )
    minute += 1
    decision = call(
        data,
        minute,
        "decision-record",
        "--by",
        "decider",
        "--proposal",
        proposal["id"],
        "--outcome",
        "approve",
        "--reasons",
        "Besoin vital, périmètre et échéance établis.",
    )
    minute += 1
    mandate = call(
        data,
        minute,
        "mandate-grant",
        "--by",
        "mandator",
        "--holder",
        "delegate",
        "--decision",
        decision["id"],
        "--scope",
        "Commander les pièces du puits",
        "--expires-at",
        stamp(minute + 20),
    )
    minute += 1
    call(
        data,
        minute,
        "mandate-exercise",
        "--by",
        "delegate",
        "--mandate",
        mandate["id"],
        "--action",
        "Commande locale n°1",
    )
    minute += 1
    power_proposal = call(
        data,
        minute,
        "proposal-create",
        "--by",
        "alice",
        "--title",
        "Pouvoir temporaire pour la réserve",
        "--body",
        "Autoriser deux capacités pendant une fenêtre très courte.",
        "--kind",
        "temporary_power_authorization",
        "--requested-holder",
        "crisis-team",
        "--authorized-scopes",
        "open_reserve",
        "reroute_water",
        "--not-after",
        stamp(minute + 10),
    )
    minute += 1
    power_decision = call(
        data,
        minute,
        "decision-record",
        "--by",
        "decider",
        "--proposal",
        power_proposal["id"],
        "--outcome",
        "approve",
        "--reasons",
        "Capacités fermées et échéance courte.",
    )
    minute += 1
    power = call(
        data,
        minute,
        "power-grant",
        "--by",
        "crisis-board",
        "--holder",
        "crisis-team",
        "--decision",
        power_decision["id"],
        "--label",
        "Réserve d'eau temporaire",
        "--capabilities",
        "open_reserve",
        "reroute_water",
        "--expires-at",
        stamp(minute + 3),
    )
    minute += 1
    call(
        data,
        minute,
        "power-exercise",
        "--by",
        "crisis-team",
        "--power",
        power["id"],
        "--capability",
        "open_reserve",
        "--action",
        "Ouvrir la réserve A",
    )
    refusal = call(
        data,
        minute + 3,
        "power-exercise",
        "--by",
        "crisis-team",
        "--power",
        power["id"],
        "--capability",
        "open_reserve",
        "--action",
        "Tentative après échéance",
        expected=2,
    )
    appeal = call(
        data,
        minute + 4,
        "appeal-open",
        "--by",
        "alice",
        "--decision",
        power_decision["id"],
        "--grounds",
        "Vérifier la proportionnalité",
        "--suspensive",
    )
    call(
        data,
        minute + 5,
        "appeal-resolve",
        "--by",
        "reviewer",
        "--appeal",
        appeal["id"],
        "--resolution",
        "confirm",
        "--reasons",
        "Contrôle contradictoire achevé",
    )
    audit = call(data, minute + 6, "audit")
    export_path = data / "export.json"
    exported = call(data, minute + 7, "export", "--output", str(export_path))
    print(
        json.dumps(
            {
                "prototype": True,
                "deployment_status": "non_deploye",
                "data_dir": str(data),
                "proposal_id": proposal["id"],
                "decision_id": decision["id"],
                "mandate_id": mandate["id"],
                "temporary_power_id": power["id"],
                "post_expiry_refusal": refusal["error"],
                "audit_ok": audit["ok"],
                "export": exported,
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
