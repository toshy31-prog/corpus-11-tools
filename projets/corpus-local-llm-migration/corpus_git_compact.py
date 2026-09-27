#!/usr/bin/env python3
from __future__ import annotations
import json, shutil, subprocess, time
from pathlib import Path

REPO=Path.home()/"Documents/ChatGPT/Corpus"
STATE=Path.home()/".local/state/corpus/git-compaction.json"
MIN_FREE=10*1024**3

def run(*args, timeout=None):
    return subprocess.run(args,cwd=REPO,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=False,timeout=timeout)

def git(*args, timeout=None):
    p=run("git",*args,timeout=timeout)
    if p.returncode:
        raise RuntimeError("git "+" ".join(args)+" failed: "+p.stdout[-4000:])
    return p.stdout.strip()

def save(value):
    STATE.parent.mkdir(parents=True,exist_ok=True)
    tmp=STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n")
    tmp.replace(STATE)

def main():
    free=shutil.disk_usage("/").free
    if free<MIN_FREE:
        raise SystemExit(f"REFUS free_bytes={free} below={MIN_FREE}")
    if git("status","--porcelain=v1"):
        raise SystemExit("REFUS working tree not clean")
    head=git("rev-parse","HEAD")
    origin=git("rev-parse","origin/main")
    refs=git("show-ref")
    before=int(run("du","-sb",str(REPO/".git")).stdout.split()[0])
    state={"status":"running","started_at_unix":time.time(),"head_before":head,"origin_before":origin,"git_bytes_before":before,"free_before":free}
    save(state)
    try:
        git("reflog","expire","--expire=now","--expire-unreachable=now","--all",timeout=300)
        git("repack","-Ad",timeout=3600)
        git("prune","--expire=now",timeout=1800)
        fsck=git("fsck","--full",timeout=1800)
        if git("rev-parse","HEAD")!=head: raise RuntimeError("HEAD changed")
        if git("rev-parse","origin/main")!=origin: raise RuntimeError("origin/main changed")
        if git("show-ref")!=refs: raise RuntimeError("refs changed")
        after=int(run("du","-sb",str(REPO/".git")).stdout.split()[0])
        state.update({"status":"completed","completion_known":True,"finished_at_unix":time.time(),"git_bytes_after":after,"freed_bytes":before-after,"fsck":fsck[-4000:]})
        save(state)
        print(json.dumps(state,ensure_ascii=False,indent=2))
        return 0
    except Exception as exc:
        state.update({"status":"failed","completion_known":True,"finished_at_unix":time.time(),"error":str(exc)})
        save(state)
        raise

if __name__=="__main__":
    raise SystemExit(main())
