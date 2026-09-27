#!/usr/bin/env python3
from __future__ import annotations
import shutil
from pathlib import Path

HOME=Path.home()
REPO=HOME/"Documents/ChatGPT/Corpus"
TARGETS={
 "download_cache": HOME/".cache/corpus/downloads",
 "huggingface_cache": HOME/".cache/corpus/huggingface",
 "corpus_3d_target": REPO/"projets/corpus-monde-vivant/target",
}

def open_fd_hits(root: Path):
    hits=[]
    proc=Path("/proc")
    for p in proc.iterdir():
        if not p.name.isdigit(): continue
        try:
            fds=list((p/"fd").iterdir())
        except (PermissionError,FileNotFoundError,ProcessLookupError,OSError):
            continue
        for fd in fds:
            try: target=fd.resolve(strict=False)
            except OSError: continue
            try:
                target.relative_to(root)
                hits.append((p.name,str(target)))
            except ValueError:
                pass
    return hits

def clean(names):
    unknown=set(names)-set(TARGETS)
    if unknown: raise ValueError("unknown targets: "+",".join(sorted(unknown)))
    for name in names:
        path=TARGETS[name]
        if not path.exists():
            print("ABSENT",name,path)
            continue
        hits=open_fd_hits(path)
        if hits:
            raise RuntimeError(f"REFUS {name}: open fd hits={len(hits)}")
        shutil.rmtree(path)
        print("CLEANED",name,path)

if __name__=="__main__":
    import argparse
    ap=argparse.ArgumentParser()
    ap.add_argument("targets",nargs="+",choices=sorted(TARGETS))
    args=ap.parse_args()
    clean(args.targets)
