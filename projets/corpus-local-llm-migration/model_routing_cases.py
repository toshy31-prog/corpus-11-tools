"""Frozen, deterministic regression cases for static model routing.

Cases contain request metadata and expected route evidence, never prompts. Running
them calls only the pure ``model_routing.decide`` function; no model, service,
configuration or download is touched.
"""
from __future__ import annotations
import hashlib,json
from pathlib import Path
from model_routing import decide

SCHEMA='corpus.model-routing-cases.v1'
HERE=Path(__file__).resolve().parent
REGISTRY=HERE/'model_routing_registry.json'; LOCK=HERE/'CORE_MODELS_LOCK.json'

def _sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def _case(row):
 if not isinstance(row,dict) or set(row)!={'id','task_class','request','expected'}:raise ValueError('cas routage invalide')
 if not isinstance(row['id'],str) or not row['id'] or row['task_class'] not in {'simple','complex','tool','multimodal','unavailable_profile'}:raise ValueError('métadonnées cas invalides')
 if not isinstance(row['request'],dict) or not isinstance(row['expected'],dict):raise ValueError('cas routage invalide')
 expected=row['expected']
 if set(expected)-{'decision','selected_id','deferred_reason'} or expected.get('decision') not in {'select_configured_profile','defer_no_eligible_profile'} or not isinstance(expected.get('selected_id'),(str,type(None))) or (expected.get('deferred_reason') is not None and not isinstance(expected.get('deferred_reason'),str)):raise ValueError('attendu routage invalide')
 return row

def validate(cases,registry_path=REGISTRY,lock_path=LOCK):
 if not isinstance(cases,dict) or cases.get('schema')!=SCHEMA or not isinstance(cases.get('cases'),list):raise ValueError('banque routage invalide')
 if cases.get('registry_sha256')!=_sha(registry_path) or cases.get('lock_sha256')!=_sha(lock_path):raise ValueError('registre ou lock routage dérivé')
 rows=[_case(row) for row in cases['cases']];ids=[r['id'] for r in rows]
 if not rows or len(ids)!=len(set(ids)):raise ValueError('ids de cas invalides')
 return {'schema':SCHEMA,'valid':True,'case_count':len(rows),'execution':'not_started','runtime_change':'none'}

def run(cases,registry_path=REGISTRY,lock_path=LOCK):
 gate=validate(cases,registry_path,lock_path); rows=[]
 for case in cases['cases']:
  result=decide(case['request'])
  expected=case['expected'];selected=result['selected']['id'] if result['selected'] else None
  deferred_reasons=[reason for row in result['deferred'] for reason in row['reasons']]
  checks={'decision':result['decision']==expected['decision'],'selected_id':selected==expected['selected_id'],'deferred_reason':expected.get('deferred_reason') is None or expected['deferred_reason'] in deferred_reasons,'runtime_unchanged':result['execution']=='not_started' and result['runtime_change']=='none'}
  rows.append({'id':case['id'],'task_class':case['task_class'],'status':'pass' if all(checks.values()) else 'fail','checks':checks})
 return {**gate,'mode':'static_route_regression','writes_performed':False,'result':'pass' if all(r['status']=='pass' for r in rows) else 'fail','cases':rows,'limits':['task_class est une étiquette de fixture : le routeur actuel ne prétend pas inférer la complexité.','Le résultat vérifie un choix de profil statique, jamais la qualité, la vitesse ou une exécution réelle.']}

def main(argv=None):
 import argparse
 p=argparse.ArgumentParser(description='Vérifie les cas gelés de routage modèle hors runtime.')
 p.add_argument('cases',type=Path);a=p.parse_args(argv)
 print(json.dumps(run(json.loads(a.cases.read_text(encoding='utf-8'))),ensure_ascii=False,indent=2));return 0
if __name__=='__main__':raise SystemExit(main())
