"""Generic contextual state algebra for Corpus-GPT handoffs."""
from __future__ import annotations
import hashlib, json, uuid
from copy import deepcopy

def _canon(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
def _digest(value):
    return hashlib.sha256(_canon(value).encode("utf-8")).hexdigest()

def stable_entity_id(kind, identity=None, entity_id=None):
    if entity_id: return str(entity_id)
    if identity is None: return "ent:opaque:" + uuid.uuid4().hex
    if not isinstance(identity, dict) or not identity.get("scheme") or "value" not in identity:
        raise ValueError("identity exige scheme + value")
    return "ent:" + _digest({"kind":str(kind),"identity":identity})[:32]

def entity(kind, identity=None, *, entity_id=None, display_name=None, attributes=None):
    result={"entity_id":stable_entity_id(kind,identity,entity_id),"kind":str(kind),"identity":deepcopy(identity) if identity is not None else None,"attributes":deepcopy(attributes or {})}
    if display_name is not None: result["display_name"]=str(display_name)
    return result

def evidence(kind, *, producer=None, digest=None, locator=None, captured_at=None, evidence_id=None):
    body={"kind":str(kind),"producer":producer,"digest":digest,"locator":deepcopy(locator or {}),"captured_at":captured_at}
    return {"evidence_id":evidence_id or "ev:"+_digest(body)[:32],**body}

def relation(source, relation_type, target, *, evidence_refs=None, validity=None, relation_id=None, attributes=None):
    body={"from":str(source),"type":str(relation_type),"to":str(target),"attributes":deepcopy(attributes or {})}
    return {"relation_id":relation_id or "rel:"+_digest(body)[:32],**body,"evidence":list(evidence_refs or []),"validity":deepcopy(validity or {})}

def assertion(subject,predicate,value,*,evidence_refs=None,validity=None,depends_on=None,supersedes=None,invalidates=None,assertion_id=None,observed_at=None,attributes=None):
    deps=[]
    for dep in depends_on or []:
        if not isinstance(dep,dict) or not dep.get("role") or not dep.get("ref"): raise ValueError("depends_on exige {role, ref}")
        deps.append({"role":str(dep["role"]),"ref":str(dep["ref"])})
    body={"subject":str(subject),"predicate":str(predicate),"value":deepcopy(value),"depends_on":deps}
    return {"assertion_id":assertion_id or "ast:"+_digest(body)[:32],**body,"evidence":list(evidence_refs or []),"observed_at":observed_at,"validity":deepcopy(validity or {}),"supersedes":list(supersedes or []),"invalidates":list(invalidates or []),"attributes":deepcopy(attributes or {})}

def graph(*,entities=None,assertions=None,relations=None,evidence_items=None):
    return {"schema_version":1,"entities":list(entities or []),"assertions":list(assertions or []),"relations":list(relations or []),"evidence":list(evidence_items or [])}

def _index(g,key,id_key): return {item[id_key]:item for item in g.get(key,[])}

def validate_graph(g):
    if not isinstance(g,dict): raise ValueError("context_graph invalide")
    es=_index(g,"entities","entity_id"); aa=_index(g,"assertions","assertion_id"); rr=_index(g,"relations","relation_id"); ev=_index(g,"evidence","evidence_id")
    for a in aa.values():
        if a.get("subject") not in es: raise ValueError("assertion subject inconnu")
        for dep in a.get("depends_on",[]):
            if dep.get("ref") not in es and dep.get("ref") not in aa and dep.get("ref") not in rr: raise ValueError("dependance inconnue")
        if any(x not in ev for x in a.get("evidence",[])): raise ValueError("evidence inconnue")
    for r in rr.values():
        if r.get("from") not in es or r.get("to") not in es: raise ValueError("relation endpoint inconnu")
        if any(x not in ev for x in r.get("evidence",[])): raise ValueError("evidence inconnue")
    return g

def _refs_from_validity(v):
    refs=set()
    if isinstance(v,dict):
        for k,x in v.items():
            if k in {"assertion_ref","relation_ref","entity_ref","ref"} and isinstance(x,str): refs.add(x)
            else: refs |= _refs_from_validity(x)
    elif isinstance(v,list):
        for x in v: refs |= _refs_from_validity(x)
    return refs

def project(g,roots):
    validate_graph(g); roots=set(roots or [])
    es=_index(g,"entities","entity_id"); aa=_index(g,"assertions","assertion_id"); rr=_index(g,"relations","relation_id"); ev=_index(g,"evidence","evidence_id")
    ke,ka,kr,kv=set(),set(),set(),set(); frontier=set(roots)
    while frontier:
        ref=frontier.pop()
        if ref in es and ref not in ke:
            ke.add(ref)
            for rid,r in rr.items():
                if r["from"]==ref or r["to"]==ref: frontier|={rid,r["from"],r["to"]}
            for aid,a in aa.items():
                if a["subject"]==ref: frontier.add(aid)
        elif ref in aa and ref not in ka:
            ka.add(ref); a=aa[ref]; frontier.add(a["subject"]); frontier|={d["ref"] for d in a.get("depends_on",[])}; frontier|=_refs_from_validity(a.get("validity",{})); kv|=set(a.get("evidence",[]))
        elif ref in rr and ref not in kr:
            kr.add(ref); r=rr[ref]; frontier|={r["from"],r["to"]}; frontier|=_refs_from_validity(r.get("validity",{})); kv|=set(r.get("evidence",[]))
    for aid in ka: kv|=set(aa[aid].get("evidence",[]))
    for rid in kr: kv|=set(rr[rid].get("evidence",[]))
    return {"schema_version":1,"roots":sorted(roots),"entities":[deepcopy(es[x]) for x in sorted(ke)],"assertions":[deepcopy(aa[x]) for x in sorted(ka)],"relations":[deepcopy(rr[x]) for x in sorted(kr)],"evidence":[deepcopy(ev[x]) for x in sorted(kv) if x in ev]}

def reconcile(projected,current):
    validate_graph(projected); validate_graph(current)
    ce=_index(current,"entities","entity_id"); ca=_index(current,"assertions","assertion_id"); cr=_index(current,"relations","relation_id")
    oa=_index(projected,"assertions","assertion_id"); orr=_index(projected,"relations","relation_id")
    slots={}; invalid=set()
    for a in ca.values():
        slots.setdefault((a["subject"],a["predicate"]),[]).append(a); invalid|=set(a.get("invalidates",[]))
    entity_state={e["entity_id"]:("recognized" if e["entity_id"] in ce else "context_missing") for e in projected.get("entities",[])}
    assertion_state={}
    for aid,old in oa.items():
        if aid in invalid: assertion_state[aid]="invalidated"; continue
        if aid in ca: assertion_state[aid]="still_valid"; continue
        replacements=slots.get((old["subject"],old["predicate"]),[])
        if any(aid in r.get("supersedes",[]) for r in replacements): assertion_state[aid]="superseded"; continue
        refs={d["ref"] for d in old.get("depends_on",[])}|_refs_from_validity(old.get("validity",{}))
        assertion_state[aid]="stale" if refs and any(ref not in ca and ref not in cr and ref not in ce for ref in refs) else "unverifiable"
    relation_state={}
    for rid,old in orr.items():
        relation_state[rid]="still_valid" if rid in cr else ("context_missing" if old["from"] not in ce or old["to"] not in ce else "unverifiable")
    return {"entities":entity_state,"assertions":assertion_state,"relations":relation_state,"compatible":not any(v=="invalidated" for v in assertion_state.values())}

def legacy_fields_from_projection(p):
    out={"validations":[],"baselines":[],"blockers":[],"stop_conditions":[]}
    mapping={"legacy.validation":"validations","legacy.baseline":"baselines","legacy.blocker":"blockers","legacy.stop_condition":"stop_conditions"}
    for a in p.get("assertions",[]):
        key=mapping.get(a.get("predicate"))
        if key and isinstance(a.get("value"),str): out[key].append(a["value"])
    return out
