#!/usr/bin/env python3
from __future__ import annotations
import os, shutil, subprocess, time
from pathlib import Path

TMP=Path("/tmp")
PREFIXES=("corpus-validation-guards-",)
MIN_AGE=6*3600

def in_use(path: Path) -> bool:
    p=subprocess.run(["lsof","+D",str(path)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=False,timeout=30)
    return p.returncode==0

def main():
    now=time.time()
    removed=0
    for child in TMP.iterdir():
        if not child.is_dir() or not child.name.startswith(PREFIXES): continue
        age=now-child.stat().st_mtime
        if age<MIN_AGE: continue
        if in_use(child): continue
        shutil.rmtree(child)
        removed+=1
        print("REAPED",child)
    print("REAPED_COUNT",removed)
    return 0

if __name__=="__main__":
    raise SystemExit(main())
