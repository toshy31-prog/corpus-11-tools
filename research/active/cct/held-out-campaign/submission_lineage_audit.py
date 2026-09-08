#!/usr/bin/env python3
"""Audit de lignage et contrôle en lecture seule des admissions CCT-HO-001.

Ce fichier matérialise l'audit des huit scénarios admis sans modifier les
scénarios, le registre historique ou les résultats de campagne. Les trois
sections de données ci-dessous séparent volontairement :

- OBSERVED_FACTS : contenu constaté dans les artefacts versionnés ;
- PROPOSED_CLASSIFICATIONS : regroupements analytiques, donc révisables ;
- UNKNOWN_FIELDS : provenance non documentée, toujours independence_unknown.

Le contrôle est fermé sur CCT-HO-001. Il lit submissions/registry.json et les
huit fichiers admis, vérifie les identifiants, versions, chemins, empreintes,
statuts d'admission et dépendances déclarées, puis écrit seulement son verdict
sur la sortie standard. Il ne lance pas la campagne et n'écrit aucun fichier.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent
SUBMISSIONS = HERE / "submissions"
REGISTRY = SUBMISSIONS / "registry.json"
INDEPENDENCE_UNKNOWN = "independence_unknown"
ABSENT = "registry_field_absent"

KNOWN_V1_WORLDS = [
    "dependency-monopoly",
    "emergency-capture",
    "fragmentation-cascade",
    "ecological-evasion",
    "local-domination",
    "information-siege",
]


# Faits observés : valeurs lues dans le registre et les scénarios gelés.
# Une déclaration d'auteur reste une déclaration ; elle n'est pas convertie en
# preuve d'indépendance. La date Git est une date d'inscription au dépôt, pas
# une date de création ou de gel par l'auteur.
OBSERVED_FACTS: dict[str, Any] = {
    "campaign": {
        "campaign_id": "CCT-HO-001",
        "required_count": 8,
        "admitted_count": 8,
        "campaign_independence_status": (
            "unknown_shared_generator_lineage_not_documented"
        ),
        "campaign_readiness": (
            "execution_complete_synthetic_common_generator_non_independent"
        ),
        "identity_status": "revealed_after_blind_vector_verdict",
        "repository_first_recorded": {
            "commit": "c7fc73815e947448a92b3db15907fef1a22df11b",
            "committer_date": "2026-08-26T15:10:06+02:00",
            "meaning": "repository_inscription_date_only",
        },
    },
    "common_declared_dependencies": {
        "schema": "corpus-open-world/v1",
        "source_regime": "external_supplied",
        "author_relation_to_corpus": "independent",
        "frozen_before_contenders": True,
        "protocol_version": "cct-held-out-campaign/v1",
        "independence_declaration": {
            "declaresNoAccessToCandidateV013": True,
            "contenderIdentitiesWithheldUntilFreeze": True,
            "notDerivedFromKnownV1Worlds": True,
            "knownV1Worlds": KNOWN_V1_WORLDS,
        },
        "matching": {
            "sameInitialWorld": True,
            "sameExogenousSequence": True,
            "sameInformationBudget": True,
            "sameActionBudget": True,
            "actionUnitsPerRound": 1,
        },
    },
    "admissions": [
        {
            "scenario_id": "orbital-subduction-cascade",
            "version": "1.0.1",
            "path": "orbital-subduction-cascade-v1.0.1.frozen.json",
            "freeze_hash": (
                "sha256:3bf1b72e288ffcf9005278bf91b99522495a671a707fed35bc4745217c1e3822"
            ),
            "author_id": "meridian-zero-investigator",
            "authorship_trace": "7b5a19c4-c21e-4b47-8a30-f4d119e075fa",
            "source_status": (
                "declared_external_authorship_not_independently_verified"
            ),
            "admission_status": "admitted",
            "declared_dependence_status": ABSENT,
            "prior_revision_observed": {
                "version": "1.0.0",
                "status": "revision_requested_before_final_admission",
            },
        },
        {
            "scenario_id": "virelian-delta-aquifer",
            "version": "1.0.0",
            "path": "virelian-delta-aquifer-v1.0.0.frozen.json",
            "freeze_hash": (
                "sha256:4685dcbc567a17ee23fa662375d970da433908790076b80bfd344cc7e65933ca"
            ),
            "author_id": "delta-hydrologue-observateur",
            "authorship_trace": "uuid-virelian-delta-2024-8a7f3e9d",
            "source_status": (
                "declared_external_authorship_not_independently_verified"
            ),
            "admission_status": "admitted",
            "declared_dependence_status": ABSENT,
        },
        {
            "scenario_id": "irrigation-quota-fracture-plaine-canaux",
            "version": "1.0.0",
            "path": (
                "irrigation-quota-fracture-plaine-canaux-v1.0.0.frozen.json"
            ),
            "freeze_hash": (
                "sha256:8d1b4d7257fdbbe6aaf8a8cb3d77ae348f80ec76b82758362507cdb1409f0a14"
            ),
            "author_id": "canal-silt-chronicler",
            "authorship_trace": "b8e4d2a1-7c3f-9e5b-1a6d-4f0c8e2b9d7a",
            "source_status": (
                "declared_external_authorship_not_independently_verified"
            ),
            "admission_status": "admitted",
            "declared_dependence_status": ABSENT,
        },
        {
            "scenario_id": "archipel-thalasso-crise",
            "version": "1.0.0",
            "path": "archipel-thalasso-crise-v1.0.0.frozen.json",
            "freeze_hash": (
                "sha256:0595e04e8108e69f5d062d4941d13fd722ab6c9c7e2742139e14effaedfacdbf"
            ),
            "author_id": "lagon-noir-observateur",
            "authorship_trace": "a7f3c9e2-4b1d-48a6-9c3f-2d8e5f1a6b9c",
            "source_status": (
                "declared_external_authorship_not_independently_verified"
            ),
            "admission_status": "admitted",
            "declared_dependence_status": ABSENT,
        },
        {
            "scenario_id": "archipel-thalasso-v1",
            "version": "1.0.0",
            "path": "archipel-thalasso-v1-v1.0.0.frozen.json",
            "freeze_hash": (
                "sha256:796c7aaafda2d2d642371fe04437fb209d9b09da1dfc20ff60cf1b5eb542535a"
            ),
            "author_id": "lagon-profond-observateur",
            "authorship_trace": "uuid-thalasso-8f4a2c1d",
            "source_status": (
                "declared_external_authorship_not_independently_verified"
            ),
            "admission_status": "admitted",
            "declared_dependence_status": (
                "independence_unknown_shared_generator_lineage_not_documented"
            ),
        },
        {
            "scenario_id": "rupture-digues-arbitrage-droits-eau",
            "version": "1.0.0",
            "path": (
                "rupture-digues-arbitrage-droits-eau-v1.0.0.frozen.json"
            ),
            "freeze_hash": (
                "sha256:d529806884ce05cdffce04a642cd965dd4fa3c2f672f33540f9723e3e3551635"
            ),
            "author_id": "arbitre-fluvial-independant",
            "authorship_trace": "f8e2a1c9-7b4d-3e6f-0a9c-5d8b2e1f4a7c",
            "source_status": (
                "declared_external_authorship_not_independently_verified"
            ),
            "admission_status": "admitted",
            "declared_dependence_status": (
                "independence_unknown_shared_generator_lineage_not_documented"
            ),
        },
        {
            "scenario_id": "delta-salinity-encroachment",
            "version": "1.0.0",
            "path": "delta-salinity-encroachment-v1.0.0.frozen.json",
            "freeze_hash": (
                "sha256:fe451f1b0007ae906372bdde8a524b86d2354fcc82a28080e8e0e85823f6de50"
            ),
            "author_id": "hydra-nexus-analyst",
            "authorship_trace": "7ef2a3bc-11fa-4c81-bd61-dc782cb41209",
            "source_status": (
                "declared_external_authorship_not_independently_verified"
            ),
            "admission_status": "admitted",
            "declared_dependence_status": (
                "substantially_dependent_with_virelian-delta-aquifer"
            ),
        },
        {
            "scenario_id": "bassin-valdrome-hydrique",
            "version": "1.0.1",
            "path": "bassin-valdrome-hydrique-v1.0.1.frozen.json",
            "freeze_hash": (
                "sha256:5ddca2c331fe98d371c3453c4f995bf872c4569e79978bc755060f881e7231cb"
            ),
            "author_id": "hydro-logic-architect",
            "authorship_trace": "uuid-valdrome-7a3f9e2d-8c1b-4e5a",
            "source_status": (
                "declared_external_authorship_not_independently_verified"
            ),
            "admission_status": "admitted",
            "declared_dependence_status": (
                "partially_dependent_with_irrigation-quota-fracture-plaine-canaux"
            ),
        },
    ],
}


# Classifications proposées : elles organisent les modes d'échec partagés sans
# créer de nouvelle preuve et sans changer le statut d'admission des fichiers.
PROPOSED_CLASSIFICATIONS: dict[str, Any] = {
    "campaign_evidence_verdict": INDEPENDENCE_UNKNOWN,
    "verdict_reason": (
        "La campagne déclare une lignée de générateur commun non documentée ; "
        "huit artefacts ne comptent donc pas comme huit preuves indépendantes."
    ),
    "failure_mode_clusters": [
        {
            "cluster": "aquifer_salinity_delayed_degradation",
            "members": [
                "virelian-delta-aquifer",
                "delta-salinity-encroachment",
            ],
            "shared_failure_mode": (
                "Le gain hydraulique immédiat masque une dégradation différée "
                "de salinité, de droits ou de récupération."
            ),
            "dependence_classification": "substantially_dependent",
            "basis": (
                "Le registre déclare delta-salinity-encroachment dépendant du "
                "mécanisme de virelian-delta-aquifer."
            ),
        },
        {
            "cluster": "drought_quota_allocation_lock_in",
            "members": [
                "irrigation-quota-fracture-plaine-canaux",
                "bassin-valdrome-hydrique",
            ],
            "shared_failure_mode": (
                "Sécheresse cumulative, allocation stable ou investissement "
                "lourd déplacent les pertes vers réserves, droits et récupération."
            ),
            "dependence_classification": "partially_dependent",
            "basis": (
                "Le registre déclare bassin-valdrome-hydrique partiellement "
                "dépendant d'irrigation-quota-fracture-plaine-canaux."
            ),
        },
        {
            "cluster": "archipelago_stock_ecological_shock",
            "members": [
                "archipel-thalasso-crise",
                "archipel-thalasso-v1",
            ],
            "shared_failure_mode": (
                "Un choc insulaire sur les stocks ou flux écologiques favorise "
                "une règle simple à court terme et reporte les pertes."
            ),
            "dependence_classification": INDEPENDENCE_UNKNOWN,
            "basis": (
                "La proximité thématique est observable, mais aucune chaîne de "
                "réutilisation entre les deux histoires n'est documentée."
            ),
        },
        {
            "cluster": "toxic_inflow_leaking_reserve_mobility",
            "members": ["rupture-digues-arbitrage-droits-eau"],
            "shared_failure_mode": (
                "Pollution, fuite de réserve et interventions ciblées peuvent "
                "dégrader la portabilité effective."
            ),
            "dependence_classification": INDEPENDENCE_UNKNOWN,
            "basis": "La lignée du générateur n'est pas documentée.",
        },
        {
            "cluster": "rare_action_information_and_inertia",
            "members": ["orbital-subduction-cascade"],
            "shared_failure_mode": (
                "Une information fiable mais une action rare peuvent rendre "
                "l'inertie d'une stratégie complexe coûteuse."
            ),
            "dependence_classification": INDEPENDENCE_UNKNOWN,
            "basis": (
                "La révision 1.0.0 vers 1.0.1 est enregistrée, mais son processus "
                "d'auteur et sa lignée de générateur ne le sont pas."
            ),
        },
    ],
    "scenario_uses": {
        "orbital-subduction-cascade": {
            "fixture": True,
            "adversarial_test": "rare_action_information_and_inertia",
            "evidence": "partial_internal_coverage_only",
        },
        "virelian-delta-aquifer": {
            "fixture": True,
            "adversarial_test": "aquifer_salinity_delayed_degradation",
            "evidence": "partial_cluster_level_only",
        },
        "irrigation-quota-fracture-plaine-canaux": {
            "fixture": True,
            "adversarial_test": "drought_quota_allocation_lock_in",
            "evidence": "partial_cluster_level_only",
        },
        "archipel-thalasso-crise": {
            "fixture": True,
            "adversarial_test": "archipelago_stock_ecological_shock",
            "evidence": "partial_cluster_level_only",
        },
        "archipel-thalasso-v1": {
            "fixture": True,
            "adversarial_test": "archipelago_stock_ecological_shock",
            "evidence": "not_separate_from_archipelago_cluster",
        },
        "rupture-digues-arbitrage-droits-eau": {
            "fixture": True,
            "adversarial_test": "toxic_inflow_leaking_reserve_mobility",
            "evidence": "partial_internal_coverage_only",
        },
        "delta-salinity-encroachment": {
            "fixture": True,
            "adversarial_test": "aquifer_salinity_delayed_degradation",
            "evidence": "not_separate_from_virelian_cluster",
        },
        "bassin-valdrome-hydrique": {
            "fixture": True,
            "adversarial_test": "drought_quota_allocation_lock_in",
            "evidence": "not_separate_from_irrigation_cluster",
        },
    },
    "evidence_ceiling": (
        "Les huit scénarios restent utilisables comme fixtures et tests adverses. "
        "Ils apportent au plus une preuve partielle de couverture interne, par "
        "grappe de dépendance ; ils ne prouvent aucune indépendance externe."
    ),
}


# Champs inconnus : même liste explicite pour chacun des huit scénarios. Une
# absence documentaire n'est jamais transformée en réponse plausible.
UNKNOWN_FIELD_NAMES = (
    "ai_provider",
    "ai_model",
    "prompt_or_prompt_family",
    "transmitted_context",
    "authoring_or_freeze_date",
    "human_intervention",
    "prior_story_reuse_beyond_declared_known_v1_exclusion",
    "generator_lineage",
)
UNKNOWN_FIELDS: dict[str, dict[str, str]] = {
    admission["scenario_id"]: {
        field: INDEPENDENCE_UNKNOWN for field in UNKNOWN_FIELD_NAMES
    }
    for admission in OBSERVED_FACTS["admissions"]
}


def _read_json(path: Path) -> dict[str, Any]:
    """Lire un objet JSON sans aucune ouverture en écriture."""
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"{path}: objet JSON attendu")
    return value


def _scenario_hash(document: dict[str, Any]) -> str:
    """Reproduire computeScenarioHash après retrait du bloc freeze."""
    payload = {key: value for key, value in document.items() if key != "freeze"}
    canonical = json.dumps(
        payload,
        ensure_ascii=False,
        allow_nan=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return f"sha256:{hashlib.sha256(canonical).hexdigest()}"


def _check_equal(
    errors: list[str], label: str, actual: Any, expected: Any
) -> None:
    if actual != expected:
        errors.append(f"{label}: attendu {expected!r}, obtenu {actual!r}")


def verify() -> list[str]:
    """Vérifier le registre d'audit contre les artefacts, en lecture seule."""
    errors: list[str] = []
    try:
        registry = _read_json(REGISTRY)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return [f"registry: lecture impossible: {exc}"]

    campaign = OBSERVED_FACTS["campaign"]
    for field in (
        "campaign_id",
        "required_count",
        "admitted_count",
        "campaign_independence_status",
        "campaign_readiness",
        "identity_status",
    ):
        _check_equal(errors, f"registry.{field}", registry.get(field), campaign[field])

    entries = registry.get("entries")
    if not isinstance(entries, list):
        return errors + ["registry.entries: liste attendue"]
    admitted = [entry for entry in entries if entry.get("status") == "admitted"]
    expected = {
        (item["scenario_id"], item["version"]): item
        for item in OBSERVED_FACTS["admissions"]
    }
    actual = {
        (item.get("scenario_id"), item.get("version")): item for item in admitted
    }
    _check_equal(errors, "admitted keys", set(actual), set(expected))
    _check_equal(errors, "admitted entry count", len(admitted), 8)
    _check_equal(errors, "unique admitted key count", len(actual), 8)

    common = OBSERVED_FACTS["common_declared_dependencies"]
    checked_ids: set[str] = set()
    for key, expected_item in expected.items():
        entry = actual.get(key)
        if entry is None:
            continue
        scenario_id, version = key
        prefix = f"{scenario_id}@{version}"
        checked_ids.add(scenario_id)
        for field in (
            "scenario_id",
            "version",
            "path",
            "freeze_hash",
            "author_id",
            "source_status",
        ):
            _check_equal(
                errors,
                f"{prefix}.registry.{field}",
                entry.get(field),
                expected_item[field],
            )
        _check_equal(
            errors,
            f"{prefix}.registry.status",
            entry.get("status"),
            expected_item["admission_status"],
        )
        expected_dependence = expected_item["declared_dependence_status"]
        if expected_dependence == ABSENT:
            if "dependence_status" in entry:
                errors.append(
                    f"{prefix}.registry.dependence_status: champ attendu absent"
                )
        else:
            _check_equal(
                errors,
                f"{prefix}.registry.dependence_status",
                entry.get("dependence_status"),
                expected_dependence,
            )

        path = (SUBMISSIONS / expected_item["path"]).resolve()
        if path.parent != SUBMISSIONS.resolve():
            errors.append(f"{prefix}.path: sortie de submissions interdite")
            continue
        try:
            document = _read_json(path)
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            errors.append(f"{prefix}.scenario: lecture impossible: {exc}")
            continue

        manifest = document.get("manifest", {})
        source = document.get("source", {})
        envelope = document.get("campaignEnvelope", {})
        freeze = document.get("freeze", {})
        _check_equal(errors, f"{prefix}.schema", document.get("schema"), common["schema"])
        _check_equal(errors, f"{prefix}.manifest.id", manifest.get("id"), scenario_id)
        _check_equal(errors, f"{prefix}.manifest.version", manifest.get("version"), version)
        _check_equal(
            errors,
            f"{prefix}.source.regime",
            source.get("regime"),
            common["source_regime"],
        )
        _check_equal(
            errors,
            f"{prefix}.source.authorId",
            source.get("authorId"),
            expected_item["author_id"],
        )
        _check_equal(
            errors,
            f"{prefix}.source.authorshipTrace",
            source.get("authorshipTrace"),
            expected_item["authorship_trace"],
        )
        _check_equal(
            errors,
            f"{prefix}.source.authorRelationToCorpus",
            source.get("authorRelationToCorpus"),
            common["author_relation_to_corpus"],
        )
        _check_equal(
            errors,
            f"{prefix}.source.frozenBeforeContenders",
            source.get("frozenBeforeContenders"),
            common["frozen_before_contenders"],
        )
        _check_equal(
            errors,
            f"{prefix}.campaignEnvelope.protocolVersion",
            envelope.get("protocolVersion"),
            common["protocol_version"],
        )
        _check_equal(
            errors,
            f"{prefix}.campaignEnvelope.independenceDeclaration",
            envelope.get("independenceDeclaration"),
            common["independence_declaration"],
        )
        _check_equal(
            errors,
            f"{prefix}.campaignEnvelope.matching",
            envelope.get("matching"),
            common["matching"],
        )
        _check_equal(errors, f"{prefix}.freeze.algorithm", freeze.get("algorithm"), "sha256")
        _check_equal(
            errors,
            f"{prefix}.freeze.contentHash",
            freeze.get("contentHash"),
            expected_item["freeze_hash"],
        )
        try:
            computed_hash = _scenario_hash(document)
        except (TypeError, ValueError) as exc:
            errors.append(f"{prefix}.freeze: empreinte impossible: {exc}")
        else:
            _check_equal(
                errors,
                f"{prefix}.freeze.computed",
                computed_hash,
                expected_item["freeze_hash"],
            )

    expected_ids = {item["scenario_id"] for item in expected.values()}
    _check_equal(errors, "checked scenario ids", checked_ids, expected_ids)
    _check_equal(errors, "unknown-field scenario ids", set(UNKNOWN_FIELDS), expected_ids)
    _check_equal(
        errors,
        "classified scenario ids",
        set(PROPOSED_CLASSIFICATIONS["scenario_uses"]),
        expected_ids,
    )
    classified_members = {
        member
        for cluster in PROPOSED_CLASSIFICATIONS["failure_mode_clusters"]
        for member in cluster["members"]
    }
    _check_equal(errors, "failure-cluster scenario ids", classified_members, expected_ids)
    for scenario_id, fields in UNKNOWN_FIELDS.items():
        if set(fields) != set(UNKNOWN_FIELD_NAMES):
            errors.append(f"{scenario_id}.unknown_fields: liste incomplète")
        for field, value in fields.items():
            if value != INDEPENDENCE_UNKNOWN:
                errors.append(
                    f"{scenario_id}.unknown_fields.{field}: doit rester independence_unknown"
                )
    return errors


if __name__ == "__main__":
    failures = verify()
    print(
        json.dumps(
            {
                "valid": not failures,
                "campaign_id": OBSERVED_FACTS["campaign"]["campaign_id"],
                "checked_admissions": len(OBSERVED_FACTS["admissions"]),
                "checked_fields": [
                    "scenario_id",
                    "version",
                    "path",
                    "freeze_hash_declared_and_recomputed",
                    "admission_status",
                    "declared_dependence_status",
                    "common_declared_dependencies",
                    "unknown_fields_are_independence_unknown",
                ],
                "errors": failures,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    raise SystemExit(1 if failures else 0)
