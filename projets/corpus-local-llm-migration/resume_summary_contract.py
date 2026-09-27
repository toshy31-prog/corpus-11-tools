"""Content-safe structural verification for local Corpus resume summaries.

A summary carries four explicit epistemic buckets and hash-only memory pointers.
The verifier returns counts/identifiers only: it does not read notes, build a
prompt, write a checkpoint or inject any memory into a model context.
"""
from __future__ import annotations
import json,re
from pathlib import Path
SCHEMA='corpus.resume-summary.v1'; HASH=re.compile(r'^[0-9a-f]{64}$'); ID=re.compile(r'^[A-Za-z0-9._:-]{1,120}$')
def _id(v,label):
 if not isinstance(v,str) or not ID.fullmatch(v):raise ValueError(label+' invalide')
 return v
def _hash(v,label):
 if not isinstance(v,str) or not HASH.fullmatch(v):raise ValueError(label+' invalide')
 return v
def _rows(v,label,fields):
 if not isinstance(v,list):raise ValueError(label+' doit être une liste')
 out=[];seen=set()
 for r in v:
  if not isinstance(r,dict) or set(r)!=fields:raise ValueError(label+' entrée invalide')
  ident=_id(r['id'],label+'.id')
  if ident in seen:raise ValueError(label+' id dupliqué')
  seen.add(ident);out.append(r)
 return out
def validate(summary):
 if not isinstance(summary,dict) or set(summary)!={'schema','facts','hypotheses','evidence','unknowns','memory_refs'} or summary.get('schema')!=SCHEMA:raise ValueError('résumé invalide')
 evidence=_rows(summary['evidence'],'evidence',{'id','kind','sha256'})
 evidence_ids=set()
 for r in evidence:
  _id(r['kind'],'evidence.kind');_hash(r['sha256'],'evidence.sha256');evidence_ids.add(r['id'])
 facts=_rows(summary['facts'],'facts',{'id','statement','evidence_ids'})
 hypotheses=_rows(summary['hypotheses'],'hypotheses',{'id','statement','basis_ids'})
 unknowns=_rows(summary['unknowns'],'unknowns',{'id','question','blocking'})
 refs=_rows(summary['memory_refs'],'memory_refs',{'id','note_sha256','role'})
 for label,rows,key in [('facts',facts,'evidence_ids'),('hypotheses',hypotheses,'basis_ids')]:
  for r in rows:
   if not isinstance(r['statement'],str) or not r['statement'].strip() or not isinstance(r[key],list) or not r[key] or any(not isinstance(x,str) for x in r[key]) or not set(r[key]).issubset(evidence_ids):raise ValueError(label+' sans preuve référencée')
 for r in unknowns:
  if not isinstance(r['question'],str) or not r['question'].strip() or type(r['blocking']) is not bool:raise ValueError('unknowns invalide')
 for r in refs:
  _hash(r['note_sha256'],'memory_refs.note_sha256')
  if r['role']!='context_pointer':raise ValueError('memory_refs.role invalide')
 return {'schema':SCHEMA,'valid':True,'writes_performed':False,'memory_injection':False,'summary_counts':{'facts':len(facts),'hypotheses':len(hypotheses),'evidence':len(evidence),'unknowns':len(unknowns),'memory_refs':len(refs)},'separation':{'facts_labeled':True,'hypotheses_labeled':True,'evidence_linked':True,'unknowns_labeled':True},'limits':['Validation structurelle : elle ne détermine pas si une phrase est réellement un fait ou une hypothèse.','Les références mémoire sont des empreintes seulement ; aucune note n’est lue ou injectée.']}
def main(argv=None):
 import argparse
 p=argparse.ArgumentParser(description='Vérifie un résumé de reprise sans lire de notes.');p.add_argument('summary',type=Path);a=p.parse_args(argv)
 print(json.dumps(validate(json.loads(a.summary.read_text(encoding='utf-8'))),ensure_ascii=False,indent=2));return 0
if __name__=='__main__':raise SystemExit(main())
