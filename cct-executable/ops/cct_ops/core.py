"""Règles opérationnelles du prototype CCT local."""

from __future__ import annotations

import re
import uuid
from copy import deepcopy
from datetime import timedelta
from typing import Any

from .store import EventStore, StoreError, normalize_time, parse_time


class CCTError(RuntimeError):
    """Refus institutionnel attendu et explicable."""


ROLES = {
    "appellant",
    "auditor",
    "decision_maker",
    "emergency_granter",
    "emergency_holder",
    "mandate_granter",
    "mandate_holder",
    "proposer",
    "registrar",
    "appeal_reviewer",
}

# Ces incompatibilités sont globales. Les autres séparations sont vérifiées par
# dossier afin de ne pas interdire toute polyvalence à une petite collectivité.
FORBIDDEN_ROLE_PAIRS = {
    frozenset(("decision_maker", "appeal_reviewer")),
    frozenset(("emergency_granter", "emergency_holder")),
    frozenset(("mandate_granter", "mandate_holder")),
}

MAX_MANDATE_DURATION = timedelta(days=366)
MAX_TEMPORARY_POWER_DURATION = timedelta(hours=168)
IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$")


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def _require_identifier(value: str, label: str = "identifiant") -> None:
    if not IDENTIFIER.fullmatch(value):
        raise CCTError(
            f"{label} invalide: 1 à 64 caractères ASCII, lettres/chiffres puis ._:-"
        )


def _role_conflicts(roles: set[str]) -> list[str]:
    conflicts: list[str] = []
    for pair in FORBIDDEN_ROLE_PAIRS:
        if pair <= roles:
            conflicts.append(" + ".join(sorted(pair)))
    return conflicts


class InstitutionalService:
    """Façade métier; chaque changement réussi produit une trace journalisée."""

    def __init__(self, store: EventStore):
        self.store = store

    def init(self, bootstrap_id: str, bootstrap_name: str, at: str | None = None) -> dict[str, Any]:
        _require_identifier(bootstrap_id, "identifiant bootstrap")
        try:
            return self.store.initialize(bootstrap_id, bootstrap_name, at)
        except (StoreError, ValueError) as exc:
            raise CCTError(str(exc)) from exc

    def _load(self, at: str | None = None, sweep: bool = True) -> tuple[dict[str, Any], str]:
        timestamp = normalize_time(at)
        try:
            if sweep:
                self.expire_due(timestamp)
            return self.store.load_state(), timestamp
        except (StoreError, ValueError) as exc:
            raise CCTError(str(exc)) from exc

    @staticmethod
    def _actor(state: dict[str, Any], actor_id: str) -> dict[str, Any]:
        actor = state["actors"].get(actor_id)
        if not actor or not actor.get("active"):
            raise CCTError(f"acteur absent ou inactif: {actor_id}")
        return actor

    @classmethod
    def _require_role(cls, state: dict[str, Any], actor_id: str, role: str) -> dict[str, Any]:
        actor = cls._actor(state, actor_id)
        if role not in actor["roles"]:
            raise CCTError(f"rôle requis pour {actor_id}: {role}")
        return actor

    def add_actor(
        self,
        by: str,
        actor_id: str,
        name: str,
        roles: list[str],
        at: str | None = None,
    ) -> dict[str, Any]:
        state, timestamp = self._load(at)
        self._require_role(state, by, "registrar")
        _require_identifier(actor_id, "identifiant acteur")
        if actor_id.startswith("system:"):
            raise CCTError("le préfixe system: est réservé")
        if actor_id in state["actors"]:
            raise CCTError(f"acteur déjà présent: {actor_id}")
        requested = set(roles)
        if not requested:
            raise CCTError("au moins un rôle est requis")
        unknown = requested - ROLES
        if unknown:
            raise CCTError(f"rôles inconnus: {', '.join(sorted(unknown))}")
        conflicts = _role_conflicts(requested)
        if conflicts:
            raise CCTError(f"rôles incompatibles: {', '.join(conflicts)}")
        actor = {
            "id": actor_id,
            "name": name,
            "roles": sorted(requested),
            "active": True,
            "created_at": timestamp,
        }
        state["actors"][actor_id] = actor
        self.store.commit(
            state,
            by,
            "actor_added",
            "actor",
            actor_id,
            {"roles": actor["roles"]},
            timestamp,
        )
        return deepcopy(actor)

    def create_proposal(
        self,
        by: str,
        title: str,
        body: str,
        at: str | None = None,
        kind: str = "policy",
        requested_holder_id: str | None = None,
        authorized_scopes: list[str] | None = None,
        not_after: str | None = None,
    ) -> dict[str, Any]:
        state, timestamp = self._load(at)
        self._require_role(state, by, "proposer")
        if not title.strip() or not body.strip():
            raise CCTError("titre et contenu sont obligatoires")
        if kind not in {"policy", "mandate_authorization", "temporary_power_authorization"}:
            raise CCTError("type de proposition inconnu")
        authorization = None
        if kind == "policy":
            if requested_holder_id or authorized_scopes or not_after:
                raise CCTError("une proposition policy ne porte pas d'autorisation exécutable")
        else:
            if not requested_holder_id or not not_after:
                raise CCTError("titulaire proposé et date butoir sont obligatoires")
            expected_role = {
                "mandate_authorization": "mandate_holder",
                "temporary_power_authorization": "emergency_holder",
            }[kind]
            self._require_role(state, requested_holder_id, expected_role)
            scopes = sorted({item.strip() for item in (authorized_scopes or []) if item.strip()})
            if not scopes:
                raise CCTError("au moins un périmètre autorisable est obligatoire")
            deadline = normalize_time(not_after)
            if parse_time(deadline) <= parse_time(timestamp):
                raise CCTError("la date butoir de l'autorisation doit être future")
            authorization = {
                "requested_holder_id": requested_holder_id,
                "authorized_scopes": scopes,
                "not_after": deadline,
            }
        proposal_id = _new_id("prop")
        proposal = {
            "id": proposal_id,
            "title": title.strip(),
            "body": body.strip(),
            "author_id": by,
            "kind": kind,
            "authorization": authorization,
            "status": "submitted",
            "created_at": timestamp,
            "decision_ids": [],
        }
        state["proposals"][proposal_id] = proposal
        self.store.commit(
            state,
            by,
            "proposal_submitted",
            "proposal",
            proposal_id,
            {"title": proposal["title"], "kind": kind, "authorization": authorization},
            timestamp,
        )
        return deepcopy(proposal)

    def record_decision(
        self,
        by: str,
        proposal_id: str,
        outcome: str,
        reasons: str,
        at: str | None = None,
    ) -> dict[str, Any]:
        state, timestamp = self._load(at)
        self._require_role(state, by, "decision_maker")
        proposal = state["proposals"].get(proposal_id)
        if not proposal:
            raise CCTError(f"proposition inconnue: {proposal_id}")
        if proposal["status"] != "submitted":
            raise CCTError(f"proposition non décidable dans l'état {proposal['status']}")
        if proposal["author_id"] == by:
            raise CCTError("séparation violée: l'auteur ne peut décider sa proposition")
        if outcome not in {"approve", "reject", "defer"}:
            raise CCTError("issue attendue: approve, reject ou defer")
        if not reasons.strip():
            raise CCTError("motifs obligatoires")
        decision_id = _new_id("dec")
        decision = {
            "id": decision_id,
            "proposal_id": proposal_id,
            "decision_maker_id": by,
            "outcome": outcome,
            "effective_outcome": outcome,
            "reasons": reasons.strip(),
            "decided_at": timestamp,
            "appeal_status": "none",
        }
        state["decisions"][decision_id] = decision
        proposal["decision_ids"].append(decision_id)
        proposal["status"] = {
            "approve": "approved",
            "reject": "rejected",
            "defer": "deferred",
        }[outcome]
        self.store.commit(
            state,
            by,
            "decision_recorded",
            "decision",
            decision_id,
            {"proposal_id": proposal_id, "outcome": outcome, "reasons": reasons.strip()},
            timestamp,
        )
        return deepcopy(decision)

    @staticmethod
    def _authorizing_decision(
        state: dict[str, Any], decision_id: str, expected_kind: str
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        decision = state["decisions"].get(decision_id)
        if not decision:
            raise CCTError(f"décision inconnue: {decision_id}")
        if decision["effective_outcome"] != "approve":
            raise CCTError("la décision n'autorise pas ou plus cette capacité")
        proposal = state["proposals"].get(decision["proposal_id"])
        if not proposal or proposal.get("kind") != expected_kind:
            raise CCTError(f"la décision n'est pas de type {expected_kind}")
        return decision, proposal

    def grant_mandate(
        self,
        by: str,
        holder_id: str,
        decision_id: str,
        scope: str,
        expires_at: str,
        starts_at: str | None = None,
        at: str | None = None,
    ) -> dict[str, Any]:
        state, timestamp = self._load(at)
        self._require_role(state, by, "mandate_granter")
        self._require_role(state, holder_id, "mandate_holder")
        _, proposal = self._authorizing_decision(
            state, decision_id, "mandate_authorization"
        )
        if by == holder_id:
            raise CCTError("séparation violée: octroyant et titulaire du mandat identiques")
        start = normalize_time(starts_at or timestamp)
        end = normalize_time(expires_at)
        if parse_time(start) < parse_time(timestamp):
            raise CCTError("le mandat ne peut commencer avant son octroi")
        duration = parse_time(end) - parse_time(start)
        if duration <= timedelta(0):
            raise CCTError("l'échéance doit être postérieure au début")
        if duration > MAX_MANDATE_DURATION:
            raise CCTError("durée maximale d'un mandat prototype: 366 jours")
        if not scope.strip():
            raise CCTError("périmètre du mandat obligatoire")
        authorization = proposal["authorization"]
        if authorization["requested_holder_id"] != holder_id:
            raise CCTError("titulaire différent de celui approuvé")
        if scope.strip() not in authorization["authorized_scopes"]:
            raise CCTError("périmètre du mandat absent de l'autorisation approuvée")
        if parse_time(end) > parse_time(authorization["not_after"]):
            raise CCTError("échéance au-delà de la date butoir approuvée")
        mandate_id = _new_id("man")
        mandate = {
            "id": mandate_id,
            "holder_id": holder_id,
            "grantor_id": by,
            "decision_id": decision_id,
            "scope": scope.strip(),
            "starts_at": start,
            "expires_at": end,
            "status": "active" if parse_time(start) <= parse_time(timestamp) else "scheduled",
            "granted_at": timestamp,
            "closed_at": None,
        }
        state["mandates"][mandate_id] = mandate
        self.store.commit(
            state,
            by,
            "mandate_granted",
            "mandate",
            mandate_id,
            {"holder_id": holder_id, "scope": scope.strip(), "expires_at": end},
            timestamp,
        )
        return deepcopy(mandate)

    def exercise_mandate(
        self,
        by: str,
        mandate_id: str,
        action: str,
        at: str | None = None,
    ) -> dict[str, Any]:
        state, timestamp = self._load(at)
        mandate = state["mandates"].get(mandate_id)
        if not mandate:
            raise CCTError(f"mandat inconnu: {mandate_id}")
        if mandate["holder_id"] != by:
            raise CCTError("seul le titulaire peut exercer le mandat")
        self._require_role(state, by, "mandate_holder")
        if mandate["status"] != "active":
            raise CCTError(f"mandat non exerçable: {mandate['status']}")
        if not action.strip():
            raise CCTError("action exercée obligatoire")
        self.store.commit(
            state,
            by,
            "mandate_exercised",
            "mandate",
            mandate_id,
            {"action": action.strip(), "scope": mandate["scope"]},
            timestamp,
        )
        return {"mandate_id": mandate_id, "action": action.strip(), "accepted": True}

    def revoke_mandate(
        self, by: str, mandate_id: str, reason: str, at: str | None = None
    ) -> dict[str, Any]:
        state, timestamp = self._load(at)
        actor = self._actor(state, by)
        mandate = state["mandates"].get(mandate_id)
        if not mandate:
            raise CCTError(f"mandat inconnu: {mandate_id}")
        if by != mandate["grantor_id"] and "auditor" not in actor["roles"]:
            raise CCTError("révocation réservée à l'octroyant ou à un auditeur")
        if mandate["status"] not in {"active", "scheduled", "suspended"}:
            raise CCTError(f"mandat déjà clos: {mandate['status']}")
        mandate["status"] = "revoked"
        mandate["closed_at"] = timestamp
        mandate["closure_reason"] = reason.strip() or "non précisé"
        self.store.commit(
            state,
            by,
            "mandate_revoked",
            "mandate",
            mandate_id,
            {"reason": mandate["closure_reason"]},
            timestamp,
        )
        return deepcopy(mandate)

    def create_appeal(
        self,
        by: str,
        decision_id: str,
        grounds: str,
        suspensive: bool = False,
        at: str | None = None,
    ) -> dict[str, Any]:
        state, timestamp = self._load(at)
        self._require_role(state, by, "appellant")
        decision = state["decisions"].get(decision_id)
        if not decision:
            raise CCTError(f"décision inconnue: {decision_id}")
        if decision["appeal_status"] != "none":
            raise CCTError("un recours a déjà été exercé contre cette décision")
        if not grounds.strip():
            raise CCTError("moyens du recours obligatoires")
        appeal_id = _new_id("app")
        appeal = {
            "id": appeal_id,
            "decision_id": decision_id,
            "claimant_id": by,
            "grounds": grounds.strip(),
            "suspensive": bool(suspensive),
            "status": "open",
            "created_at": timestamp,
            "reviewer_id": None,
            "resolution": None,
            "resolved_at": None,
        }
        state["appeals"][appeal_id] = appeal
        decision["appeal_status"] = "open"
        affected: list[str] = []
        if suspensive:
            decision["effective_outcome"] = "suspended"
            for mandate in state["mandates"].values():
                if mandate["decision_id"] == decision_id and mandate["status"] in {
                    "active",
                    "scheduled",
                }:
                    mandate["suspended_from"] = mandate["status"]
                    mandate["status"] = "suspended"
                    mandate["suspended_at"] = timestamp
                    affected.append(f"mandate:{mandate['id']}")
            for power in state["temporary_powers"].values():
                if power["decision_id"] == decision_id and power["status"] == "active":
                    power["suspended_from"] = "active"
                    power["status"] = "suspended"
                    power["suspended_at"] = timestamp
                    affected.append(f"temporary_power:{power['id']}")
        self.store.commit(
            state,
            by,
            "appeal_opened",
            "appeal",
            appeal_id,
            {
                "decision_id": decision_id,
                "suspensive": bool(suspensive),
                "suspended_dependents": sorted(affected),
            },
            timestamp,
        )
        return deepcopy(appeal)

    def resolve_appeal(
        self,
        by: str,
        appeal_id: str,
        resolution: str,
        reasons: str,
        at: str | None = None,
    ) -> dict[str, Any]:
        state, timestamp = self._load(at)
        self._require_role(state, by, "appeal_reviewer")
        appeal = state["appeals"].get(appeal_id)
        if not appeal:
            raise CCTError(f"recours inconnu: {appeal_id}")
        if appeal["status"] != "open":
            raise CCTError("recours déjà clos")
        decision = state["decisions"][appeal["decision_id"]]
        if by in {appeal["claimant_id"], decision["decision_maker_id"]}:
            raise CCTError("séparation violée: le réviseur est partie ou auteur de la décision")
        if resolution not in {"confirm", "remand", "reverse"}:
            raise CCTError("résolution attendue: confirm, remand ou reverse")
        if not reasons.strip():
            raise CCTError("motifs de résolution obligatoires")
        appeal.update(
            {
                "status": "resolved",
                "reviewer_id": by,
                "resolution": resolution,
                "resolution_reasons": reasons.strip(),
                "resolved_at": timestamp,
            }
        )
        decision["appeal_status"] = "resolved"
        affected: list[str] = []
        if resolution == "confirm":
            decision["effective_outcome"] = decision["outcome"]
        elif resolution == "reverse":
            decision["effective_outcome"] = "voided"
            state["proposals"][decision["proposal_id"]]["status"] = "reversed_on_appeal"
        else:
            decision["effective_outcome"] = "remanded"
            state["proposals"][decision["proposal_id"]]["status"] = "submitted"
        for mandate in state["mandates"].values():
            if mandate["decision_id"] != decision["id"] or mandate["status"] != "suspended":
                continue
            if resolution == "confirm" and parse_time(mandate["expires_at"]) > parse_time(timestamp):
                mandate["status"] = (
                    "active"
                    if parse_time(mandate["starts_at"]) <= parse_time(timestamp)
                    else "scheduled"
                )
                mandate.pop("suspended_from", None)
                mandate.pop("suspended_at", None)
            elif resolution == "confirm":
                mandate["status"] = "expired"
                mandate["closed_at"] = timestamp
            else:
                mandate["status"] = "revoked_by_appeal"
                mandate["closed_at"] = timestamp
            affected.append(f"mandate:{mandate['id']}:{mandate['status']}")
        for power in state["temporary_powers"].values():
            if power["decision_id"] != decision["id"] or power["status"] != "suspended":
                continue
            if resolution == "confirm" and parse_time(power["expires_at"]) > parse_time(timestamp):
                power["status"] = "active"
                power.pop("suspended_from", None)
                power.pop("suspended_at", None)
            elif resolution == "confirm":
                power["status"] = "expired"
                power["closed_at"] = timestamp
                power["closure_reason"] = "expired_during_appeal"
            else:
                power["status"] = "revoked_by_appeal"
                power["closed_at"] = timestamp
                power["closure_reason"] = resolution
            affected.append(f"temporary_power:{power['id']}:{power['status']}")
        self.store.commit(
            state,
            by,
            "appeal_resolved",
            "appeal",
            appeal_id,
            {
                "resolution": resolution,
                "reasons": reasons.strip(),
                "dependent_transitions": sorted(affected),
            },
            timestamp,
        )
        return deepcopy(appeal)

    def grant_temporary_power(
        self,
        by: str,
        holder_id: str,
        decision_id: str,
        label: str,
        capabilities: list[str],
        expires_at: str,
        at: str | None = None,
    ) -> dict[str, Any]:
        state, timestamp = self._load(at)
        self._require_role(state, by, "emergency_granter")
        self._require_role(state, holder_id, "emergency_holder")
        _, proposal = self._authorizing_decision(
            state, decision_id, "temporary_power_authorization"
        )
        if by == holder_id:
            raise CCTError("séparation violée: l'octroyant ne peut recevoir le pouvoir")
        end = normalize_time(expires_at)
        duration = parse_time(end) - parse_time(timestamp)
        if duration <= timedelta(0):
            raise CCTError("l'échéance du pouvoir doit être future")
        if duration > MAX_TEMPORARY_POWER_DURATION:
            raise CCTError("durée maximale d'un pouvoir temporaire prototype: 168 heures")
        normalized_capabilities = sorted({item.strip() for item in capabilities if item.strip()})
        if not label.strip() or not normalized_capabilities:
            raise CCTError("libellé et au moins une capacité sont obligatoires")
        authorization = proposal["authorization"]
        if authorization["requested_holder_id"] != holder_id:
            raise CCTError("titulaire différent de celui approuvé")
        outside = set(normalized_capabilities) - set(authorization["authorized_scopes"])
        if outside:
            raise CCTError(f"capacités non approuvées: {', '.join(sorted(outside))}")
        if parse_time(end) > parse_time(authorization["not_after"]):
            raise CCTError("échéance au-delà de la date butoir approuvée")
        power_id = _new_id("pow")
        power = {
            "id": power_id,
            "label": label.strip(),
            "holder_id": holder_id,
            "grantor_id": by,
            "decision_id": decision_id,
            "capabilities": normalized_capabilities,
            "granted_at": timestamp,
            "expires_at": end,
            "status": "active",
            "closed_at": None,
            "reactivable": False,
        }
        state["temporary_powers"][power_id] = power
        self.store.commit(
            state,
            by,
            "temporary_power_granted",
            "temporary_power",
            power_id,
            {
                "holder_id": holder_id,
                "capabilities": normalized_capabilities,
                "expires_at": end,
            },
            timestamp,
        )
        return deepcopy(power)

    def exercise_temporary_power(
        self,
        by: str,
        power_id: str,
        capability: str,
        action: str,
        at: str | None = None,
    ) -> dict[str, Any]:
        state, timestamp = self._load(at)
        power = state["temporary_powers"].get(power_id)
        if not power:
            raise CCTError(f"pouvoir inconnu: {power_id}")
        if power["holder_id"] != by:
            raise CCTError("seul le titulaire peut exercer ce pouvoir")
        self._require_role(state, by, "emergency_holder")
        if power["status"] != "active":
            raise CCTError(f"pouvoir éteint: {power['status']}")
        if capability not in power["capabilities"]:
            raise CCTError("capacité hors périmètre")
        if not action.strip():
            raise CCTError("action exercée obligatoire")
        self.store.commit(
            state,
            by,
            "temporary_power_exercised",
            "temporary_power",
            power_id,
            {"capability": capability, "action": action.strip()},
            timestamp,
        )
        return {
            "power_id": power_id,
            "capability": capability,
            "action": action.strip(),
            "accepted": True,
        }

    def revoke_temporary_power(
        self, by: str, power_id: str, reason: str, at: str | None = None
    ) -> dict[str, Any]:
        state, timestamp = self._load(at)
        actor = self._actor(state, by)
        power = state["temporary_powers"].get(power_id)
        if not power:
            raise CCTError(f"pouvoir inconnu: {power_id}")
        if by != power["grantor_id"] and "auditor" not in actor["roles"]:
            raise CCTError("révocation réservée à l'octroyant ou à un auditeur")
        if power["status"] not in {"active", "suspended"}:
            raise CCTError(f"pouvoir déjà éteint: {power['status']}")
        power["status"] = "revoked"
        power["closed_at"] = timestamp
        power["closure_reason"] = reason.strip() or "non précisé"
        self.store.commit(
            state,
            by,
            "temporary_power_revoked",
            "temporary_power",
            power_id,
            {"reason": power["closure_reason"]},
            timestamp,
        )
        return deepcopy(power)

    def expire_due(self, at: str | None = None) -> list[dict[str, str]]:
        """Matérialise les échéances; aucune capacité expirée ne peut être exercée.

        L'extinction est évaluée avant chaque opération. Si aucun processus ne
        tourne, aucune action n'est possible; le prochain appel journalise alors
        l'extinction avant de traiter la commande demandée.
        """

        timestamp = normalize_time(at)
        try:
            state = self.store.load_state()
        except StoreError as exc:
            if "absent" in str(exc):
                return []
            raise CCTError(str(exc)) from exc
        current = parse_time(timestamp)
        transitions: list[dict[str, str]] = []
        for mandate_id in sorted(state["mandates"]):
            mandate = state["mandates"][mandate_id]
            if mandate["status"] not in {"active", "scheduled", "suspended"}:
                continue
            if parse_time(mandate["expires_at"]) <= current:
                mandate["status"] = "expired"
                mandate["closed_at"] = timestamp
                self.store.commit(
                    state,
                    "system:clock",
                    "mandate_expired",
                    "mandate",
                    mandate_id,
                    {"scheduled_expiry": mandate["expires_at"]},
                    timestamp,
                )
                transitions.append({"type": "mandate", "id": mandate_id, "status": "expired"})
            elif mandate["status"] == "scheduled" and parse_time(mandate["starts_at"]) <= current:
                mandate["status"] = "active"
                self.store.commit(
                    state,
                    "system:clock",
                    "mandate_activated",
                    "mandate",
                    mandate_id,
                    {"scheduled_start": mandate["starts_at"]},
                    timestamp,
                )
                transitions.append({"type": "mandate", "id": mandate_id, "status": "active"})
        for power_id in sorted(state["temporary_powers"]):
            power = state["temporary_powers"][power_id]
            if power["status"] in {"active", "suspended"} and parse_time(
                power["expires_at"]
            ) <= current:
                power["status"] = "expired"
                power["closed_at"] = timestamp
                power["closure_reason"] = "automatic_expiry"
                self.store.commit(
                    state,
                    "system:clock",
                    "temporary_power_expired",
                    "temporary_power",
                    power_id,
                    {"scheduled_expiry": power["expires_at"]},
                    timestamp,
                )
                transitions.append(
                    {"type": "temporary_power", "id": power_id, "status": "expired"}
                )
        return transitions

    def snapshot(self, at: str | None = None) -> dict[str, Any]:
        state, timestamp = self._load(at)
        return {
            "as_of": timestamp,
            "prototype": True,
            "deployment_status": "non_deploye",
            "counts": {
                key: len(state[key])
                for key in (
                    "actors",
                    "proposals",
                    "decisions",
                    "mandates",
                    "appeals",
                    "temporary_powers",
                )
            },
            "active_mandates": sorted(
                item["id"] for item in state["mandates"].values() if item["status"] == "active"
            ),
            "active_temporary_powers": sorted(
                item["id"]
                for item in state["temporary_powers"].values()
                if item["status"] == "active"
            ),
        }

    def separation_audit(self, as_of: str | None = None) -> dict[str, Any]:
        timestamp = normalize_time(as_of)
        repository = self.store.verify_repository()
        errors = list(repository["errors"])
        warnings: list[str] = []
        try:
            state = self.store.load_state()
        except StoreError as exc:
            return {
                "ok": False,
                "prototype": True,
                "deployment_status": "non_deploye",
                "as_of": timestamp,
                "errors": errors + [str(exc)],
                "warnings": warnings,
                "repository": repository,
            }
        for actor_id, actor in state["actors"].items():
            roles = set(actor["roles"])
            for conflict in _role_conflicts(roles):
                errors.append(f"acteur {actor_id}: rôles incompatibles {conflict}")
            if len(roles) > 3:
                warnings.append(f"acteur {actor_id}: concentration de {len(roles)} rôles")
        for role in sorted(ROLES - {"registrar"}):
            if not any(
                role in actor["roles"] and actor["active"]
                for actor in state["actors"].values()
            ):
                warnings.append(f"fonction non pourvue: {role}")

        def has_role(actor_id: str, role: str) -> bool:
            actor = state["actors"].get(actor_id)
            return bool(actor and actor.get("active") and role in actor.get("roles", []))

        for proposal_id, proposal in state["proposals"].items():
            if not has_role(proposal["author_id"], "proposer"):
                errors.append(f"proposition {proposal_id}: auteur sans rôle proposer")
            if proposal.get("kind") != "policy":
                authorization = proposal.get("authorization") or {}
                if not authorization.get("requested_holder_id"):
                    errors.append(f"proposition {proposal_id}: titulaire autorisé absent")
                if not authorization.get("authorized_scopes"):
                    errors.append(f"proposition {proposal_id}: périmètre autorisé absent")
        for decision_id, decision in state["decisions"].items():
            proposal = state["proposals"].get(decision["proposal_id"])
            if not proposal:
                errors.append(f"décision {decision_id}: proposition absente")
            elif proposal["author_id"] == decision["decision_maker_id"]:
                errors.append(f"décision {decision_id}: auto-décision")
            if not has_role(decision["decision_maker_id"], "decision_maker"):
                errors.append(f"décision {decision_id}: auteur sans rôle decision_maker")
        for mandate_id, mandate in state["mandates"].items():
            if mandate["grantor_id"] == mandate["holder_id"]:
                errors.append(f"mandat {mandate_id}: octroyant et titulaire identiques")
            if not has_role(mandate["grantor_id"], "mandate_granter"):
                errors.append(f"mandat {mandate_id}: octroyant sans rôle mandate_granter")
            if not has_role(mandate["holder_id"], "mandate_holder"):
                errors.append(f"mandat {mandate_id}: titulaire sans rôle mandate_holder")
            decision = state["decisions"].get(mandate["decision_id"])
            proposal = state["proposals"].get(decision["proposal_id"]) if decision else None
            authorization = proposal.get("authorization") if proposal else None
            if not proposal or proposal.get("kind") != "mandate_authorization":
                errors.append(f"mandat {mandate_id}: type d'autorisation invalide")
            elif not authorization or (
                authorization["requested_holder_id"] != mandate["holder_id"]
                or mandate["scope"] not in authorization["authorized_scopes"]
                or parse_time(mandate["expires_at"]) > parse_time(authorization["not_after"])
            ):
                errors.append(f"mandat {mandate_id}: dépasse l'autorisation approuvée")
            if mandate["status"] in {"active", "scheduled", "suspended"} and parse_time(
                mandate["expires_at"]
            ) <= parse_time(timestamp):
                warnings.append(f"mandat {mandate_id}: échéance due; lancer tick")
        for appeal_id, appeal in state["appeals"].items():
            if not has_role(appeal["claimant_id"], "appellant"):
                errors.append(f"recours {appeal_id}: requérant sans rôle appellant")
            if appeal["status"] == "resolved":
                decision = state["decisions"].get(appeal["decision_id"])
                if not has_role(appeal["reviewer_id"], "appeal_reviewer"):
                    errors.append(f"recours {appeal_id}: réviseur sans rôle appeal_reviewer")
                if decision and appeal["reviewer_id"] in {
                    appeal["claimant_id"],
                    decision["decision_maker_id"],
                }:
                    errors.append(f"recours {appeal_id}: réviseur non indépendant")
        for power_id, power in state["temporary_powers"].items():
            if power["grantor_id"] == power["holder_id"]:
                errors.append(f"pouvoir {power_id}: octroyant et titulaire identiques")
            if not has_role(power["grantor_id"], "emergency_granter"):
                errors.append(f"pouvoir {power_id}: octroyant sans rôle emergency_granter")
            if not has_role(power["holder_id"], "emergency_holder"):
                errors.append(f"pouvoir {power_id}: titulaire sans rôle emergency_holder")
            decision = state["decisions"].get(power["decision_id"])
            proposal = state["proposals"].get(decision["proposal_id"]) if decision else None
            authorization = proposal.get("authorization") if proposal else None
            if not proposal or proposal.get("kind") != "temporary_power_authorization":
                errors.append(f"pouvoir {power_id}: type d'autorisation invalide")
            elif not authorization or (
                authorization["requested_holder_id"] != power["holder_id"]
                or not set(power["capabilities"]) <= set(authorization["authorized_scopes"])
                or parse_time(power["expires_at"]) > parse_time(authorization["not_after"])
            ):
                errors.append(f"pouvoir {power_id}: dépasse l'autorisation approuvée")
            if power.get("reactivable") is not False:
                errors.append(f"pouvoir {power_id}: canal de réactivation déclaré")
            if power["status"] in {"active", "suspended"} and parse_time(
                power["expires_at"]
            ) <= parse_time(timestamp):
                warnings.append(f"pouvoir {power_id}: échéance due; lancer tick")
        return {
            "ok": not errors,
            "prototype": True,
            "deployment_status": "non_deploye",
            "as_of": timestamp,
            "errors": errors,
            "warnings": sorted(set(warnings)),
            "repository": repository,
            "limits": [
                "hachage détectif, non protection contre un administrateur du disque",
                "tests locaux seulement; aucune autorisation, aucun déploiement, aucune réobservation",
                "identités déclaratives; aucune preuve cryptographique des personnes",
            ],
        }
