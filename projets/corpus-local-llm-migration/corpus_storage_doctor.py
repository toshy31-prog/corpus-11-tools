#!/usr/bin/env python3
from __future__ import annotations
import json, os, shutil, subprocess, time
from pathlib import Path

HOME=Path.home()
REPO=HOME/"Documents/ChatGPT/Corpus"
TMP=Path("/tmp")
STATE=HOME/".local/state/corpus/storage-doctor.json"
WARNING_FREE=10*1024**3
CRITICAL_FREE=5*1024**3
TMP_WARNING=2*1024**3
GIT_RATIO_WARNING=3.0
KNOWN_TMP_PREFIXES=("corpus-validation-guards-",)
RUNTIME_ROOT=HOME/".local/share/corpus/runtime"
RUNTIME_BACKUP_MARKERS=(".bad",".pre-")

def size(path: Path) -> int:
    p=subprocess.run(["du","-sb",str(path)],text=True,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,check=False,timeout=30)
    try:return int(p.stdout.split()[0])
    except (ValueError,IndexError):return 0

def git_bytes() -> tuple[int,int]:
    total=size(REPO/".git")
    p=subprocess.run(["git","rev-list","--disk-usage","--objects","--all"],cwd=REPO,text=True,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,check=False,timeout=30)
    try:reachable=int(p.stdout.strip().splitlines()[-1])
    except (ValueError,IndexError):reachable=0
    return total,reachable

def main():
    usage=shutil.disk_usage("/")
    tmp=size(TMP)
    git_total,git_reachable=git_bytes()
    ratio=(git_total/git_reachable) if git_reachable else None
    orphan_candidates=[]
    now=time.time()
    for child in TMP.iterdir():
        if not child.is_dir() or not child.name.startswith(KNOWN_TMP_PREFIXES): continue
        age=now-child.stat().st_mtime
        orphan_candidates.append({"path":str(child),"bytes":size(child),"age_seconds":int(age)})
    runtime_backup_candidates=[]
    if RUNTIME_ROOT.exists():
        for p in RUNTIME_ROOT.rglob("*"):
            if p.is_file() and any(marker in p.name for marker in RUNTIME_BACKUP_MARKERS):
                runtime_backup_candidates.append({"path":str(p),"bytes":p.stat().st_size})
    level="ok"
    reasons=[]
    if usage.free<CRITICAL_FREE: level="critical"; reasons.append("free_space_below_5GiB")
    elif usage.free<WARNING_FREE: level="warning"; reasons.append("free_space_below_10GiB")
    if tmp>TMP_WARNING:
        level="critical" if level=="critical" else "warning"; reasons.append("tmp_above_2GiB")
    if ratio is not None and ratio>GIT_RATIO_WARNING:
        level="critical" if level=="critical" else "warning"; reasons.append("git_storage_ratio_above_3")
    out={
      "schema_version":1,"status":level,"reasons":reasons,
      "root":{"total":usage.total,"used":usage.used,"free":usage.free},
      "tmp_bytes":tmp,
      "git":{"total_bytes":git_total,"reachable_bytes":git_reachable,"ratio":ratio},
      "known_tmp_candidates":orphan_candidates,
      "runtime_backup_candidates":runtime_backup_candidates,
      "policy":{"warning_free_bytes":WARNING_FREE,"critical_free_bytes":CRITICAL_FREE,"tmp_warning_bytes":TMP_WARNING},
      "observed_at_unix":now,
    }
    STATE.parent.mkdir(parents=True,exist_ok=True)
    STATE.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps(out,ensure_ascii=False,indent=2))
    return 0 if level!="critical" else 2

if __name__=="__main__":
    raise SystemExit(main())
