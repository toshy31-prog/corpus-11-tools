"""Validate a local registry for lawful, reviewable upstream adoption.

This does not download, install, or decide whether upstream code is legally
compatible.  It rejects a code import that lacks an immutable source revision,
a stated license, retained notice, or local test reference.
"""
from __future__ import annotations

from urllib.parse import urlparse
from datetime import date

from research_source_contract import validate as validate_source


class AdoptionError(ValueError):
    pass


PERMISSIVE = {'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'}
PACKET_SCHEMA = 'corpus.adoption-review.v1'


def _text(value, name, limit=500):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise AdoptionError(f'{name} invalide.')
    return value.strip()


def validate(entries):
    if not isinstance(entries, list):
        raise AdoptionError('Liste d’adoptions requise.')
    identifiers = set()
    result = []
    for row in entries:
        if not isinstance(row, dict):
            raise AdoptionError('Entrée d’adoption invalide.')
        ident = _text(row.get('id'), 'id', 120)
        if ident in identifiers:
            raise AdoptionError('id dupliqué.')
        identifiers.add(ident)
        mode = _text(row.get('mode'), 'mode', 40)
        if mode not in {'idea', 'code', 'local_implementation'}:
            raise AdoptionError('mode inconnu.')
        source = row.get('source')
        if mode != 'local_implementation':
            source = _text(source, 'source')
            parsed = urlparse(source)
            if parsed.scheme != 'https' or not parsed.netloc:
                raise AdoptionError('source HTTPS requise.')
        checked = {'id': ident, 'mode': mode, 'source': source or None,
                   'state': 'review_required'}
        if mode == 'code':
            license_id = _text(row.get('license'), 'licence', 80)
            revision = _text(row.get('revision'), 'révision', 128)
            notice = _text(row.get('notice_path'), 'notice_path')
            test = _text(row.get('local_test'), 'local_test')
            if license_id not in PERMISSIVE:
                raise AdoptionError('licence non admise sans revue explicite.')
            if len(revision) < 7:
                raise AdoptionError('révision immuable requise.')
            checked.update(license=license_id, revision=revision,
                           notice_path=notice, local_test=test,
                           state='reviewable_code_import')
        elif mode == 'idea':
            checked['state'] = 'idea_only_no_code_copied'
        else:
            checked['state'] = 'native_code_no_upstream_copy'
        result.append(checked)
    return {'schema_version': 1, 'entries': result,
            'limits': ['le registre ne télécharge ni ne copie de code',
                       'une licence déclarée doit être vérifiée humainement',
                       'reviewable_code_import ne signifie ni intégré ni déployé']}


def validate_review_packet(packet):
    """Link proposed adoptions to dated, typed source metadata offline.

    A community or secondary source can inform an *idea*, but cannot support a
    code-copy proposal.  The output is a review queue only: it performs no
    fetch, import, installation, or license determination.
    """
    if not isinstance(packet, dict) or set(packet) != {'schema', 'sources', 'adoptions', 'links'}:
        raise AdoptionError('Packet de revue invalide.')
    if packet['schema'] != PACKET_SCHEMA:
        raise AdoptionError('Schéma de packet inconnu.')
    adoptions = validate(packet['adoptions'])
    sources_raw = packet['sources']
    if not isinstance(sources_raw, list) or not sources_raw:
        raise AdoptionError('Sources de revue requises.')
    sources = {}
    for raw in sources_raw:
        try:
            source = validate_source(raw)
        except ValueError as exc:
            raise AdoptionError(f'Source de revue invalide: {exc}') from exc
        ident = source['id']
        if ident in sources:
            raise AdoptionError('id de source dupliqué.')
        # A later publication date than the declared review date cannot be
        # evidence for that review.
        sources[ident] = raw
    adoption_by_id = {row['id']: row for row in adoptions['entries']}
    links = packet['links']
    if not isinstance(links, list) or len(links) != len(adoption_by_id):
        raise AdoptionError('Chaque adoption doit avoir exactement un lien de revue.')
    seen = set()
    reviewed = []
    for link in links:
        if not isinstance(link, dict) or set(link) != {'adoption_id', 'source_id', 'reviewed_on', 'decision'}:
            raise AdoptionError('Lien de revue invalide.')
        adoption_id = _text(link['adoption_id'], 'adoption_id', 120)
        source_id = _text(link['source_id'], 'source_id', 120)
        if adoption_id in seen or adoption_id not in adoption_by_id or source_id not in sources:
            raise AdoptionError('Lien de revue dupliqué ou inconnu.')
        seen.add(adoption_id)
        try:
            reviewed_on = date.fromisoformat(_text(link['reviewed_on'], 'reviewed_on', 10))
        except ValueError as exc:
            raise AdoptionError('reviewed_on invalide.') from exc
        if link['decision'] not in {'observe', 'propose_adaptation', 'propose_code_review'}:
            raise AdoptionError('Décision de revue invalide.')
        source = sources[source_id]
        if date.fromisoformat(source['published_on']) > reviewed_on:
            raise AdoptionError('Source postérieure à la revue déclarée.')
        adoption = adoption_by_id[adoption_id]
        if adoption['mode'] == 'code':
            if source['source_kind'] != 'primary':
                raise AdoptionError('Le code exige une source primaire maintenue.')
            if source['license_status'] != 'open_verified':
                raise AdoptionError('Le code exige une licence source ouverte vérifiée.')
            if link['decision'] != 'propose_code_review':
                raise AdoptionError('Le code exige une proposition de revue de code explicite.')
            state = 'code_review_pending_no_import'
        else:
            if link['decision'] == 'propose_code_review':
                raise AdoptionError('Une idée ou une implémentation locale ne peut proposer une revue de copie de code.')
            kind = source['source_kind']
            state = {'primary': 'primary_inspiration_only', 'community': 'community_signal_only',
                     'secondary': 'secondary_signal_only'}[kind]
        reviewed.append({'adoption_id': adoption_id, 'source_id': source_id,
                         'source_kind': source['source_kind'], 'reviewed_on': reviewed_on.isoformat(),
                         'decision': link['decision'], 'state': state})
    return {'schema': PACKET_SCHEMA, 'mode': 'local_review_metadata_only', 'writes_performed': False,
            'network': 'not_used', 'result': 'reviewable', 'reviews': reviewed,
            'limits': ['Les dates, licences et statuts de source restent déclaratifs jusqu’à preuve externe.',
                       'Ce packet ne copie, télécharge, installe ni intègre de code.',
                       'code_review_pending_no_import ne vaut ni autorisation juridique ni intégration.']}
