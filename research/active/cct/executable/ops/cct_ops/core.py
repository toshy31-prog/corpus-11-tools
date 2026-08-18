"""Politique CCT appliquée au moteur institutionnel générique de Corpus."""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
import sys

from .store import EventStore


for _parent in Path(__file__).resolve().parents:
    _labs = _parent / "corpus-11-tools" / "labs" / "python"
    if _labs.is_dir():
        sys.path.insert(0, str(_labs))
        break
else:  # pragma: no cover - disposition du dépôt invalide
    raise RuntimeError("Corpus generic labs are unavailable")

from corpus_labs.institutional_protocol import (  # noqa: E402
    InstitutionalService as CorpusInstitutionalService,
    ProtocolError,
)


CCTError = ProtocolError

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

FORBIDDEN_ROLE_PAIRS = {
    frozenset(("decision_maker", "appeal_reviewer")),
    frozenset(("emergency_granter", "emergency_holder")),
    frozenset(("mandate_granter", "mandate_holder")),
}

MAX_MANDATE_DURATION = timedelta(days=366)
MAX_TEMPORARY_POWER_DURATION = timedelta(hours=168)


class InstitutionalService(CorpusInstitutionalService):
    """Façade compatible configurant la politique du prototype CCT."""

    def __init__(self, store: EventStore):
        super().__init__(
            store,
            roles=ROLES,
            forbidden_role_pairs=FORBIDDEN_ROLE_PAIRS,
            max_mandate_duration=MAX_MANDATE_DURATION,
            max_temporary_power_duration=MAX_TEMPORARY_POWER_DURATION,
        )

    def _mandate_duration_error(self) -> str:
        return "durée maximale d'un mandat prototype: 366 jours"

    def _temporary_power_duration_error(self) -> str:
        return "durée maximale d'un pouvoir temporaire prototype: 168 heures"
