"""Receipted capability lifecycle handoff."""
from __future__ import annotations
import json, os, subprocess, tempfile, time, uuid
from pathlib import Path
from corpus_paths import STATE_ROOT
import corpus_gpt_reload as reload_guard
import context_algebra as algebra

REPO=Path(__file__).resolve().parents[2]
HANDOFFS=STATE_ROOT/"corpus-gpt"/"handoffs"

def git_snapshot():
    def g(*a):
        p=subprocess.run(["git",*a],cwd=REPO,text=True,capture_output=True,check=False,timeout=15)
        if p.returncode: raise RuntimeError(p.stdout+p.stderr)
        return p.stdout.rstrip("\n")
    return {"head":g("rev-parse","HEAD"),"status":g("status","--porcelain=v1")}

def surface_files():
    return [str(Path(p).resolve().relative_to(REPO)) for p in reload_guard.SOURCES]

def _write_receipt(receipt):
    HANDOFFS.mkdir(parents=True,exist_ok=True)
    target=HANDOFFS/(receipt["handoff_id"]+".json")
    fd,raw=tempfile.mkstemp(prefix=".handoff-",dir=str(HANDOFFS)); os.close(fd); tmp=Path(raw)
    try:
        tmp.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n")
        os.replace(tmp,target)
    finally:
        if tmp.exists(): tmp.unlink()

def create(**a):
    snap=git_snapshot(); state=reload_guard.read_state()
    changed={x[3:] for x in snap["status"].splitlines() if len(x)>=4}
    expected=sorted(set(a.get("expected_capabilities") or [])); observed=sorted(set(a.get("observed_capabilities") or []))
    hid=time.strftime("%Y%m%d-%H%M%S")+"-"+uuid.uuid4().hex[:8]
    source_digest=reload_guard.source_digest()
    loaded_digest=state.get("loaded_digest",state.get("digest"))
    runtime_reload_complete=loaded_digest == source_digest
    surface_mismatch=bool(expected and observed and set(expected)!=set(observed))
    context_health=a.get("context_health") or "healthy"
    if context_health not in {"healthy","degraded","unknown"}: raise ValueError("context_health invalide")
    explicit_reason=(a.get("new_chat_reason") or "").strip()
    new_chat_reason=explicit_reason or ("tool_surface_schema_changed" if surface_mismatch else ("context_or_stream_degraded" if context_health=="degraded" else ""))
    new_chat_required=bool(new_chat_reason)

    context_graph=a.get("context_graph")
    projection_roots=a.get("projection_roots") or []
    projection=None; generated={}
    if context_graph is not None:
        algebra.validate_graph(context_graph)
        projection=algebra.project(context_graph,projection_roots)
        generated=algebra.legacy_fields_from_projection(projection)

    def legacy(name):
        explicit=a.get(name)
        return explicit if explicit else generated.get(name,[])

    receipt={"schema_version":3 if projection is not None else 2,"handoff_id":hid,
      "start_head":a.get("start_head") or snap["head"],"current_head":snap["head"],
      "git_status_intentional":True,"git_status":snap["status"],"modified_files":sorted(changed),
      "surface_files":surface_files(),"surface_modified_files":[p for p in surface_files() if p in changed],
      "source_digest":source_digest,"validated_digest":state.get("validated_digest"),
      "reload_requested_digest":state.get("reload_requested_digest"),"loaded_digest":loaded_digest,
      "validations":legacy("validations"),"baselines":legacy("baselines"),
      "expected_capabilities":expected,"observed_capabilities":observed,
      "exact_jobs":a.get("exact_jobs") or {},"async_tokens":a.get("async_tokens") or [],
      "invariants":a.get("invariants") or [],"work_in_progress":a.get("work_in_progress") or "",
      "next_action":a.get("next_action") or "","blockers":legacy("blockers"),
      "stop_conditions":legacy("stop_conditions"),
      "runtime_reload_complete":runtime_reload_complete,"reload_required":not runtime_reload_complete,
      "plugin_refresh_required":surface_mismatch,"context_health":context_health,
      "same_chat_continuation_allowed":not new_chat_required,
      "new_chat_required":new_chat_required,"new_chat_reason":new_chat_reason}
    if projection is not None:
        receipt["context_projection"]=projection
        receipt["projection_roots"]=list(projection_roots)
    _write_receipt(receipt)
    return receipt

def _canonical_identity(e):
    identity=e.get("identity")
    if isinstance(identity,dict) and identity.get("scheme") and "value" in identity:
        return {"scheme":identity["scheme"],"value":identity["value"]}
    return None

def _inspection_receipt(projected,current,rec):
    current_entities={e["entity_id"]:e for e in current.get("entities",[])}
    roots=[]
    for root in projected.get("roots",[]):
        state=rec.get("entities",{}).get(root,"context_missing")
        old=next((e for e in projected.get("entities",[]) if e.get("entity_id")==root),None)
        roots.append({
            "root":root,
            "canonical_identity":_canonical_identity(old or {}),
            "reconciliation":state,
            "resumable":state=="recognized" and rec.get("compatible",False),
            "still_valid":state=="recognized",
        })
    stale={
        "assertions":sorted(k for k,v in rec.get("assertions",{}).items() if v=="stale"),
        "relations":sorted(k for k,v in rec.get("relations",{}).items() if v=="stale"),
    }
    historical={
        "assertions":sorted(rec.get("assertions",{})),
        "relations":sorted(rec.get("relations",{})),
    }
    identities=[]
    for e in projected.get("entities",[]):
        identities.append({
            "entity_id":e["entity_id"],
            "canonical_identity":_canonical_identity(e),
            "reconciliation":rec.get("entities",{}).get(e["entity_id"],"context_missing"),
            "current_entity_present":e["entity_id"] in current_entities,
        })
    return {
        "projection_roots":roots,
        "stale":stale,
        "historical_projection_preserved":historical,
        "reconciliation_by_canonical_identity":identities,
    }

def resume(handoff_id,current_context_graph=None):
    if not isinstance(handoff_id,str) or not handoff_id or "/" in handoff_id or ".." in handoff_id: raise ValueError("handoff id invalide")
    p=HANDOFFS/(handoff_id+".json")
    if not p.is_file(): raise ValueError("handoff inconnu")
    receipt=json.loads(p.read_text()); snap=git_snapshot()
    if receipt.get("schema_version",1) < 3 or "context_projection" not in receipt:
        ok=snap["head"]==receipt["current_head"] and snap["status"]==receipt["git_status"]
        return {"compatible":ok,"current":snap,"receipt":receipt,"reason":"match" if ok else "repository_diverged"}
    if current_context_graph is None:
        # v3 without fresh contextual observations is intentionally conservative:
        # return the projection but do not fall back to global working-tree equivalence.
        return {"compatible":None,"current":snap,"receipt":receipt,"reconciliation":None,"reason":"context_required"}
    algebra.validate_graph(current_context_graph)
    rec=algebra.reconcile(receipt["context_projection"],current_context_graph)
    inspection=_inspection_receipt(receipt["context_projection"],current_context_graph,rec)
    return {"compatible":rec["compatible"],"current":snap,"receipt":receipt,"reconciliation":rec,
            "inspection_receipt":inspection,
            "reason":"context_match" if rec["compatible"] else "context_invalidated"}
