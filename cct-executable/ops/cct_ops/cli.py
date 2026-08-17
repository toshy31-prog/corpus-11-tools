"""Interface en ligne de commande JSON du prototype CCT Ops."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from .core import CCTError, InstitutionalService, ROLES
from .store import EventStore, StoreError, normalize_time


def emit(value: Any, stream: Any = sys.stdout) -> None:
    json.dump(value, stream, ensure_ascii=False, sort_keys=True, indent=2)
    stream.write("\n")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(
        prog="cct-ops",
        description="PROTOTYPE NON DÉPLOYÉ — opérations institutionnelles CCT hors ligne",
    )
    root.add_argument(
        "--data-dir",
        default="./cct-data",
        help="répertoire local contenant state.json et events.jsonl",
    )
    root.add_argument(
        "--at",
        help="horodatage ISO-8601 explicite (tests/démonstrations); sinon heure UTC courante",
    )
    commands = root.add_subparsers(dest="command", required=True)

    init = commands.add_parser("init", help="initialiser un dépôt local")
    init.add_argument("--bootstrap-id", required=True)
    init.add_argument("--bootstrap-name", required=True)

    actor = commands.add_parser("actor-add", help="enregistrer un acteur et ses rôles")
    actor.add_argument("--by", required=True)
    actor.add_argument("--id", required=True)
    actor.add_argument("--name", required=True)
    actor.add_argument("--roles", nargs="+", choices=sorted(ROLES), required=True)

    proposal = commands.add_parser("proposal-create", help="soumettre une proposition")
    proposal.add_argument("--by", required=True)
    proposal.add_argument("--title", required=True)
    proposal.add_argument("--body", required=True)
    proposal.add_argument(
        "--kind",
        choices=["policy", "mandate_authorization", "temporary_power_authorization"],
        default="policy",
    )
    proposal.add_argument("--requested-holder")
    proposal.add_argument("--authorized-scopes", nargs="+")
    proposal.add_argument("--not-after")

    decision = commands.add_parser("decision-record", help="consigner une décision motivée")
    decision.add_argument("--by", required=True)
    decision.add_argument("--proposal", required=True)
    decision.add_argument("--outcome", choices=["approve", "reject", "defer"], required=True)
    decision.add_argument("--reasons", required=True)

    mandate_grant = commands.add_parser("mandate-grant", help="octroyer un mandat à échéance")
    mandate_grant.add_argument("--by", required=True)
    mandate_grant.add_argument("--holder", required=True)
    mandate_grant.add_argument("--decision", required=True)
    mandate_grant.add_argument("--scope", required=True)
    mandate_grant.add_argument("--starts-at")
    mandate_grant.add_argument("--expires-at", required=True)

    mandate_use = commands.add_parser("mandate-exercise", help="tracer l'exercice d'un mandat")
    mandate_use.add_argument("--by", required=True)
    mandate_use.add_argument("--mandate", required=True)
    mandate_use.add_argument("--action", required=True)

    mandate_revoke = commands.add_parser("mandate-revoke", help="révoquer un mandat")
    mandate_revoke.add_argument("--by", required=True)
    mandate_revoke.add_argument("--mandate", required=True)
    mandate_revoke.add_argument("--reason", required=True)

    appeal = commands.add_parser("appeal-open", help="ouvrir un recours")
    appeal.add_argument("--by", required=True)
    appeal.add_argument("--decision", required=True)
    appeal.add_argument("--grounds", required=True)
    appeal.add_argument("--suspensive", action="store_true")

    appeal_resolve = commands.add_parser("appeal-resolve", help="résoudre un recours")
    appeal_resolve.add_argument("--by", required=True)
    appeal_resolve.add_argument("--appeal", required=True)
    appeal_resolve.add_argument("--resolution", choices=["confirm", "remand", "reverse"], required=True)
    appeal_resolve.add_argument("--reasons", required=True)

    power_grant = commands.add_parser(
        "power-grant", help="octroyer un pouvoir temporaire (maximum 168 h)"
    )
    power_grant.add_argument("--by", required=True)
    power_grant.add_argument("--holder", required=True)
    power_grant.add_argument("--decision", required=True)
    power_grant.add_argument("--label", required=True)
    power_grant.add_argument("--capabilities", nargs="+", required=True)
    power_grant.add_argument("--expires-at", required=True)

    power_use = commands.add_parser("power-exercise", help="tracer l'exercice d'un pouvoir")
    power_use.add_argument("--by", required=True)
    power_use.add_argument("--power", required=True)
    power_use.add_argument("--capability", required=True)
    power_use.add_argument("--action", required=True)

    power_revoke = commands.add_parser("power-revoke", help="éteindre un pouvoir avant terme")
    power_revoke.add_argument("--by", required=True)
    power_revoke.add_argument("--power", required=True)
    power_revoke.add_argument("--reason", required=True)

    commands.add_parser("tick", help="matérialiser activations et expirations dues")
    commands.add_parser("status", help="résumé opérationnel; matérialise d'abord les échéances")
    commands.add_parser("audit", help="intégrité, séparations, fonctions non pourvues")

    trace = commands.add_parser("trace", help="lire les dernières traces sans instantanés")
    trace.add_argument("--limit", type=int, default=20)

    show = commands.add_parser("show", help="afficher une entité")
    show.add_argument(
        "--type",
        choices=["actor", "proposal", "decision", "mandate", "appeal", "power"],
        required=True,
    )
    show.add_argument("--id", required=True)

    export = commands.add_parser("export", help="exporter état, traces et verdict d'audit")
    export.add_argument("--output", required=True)

    recover = commands.add_parser("recover", help="restaurer state.json depuis le journal valide")
    recover.add_argument("--by", required=True, help="acteur possédant le rôle auditor")
    recover.add_argument("--apply", action="store_true", help="appliquer; sinon simulation")
    return root


def run(args: argparse.Namespace) -> Any:
    store = EventStore(Path(args.data_dir))
    service = InstitutionalService(store)
    at = args.at
    if args.command == "init":
        state = service.init(args.bootstrap_id, args.bootstrap_name, at)
        return {
            "ok": True,
            "prototype": True,
            "deployment_status": "non_deploye",
            "bootstrap_actor": state["actors"][args.bootstrap_id],
        }
    if args.command == "actor-add":
        return service.add_actor(args.by, args.id, args.name, args.roles, at)
    if args.command == "proposal-create":
        return service.create_proposal(
            args.by,
            args.title,
            args.body,
            at,
            args.kind,
            args.requested_holder,
            args.authorized_scopes,
            args.not_after,
        )
    if args.command == "decision-record":
        return service.record_decision(args.by, args.proposal, args.outcome, args.reasons, at)
    if args.command == "mandate-grant":
        return service.grant_mandate(
            args.by,
            args.holder,
            args.decision,
            args.scope,
            args.expires_at,
            args.starts_at,
            at,
        )
    if args.command == "mandate-exercise":
        return service.exercise_mandate(args.by, args.mandate, args.action, at)
    if args.command == "mandate-revoke":
        return service.revoke_mandate(args.by, args.mandate, args.reason, at)
    if args.command == "appeal-open":
        return service.create_appeal(
            args.by, args.decision, args.grounds, args.suspensive, at
        )
    if args.command == "appeal-resolve":
        return service.resolve_appeal(
            args.by, args.appeal, args.resolution, args.reasons, at
        )
    if args.command == "power-grant":
        return service.grant_temporary_power(
            args.by,
            args.holder,
            args.decision,
            args.label,
            args.capabilities,
            args.expires_at,
            at,
        )
    if args.command == "power-exercise":
        return service.exercise_temporary_power(
            args.by, args.power, args.capability, args.action, at
        )
    if args.command == "power-revoke":
        return service.revoke_temporary_power(args.by, args.power, args.reason, at)
    if args.command == "tick":
        return {
            "as_of": normalize_time(at),
            "transitions": service.expire_due(at),
            "prototype": True,
        }
    if args.command == "status":
        return service.snapshot(at)
    if args.command == "audit":
        return service.separation_audit(at)
    if args.command == "trace":
        if args.limit < 1 or args.limit > 1000:
            raise CCTError("limit doit être compris entre 1 et 1000")
        events = list(store.iter_events())[-args.limit :]
        return [
            {key: value for key, value in event.items() if key != "snapshot"}
            for event in events
        ]
    if args.command == "show":
        service.expire_due(at)
        state = store.load_state()
        containers = {
            "actor": "actors",
            "proposal": "proposals",
            "decision": "decisions",
            "mandate": "mandates",
            "appeal": "appeals",
            "power": "temporary_powers",
        }
        entity = state[containers[args.type]].get(args.id)
        if not entity:
            raise CCTError(f"entité inconnue: {args.type}/{args.id}")
        return entity
    if args.command == "export":
        return store.export_bundle(args.output, at)
    if args.command == "recover":
        log = store.verify_log()
        if not log["ok"] or not log["last_snapshot"]:
            raise CCTError("récupération refusée: journal absent ou invalide")
        actor = log["last_snapshot"]["actors"].get(args.by)
        if not actor or not actor.get("active") or "auditor" not in actor["roles"]:
            raise CCTError("récupération réservée à un auditeur déclaré dans le journal")
        result = store.recover_state(args.apply)
        if result["applied"]:
            state = store.load_state()
            store.commit(
                state,
                args.by,
                "state_recovered",
                "repository",
                "local",
                {"recovered_state_hash": result["state_hash"]},
                normalize_time(at),
            )
        return result
    raise CCTError(f"commande non prise en charge: {args.command}")


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        result = run(args)
        emit(result)
        if args.command == "audit" and isinstance(result, dict) and not result.get("ok", False):
            return 1
        return 0
    except (CCTError, StoreError, ValueError, OSError) as exc:
        emit(
            {
                "ok": False,
                "prototype": True,
                "deployment_status": "non_deploye",
                "error": str(exc),
            },
            sys.stderr,
        )
        return 2


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
