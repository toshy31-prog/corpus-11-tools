from __future__ import annotations
import hashlib,json
from pathlib import Path
from corpus_paths import VAULT_ROOT

PAYLOAD_SUFFIXES=(".tar",".tar.gz")
STATE=Path.home()/".local/state/corpus/vault-retention.json"

def digest(path):
 h=hashlib.sha256()
 with path.open("rb") as f:
  for block in iter(lambda:f.read(8*1024*1024),b""): h.update(block)
 return h.hexdigest()

def inventory(root=None):
 root=(root or VAULT_ROOT)
 if root is None:return {"status":"vault_unconfigured","duplicates":[],"snapshots":[]}
 base=root/"RecoverySnapshots"
 rows=[]
 if base.is_dir():
  for d in sorted(x for x in base.iterdir() if x.is_dir()):
   payloads=[p for p in d.iterdir() if p.is_file() and p.name.endswith(PAYLOAD_SUFFIXES)]
   rows.append({"name":d.name,"path":str(d),"payloads":[{"name":p.name,"bytes":p.stat().st_size,"sha256":digest(p)} for p in payloads]})
 by_hash={}
 for row in rows:
  for p in row["payloads"]:by_hash.setdefault(p["sha256"],[]).append({"snapshot":row["name"],**p})
 duplicates=[v for v in by_hash.values() if len(v)>1]
 return {"status":"ok","snapshots":rows,"duplicates":duplicates}

def write_state(value):
 STATE.parent.mkdir(parents=True,exist_ok=True);STATE.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n")

if __name__=="__main__":
 value=inventory();write_state(value);print(json.dumps(value,ensure_ascii=False,indent=2))
