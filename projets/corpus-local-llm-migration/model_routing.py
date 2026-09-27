"""Static local model-profile selection; it never starts or reconfigures a model."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
DEFAULT_REGISTRY = HERE / "model_routing_registry.json"
DEFAULT_LOCK = HERE / "CORE_MODELS_LOCK.json"


class ModelRoutingError(ValueError):
    pass


def _object(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ModelRoutingError(f"{label} doit être un objet.")
    return value


def validate_registry(registry: dict[str, Any], locks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not isinstance(registry, dict) or registry.get("schema_version") != 1 or not isinstance(registry.get("profiles"), list):
        raise ModelRoutingError("Registre de modèles invalide.")
    locked = {row.get("id"): row for row in locks if isinstance(row, dict)}
    rows = []
    seen = set()
    for row in registry["profiles"]:
        if not isinstance(row, dict) or set(row) != {"id", "model_id", "tier", "availability", "variant", "input_modalities", "tool_call", "context_tokens", "evidence", "limits"}:
            raise ModelRoutingError("Profil de modèle invalide.")
        ident, model_id = row["id"], row["model_id"]
        if not isinstance(ident, str) or not ident or ident in seen or model_id not in locked:
            raise ModelRoutingError("Identifiant de profil ou modèle verrouillé invalide.")
        seen.add(ident)
        if row["tier"] != locked[model_id].get("tier") or row["tier"] not in {"hot", "cold"}:
            raise ModelRoutingError("Tier de profil incompatible avec le lock.")
        if row["availability"] not in {"configured_local", "cold_comparator_not_active"} or row["variant"] not in {"direct", "reflexion"}:
            raise ModelRoutingError("Disponibilité ou variante invalide.")
        if not isinstance(row["input_modalities"], list) or not row["input_modalities"] or any(v not in {"text", "image"} for v in row["input_modalities"]):
            raise ModelRoutingError("Modalités invalides.")
        if type(row["tool_call"]) is not bool or type(row["context_tokens"]) is not int or row["context_tokens"] < 1:
            raise ModelRoutingError("Capacités de profil invalides.")
        if not all(isinstance(v, str) and v for v in row["evidence"] + row["limits"]):
            raise ModelRoutingError("Preuves ou limites invalides.")
        rows.append(dict(row))
    return rows


def load_registry(path: Path = DEFAULT_REGISTRY, lock_path: Path = DEFAULT_LOCK) -> list[dict[str, Any]]:
    return validate_registry(json.loads(path.read_text(encoding="utf-8")), json.loads(lock_path.read_text(encoding="utf-8")))


def _request(value: Any) -> dict[str, Any]:
    value = _object(value, "Demande")
    if set(value) != {"mode", "input_modality", "requires_tool_call", "context_tokens", "budget"}:
        raise ModelRoutingError("Champs de demande incomplets ou inconnus.")
    if value["mode"] not in {"auto", "direct", "reflexion"} or value["input_modality"] not in {"text", "image"}:
        raise ModelRoutingError("Mode ou modalité invalide.")
    if type(value["requires_tool_call"]) is not bool or type(value["context_tokens"]) is not int or value["context_tokens"] < 1:
        raise ModelRoutingError("Exigences de demande invalides.")
    budget = _object(value["budget"], "budget")
    if set(budget) != {"allow_cold_restore", "allow_unmeasured_reasoning"} or any(type(v) is not bool for v in budget.values()):
        raise ModelRoutingError("Budget de demande invalide.")
    return {**value, "budget": dict(budget)}


def decide(request: dict[str, Any], *, profiles: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Select a configured profile or defer, without an execution side effect."""
    request = _request(request)
    profiles = load_registry() if profiles is None else list(profiles)
    candidates, deferred = [], []
    for profile in profiles:
        reasons = []
        if request["input_modality"] not in profile["input_modalities"]:
            reasons.append("modalité_non_supportée_par_le_profil")
        if request["requires_tool_call"] and not profile["tool_call"]:
            reasons.append("appels_outils_non_déclarés")
        if request["context_tokens"] > profile["context_tokens"]:
            reasons.append("contexte_au_delà_du_profil")
        if request["mode"] != "auto" and request["mode"] != profile["variant"]:
            reasons.append("variante_non_demandée")
        if profile["availability"] != "configured_local":
            reasons.append("profil_froid_non_actif")
            if request["budget"]["allow_cold_restore"]:
                reasons.append("restauration_froide_permise_mais_non_exécutée")
            deferred.append({"id": profile["id"], "reasons": reasons + profile["limits"]})
            continue
        if profile["variant"] == "reflexion" and not request["budget"]["allow_unmeasured_reasoning"]:
            reasons.append("raisonnement_non_mesuré_non_autorisé_par_le_budget")
        if reasons:
            deferred.append({"id": profile["id"], "reasons": reasons})
        else:
            candidates.append(profile)
    # Direct is the default because its reasoning cost is not assumed; this is
    # a conservative selection rule, not a claim that it is faster or better.
    candidates.sort(key=lambda row: (0 if row["variant"] == "direct" else 1, row["id"]))
    selected = candidates[0] if candidates else None
    return {
        "schema_version": 1,
        "kind": "static_model_route",
        "decision": "select_configured_profile" if selected else "defer_no_eligible_profile",
        "execution": "not_started",
        "runtime_change": "none",
        "selected": ({"id": selected["id"], "model_id": selected["model_id"], "variant": selected["variant"],
                      "evidence": selected["evidence"], "limits": selected["limits"]} if selected else None),
        "deferred": deferred,
        "request": request,
        "tool_boundary": "Un profil modèle compatible avec les appels d’outils ne sélectionne, n’autorise ni n’exécute aucun outil.",
        "limits": [
            "La décision lit seulement un registre et les locks locaux ; aucun modèle, service ou téléchargement n’est sollicité.",
            "Les preuves de configuration et d’épreuves bornées ne prédisent pas la qualité ni la latence de cette demande.",
            "Un profil COLD reste différé, même quand sa restauration est permise par budget : une action explicite séparée est nécessaire.",
        ],
    }
