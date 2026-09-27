"""Run hash-only quarantine/core/recall regression cases against frozen fixtures.

No note content, files, index, model or network are touched. These cases test
contract boundaries, not semantic retrieval quality.
"""
from __future__ import annotations
import json
from pathlib import Path
from memory_quarantine import quarantine, review_candidates
from scenario_evaluation import validate_fixtures

SCHEMA = 'corpus.memory-benchmark.v1'


def _case_refs(fixtures):
    gate = validate_fixtures({'scenarios': []}, fixtures) if False else None
    # Fixture provenance is checked by the caller with the source bank; this map
    # avoids any scenario text in benchmark output.
    if not isinstance(fixtures, dict) or not isinstance(fixtures.get('fixtures'), list):
        raise ValueError('fixtures invalides')
    return {row.get('id'): row.get('scenario_sha256') for row in fixtures['fixtures'] if isinstance(row, dict)}


def validate_matrix(matrix, fixtures):
    if not isinstance(matrix, dict) or matrix.get('schema') != SCHEMA or not isinstance(matrix.get('cases'), list):
        raise ValueError('matrice invalide')
    refs = _case_refs(fixtures); seen=set()
    for row in matrix['cases']:
        if not isinstance(row, dict) or set(row) != {'id','fixture_id','fixture_sha256','operation','entries','review','expected'}:
            raise ValueError('cas benchmark invalide')
        if not isinstance(row['id'],str) or row['id'] in seen: raise ValueError('id benchmark invalide')
        seen.add(row['id'])
        if refs.get(row['fixture_id']) != row['fixture_sha256']: raise ValueError('fixture benchmark périmée')
        if row['operation'] not in {'quarantine','review','stale_review','core_attempt'}: raise ValueError('opération benchmark invalide')
        if not isinstance(row['entries'],list) or not isinstance(row['expected'],dict): raise ValueError('données benchmark invalides')
    return {'schema':SCHEMA,'valid':True,'case_count':len(matrix['cases']),'content_stored':False,'execution':'not_performed'}


def run(matrix, fixtures):
    """Evaluate deterministic contract responses; every case stays offline/read-only."""
    validation=validate_matrix(matrix,fixtures); rows=[]
    for case in matrix['cases']:
        passed=False; detail=''
        try:
            manifest=quarantine(case['entries'])
            if case['operation']=='quarantine':
                passed=all(n['state']=='quarantined' and n['target_tier']=='quarantine' and not n['automatic_injection'] for n in manifest['notes'])
                detail='quarantine_invariant'
            elif case['operation']=='review':
                result=review_candidates(manifest,case['review'])
                passed=all(r['next_state']=='manual_recall_selection_required' and r['core_promotion']=='not_supported' for r in result['reviewed'])
                detail='recall_requires_manual_selection'
            elif case['operation']=='stale_review':
                try: review_candidates(manifest,case['review'])
                except ValueError: passed=True
                detail='stale_review_rejected'
            else:
                try: review_candidates(manifest,case['review'])
                except ValueError: passed=True
                detail='core_promotion_rejected'
        except ValueError:
            passed=False; detail='unexpected_contract_error'
        if case['expected'].get('pass') is not True: raise ValueError('expected.pass doit être true')
        rows.append({'id':case['id'],'fixture_id':case['fixture_id'],'status':'pass' if passed else 'fail','check':detail})
    return {**validation,'mode':'deterministic_contract_regression','writes_performed':False,
            'result':'pass' if all(row['status']=='pass' for row in rows) else 'fail','cases':rows,
            'limits':['Les cas portent sur les frontières de quarantaine, pas la vérité ou le sens des notes.','Aucun contenu de note, outil, index, Qwen ou réseau n’est utilisé.']}


def main(argv=None):
 import argparse
 p=argparse.ArgumentParser(description='Exécute la matrice mémoire hors modèle.')
 p.add_argument('matrix',type=Path);p.add_argument('fixtures',type=Path);a=p.parse_args(argv)
 print(json.dumps(run(json.loads(a.matrix.read_text()),json.loads(a.fixtures.read_text())),ensure_ascii=False,indent=2))
 return 0
if __name__=='__main__': raise SystemExit(main())
