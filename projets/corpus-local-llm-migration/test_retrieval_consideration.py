import unittest
import context_algebra as ca
import decision_grounding as dg

POLICY={"schema":"decision_admission_policy.v1","version":"1.0","rules":[{"rule_id":"rev","predicate":"task.reversibility","goal_terms":["safe","change"],"allowed_planner_axes":["reversibility"]}]}
BOUNDS={"source":"memory-search","limit":20,"scope":"project:A","reason":"ground current goal"}

class ConsiderationTests(unittest.TestCase):
 def e(self,v,n=None):return ca.entity("scope",{"scheme":"canonical-uri","value":v},display_name=n)
 def ev(self,n):return ca.evidence("fact",digest=n,evidence_id="ev:"+n)
 def g(self,e,a,v):return ca.graph(entities=e,assertions=a,evidence_items=v)
 def hit(self,ref,res,score=None,rank=None,source="memory"):return {"retrieval_ref":ref,"source":{"provider":source},"score":score,"rank":rank,"resolution":res}

 def test_unique_resolved(self):
  e=self.e("A");v=self.ev("x");a=ca.assertion(e["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);g=self.g([e],[a],[v]);h=self.hit("r1",{"assertion_ref":a["assertion_id"]},.9,1)
  r=dg.consideration_receipt(context_graph=g,projection_roots=[e["entity_id"]],retrieval_results=[h],retrieval_bounds=BOUNDS)
  self.assertEqual(r["considered_assertion_refs"],[a["assertion_id"]]);self.assertEqual(r["retrieval_hits"][0]["status"],"resolved")

 def test_duplicates_and_multiple_sources_dedupe_without_losing_provenance(self):
  e=self.e("A");v=self.ev("x");a=ca.assertion(e["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);g=self.g([e],[a],[v])
  hs=[self.hit("r1",{"assertion_ref":a["assertion_id"]},.9,1,"one"),self.hit("r2",{"assertion_ref":a["assertion_id"]},.2,8,"two")]
  r=dg.consideration_receipt(context_graph=g,projection_roots=[e["entity_id"]],retrieval_results=hs,retrieval_bounds=BOUNDS)
  self.assertEqual(r["considered_assertion_refs"],[a["assertion_id"]]);self.assertEqual(r["considered"][0]["retrieval_refs"],["r1","r2"]);self.assertEqual(len(r["retrieval_hits"]),2)

 def test_homonyms_canonical_identity_and_ambiguity(self):
  a,b=self.e("A","same"),self.e("B","same");v=self.ev("x");aa=ca.assertion(a["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);bb=ca.assertion(b["entity_id"],"task.reversibility","irreversible",evidence_refs=["ev:x"]);g=self.g([a,b],[aa,bb],[v])
  exact=self.hit("r1",{"canonical_identity":a["identity"],"predicate":"task.reversibility"})
  r=dg.consideration_receipt(context_graph=g,projection_roots=[a["entity_id"]],retrieval_results=[exact],retrieval_bounds=BOUNDS);self.assertEqual(r["considered_assertion_refs"],[aa["assertion_id"]])
  # Same canonical subject/predicate with two historical assertions is ambiguous by design.
  aa2=ca.assertion(a["entity_id"],"task.reversibility","costly",evidence_refs=["ev:x"]);g2=self.g([a,b],[aa,aa2,bb],[v])
  r2=dg.consideration_receipt(context_graph=g2,projection_roots=[a["entity_id"]],retrieval_results=[exact],retrieval_bounds=BOUNDS);self.assertEqual(r2["retrieval_hits"][0]["status"],"ambiguous");self.assertEqual(r2["considered_assertion_refs"],[])

 def test_unresolved_never_synthesizes_assertion(self):
  e=self.e("A");g=self.g([e],[],[]);h=self.hit("r1",{"assertion_ref":"ast:missing"})
  r=dg.consideration_receipt(context_graph=g,projection_roots=[e["entity_id"]],retrieval_results=[h],retrieval_bounds=BOUNDS)
  self.assertEqual(r["retrieval_hits"][0]["status"],"unresolved");self.assertEqual(r["considered_assertion_refs"],[])

 def test_resolved_outside_projection_not_considered(self):
  a,b=self.e("A"),self.e("B");v=self.ev("x");bb=ca.assertion(b["entity_id"],"task.reversibility","irreversible",evidence_refs=["ev:x"]);g=self.g([a,b],[bb],[v]);h=self.hit("r1",{"assertion_ref":bb["assertion_id"]})
  r=dg.consideration_receipt(context_graph=g,projection_roots=[a["entity_id"]],retrieval_results=[h],retrieval_bounds=BOUNDS)
  self.assertEqual(r["retrieval_hits"][0]["status"],"resolved_outside_projection");self.assertEqual(r["considered_assertion_refs"],[])

 def test_high_score_rejected_low_score_admitted_by_policy_not_rank(self):
  e=self.e("A");v=self.ev("x");noise=ca.assertion(e["entity_id"],"task.note","safe change",evidence_refs=["ev:x"]);good=ca.assertion(e["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);g=self.g([e],[noise,good],[v])
  hs=[self.hit("high",{"assertion_ref":noise["assertion_id"]},.999,1),self.hit("low",{"assertion_ref":good["assertion_id"]},.01,99)]
  r=dg.build_retrieval_grounded_receipt(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],policy=POLICY,retrieval_results=hs,retrieval_bounds=BOUNDS)
  ds={x["assertion_ref"]:x for x in r["admission"]["decisions"]};self.assertEqual(ds[noise["assertion_id"]]["decision"],"rejected");self.assertEqual(ds[good["assertion_id"]]["decision"],"admitted");self.assertEqual(r["planner_input"]["reversibility"],"reversible")

 def test_order_rank_score_do_not_change_considered_or_decision_semantics(self):
  e=self.e("A");v=self.ev("x");a=ca.assertion(e["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);g=self.g([e],[a],[v])
  h1=self.hit("r1",{"assertion_ref":a["assertion_id"]},.9,1);h2=self.hit("r2",{"assertion_ref":a["assertion_id"]},.1,9)
  x=dg.consideration_receipt(context_graph=g,projection_roots=[e["entity_id"]],retrieval_results=[h1,h2],retrieval_bounds=BOUNDS)
  h1b=self.hit("r1",{"assertion_ref":a["assertion_id"]},.01,20);h2b=self.hit("r2",{"assertion_ref":a["assertion_id"]},.99,1)
  y=dg.consideration_receipt(context_graph=g,projection_roots=[e["entity_id"]],retrieval_results=[h2b,h1b],retrieval_bounds=BOUNDS)
  self.assertEqual(x["considered_assertion_refs"],y["considered_assertion_refs"]);self.assertEqual(x["decision_semantic_digest"],y["decision_semantic_digest"]);self.assertNotEqual(x["receipt_digest"],y["receipt_digest"])

 def test_bounds_are_enforced_and_inspectable(self):
  e=self.e("A");g=self.g([e],[],[])
  with self.assertRaises(ValueError):dg.consideration_receipt(context_graph=g,projection_roots=[e["entity_id"]],retrieval_results=[self.hit("r"+str(i),{"assertion_ref":"x"}) for i in range(21)],retrieval_bounds=BOUNDS)
  r=dg.consideration_receipt(context_graph=g,projection_roots=[e["entity_id"]],retrieval_results=[],retrieval_bounds=BOUNDS);self.assertEqual(r["retrieval_bounds"],BOUNDS)

 def test_retrieval_metadata_is_separate_from_fact_evidence(self):
  e=self.e("A");v=self.ev("fact");a=ca.assertion(e["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:fact"]);g=self.g([e],[a],[v]);h=self.hit("r1",{"assertion_ref":a["assertion_id"]},.7,2,"retriever")
  r=dg.build_retrieval_grounded_receipt(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],policy=POLICY,retrieval_results=[h],retrieval_bounds=BOUNDS)
  self.assertEqual(r["consideration"]["retrieval_hits"][0]["source"],{"provider":"retriever"});self.assertEqual(r["observations"][0]["provenance"]["evidence_refs"],["ev:fact"])

if __name__=="__main__":unittest.main()
