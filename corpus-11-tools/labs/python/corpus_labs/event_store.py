"""Stockage local JSON/JSONL générique avec journal append-only vérifiable.

Le journal est la source de vérité. Chaque événement contient un instantané complet
de l'état, ce qui privilégie ici la récupérabilité et l'audit au rendement disque.
Il s'agit d'un prototype : la chaîne de hachage détecte une altération, elle ne
protège pas contre un acteur ayant le contrôle du système de fichiers.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


DEFAULT_SCHEMA_VERSION = "corpus-event-store/1"
DEFAULT_EXPORT_FORMAT = "corpus-event-store-export/1"
GENESIS_HASH = "0" * 64
RESERVED_EXPORT_KEYS = frozenset(
    {"format", "exported_at", "repository_audit", "state", "events"}
)


class StoreError(RuntimeError):
    """Erreur de stockage ou d'intégrité."""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_time(value: str) -> datetime:
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        raise ValueError("un horodatage doit inclure un fuseau (ex. Z ou +01:00)")
    return parsed.astimezone(timezone.utc)


def normalize_time(value: str | None) -> str:
    parsed = parse_time(value) if value else datetime.now(timezone.utc)
    return parsed.isoformat().replace("+00:00", "Z")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def empty_state(created_at: str) -> dict[str, Any]:
    return {
        "schema_version": DEFAULT_SCHEMA_VERSION,
        "prototype": True,
        "deployment_status": "non_deploye",
        "created_at": created_at,
        "actors": {},
        "proposals": {},
        "decisions": {},
        "mandates": {},
        "appeals": {},
        "temporary_powers": {},
    }


class EventStore:
    """Dépôt d'état local composé de ``state.json`` et ``events.jsonl``.

    La forme de l'état initial, sa version, les rôles de bootstrap et le format
    d'export sont injectés par l'adaptateur appelant. Le stockage ne connaît
    aucune institution ni recherche particulière.
    """

    def __init__(
        self,
        root: str | Path,
        *,
        schema_version: str = DEFAULT_SCHEMA_VERSION,
        state_factory: Any = empty_state,
        bootstrap_roles: Iterable[str] = (),
        export_format: str = DEFAULT_EXPORT_FORMAT,
        artifact_metadata: dict[str, Any] | None = None,
    ):
        self.root = Path(root)
        self.state_path = self.root / "state.json"
        self.events_path = self.root / "events.jsonl"
        self.schema_version = schema_version
        self.state_factory = state_factory
        self.bootstrap_roles = sorted(set(bootstrap_roles))
        self.export_format = export_format
        metadata = deepcopy(artifact_metadata or {})
        reserved = set(metadata) & RESERVED_EXPORT_KEYS
        if reserved:
            raise ValueError(
                f"artifact_metadata cannot replace reserved export keys: {sorted(reserved)}"
            )
        self.artifact_metadata = metadata

    @property
    def initialized(self) -> bool:
        return self.state_path.exists() and self.events_path.exists()

    def initialize(
        self,
        bootstrap_id: str,
        bootstrap_name: str,
        at: str | None = None,
    ) -> dict[str, Any]:
        if self.state_path.exists() or self.events_path.exists():
            raise StoreError("le dépôt existe déjà; initialisation refusée")
        timestamp = normalize_time(at)
        self.root.mkdir(parents=True, exist_ok=True)
        state = self.state_factory(timestamp)
        if state.get("schema_version") != self.schema_version:
            raise StoreError("la fabrique d'état a produit une version de schéma inattendue")
        if "actors" not in state or not isinstance(state["actors"], dict):
            raise StoreError("la fabrique d'état doit fournir une collection actors")
        state["actors"][bootstrap_id] = {
            "id": bootstrap_id,
            "name": bootstrap_name,
            "roles": list(self.bootstrap_roles),
            "active": True,
            "created_at": timestamp,
        }
        self._append_event(
            state=state,
            actor_id=bootstrap_id,
            action="repository_initialized",
            entity_type="repository",
            entity_id="local",
            details={"bootstrap_roles": list(self.bootstrap_roles)},
            at=timestamp,
        )
        self._atomic_write_state(state)
        return deepcopy(state)

    def load_state(self) -> dict[str, Any]:
        if not self.state_path.exists():
            raise StoreError("state.json absent; lancer init ou recover")
        try:
            with self.state_path.open("r", encoding="utf-8") as handle:
                state = json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            raise StoreError(f"state.json illisible: {exc}") from exc
        if state.get("schema_version") != self.schema_version:
            raise StoreError("version de schéma inconnue")
        return state

    def iter_events(self) -> Iterable[dict[str, Any]]:
        if not self.events_path.exists():
            raise StoreError("events.jsonl absent")
        with self.events_path.open("r", encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, start=1):
                if not line.strip():
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError as exc:
                    raise StoreError(
                        f"events.jsonl ligne {line_number} invalide: {exc}"
                    ) from exc

    def commit(
        self,
        state: dict[str, Any],
        actor_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: dict[str, Any],
        at: str | None = None,
    ) -> dict[str, Any]:
        """Ajoute d'abord la trace, puis remplace atomiquement l'état matérialisé.

        Une interruption entre les deux laisse un journal en avance, situation que
        ``audit`` détecte et que ``recover`` peut réparer.
        """

        timestamp = normalize_time(at)
        event = self._append_event(
            state=state,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            at=timestamp,
        )
        self._atomic_write_state(state)
        return event

    def _append_event(
        self,
        state: dict[str, Any],
        actor_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: dict[str, Any],
        at: str,
    ) -> dict[str, Any]:
        previous = None
        if self.events_path.exists():
            for previous in self.iter_events():
                pass
        seq = 1 if previous is None else int(previous["seq"]) + 1
        prev_hash = GENESIS_HASH if previous is None else previous["hash"]
        if previous is not None and parse_time(at) < parse_time(previous["timestamp"]):
            raise StoreError("horodatage antérieur au dernier événement")
        snapshot = deepcopy(state)
        event = {
            "seq": seq,
            "timestamp": at,
            "actor_id": actor_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": deepcopy(details),
            "state_hash": digest(snapshot),
            "prev_hash": prev_hash,
            "snapshot": snapshot,
        }
        event["hash"] = digest(event)
        self.root.mkdir(parents=True, exist_ok=True)
        with self.events_path.open("a", encoding="utf-8") as handle:
            handle.write(canonical_json(event) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        return event

    def _atomic_write_state(self, state: dict[str, Any]) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        temp_name = None
        try:
            with tempfile.NamedTemporaryFile(
                "w",
                encoding="utf-8",
                dir=self.root,
                prefix=".state-",
                suffix=".tmp",
                delete=False,
            ) as handle:
                temp_name = handle.name
                json.dump(state, handle, ensure_ascii=False, sort_keys=True, indent=2)
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_name, self.state_path)
        finally:
            if temp_name and os.path.exists(temp_name):
                os.unlink(temp_name)

    def verify_log(self) -> dict[str, Any]:
        errors: list[str] = []
        events: list[dict[str, Any]] = []
        expected_prev = GENESIS_HASH
        expected_seq = 1
        previous_time: datetime | None = None
        try:
            events = list(self.iter_events())
        except StoreError as exc:
            return {"ok": False, "errors": [str(exc)], "events": 0, "last_snapshot": None}
        for event in events:
            seq = event.get("seq")
            if seq != expected_seq:
                errors.append(f"séquence attendue {expected_seq}, reçue {seq}")
            if event.get("prev_hash") != expected_prev:
                errors.append(f"chaîne rompue à l'événement {seq}")
            claimed_hash = event.get("hash")
            body = dict(event)
            body.pop("hash", None)
            actual_hash = digest(body)
            if claimed_hash != actual_hash:
                errors.append(f"hachage invalide à l'événement {seq}")
            snapshot = event.get("snapshot")
            if event.get("state_hash") != digest(snapshot):
                errors.append(f"instantané altéré à l'événement {seq}")
            try:
                current_time = parse_time(event["timestamp"])
                if previous_time and current_time < previous_time:
                    errors.append(f"temps décroissant à l'événement {seq}")
                previous_time = current_time
            except (KeyError, TypeError, ValueError):
                errors.append(f"horodatage invalide à l'événement {seq}")
            expected_prev = claimed_hash or ""
            expected_seq += 1
        if not events:
            errors.append("journal vide")
        return {
            "ok": not errors,
            "errors": errors,
            "events": len(events),
            "last_hash": events[-1].get("hash") if events else None,
            "last_snapshot": deepcopy(events[-1].get("snapshot")) if events else None,
        }

    def verify_repository(self) -> dict[str, Any]:
        result = self.verify_log()
        errors = list(result["errors"])
        if result["last_snapshot"] is not None:
            try:
                current = self.load_state()
                if digest(current) != digest(result["last_snapshot"]):
                    errors.append("state.json ne correspond pas au dernier instantané journalisé")
            except StoreError as exc:
                errors.append(str(exc))
        return {
            "ok": not errors,
            "errors": errors,
            "events": result["events"],
            "last_hash": result.get("last_hash"),
        }

    def recover_state(self, apply: bool = False) -> dict[str, Any]:
        result = self.verify_log()
        if not result["ok"]:
            raise StoreError("récupération refusée: journal invalide")
        snapshot = result["last_snapshot"]
        if snapshot is None:
            raise StoreError("récupération impossible: aucun instantané")
        matches = False
        try:
            matches = digest(self.load_state()) == digest(snapshot)
        except StoreError:
            matches = False
        if apply and not matches:
            self._atomic_write_state(snapshot)
        return {
            "recoverable": True,
            "already_current": matches,
            "applied": bool(apply and not matches),
            "state_hash": digest(snapshot),
        }

    def export_bundle(self, output: str | Path, exported_at: str | None = None) -> dict[str, Any]:
        output_path = Path(output)
        resolved_output = output_path.resolve()
        protected = {self.state_path.resolve(), self.events_path.resolve()}
        if resolved_output in protected or any(
            output_path.exists() and path.exists() and os.path.samefile(output_path, path)
            for path in (self.state_path, self.events_path)
        ):
            raise StoreError("export refusé: la destination est un fichier du dépôt")
        verification = self.verify_repository()
        if not verification["ok"]:
            raise StoreError("export refusé: dépôt invalide")
        state = self.load_state()
        events = list(self.iter_events())
        bundle = {
            "format": self.export_format,
            **deepcopy(self.artifact_metadata),
            "exported_at": normalize_time(exported_at),
            "repository_audit": verification,
            "state": state,
            "events": events,
        }
        output_path.parent.mkdir(parents=True, exist_ok=True)
        temp_name = None
        try:
            with tempfile.NamedTemporaryFile(
                "w",
                encoding="utf-8",
                dir=output_path.parent,
                prefix=f".{output_path.name}-",
                delete=False,
            ) as handle:
                temp_name = handle.name
                json.dump(bundle, handle, ensure_ascii=False, sort_keys=True, indent=2)
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_name, output_path)
        finally:
            if temp_name and os.path.exists(temp_name):
                os.unlink(temp_name)
        return {
            "output": str(output_path),
            "events": len(events),
            "state_hash": digest(state),
        }
