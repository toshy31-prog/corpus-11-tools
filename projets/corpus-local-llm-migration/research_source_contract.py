"""Validate local, manually supplied research-source metadata without collection."""
from __future__ import annotations
import json,re
from datetime import date
from pathlib import Path
SCHEMA='corpus.research-source.v1'; HASH=re.compile(r'^[0-9a-f]{64}$')
KINDS={'primary','community','secondary'}; LICENSE={'open_verified','license_unknown','proprietary_or_restricted','not_applicable'}; STATUS={'local_copy_verified','metadata_only','citation_only'}
def _id(v):
 if not isinstance(v,str) or not re.fullmatch(r'[A-Za-z0-9._:-]{1,120}',v):raise ValueError('id invalide')
 return v
def _date(v):
 if not isinstance(v,str):raise ValueError('date invalide')
 try:date.fromisoformat(v)
 except ValueError:raise ValueError('date invalide')
 return v
def validate(record):
 required={'schema','id','source_kind','provenance','published_on','accessed_on','license_status','local_status','excerpt','claims_scope'}
 if not isinstance(record,dict) or set(record)!=required or record.get('schema')!=SCHEMA:raise ValueError('source invalide')
 _id(record['id'])
 if record['source_kind'] not in KINDS or record['license_status'] not in LICENSE or record['local_status'] not in STATUS:raise ValueError('statut source invalide')
 if not isinstance(record['provenance'],dict) or set(record['provenance'])!={'publisher','reference'} or not all(isinstance(x,str) and x.strip() and len(x)<=1000 for x in record['provenance'].values()):raise ValueError('provenance invalide')
 _date(record['published_on']);_date(record['accessed_on'])
 ex=record['excerpt']
 if not isinstance(ex,dict) or set(ex)!={'sha256','chars','stored'} or not isinstance(ex['sha256'],str) or not HASH.fullmatch(ex['sha256']) or type(ex['chars']) is not int or ex['chars']<0 or ex['stored'] is not False:raise ValueError('extrait invalide')
 if not isinstance(record['claims_scope'],str) or not record['claims_scope'].strip() or len(record['claims_scope'])>500:raise ValueError('scope invalide')
 return {'schema':SCHEMA,'valid':True,'id':record['id'],'source_kind':record['source_kind'],'license_status':record['license_status'],'local_status':record['local_status'],'excerpt_stored':False,'collection':'not_performed','network':'not_used','limits':['Métadonnées déclarées localement : aucune page n’est téléchargée ou vérifiée.','Une source communauté ne devient pas une source primaire par ce contrat.','Le statut de licence décrit une revue, pas une autorisation de copie automatique.']}
def main(argv=None):
 import argparse
 p=argparse.ArgumentParser(description='Valide des métadonnées de source locale sans réseau.');p.add_argument('record',type=Path);a=p.parse_args(argv);print(json.dumps(validate(json.loads(a.record.read_text(encoding='utf-8'))),ensure_ascii=False,indent=2));return 0
if __name__=='__main__':raise SystemExit(main())
