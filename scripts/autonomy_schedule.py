#!/usr/bin/env python3
"""Plan Corpus heartbeat changes; never write app settings or start a process."""

import argparse
from datetime import datetime, timedelta, timezone
import json
import hashlib
from pathlib import Path
import sqlite3
import tomllib


AUTOMATION_ID = "am-lioration-continue-du-cct"
THREAD_ID = "01a0b9e4-f51c-7991-b19c-3b6fa492cc0e"
ACTIVE_RULE = "RRULE:FREQ=MINUTELY;INTERVAL=30"
MAX_WAIT = timedelta(hours=6)


def authority_digest(automation):
    fields = ("id", "kind", "name", "prompt", "target_thread_id", "model",
              "reasoning_effort", "notification_policy")
    data = {key: automation.get(key) for key in fields}
    return hashlib.sha256(json.dumps(data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def update_request(automation, rule, status):
    for key in ("name", "prompt"):
        if not isinstance(automation.get(key), str) or not automation[key].strip():
            raise ValueError(f"Champ {key} manquant ; ne pas effacer le mandat.")
    request = {"mode": "update", "id": AUTOMATION_ID, "kind": "heartbeat",
               "name": automation["name"], "prompt": automation["prompt"],
               "status": status, "rrule": rule, "targetThreadId": THREAD_ID}
    if "notification_policy" in automation:
        request["notificationPolicy"] = automation["notification_policy"]
    return request


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError("Une date ISO avec fuseau horaire est requise.")
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None or result.utcoffset() is None:
        raise ValueError("Une date sans fuseau horaire est ambiguë.")
    return result.astimezone(timezone.utc)


def plan(state, automation, now, refusal=None):
    if (automation.get("id") != AUTOMATION_ID
            or automation.get("kind") != "heartbeat"
            or automation.get("target_thread_id") != THREAD_ID):
        raise ValueError("Cette commande concerne uniquement le heartbeat Corpus existant.")
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("L'heure actuelle doit inclure un fuseau horaire.")
    now = now.astimezone(timezone.utc)
    guard = {"authority_sha256": authority_digest(automation),
             "desired_status": automation.get("status"),
             "desired_rrule": automation.get("rrule")}
    if automation.get("status") == "PAUSED":
        return {**guard, "action": "none", "mode": "paused",
                "schedule_state": "unverified", "reason": "Pause conservée ; aucune réactivation implicite."}
    if automation.get("status") != "ACTIVE":
        raise ValueError("Statut d'automatisation non pris en charge.")
    # The app's heartbeat update tool cannot preserve explicit model overrides.
    if automation.get("model") or automation.get("reasoning_effort"):
        raise ValueError("Conserver le réglage modèle explicite exige un autre examen.")
    if refusal is not None:
        if not isinstance(refusal, dict) or refusal.get("isError") is not True:
            raise ValueError("Conserver la réponse d'erreur native, sans inventer un refus.")
        if not refusal.get("content"):
            raise ValueError("La raison du refus doit rester consultable.")
        # Stopping future calls is a safer alternative, never an indirect retry.
        return {**guard, "action": "update", "mode": "paused",
                "desired_status": "PAUSED", "schedule_state": "refused",
                "changed_fields": ["status"],
                "reason": "Report refusé : demander la pause de protection native, puis vérifier et signaler.",
                "automation_update": update_request(automation, automation["rrule"], "PAUSED")}
    mode = state.get("mode")
    if mode not in {"execution", "exploration", "attente_datee"}:
        raise ValueError("Mode inconnu : réexaminer le point de reprise, sans désactiver la tâche.")
    rule = ACTIVE_RULE
    not_before = None
    reason = "Cadence de travail : trente minutes."
    if mode == "attente_datee":
        due = timestamp(state.get("next_review_at"))
        explored = timestamp((state.get("last_exploration") or {}).get("at"))
        if explored > now or due <= explored or due - explored > MAX_WAIT:
            raise ValueError("Attente incohérente ou supérieure à six heures depuis l'exploration.")
        if due > now:
            # Round upwards: a heartbeat must not be scheduled before the deadline.
            start = due.replace(microsecond=0)
            if due.microsecond:
                start += timedelta(seconds=1)
            not_before = start.isoformat()
            rule = f"DTSTART:{start:%Y%m%dT%H%M%SZ}\n{ACTIVE_RULE}"
            reason = "Aucun réveil intermédiaire ; reprise toutes les trente minutes à l'échéance."
        else:
            mode = "exploration"
            reason = "Échéance atteinte : explorer maintenant, puis reprendre la cadence de travail."
    result = {**guard, "action": "none", "mode": mode, "reason": reason,
              "schedule_state": "requested", "changed_fields": [],
              "not_before": not_before, "desired_rrule": rule}
    if automation.get("rrule", "").strip() == rule:
        return result
    result.update(action="update", changed_fields=["rrule"],
                  automation_update=update_request(automation, rule, "ACTIVE"))
    return result


def verify_runtime(database, proposal):
    """Read just this automation's scheduler row; never mutate the database."""
    uri = Path(database).resolve().as_uri() + "?mode=ro"
    connection = sqlite3.connect(uri, uri=True)
    connection.row_factory = sqlite3.Row
    try:
        row = connection.execute(
            "SELECT id,kind,name,prompt,status,target_thread_id,rrule,next_run_at,"
            "model,reasoning_effort,notification_policy FROM automations WHERE id=?",
            (AUTOMATION_ID,),
        ).fetchone()
    finally:
        connection.close()
    if row is None:
        return {"verified": False, "reason": "Automatisation absente du planificateur."}
    expected = proposal.get("not_before")
    expected_ms = int(timestamp(expected).timestamp() * 1000) if expected else None
    paused = proposal["desired_status"] == "PAUSED"
    valid = (row["kind"] == "heartbeat" and row["status"] == proposal["desired_status"]
             and row["target_thread_id"] == THREAD_ID
             and row["rrule"].strip() == proposal["desired_rrule"]
             and authority_digest(dict(row)) == proposal["authority_sha256"]
             and ((paused and row["next_run_at"] is None)
                  or (not paused and row["next_run_at"] is not None
                      and (expected_ms is None or row["next_run_at"] == expected_ms))))
    next_run = (datetime.fromtimestamp(row["next_run_at"] / 1000, timezone.utc).isoformat()
                if row["next_run_at"] is not None else None)
    return {"verified": valid, "next_run_utc": next_run,
            "schedule_state": ("paused" if paused else "scheduled") if valid else "unverified"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", type=Path, required=True)
    parser.add_argument("--automation", type=Path, required=True)
    parser.add_argument("--scheduler-db", type=Path,
                        help="Lecture facultative du prochain réveil réellement enregistré.")
    parser.add_argument("--now", help="Date ISO avec fuseau, pour un contrôle reproductible.")
    parser.add_argument("--refusal", type=Path, help="Réponse native refusée : proposer uniquement une pause.")
    parser.add_argument("--verify-plan", type=Path,
                        help="Vérifier le plan sauvegardé avant appel, y compris le mandat conservé.")
    args = parser.parse_args()
    try:
        state = json.loads(args.state.read_text())
        automation = tomllib.loads(args.automation.read_text())
        if args.verify_plan and not args.scheduler_db:
            raise ValueError("--verify-plan exige --scheduler-db.")
        proposal = (json.loads(args.verify_plan.read_text()) if args.verify_plan else
                    plan(state, automation, timestamp(args.now) if args.now else datetime.now(timezone.utc),
                         json.loads(args.refusal.read_text()) if args.refusal else None))
        if args.scheduler_db:
            proposal["runtime"] = verify_runtime(args.scheduler_db, proposal)
            proposal["schedule_state"] = proposal["runtime"]["schedule_state"] if "schedule_state" in proposal["runtime"] else "unverified"
        print(json.dumps(proposal, ensure_ascii=False, indent=2))
        return 1 if args.scheduler_db and not proposal["runtime"]["verified"] else 0
    except (ValueError, TypeError, KeyError, AttributeError, OSError, sqlite3.Error) as exc:
        print(json.dumps({"action": "error", "error": str(exc)}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
