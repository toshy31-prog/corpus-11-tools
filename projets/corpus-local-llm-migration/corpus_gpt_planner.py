from __future__ import annotations
import blocker_resilience

ABSTRACTION={'instance','component','project','system','organism'}
TRANSVERSALITY={'single_surface','multi_surface','multi_project','ecosystem'}
REVERSIBILITY={'trivial','reversible','costly','irreversible'}
EVIDENCE={'fresh','attested','stale','missing'}

def plan(request):
 if not isinstance(request,dict):raise ValueError("objet requis")
 allowed={"status","job_known","job_kind","potentially_long","blocker","write","destructive","abstraction","transversality","reversibility","evidence_freshness","uncertainty","counterfield","revision_condition","stop_condition","exclusive_resources","preserved_capabilities","displaced_costs","modalities"}
 if set(request)-allowed:raise ValueError("champs inconnus")
 status=request.get("status","unknown")
 known=request.get("job_known",False)
 kind=request.get("job_kind","browser")
 long=request.get("potentially_long",False)
 write=request.get("write",False)
 destructive=request.get("destructive",False)
 if status not in {"pass","degraded","unknown"} or kind not in {"local","browser"}:raise ValueError("état invalide")
 abstraction=request.get("abstraction","instance");trans=request.get("transversality","single_surface");rev=request.get("reversibility","reversible");fresh=request.get("evidence_freshness","missing")
 if abstraction not in ABSTRACTION or trans not in TRANSVERSALITY or rev not in REVERSIBILITY or fresh not in EVIDENCE:raise ValueError("axe décisionnel invalide")
 if any(type(x) is not bool for x in (known,long,write,destructive)):raise ValueError("booléen invalide")
 for key in ("counterfield","revision_condition","stop_condition"):
  if key in request and (not isinstance(request[key],str) or not request[key].strip()):raise ValueError(key+" invalide")
 for key in ("exclusive_resources","preserved_capabilities","displaced_costs"):
  if key in request and (not isinstance(request[key],list) or any(not isinstance(x,str) or not x for x in request[key])):raise ValueError(key+" invalide")
 modalities=request.get("modalities",["local_compute"])
 allowed_modalities={"local_compute","browser_interaction","visual_evidence","outbound_transport"}
 if not isinstance(modalities,list) or not modalities or any(x not in allowed_modalities for x in modalities):raise ValueError("modalities invalide")
 calls=[]
 skip=[]
 if status=="unknown":calls.append("status")
 if status=="degraded":calls.append("doctor")
 if not known:calls.append("job_info_or_jobs")
 if kind=="local":skip.append("cdp_preflight")
 if fresh in {"fresh","attested"}:skip.append("recompute_existing_evidence")
 if long:calls+=["start_job","job_status"]
 else:calls.append("run_job")
 if write:calls.append("preconditions_and_scope_check")
 if destructive or rev=="irreversible":calls.append("explicit_authorization_and_rollback_evidence")
 if trans in {"multi_project","ecosystem"}:calls.append("boundary_and_dependency_check")
 if abstraction in {"system","organism"}:calls.append("cross_surface_invariant_check")
 if "browser_interaction" in modalities and kind!="browser":calls.append("browser_job_required")
 if "visual_evidence" in modalities:calls.append("screenshot_or_frame_evidence")
 if "outbound_transport" in modalities:calls.append("explicit_transport_step")
 blocker=request.get("blocker")
 recovery=None
 if blocker:
  if not isinstance(blocker,dict):raise ValueError("blocker invalide")
  recovery=blocker_resilience.assess(blocker)
 return {"schema_version":2,"kind":"corpus_gpt_execution_plan","calls":calls,"skip":skip,"recovery":recovery,"authorization":"required" if destructive or rev=="irreversible" else "unchanged","execution":"not_started","decision_axes":{"abstraction":abstraction,"transversality":trans,"reversibility":rev,"evidence_freshness":fresh,"uncertainty":request.get("uncertainty","unknown"),"counterfield":request.get("counterfield"),"revision_condition":request.get("revision_condition"),"stop_condition":request.get("stop_condition"),"exclusive_resources":request.get("exclusive_resources",[]),"preserved_capabilities":request.get("preserved_capabilities",[]),"displaced_costs":request.get("displaced_costs",[]),"modalities":modalities},"invariants":["no_hidden_composite_score","causal_priority_over_rigid_sequence","preserve_existing_capacity_before_uncertain_reconstruction","no_common_failure_assumed_as_redundancy","method_remains_replaceable","human_arbitration_when_dimensions_remain_incomparable"]}
