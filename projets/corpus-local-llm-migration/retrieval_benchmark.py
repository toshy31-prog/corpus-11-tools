"""Frozen adversarial regression cases for recorded retrieval ranking.

The suite calls only ``retrieval_evaluation.evaluate`` over synthetic identifiers.
It never opens the retrieval index, embeddings, reranker, model or network.
"""
from __future__ import annotations
import hashlib,json
from pathlib import Path
from retrieval_evaluation import evaluate

SCHEMA='corpus.retrieval-benchmark.v1'; HERE=Path(__file__).resolve().parent; EVALUATOR=HERE/'retrieval_evaluation.py'
def _sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def validate(matrix,evaluator_path=EVALUATOR):
 if not isinstance(matrix,dict) or matrix.get('schema')!=SCHEMA or not isinstance(matrix.get('cases'),list):raise ValueError('matrice retrieval invalide')
 if matrix.get('evaluator_sha256')!=_sha(evaluator_path):raise ValueError('contrat évaluateur retrieval dérivé')
 seen=set()
 for c in matrix['cases']:
  if not isinstance(c,dict) or set(c)!={'id','manifest','expected'} or not isinstance(c['id'],str) or c['id'] in seen or not isinstance(c['manifest'],dict) or c['expected'] not in {'pass','fail','reject'}:raise ValueError('cas retrieval invalide')
  seen.add(c['id'])
 if not seen:raise ValueError('matrice vide')
 return {'schema':SCHEMA,'valid':True,'case_count':len(seen),'content_stored':False,'execution':'not_performed'}
def run(matrix,evaluator_path=EVALUATOR):
 gate=validate(matrix,evaluator_path);rows=[]
 for c in matrix['cases']:
  try:
   value=evaluate(c['manifest']);actual=value['result'];checks={'expected_result':actual==c['expected']} if c['expected']!='reject' else {'expected_rejection':False}
  except ValueError:
   actual='reject';checks={'expected_rejection':c['expected']=='reject'}
  rows.append({'id':c['id'],'status':'pass' if all(checks.values()) else 'fail','actual':actual,'checks':checks})
 return {**gate,'mode':'synthetic_ranked_identifiers_only','writes_performed':False,'result':'pass' if all(x['status']=='pass' for x in rows) else 'fail','cases':rows,'limits':['Les identifiants sont synthétiques; aucune requête, document, embedding, reranking ou index n’est utilisé.','La suite vérifie le contrat de ranking, pas la pertinence sémantique réelle.']}
def main(argv=None):
 import argparse
 p=argparse.ArgumentParser(description='Exécute les cas retrieval gelés hors index/modèle.');p.add_argument('matrix',type=Path);a=p.parse_args(argv)
 print(json.dumps(run(json.loads(a.matrix.read_text(encoding='utf-8'))),ensure_ascii=False,indent=2));return 0
if __name__=='__main__':raise SystemExit(main())
