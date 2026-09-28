from __future__ import annotations
import hashlib, json, shutil
from pathlib import Path
from corpus_paths import MEDIA_MODELS_ROOT, VAULT_ROOT

HERE=Path(__file__).resolve().parent
COLD_SUBDIR=Path("ColdModels/media")
MIN_FREE_AFTER=10*1024**3

def locks():
    rows=[]
    for name in ("MEDIA_MODELS_LOCK.json","AUDIO_MODELS_LOCK.json"):
        rows.extend(json.loads((HERE/name).read_text()))
    return {row["file"]:row for row in rows}

def cold_root():
    return None if VAULT_ROOT is None else VAULT_ROOT/COLD_SUBDIR

def digest(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda:f.read(8*1024*1024),b""): h.update(block)
    return h.hexdigest()

def valid(path,entry,verify_hash=False):
    if not path.is_file() or path.stat().st_size!=entry["size"]: return False
    return not verify_hash or digest(path)==entry["sha256"]

def residency(files):
    table=locks(); cold=cold_root()
    if all(valid(MEDIA_MODELS_ROOT/f,table[f]) for f in files): return "hot"
    if cold is not None and all(valid(cold/f,table[f]) for f in files): return "cold"
    return "unavailable"

def demote(files):
    table=locks(); cold=cold_root()
    if cold is None: raise ValueError("Vault COLD non configuré.")
    cold.mkdir(parents=True,exist_ok=True)
    for name in files:
        entry=table[name]; source=MEDIA_MODELS_ROOT/name; dest=cold/name
        if not valid(source,entry,verify_hash=True):
            if valid(dest,entry,verify_hash=True): continue
            raise ValueError("Poids HOT absent ou invalide : "+name)
        if valid(dest,entry,verify_hash=True):
            source.unlink(); continue
        temp=cold/(name+".demoting")
        try:
            with source.open("rb") as src,temp.open("wb") as dst:
                shutil.copyfileobj(src,dst,8*1024*1024)
            if not valid(temp,entry,verify_hash=True): raise ValueError("Démotion invalide : "+name)
            temp.replace(dest)
            source.unlink()
        finally:
            temp.unlink(missing_ok=True)
    return "cold"


def ensure_hot(files):
    table=locks(); cold=cold_root()
    missing=[f for f in files if not valid(MEDIA_MODELS_ROOT/f,table[f])]
    if not missing: return "hot"
    if cold is None or not cold.is_dir(): raise ValueError("Vault COLD indisponible.")
    required=sum(table[f]["size"] for f in missing)
    if shutil.disk_usage(MEDIA_MODELS_ROOT).free-required<MIN_FREE_AFTER:
        raise ValueError("Espace HOT insuffisant pour activer ce modèle tout en conservant la réserve Corpus.")
    MEDIA_MODELS_ROOT.mkdir(parents=True,exist_ok=True)
    for name in missing:
        entry=table[name]; source=cold/name
        if not valid(source,entry,verify_hash=True): raise ValueError("Poids COLD absent ou invalide : "+name)
        temp=MEDIA_MODELS_ROOT/(name+".promoting")
        try:
            with source.open("rb") as src,temp.open("wb") as dst:
                shutil.copyfileobj(src,dst,8*1024*1024)
            if not valid(temp,entry,verify_hash=True): raise ValueError("Promotion invalide : "+name)
            temp.replace(MEDIA_MODELS_ROOT/name)
        finally:
            temp.unlink(missing_ok=True)
    return "hot"
