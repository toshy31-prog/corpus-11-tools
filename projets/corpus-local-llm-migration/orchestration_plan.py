"""Planifie des lots agentiques locaux sans lancer d'agent ni d'outil.

La parallélisation est admise seulement pour des tâches explicitement déclarées
indépendantes, sans ressource exclusive commune. Les tâches inconnues ou
séquentielles restent dans une vague unitaire : le plan ne déduit jamais une
autorisation d'exécution.
"""
from __future__ import annotations

from collections import defaultdict
from copy import deepcopy


class PlanError(ValueError):
    """Le plan ne fournit pas une preuve suffisante de parallélisme."""


def _task(value):
    if not isinstance(value, dict):
        raise PlanError('Tâche invalide.')
    ident = value.get('id')
    if not isinstance(ident, str) or not ident or len(ident) > 120:
        raise PlanError('Identifiant de tâche invalide.')
    deps = value.get('depends_on', [])
    resources = value.get('exclusive_resources', [])
    if (not isinstance(deps, list) or not all(isinstance(item, str) and item for item in deps)
            or not isinstance(resources, list) or not all(isinstance(item, str) and item for item in resources)):
        raise PlanError(f'Contrat invalide pour {ident}.')
    safe = value.get('parallel_safe', False)
    if not isinstance(safe, bool):
        raise PlanError(f'parallel_safe invalide pour {ident}.')
    return {'id': ident, 'depends_on': list(deps),
            'exclusive_resources': sorted(set(resources)), 'parallel_safe': safe}


def build_waves(tasks):
    """Retourne des vagues prêtes, sans exécuter les tâches décrites.

    Une tâche n'est mise avec une autre que si *les deux* l'autorisent et si
    elles ne déclarent aucune ressource exclusive commune. Toute tâche sans
    preuve de parallélisme forme sa propre vague.
    """
    if not isinstance(tasks, list) or not tasks:
        raise PlanError('Liste de tâches non vide requise.')
    rows = [_task(item) for item in tasks]
    by_id = {row['id']: row for row in rows}
    if len(by_id) != len(rows):
        raise PlanError('Identifiants de tâches dupliqués.')
    for row in rows:
        unknown = set(row['depends_on']) - set(by_id)
        if unknown:
            raise PlanError(f"Dépendance inconnue pour {row['id']} : {sorted(unknown)[0]}.")
        if row['id'] in row['depends_on']:
            raise PlanError(f"Dépendance circulaire pour {row['id']}.")

    remaining = {row['id']: set(row['depends_on']) for row in rows}
    completed = set()
    waves = []
    while remaining:
        ready = [by_id[ident] for ident, deps in remaining.items() if deps <= completed]
        if not ready:
            raise PlanError('Dépendances circulaires ou impossibles.')
        wave, used = [], set()
        for row in ready:
            resources = set(row['exclusive_resources'])
            if not wave:
                wave.append(row)
                used |= resources
            elif row['parallel_safe'] and all(item['parallel_safe'] for item in wave) and not resources & used:
                wave.append(row)
                used |= resources
        # A sequential first task is deliberately isolated even if later work is ready.
        identifiers = [row['id'] for row in wave]
        waves.append({'tasks': identifiers,
                      'parallel': len(identifiers) > 1,
                      'basis': ('indépendance déclarée et ressources exclusives disjointes'
                                if len(identifiers) > 1 else 'ordre conservateur')})
        completed.update(identifiers)
        for ident in identifiers:
            remaining.pop(ident)
    return {'schema_version': 1, 'execution': 'not_started', 'waves': waves,
            'limits': ['aucun agent ni outil n’est lancé',
                       'les permissions et la validation restent exigées par tâche',
                       'parallel_safe est une déclaration à vérifier, pas une preuve de résultat']}
