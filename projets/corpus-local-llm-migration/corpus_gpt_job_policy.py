from __future__ import annotations
import json
from pathlib import Path

BROWSER_MARKER="# corpus-job-kind: browser"
LOCAL_MARKER="# corpus-job-kind: local"

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

def execution_env(kind, visual_target=""):
 env=runner_env(kind)
 if kind in {"browser-visible","browser-hybrid"} and visual_target:
  env["CORPUS_BB_VISUAL_TARGET"]=visual_target
 return env
