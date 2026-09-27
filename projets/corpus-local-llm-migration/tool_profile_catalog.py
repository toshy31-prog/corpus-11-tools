"""Offline profile validation and user-facing tool names; no inference.

Validation follows JSON Schema's types/required/uniqueItems principles:
https://json-schema.org/understanding-json-schema/reference/array
https://json-schema.org/understanding-json-schema/reference/object
No upstream code copied; no additional dependency.
"""
import copy
import re

_LABELS = {
    'read': 'Lire un fichier ou dossier',
    'glob': 'Rechercher des fichiers par nom',
    'grep': 'Rechercher dans le contenu des fichiers',
    'edit': 'Modifier un fichier',
    'write': 'Écrire ou remplacer un fichier',
    'bash': 'Exécuter une commande locale',
    'task': 'Déléguer à un agent',
    'corpus-retrieval_memory_search': 'Rechercher dans la mémoire',
    'corpus-retrieval_memory_index_text': 'Ajouter un texte à la mémoire',
    'corpus-retrieval_memory_delete': 'Retirer un document de la mémoire',
    'corpus-tools_browser_request': 'Demander une action du navigateur',
    'corpus-tools_browser_result': 'Consulter une action du navigateur',
    'corpus-tools_research_request': 'Demander une recherche web',
    'corpus-tools_research_result': 'Consulter une recherche web',
    'corpus-tools_document_extract': 'Lire le contenu d’un document',
    'corpus-tools_document_create': 'Créer un document',
    'corpus-tools_document_formats': 'Consulter les formats de documents',
    'corpus-tools_document_result': 'Consulter un document créé',
    'corpus-tools_media_generate': 'Générer une image, vidéo ou un son',
    'corpus-tools_media_models': 'Consulter les moteurs et rendus multimédias',
    'corpus-tools_media_result': 'Consulter une génération multimédia',
    'corpus-tools_git_request': 'Demander une opération Git',
    'corpus-tools_ssh_request': 'Demander une commande distante',
    'corpus-tools_plugins_list': 'Lister les méthodes activées',
    'corpus-tools_plugin_resources': 'Lister les ressources d’une méthode',
    'corpus-tools_plugin_read': 'Lire une méthode ou sa documentation',
}


def _known_tools(catalog):
    if not isinstance(catalog, dict) or not isinstance(catalog.get('tools'), dict):
        raise ValueError('Le catalogue doit contenir un objet tools.')
    if any(not isinstance(name, str) or not name for name in catalog['tools']):
        raise ValueError('Le catalogue contient un nom d’outil invalide.')
    return catalog['tools']


def tool_labels(catalog):
    """Return labels only for available tools; retain unknown future names."""
    return {name: _LABELS.get(name, name) for name in _known_tools(catalog)}


def validate_profiles(data, catalog):
    """Return detached validated rows, or ValueError with an actionable reason.

    Extra metadata is preserved. The empty tools list remains valid for the
    answer-only profile. Exposure profiles never confer execution permission.
    """
    known = _known_tools(catalog)
    if not isinstance(data, dict):
        raise ValueError('La configuration des profils doit être un objet.')
    if type(data.get('schema_version')) is not int or data['schema_version'] != 1:
        raise ValueError('Version des profils non prise en charge (attendue : 1).')
    rows = data.get('profiles')
    if not isinstance(rows, list):
        raise ValueError('profiles doit être une liste.')
    seen = set()
    for index, row in enumerate(rows):
        where = f'Profil {index + 1}'
        if not isinstance(row, dict):
            raise ValueError(f'{where} : un objet est attendu.')
        for field in ('id', 'label', 'description'):
            if not isinstance(row.get(field), str) or not row[field].strip():
                raise ValueError(f'{where} : {field} doit être un texte non vide.')
        if not re.fullmatch(r'[a-z][a-z0-9_-]*', row['id']):
            raise ValueError(f'{where} : identifiant invalide.')
        if row['id'] in seen:
            raise ValueError(f'{where} : identifiant dupliqué ({row["id"]}).')
        seen.add(row['id'])
        names = row.get('tools')
        if not isinstance(names, list) or any(not isinstance(n, str) or not n for n in names):
            raise ValueError(f'{where} : tools doit être une liste de noms d’outils.')
        if len(names) != len(set(names)):
            raise ValueError(f'{where} : un outil apparaît plusieurs fois.')
        unknown = set(names) - known.keys()
        if unknown:
            raise ValueError(f'{where} : outils inconnus : {", ".join(sorted(unknown))}.')
    return copy.deepcopy(rows)
