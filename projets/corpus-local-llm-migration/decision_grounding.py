"""Pure decision-grounding contract over canonical ContextGraph."""
from __future__ import annotations
import hashlib,json,re
from copy import deepcopy
import context_algebra as ca

PLANNER_AXES={"status","job_known","job_kind","potentially_long","blocker","write","destructive","abstraction","transversality","reversibility","evidence_freshness","uncertainty","counterfield","revision_condition","stop_condition","exclusive_resources","preserved_capabilities","displaced_costs","modalities","delegation"}
POLICY_SCHEMA="decision_admission_policy.v1"

def _canon(v): return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def _digest(v): return hashlib.sha256(_canon(v).encode()).hexdigest()
def _idx(rows,key): return {x[key]:x for x in rows}
def _terms(text): return set(re.findall(r"[a-z0-9_]+",str(text).lower()))

def validate_policy(policy):
 if not isinstance(policy,dict) or policy.get("schema")!=POLICY_SCHEMA or not isinstance(policy.get("version"),str): raise ValueError("policy invalide")
 rules=policy.get("rules")
 if not isinstance(rules,list): raise ValueError("rules invalides")
 seen=set()
 for r in rules:
  if not isinstance(r,dict) or not r.get("rule_id") or r["rule_id"] in seen: raise ValueError("rule_id invalide")
  seen.add(r["rule_id"])
  if not isinstance(r.get("predicate"),str) or not isinstance(r.get("goal_terms"),list) or not r["goal_terms"]: raise ValueError("rule match invalide")
  axes=r.get("allowed_planner_axes",[])
  if not isinstance(axes,list) or any(x not in PLANNER_AXES for x in axes): raise ValueError("axes invalides")
 return policy

def policy_descriptor(policy):
 validate_policy(policy)
 body={"schema":policy["schema"],"version":policy["version"],"rules":deepcopy(policy["rules"])}
 return {**body,"digest":_digest(body)}

def admission_decisions(*,goal,context_graph,projection_roots,current_context_graph=None,considered_assertion_refs=None,policy):
 if not isinstance(goal,str) or not goal.strip(): raise ValueError("goal requis")
 desc=policy_descriptor(policy); ca.validate_graph(context_graph); p=ca.project(context_graph,projection_roots)
 cur=current_context_graph or context_graph; ca.validate_graph(cur); rec=ca.reconcile(p,cur)
 projected=_idx(p["assertions"],"assertion_id"); all_assertions=_idx(context_graph.get("assertions",[]),"assertion_id"); evidence=_idx(p["evidence"],"evidence_id")
 refs=sorted(set(considered_assertion_refs or [])); out=[]; gt=_terms(goal)
 for ref in refs:
  a=all_assertions.get(ref)
  if a is None:
   out.append({"assertion_ref":ref,"decision":"rejected","goal_relevance":{"relevant":False,"reason":"unknown_assertion"},"projection_authority":{"authorized":False,"roots":list(p["roots"])},"admission_reason":None,"rejection_reason":"unknown_assertion","defer_reason":None,"allowed_planner_axes":[],"policy_rule":None});continue
  if ref not in projected:
   out.append({"assertion_ref":ref,"decision":"rejected","goal_relevance":{"relevant":False,"reason":"outside_projected_scope"},"projection_authority":{"authorized":False,"roots":list(p["roots"])},"admission_reason":None,"rejection_reason":"outside_projection","defer_reason":None,"allowed_planner_axes":[],"policy_rule":None});continue
  matches=[r for r in policy["rules"] if r["predicate"]==a["predicate"] and set(map(str.lower,r["goal_terms"]))<=gt]
  if not matches:
   out.append({"assertion_ref":ref,"decision":"rejected","goal_relevance":{"relevant":False,"reason":"no_semantic_policy_rule"},"projection_authority":{"authorized":True,"roots":list(p["roots"])},"admission_reason":None,"rejection_reason":"not_goal_relevant_under_policy","defer_reason":None,"allowed_planner_axes":[],"policy_rule":None});continue
  if len(matches)!=1: raise ValueError("policy ambiguë")
  rule=matches[0]; state=rec["assertions"].get(ref,"unverifiable"); evrefs=sorted(x for x in a.get("evidence",[]) if x in evidence)
  base={"assertion_ref":ref,"goal_relevance":{"relevant":True,"reason":"matched_policy_rule"},"projection_authority":{"authorized":True,"roots":list(p["roots"])},"allowed_planner_axes":sorted(rule.get("allowed_planner_axes",[])),"policy_rule":{"rule_id":rule["rule_id"],"policy_version":desc["version"],"policy_digest":desc["digest"]}}
  if state in {"stale","superseded","invalidated"}:
   out.append({**base,"decision":"rejected","admission_reason":None,"rejection_reason":state,"defer_reason":None});continue
  if state!="still_valid":
   out.append({**base,"decision":"deferred","admission_reason":None,"rejection_reason":None,"defer_reason":"validity_uncertain"});continue
  if not evrefs:
   out.append({**base,"decision":"deferred","admission_reason":None,"rejection_reason":None,"defer_reason":"insufficient_evidence"});continue
  out.append({**base,"decision":"admitted","admission_reason":"current_evidenced_policy_match","rejection_reason":None,"defer_reason":None})
 return {"policy":desc,"projection":{"roots":list(p["roots"]),"digest":_digest(p)},"decisions":out}

def build_receipt(*,goal,context_graph,projection_roots,current_context_graph=None,candidates=None,inferences=None,admission=None):
 if not isinstance(goal,str) or not goal.strip(): raise ValueError("goal requis")
 ca.validate_graph(context_graph); p=ca.project(context_graph,projection_roots)
 cur=current_context_graph or context_graph; ca.validate_graph(cur); rec=ca.reconcile(p,cur)
 aa=_idx(p["assertions"],"assertion_id"); ev=_idx(p["evidence"],"evidence_id"); cc={}
 for raw in candidates or []:
  if not isinstance(raw,dict) or raw.get("assertion_ref") not in aa: raise ValueError("candidate hors projection")
  ref=raw["assertion_ref"]
  if ref in cc: raise ValueError("candidate duplique")
  if not isinstance(raw.get("relevance_reason"),str) or not raw["relevance_reason"].strip(): raise ValueError("relevance_reason requis")
  axis=raw.get("planner_axis")
  if axis is not None and axis not in PLANNER_AXES: raise ValueError("planner_axis inconnu")
  cc[ref]=raw
 slots={}
 for ref in cc:
  a=aa[ref]; slots.setdefault((a["subject"],a["predicate"]),[]).append(ref)
 conflicts=set()
 for refs in slots.values():
  for i,x in enumerate(refs):
   for y in refs[i+1:]:
    ax,ay=aa[x],aa[y]
    if _canon(ax["value"])!=_canon(ay["value"]) and x not in ay.get("supersedes",[]) and y not in ax.get("supersedes",[]): conflicts|={x,y}
 observations=[]; influences={}
 for ref in sorted(cc):
  raw,a=cc[ref],aa[ref]; erefs=sorted(x for x in a.get("evidence",[]) if x in ev); state=rec["assertions"].get(ref,"unverifiable")
  q="conflict" if ref in conflicts else ("current" if state=="still_valid" and erefs else "insufficient_evidence" if state=="still_valid" else state if state in {"stale","superseded","invalidated"} else "uncertain")
  influence=None; axis=raw.get("planner_axis")
  if axis is not None and q=="current":
   value=deepcopy(raw.get("planner_value",a["value"])); influence={"axis":axis,"value":value}; influences.setdefault(axis,[]).append((ref,value))
  observations.append({"assertion_ref":ref,"observation":{"subject":a["subject"],"predicate":a["predicate"],"value":deepcopy(a["value"])},"provenance":{"evidence_refs":erefs,"evidence":[deepcopy(ev[x]) for x in erefs]},"validity":{"reconciliation_state":state,"qualification":q},"relevance":{"goal":goal.strip(),"reason":raw["relevance_reason"].strip()},"projection":{"roots":list(p["roots"]),"subject_in_projection":True},"planner_influence":influence})
 conflict_rows=[]
 for refs in slots.values():
  involved=sorted(set(refs)&conflicts)
  if len(involved)>1: conflict_rows.append({"assertion_refs":involved,"resolution":"unresolved"})
 planner={}
 for axis,items in sorted(influences.items()):
  vals={_canon(v) for _,v in items}
  if len(vals)==1: planner[axis]=deepcopy(items[0][1])
  else: conflict_rows.append({"assertion_refs":sorted(r for r,_ in items),"planner_axis":axis,"resolution":"unresolved"})
 derived=[]
 for x in inferences or []:
  if not isinstance(x,dict) or not x.get("inference_id") or not x.get("rule"): raise ValueError("inference invalide")
  refs=sorted(x.get("depends_on",[]))
  if any(r not in aa for r in refs): raise ValueError("inference hors projection")
  derived.append({"inference_id":str(x["inference_id"]),"kind":"derived_inference","rule":str(x["rule"]),"depends_on":refs,"value":deepcopy(x.get("value"))})
 body={"schema_version":1,"kind":"decision_context_receipt","goal":goal.strip(),"projection":{"roots":list(p["roots"]),"digest":_digest(p)},"admission":deepcopy(admission),"observations":observations,"conflicts":sorted(conflict_rows,key=_canon),"inferences":sorted(derived,key=lambda x:x["inference_id"]),"planner_input":planner,"reconciliation":{"compatible":rec["compatible"],"assertions":rec["assertions"]},"invariants":["retrieved_assertion_is_not_automatically_decision_fact","inference_is_never_observation","conflicts_remain_explicit","only_current_evidenced_observation_directly_influences_planner","projection_bounds_decision_scope","independent_root_change_does_not_invalidate_projection"]}
 return {**body,"receipt_digest":_digest(body)}

def build_admitted_receipt(*,goal,context_graph,projection_roots,policy,considered_assertion_refs,current_context_graph=None,inferences=None):
 adm=admission_decisions(goal=goal,context_graph=context_graph,projection_roots=projection_roots,current_context_graph=current_context_graph,considered_assertion_refs=considered_assertion_refs,policy=policy)
 aa=_idx(context_graph.get("assertions",[]),"assertion_id"); rules={r["rule_id"]:r for r in policy["rules"]}; candidates=[]
 for d in adm["decisions"]:
  if d["decision"]!="admitted": continue
  rule=rules[d["policy_rule"]["rule_id"]]; axes=d["allowed_planner_axes"]
  if len(axes)>1: raise ValueError("une règle ne peut influencer plusieurs axes en tranche 2")
  candidate={"assertion_ref":d["assertion_ref"],"relevance_reason":"admitted by "+rule["rule_id"]}
  if axes:
   candidate["planner_axis"]=axes[0]; candidate["planner_value"]=deepcopy(aa[d["assertion_ref"]]["value"])
  candidates.append(candidate)
 return build_receipt(goal=goal,context_graph=context_graph,projection_roots=projection_roots,current_context_graph=current_context_graph,candidates=candidates,inferences=inferences,admission=adm)

def consideration_receipt(*,context_graph,projection_roots,retrieval_results,retrieval_bounds):
 """Resolve retrieval discovery metadata to existing ContextGraph assertions only."""
 ca.validate_graph(context_graph); p=ca.project(context_graph,projection_roots)
 if not isinstance(retrieval_bounds,dict): raise ValueError("retrieval_bounds requis")
 for key in ("source","limit","scope","reason"):
  if key not in retrieval_bounds: raise ValueError("retrieval bound manquant: "+key)
 if not isinstance(retrieval_bounds["limit"],int) or retrieval_bounds["limit"]<1: raise ValueError("limit invalide")
 if not isinstance(retrieval_results,list) or len(retrieval_results)>retrieval_bounds["limit"]: raise ValueError("retrieval hors borne")
 all_a=_idx(context_graph.get("assertions",[]),"assertion_id"); proj_a=_idx(p.get("assertions",[]),"assertion_id"); entities=_idx(context_graph.get("entities",[]),"entity_id")
 identity_to_entities={}
 for e in entities.values():
  if e.get("identity") is not None: identity_to_entities.setdefault(_canon(e["identity"]),[]).append(e["entity_id"])
 rows=[]; by_assertion={}
 for raw in retrieval_results:
  if not isinstance(raw,dict) or not isinstance(raw.get("retrieval_ref"),str) or not raw["retrieval_ref"]: raise ValueError("retrieval_ref requis")
  source=deepcopy(raw.get("source")); score=raw.get("score"); rank=raw.get("rank"); resolution=raw.get("resolution")
  if not isinstance(resolution,dict): raise ValueError("resolution requise")
  method=None; matches=[]
  if isinstance(resolution.get("assertion_ref"),str):
   method="assertion_ref"; ref=resolution["assertion_ref"]; matches=[ref] if ref in all_a else []
  elif isinstance(resolution.get("canonical_identity"),dict) and isinstance(resolution.get("predicate"),str):
   method="canonical_identity+predicate"; subjects=identity_to_entities.get(_canon(resolution["canonical_identity"]),[])
   matches=sorted(aid for aid,a in all_a.items() if a["subject"] in subjects and a["predicate"]==resolution["predicate"])
  elif isinstance(resolution.get("entity_ref"),str) and isinstance(resolution.get("predicate"),str):
   method="entity_ref+predicate"; matches=sorted(aid for aid,a in all_a.items() if a["subject"]==resolution["entity_ref"] and a["predicate"]==resolution["predicate"])
  else: raise ValueError("méthode de résolution inconnue")
  if not matches: status="unresolved"; considered=[]
  elif len(matches)>1: status="ambiguous"; considered=[]
  elif matches[0] not in proj_a: status="resolved_outside_projection"; considered=[]
  else: status="resolved"; considered=matches
  row={"retrieval_ref":raw["retrieval_ref"],"source":source,"score":score,"rank":rank,"resolution_method":method,"resolved_assertion_refs":matches,"status":status,"ambiguities":matches if status=="ambiguous" else [],"considered_assertion_refs":considered,"consideration_reason":"resolved_existing_assertion_inside_projection" if considered else None}
  rows.append(row)
  for ref in considered: by_assertion.setdefault(ref,[]).append(raw["retrieval_ref"])
 considered_rows=[{"assertion_ref":ref,"retrieval_refs":sorted(refs),"reason":"one_or_more_resolved_hits_inside_projection"} for ref,refs in sorted(by_assertion.items())]
 # Stable semantic digest excludes retrieval ordering/rank/score but preserves discovery provenance separately.
 semantic={"projection_digest":_digest(p),"bounds":{"source":retrieval_bounds["source"],"limit":retrieval_bounds["limit"],"scope":retrieval_bounds["scope"],"reason":retrieval_bounds["reason"]},"considered":considered_rows}
 body={"schema_version":1,"kind":"retrieval_consideration_receipt","retrieval_bounds":deepcopy(retrieval_bounds),"projection":{"roots":list(p["roots"]),"digest":_digest(p)},"retrieval_hits":sorted(rows,key=lambda x:x["retrieval_ref"]),"considered":considered_rows,"considered_assertion_refs":[x["assertion_ref"] for x in considered_rows],"decision_semantic_digest":_digest(semantic),"invariants":["retrieved_is_not_considered","considered_is_not_admitted","retrieval_score_is_not_decision_priority","no_synthetic_assertions","ambiguity_is_not_silently_resolved","retrieval_metadata_is_not_factual_evidence"]}
 return {**body,"receipt_digest":_digest(body)}

def build_retrieval_grounded_receipt(*,goal,context_graph,projection_roots,policy,retrieval_results,retrieval_bounds,current_context_graph=None,inferences=None):
 consideration=consideration_receipt(context_graph=context_graph,projection_roots=projection_roots,retrieval_results=retrieval_results,retrieval_bounds=retrieval_bounds)
 decision=build_admitted_receipt(goal=goal,context_graph=context_graph,projection_roots=projection_roots,policy=policy,considered_assertion_refs=consideration["considered_assertion_refs"],current_context_graph=current_context_graph,inferences=inferences)
 decision["consideration"]=consideration
 # Recompute receipt digest because consideration is part of the inspectable decision receipt.
 body={k:v for k,v in decision.items() if k!="receipt_digest"}; decision["receipt_digest"]=_digest(body)
 return decision

def normalize_memory_search_response(*,provider_response,query,limit,scope,reason,id_resolution_map=None,provider="corpus-retrieval/memory_search"):
 """Normalize the real corpus-retrieval memory_search shape without text matching."""
 bounds={"source":provider,"limit":limit,"scope":scope,"reason":reason,"query":query}
 if not isinstance(limit,int) or not 1<=limit<=20: raise ValueError("provider limit invalide")
 if not isinstance(provider_response,dict): return {"status":"provider_failure","retrieval_bounds":bounds,"error":"invalid_provider_response","retrieval_results":[]}
 if provider_response.get("error") is not None: return {"status":"provider_failure","retrieval_bounds":bounds,"error":deepcopy(provider_response["error"]),"retrieval_results":[]}
 results=provider_response.get("results")
 if not isinstance(results,list): return {"status":"provider_failure","retrieval_bounds":bounds,"error":"missing_results","retrieval_results":[]}
 mapping=id_resolution_map or {}; normalized=[]
 for rank,hit in enumerate(results,1):
  if not isinstance(hit,dict) or not isinstance(hit.get("id"),str): raise ValueError("hit provider invalide")
  ident=hit["id"]; resolution=deepcopy(mapping.get(ident,{"assertion_ref":"provider-unresolved:"+ident}))
  normalized.append({"retrieval_ref":provider+":"+ident,"source":{"provider":provider,"document_id":ident,"document_source":hit.get("source")},"score":hit.get("score"),"rank":rank,"resolution":resolution,"provider_metadata":{"text_present":isinstance(hit.get("text"),str),"text_chars":len(hit.get("text","")) if isinstance(hit.get("text"),str) else None}})
 return {"status":"zero_hits" if not normalized else "hits","retrieval_bounds":bounds,"retrieval_results":normalized}
