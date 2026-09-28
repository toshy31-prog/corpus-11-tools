"""Operational T5a orchestration over the published T1-T4b primitives."""
from __future__ import annotations
from copy import deepcopy
import decision_grounding as dg
import corpus_gpt_planner as planner

def merge_planner_inputs(planner_base, grounding_input):
    if not isinstance(planner_base,dict): raise ValueError("planner_base requis")
    if not isinstance(grounding_input,dict): raise ValueError("grounding_input invalide")
    merged={}; axes={}; collisions=[]
    for key in sorted(set(planner_base)|set(grounding_input)):
        in_base=key in planner_base; in_ground=key in grounding_input
        if in_base and in_ground:
            if planner_base[key]==grounding_input[key]:
                merged[key]=deepcopy(planner_base[key]); axes[key]={"provenance":"convergent","value":deepcopy(merged[key])}
            else:
                axes[key]={"provenance":"collision","planner_base":deepcopy(planner_base[key]),"grounding":deepcopy(grounding_input[key])}
                collisions.append(key)
        elif in_ground:
            merged[key]=deepcopy(grounding_input[key]); axes[key]={"provenance":"grounding","value":deepcopy(merged[key])}
        else:
            merged[key]=deepcopy(planner_base[key]); axes[key]={"provenance":"planner_base","value":deepcopy(merged[key])}
    return {"merged":merged,"axes":axes,"collisions":collisions,"compatible":not collisions}

EXPOSURE_PRECONDITIONS=("decision_required","persistent_context_required","context_graph_available","projection_roots_available")

def exposure_admission(exposure_context):
    provided=exposure_context if isinstance(exposure_context,dict) else {}
    invalid=sorted(k for k in EXPOSURE_PRECONDITIONS if k in provided and type(provided[k]) is not bool)
    missing=sorted(k for k in EXPOSURE_PRECONDITIONS if k not in provided or provided.get(k) is not True)
    extra=sorted(k for k in provided if k not in EXPOSURE_PRECONDITIONS)
    admitted=isinstance(exposure_context,dict) and not invalid and not extra and not missing
    return {"admission":admitted,"missing_preconditions":missing,"invalid_preconditions":invalid,"unknown_preconditions":extra}

def orchestrate(*,goal,context_graph,projection_roots,admission_policy,retrieval_query,retrieval_limit,retrieval_scope,retrieval_reason,id_resolution_map,planner_base,retrieval_search,exposure_context,current_context_graph=None,inferences=None):
    gate=exposure_admission(exposure_context)
    receipt={"schema_version":1,"kind":"decision_grounding_operational_receipt","goal":goal,
             "exposure_context":deepcopy(exposure_context),"exposure_admission":gate["admission"],
             "missing_preconditions":gate["missing_preconditions"],"invalid_preconditions":gate["invalid_preconditions"],
             "unknown_preconditions":gate["unknown_preconditions"],
             "retrieval_request":{"query":retrieval_query,"limit":retrieval_limit,"scope":retrieval_scope,"reason":retrieval_reason},
             "retrieval":None,"consideration":None,"admission":None,"decision_context_receipt":None,
             "planner_input":None,"planner_base":deepcopy(planner_base),"merge":None,"execution_plan":None,
             "state":"started","stop_reason":None}
    if not gate["admission"]:
        receipt["state"]="rejected_before_retrieval";receipt["stop_reason"]="exposure_preconditions_not_satisfied";return receipt
    try:
        transport=retrieval_search(retrieval_query,retrieval_limit)
    except Exception as exc:
        receipt["retrieval"]={"status":"provider_failure","error":{"kind":type(exc).__name__,"message":str(exc)}}
        receipt["state"]="stopped_before_planner";receipt["stop_reason"]="provider_failure";return receipt
    receipt["retrieval"]=deepcopy(transport)
    normalized=dg.normalize_memory_search_response(provider_response=transport,query=retrieval_query,limit=retrieval_limit,scope=retrieval_scope,reason=retrieval_reason,id_resolution_map=id_resolution_map)
    if normalized["status"]=="provider_failure":
        receipt["state"]="stopped_before_planner";receipt["stop_reason"]="provider_failure";return receipt
    decision=dg.build_retrieval_grounded_receipt(goal=goal,context_graph=context_graph,projection_roots=projection_roots,policy=admission_policy,retrieval_results=normalized["retrieval_results"],retrieval_bounds=normalized["retrieval_bounds"],current_context_graph=current_context_graph,inferences=inferences)
    receipt["consideration"]=deepcopy(decision["consideration"])
    receipt["admission"]=deepcopy(decision["admission"])
    receipt["decision_context_receipt"]=deepcopy({k:v for k,v in decision.items() if k!="consideration"})
    receipt["planner_input"]=deepcopy(decision["planner_input"])
    merge=merge_planner_inputs(planner_base,decision["planner_input"]);receipt["merge"]=merge
    if not merge["compatible"]:
        receipt["state"]="stopped_before_planner";receipt["stop_reason"]="planner_input_collision";return receipt
    # An unresolved T1 conflict cannot be promoted; planner_input already omits it.
    try:
        receipt["execution_plan"]=planner.plan(merge["merged"])
    except ValueError as exc:
        receipt["state"]="stopped_at_planner";receipt["stop_reason"]="planner_rejected_input";receipt["planner_error"]=str(exc);return receipt
    receipt["state"]="planned";receipt["stop_reason"]=None
    return receipt
