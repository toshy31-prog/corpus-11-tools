from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path

BROWSER_MARKER="# corpus-job-kind: browser"
LOCAL_MARKER="# corpus-job-kind: local"
AUTHORIZATION_MARKER_PREFIX="# corpus-requires-durable-authorization:"

def kind_from_content(content):
 header=content.splitlines()[:8]
 prefix="# corpus-job-kind:"
 for line in header:
  if line.startswith(prefix):
   kind=line[len(prefix):].strip()
   if kind in {"local","browser","browser-headless","browser-visible","browser-hybrid"}: return kind
 return "local"

def load(path):
 try:value=json.loads(Path(path).read_text())
 except (OSError,json.JSONDecodeError):return {}
 return value if isinstance(value,dict) else {}

def managed_job_definition(job, *, jobs_root):
 if not isinstance(job,str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,79}",job):
  raise ValueError("job invalide")
 root=Path(jobs_root).resolve()
 path=(root/(job+".sh")).resolve()
 if path.parent!=root or not path.is_file():
  raise ValueError("job non enregistré")
 source=path.read_text(encoding="utf-8")
 return {"job":job,"source_path":str(path),"sha256":hashlib.sha256(source.encode("utf-8")).hexdigest(),"source":source}


def kind_for(job,registry):
 value=registry.get(job)
 return value.get("kind") if isinstance(value,dict) and value.get("kind") in {"local","browser","browser-headless","browser-visible","browser-hybrid"} else "browser"

def runner_env(kind):
 return {"CORPUS_BB_SKIP_INFRA":"1"} if kind in {"local","browser-headless"} else {}

def visual_target_from_content(content):
 prefix="# corpus-visual-target:"
 for line in content.splitlines()[:12]:
  if line.startswith(prefix):
   value=line[len(prefix):].strip()
   if value.startswith(("http://","https://")) and len(value)<=2048: return value
 return ""

def authorization_requirement_from_content(content):
 for line in content.splitlines()[:12]:
  if line.startswith(AUTHORIZATION_MARKER_PREFIX):
   value=line[len(AUTHORIZATION_MARKER_PREFIX):].strip()
   if value=="true": return True
   if value=="false": return False
   raise ValueError("requires_durable_authorization marker invalide")
 return False

def requires_durable_authorization(job,registry):
 value=registry.get(job) if isinstance(registry,dict) else None
 if not isinstance(value,dict) or "requires_durable_authorization" not in value:
  return False
 required=value["requires_durable_authorization"]
 if type(required) is not bool:
  raise ValueError("requires_durable_authorization invalide")
 return required

def execution_env(kind, visual_target=""):
 env=runner_env(kind)
 if kind in {"browser-visible","browser-hybrid"} and visual_target:
  env["CORPUS_BB_VISUAL_TARGET"]=visual_target
 return env

EFFECTS = frozenset({"repo_write","filesystem_write","service_mutation","outbound_transport","browser_interaction"})

def effect_projection(job, registry):
 value=registry.get(job) if isinstance(registry,dict) else None
 if not isinstance(value,dict) or "effects" not in value:
  return {"status":"unknown","effects":[]}
 effects=value["effects"]
 if (not isinstance(effects,list) or len(effects)>len(EFFECTS)
     or any(not isinstance(x,str) or x not in EFFECTS for x in effects)
     or len(set(effects))!=len(effects)):
  return {"status":"unknown","effects":[]}
 out={"status":"attested","effects":sorted(effects)}
 if "write_set" in value:
  write_set=value["write_set"]
  if (not isinstance(write_set,list) or len(write_set)>100
      or any(not isinstance(x,str) or not x or len(x)>500 or x.startswith("/") or ".." in x.split("/") for x in write_set)
      or len(set(write_set))!=len(write_set)):
   return {"status":"unknown","effects":[]}
  out["write_set"]=sorted(write_set)
 return out
