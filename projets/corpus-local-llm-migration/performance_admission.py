"""Admit or defer a future Qwen cache experiment from recorded aggregate evidence.

This module is deliberately upstream from ``performance_experiment.py``: it
checks whether a two-run experiment is worth spending local inference on.
It consumes only aggregate telemetry and never reads prompts, starts services,
changes configuration, or invokes a model.
"""
from __future__ import annotations

import json
from pathlib import Path

SCHEMA = "corpus.performance-admission.v1"
DEFAULT_POLICY = {
    "minimum_continuations": 10,
    "minimum_prefix_candidates": 5,
    "minimum_group_steps": 5,
}


def _mapping(value, label):
    if not isinstance(value, dict):
        raise ValueError(f"{label} doit être un objet.")
    return value


def _integer(value, label, *, minimum=0):
    if type(value) is not int or value < minimum:
        raise ValueError(f"{label} invalide.")
    return value


def _policy(raw):
    value = {**DEFAULT_POLICY, **(_mapping(raw, "policy") if raw is not None else {})}
    if set(value) != set(DEFAULT_POLICY):
        raise ValueError("policy contient une clé inconnue.")
    return {key: _integer(item, key, minimum=1) for key, item in value.items()}


def _variation(value):
    value = _mapping(value, "variation")
    if set(value) != {"key", "baseline", "candidate"}:
        raise ValueError("variation doit définir key, baseline et candidate.")
    key = value["key"]
    if not isinstance(key, str) or not key or len(key) > 80:
        raise ValueError("variation.key invalide.")
    if value["baseline"] == value["candidate"]:
        raise ValueError("La variation doit changer une valeur.")
    return dict(value)


def _groups(value):
    value = _mapping(value, "cache_latency")
    groups = _mapping(value.get("groups"), "cache_latency.groups") if value.get("available") is True else None
    if groups is None:
        return None
    result = {}
    for name in ("with_reported_cache_read", "without_reported_cache_read"):
        group = _mapping(groups.get(name), "cache_latency.groups." + name)
        result[name] = _integer(group.get("steps"), name + ".steps")
    return result


def admit(manifest: dict) -> dict:
    """Return a conservative yes/no admission decision and exact missing evidence."""
    manifest = _mapping(manifest, "manifest")
    if manifest.get("schema") != SCHEMA:
        raise ValueError("Schéma d’admission performance invalide.")
    unknown = set(manifest) - {"schema", "experiment", "variation", "evidence", "policy", "immutable_fields"}
    if unknown:
        raise ValueError("Clés inconnues : " + ", ".join(sorted(unknown)))
    variation = _variation(manifest.get("variation"))
    evidence = _mapping(manifest.get("evidence"), "evidence")
    prefix = _mapping(evidence.get("prefix_cache"), "evidence.prefix_cache")
    counters = _mapping(prefix.get("counters"), "prefix_cache.counters")
    continuations = _integer(counters.get("continuations_observed"), "continuations_observed")
    candidates = _integer(counters.get("prefix_candidates"), "prefix_candidates")
    content_stored = counters.get("content_stored")
    if content_stored is not False:
        raise ValueError("content_stored doit être false pour cette admission.")
    groups = _groups(evidence.get("cache_latency"))
    policy = _policy(manifest.get("policy"))
    immutable = manifest.get("immutable_fields")
    if not isinstance(immutable, list) or not immutable or not all(isinstance(field, str) and field for field in immutable):
        raise ValueError("immutable_fields invalide.")
    reasons = []
    if continuations < policy["minimum_continuations"]:
        reasons.append("continuations_insufficientes")
    if candidates < policy["minimum_prefix_candidates"]:
        reasons.append("candidats_de_prefixe_insuffisants")
    if groups is None:
        reasons.append("latence_cache_non_observee")
    else:
        for name, steps in groups.items():
            if steps < policy["minimum_group_steps"]:
                reasons.append("groupe_insuffisant:" + name)
    admitted = not reasons
    return {
        "schema": SCHEMA,
        "mode": "aggregate_evidence_only",
        "writes_performed": False,
        "experiment": manifest.get("experiment", "unnamed"),
        "variation": variation,
        "decision": "admit_one_grouped_ab_run" if admitted else "defer_qwen_experiment",
        "reasons": reasons,
        "observations": {
            "continuations_observed": continuations,
            "prefix_candidates": candidates,
            "candidate_rate": round(candidates / max(1, continuations), 4),
            "latency_group_steps": groups,
        },
        "policy": policy,
        "comparison_contract": {
            "one_configuration_change": variation["key"],
            "immutable_fields": immutable,
            "record_required": [
                "wall_seconds_from_transcript",
                "execution_chain_verified",
                "terminal_completed",
                "service_ready_after",
                "cuda_errors",
            ],
            "verdict_module": "performance_experiment.py",
        },
        "limits": [
            "Les candidats de préfixe et les lectures de cache déclarées ne prouvent pas un hit KV effectif.",
            "Une admission autorise au plus une expérience A/B groupée à préparer ; elle ne modifie rien et ne lance pas Qwen.",
            "Une comparaison admise doit encore conserver modèle, prompt, outils, fixture et environnement identiques.",
        ],
    }


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description="Décide hors ligne si une expérience cache Qwen est justifiée.")
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args(argv)
    print(json.dumps(admit(json.loads(args.manifest.read_text(encoding="utf-8"))), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
