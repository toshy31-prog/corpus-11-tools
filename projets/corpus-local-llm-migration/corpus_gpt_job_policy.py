from __future__ import annotations
import json
from pathlib import Path

BROWSER_MARKER="# corpus-job-kind: browser"
LOCAL_MARKER="# corpus-job-kind: local"

def kind_from_content(content):
 header=content.splitlines()[:8]
 if BROWSER_MARKER in header:return "browser"
 if LOCAL_MARKER in header:return "local"
 return "local"

def load(path):
 try:value=json.loads(Path(path).read_text())
 except (OSError,json.JSONDecodeError):return {}
 return value if isinstance(value,dict) else {}

def kind_for(job,registry):
 value=registry.get(job)
 return value.get("kind") if isinstance(value,dict) and value.get("kind") in {"local","browser"} else "browser"

def runner_env(kind):
 return {"CORPUS_BB_SKIP_INFRA":"1"} if kind=="local" else {}
