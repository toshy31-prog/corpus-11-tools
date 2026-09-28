from __future__ import annotations
import blocker_resilience

def plan(request):
 if not isinstance(request,dict):raise ValueError("objet requis")
 allowed={"status","job_known","job_kind","potentially_long","blocker","write","destructive"}
 if set(request)-allowed:raise ValueError("champs inconnus")
 status=request.get("status","unknown")
 known=request.get("job_known",False)
 kind=request.get("job_kind","browser")
 long=request.get("potentially_long",False)
 write=request.get("write",False)
 destructive=request.get("destructive",False)
 if status not in {"pass","degraded","unknown"} or kind not in {"local","browser"}:raise ValueError("état invalide")
 if any(type(x) is not bool for x in (known,long,write,destructive)):raise ValueError("booléen invalide")
 calls=[]
 skip=[]
 if status=="unknown":calls.append("status")
 if status=="degraded":calls.append("doctor")
 if not known:calls.append("job_info_or_jobs")
 if kind=="local":skip.append("cdp_preflight")
 if long:calls+=["start_job","job_status"]
 else:calls.append("run_job")
 if write:calls.append("preconditions_and_scope_check")
 if destructive:calls.append("explicit_authorization_and_rollback_evidence")
 blocker=request.get("blocker")
 recovery=None
 if blocker:
  if not isinstance(blocker,dict):raise ValueError("blocker invalide")
  recovery=blocker_resilience.assess(blocker)
 return {"schema_version":1,"kind":"corpus_gpt_execution_plan","calls":calls,"skip":skip,
         "recovery":recovery,"authorization":"required" if destructive else "unchanged",
         "execution":"not_started"}
