"""Read-only classification of already-observed local runtime diagnostics."""
from __future__ import annotations
import math
from typing import Any


def _object(value: Any, name: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError(name + ' doit être un objet.')
    return value


def _time(value: Any, name: str) -> float:
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value) or value < 0:
        raise ValueError(name + ' invalide.')
    return float(value)


def assess(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Classify a diagnostic snapshot; never poll, restart, or invoke inference."""
    snapshot = _object(snapshot, 'snapshot')
    if set(snapshot) != {'health', 'cuda_errors', 'active_sessions', 'observed', 'observed_at_unix', 'evaluated_at_unix', 'max_age_seconds'}:
        raise ValueError('Champs snapshot incomplets ou inconnus.')
    health = _object(snapshot['health'], 'health')
    if set(health) != {'ready', 'state'} or type(health['ready']) is not bool or not isinstance(health['state'], str):
        raise ValueError('health invalide.')
    if not isinstance(snapshot['cuda_errors'], list) or any(not isinstance(x, str) or not x for x in snapshot['cuda_errors']):
        raise ValueError('cuda_errors invalide.')
    if type(snapshot['active_sessions']) is not int or snapshot['active_sessions'] < 0:
        raise ValueError('active_sessions invalide.')
    if snapshot['observed'] not in {'observed', 'unknown'}:
        raise ValueError('observed invalide.')
    observed_at = _time(snapshot['observed_at_unix'], 'observed_at_unix')
    evaluated_at = _time(snapshot['evaluated_at_unix'], 'evaluated_at_unix')
    max_age = _time(snapshot['max_age_seconds'], 'max_age_seconds')
    if evaluated_at < observed_at or max_age <= 0:
        raise ValueError('Horodatage ou durée de validité invalide.')
    age = round(evaluated_at - observed_at, 3)
    reasons = []
    if snapshot['observed'] != 'observed':
        reasons.append('diagnostic_non_observé')
    if not health['ready'] or health['state'] != 'ready':
        reasons.append('service_non_prêt')
    if snapshot['cuda_errors']:
        reasons.append('erreur_cuda_observée')
    if age > max_age:
        reasons.append('diagnostic_expiré')
    if reasons:
        # A stale probe cannot establish current health, even when it records a
        # prior CUDA failure.  Keep that failure in the reasons but do not turn
        # historical evidence into a claim about the current process.
        state = 'unknown' if snapshot['observed'] != 'observed' or age > max_age else 'degraded'
        admission = 'inference_prohibited'
    else:
        state = 'ready'
        admission = 'not_authorized_by_evaluator'
    return {
        'schema_version': 1,
        'kind': 'runtime_resilience_assessment',
        'state': state,
        'inference_admission': admission,
        'blocking_reasons': reasons,
        'observations': {
            'health_ready': health['ready'], 'health_state': health['state'],
            'cuda_error_count': len(snapshot['cuda_errors']), 'active_sessions': snapshot['active_sessions'],
            'observation_age_seconds': age, 'maximum_age_seconds': max_age,
            'fresh': age <= max_age,
        },
        'execution': 'not_started',
        'limits': [
            'Ready décrit un instantané observé ; il ne lance ni n’autorise une inférence.',
            'Un diagnostic expiré devient inconnu : il ne décrit pas l’état actuel du service.',
            'Dégradé ou inconnu interdit toute inférence par ce contrat jusqu’à une nouvelle observation saine.',
            'Aucun appel réseau, redémarrage, modèle ou session n’est effectué.',
        ],
    }
