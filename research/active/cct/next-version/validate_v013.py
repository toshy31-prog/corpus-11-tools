#!/usr/bin/env python3
"""Static validator for the CCT v0.13 candidate.

Passing this validator establishes only a written, internally consistent
candidate. It does not establish institutional effectiveness or authorization.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent
DEFAULT_DOCUMENT = HERE / "v0.13-candidate.json"
REQUIRED_UNKNOWN = {"autorisee", "deployee", "reobservee", "efficacite_territoriale", "robustesse_independante"}
TERMINAL_ROLES = ("stop", "restart", "certify")


def load(path: Path = DEFAULT_DOCUMENT) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def validate(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if data.get("document_kind") != "cct_next_version_candidate":
        errors.append("document_kind invalide")
    if data.get("version") != "0.13-candidate":
        errors.append("version attendue: 0.13-candidate")
    lifecycle = data.get("lifecycle", {})
    if lifecycle.get("state") != "tests_statiques_passes":
        errors.append("la candidate doit rester au niveau tests_statiques_passes")
    missing_unknown = REQUIRED_UNKNOWN - set(lifecycle.get("not_established", []))
    if missing_unknown:
        errors.append(f"statuts non établis manquants: {sorted(missing_unknown)}")

    future = data.get("design_constraints", {}).get("future_arena", {})
    for key in ("matched_information_budget", "matched_action_budget", "must_be_frozen_by_distinct_author", "keep_vector_outcomes"):
        if future.get(key) is not True:
            errors.append(f"future_arena.{key} doit être vrai")
    if future.get("reuse_v1_worlds_for_acceptance") is not False:
        errors.append("les mondes v1 ne peuvent pas servir à accepter la v0.13")

    mechanisms = data.get("mechanisms", [])
    ids = [item.get("id") for item in mechanisms]
    if len(mechanisms) != 4 or len(set(ids)) != len(ids):
        errors.append("quatre mécanismes uniques sont requis")
    for item in mechanisms:
        identifier = item.get("id", "mécanisme-inconnu")
        delta = item.get("capability_delta", {})
        if not delta.get("removed_from_dominant") or not delta.get("granted_to_affected"):
            errors.append(f"{identifier}: delta de capacité incomplet")
        activation = item.get("activation", {})
        channels = activation.get("channels", [])
        domains = [channel.get("failure_domain") for channel in channels]
        if len(channels) < 2 or len(set(domains)) != len(domains) or None in domains:
            errors.append(f"{identifier}: deux canaux à domaines de panne distincts sont requis")
        keys = activation.get("dual_key", [])
        if len(keys) != 2 or len(set(keys)) != 2:
            errors.append(f"{identifier}: double clé distincte requise")
        if activation.get("local_authority_veto") is not False:
            errors.append(f"{identifier}: le pouvoir visé ne peut disposer d'un veto d'activation")

        authority = item.get("authority", {})
        role_sets = [set(authority.get(role, [])) for role in TERMINAL_ROLES]
        if any(not values for values in role_sets):
            errors.append(f"{identifier}: rôles terminaux incomplets")
        if any(role_sets[left] & role_sets[right] for left in range(3) for right in range(left + 1, 3)):
            errors.append(f"{identifier}: arrêt, relance et certification doivent être disjoints")
        if set(authority.get("execute", [])) & set(authority.get("certify", [])):
            errors.append(f"{identifier}: exécution et certification doivent être disjointes")

        execution = item.get("execution", {})
        if not isinstance(execution.get("action_budget_units"), int) or execution["action_budget_units"] < 1:
            errors.append(f"{identifier}: budget d'action positif requis")
        if not execution.get("renewal_requires") or not execution.get("safe_state"):
            errors.append(f"{identifier}: reprise et état sûr doivent être spécifiés")
        costs = item.get("costs", {})
        if not costs.get("burden") or not costs.get("bearers") or not costs.get("hidden_cost_probe"):
            errors.append(f"{identifier}: coût, porteurs et sonde de coût caché requis")
        if not item.get("withdrawal_condition"):
            errors.append(f"{identifier}: condition de retrait requise")
        if len(item.get("traces", [])) < 3:
            errors.append(f"{identifier}: traces insuffisantes")

    portability = next((item for item in mechanisms if item.get("id") == "M13-02"), None)
    if portability and portability["activation"].get("local_authority_veto") is not False:
        errors.append("M13-02: la portabilité dépend encore du pouvoir local")
    information = next((item for item in mechanisms if item.get("id") == "M13-03"), None)
    if information and "divergences non résolues" not in information.get("traces", []):
        errors.append("M13-03: les divergences doivent survivre à la réconciliation")
    return errors


if __name__ == "__main__":
    result = validate(load())
    print(json.dumps({"valid": not result, "errors": result}, ensure_ascii=False, indent=2))
    raise SystemExit(1 if result else 0)
