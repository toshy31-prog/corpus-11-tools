import json,unittest
import context_algebra as ca
import decision_grounding as dg

class GroundingTests(unittest.TestCase):
 def ent(self,v,n=None): return ca.entity("scope",{"scheme":"canonical-uri","value":v},display_name=n)
 def ev(self,n): return ca.evidence("test",digest=n,evidence_id="ev:"+n)
 def graph(self,e,a,v): return ca.graph(entities=e,assertions=a,evidence_items=v)
 def c(self,a,axis=None,value=None):
  x={"assertion_ref":a["assertion_id"],"relevance_reason":"relevant to goal"}
  if axis:x["planner_axis"]=axis
  if value is not None:x["planner_value"]=value
  return x

 def test_current_fact_provenance_and_axis(self):
  e=self.ent("A");v=self.ev("x");a=ca.assertion(e["entity_id"],"task.reversibility","reversible",evidence_refs=[v["evidence_id"]]);g=self.graph([e],[a],[v])
  r=dg.build_receipt(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],candidates=[self.c(a,"reversibility")])
  self.assertEqual(r["planner_input"]["reversibility"],"reversible");self.assertEqual(r["observations"][0]["validity"]["qualification"],"current");self.assertEqual(r["observations"][0]["provenance"]["evidence_refs"],["ev:x"])

 def test_stale_and_superseded_do_not_ground(self):
  e,d=self.ent("A"),self.ent("dep");v=self.ev("x")
  old=ca.assertion(e["entity_id"],"state","old",evidence_refs=["ev:x"]);risk=ca.assertion(e["entity_id"],"risk","low",depends_on=[{"role":"basis","ref":d["entity_id"]}],evidence_refs=["ev:x"]);g=self.graph([e,d],[old,risk],[v])
  new=ca.assertion(e["entity_id"],"state","new",supersedes=[old["assertion_id"]],evidence_refs=["ev:x"]);cur=self.graph([e],[new],[v])
  r=dg.build_receipt(goal="decide",context_graph=g,projection_roots=[e["entity_id"]],current_context_graph=cur,candidates=[self.c(old,"uncertainty"),self.c(risk,"reversibility")]);q={x["assertion_ref"]:x["validity"]["qualification"] for x in r["observations"]}
  self.assertEqual(q[old["assertion_id"]],"superseded");self.assertEqual(q[risk["assertion_id"]],"stale");self.assertEqual(r["planner_input"],{})

 def test_conflict_explicit_no_silent_winner(self):
  e=self.ent("A");x,y=self.ev("x"),self.ev("y");a=ca.assertion(e["entity_id"],"rev","reversible",evidence_refs=["ev:x"]);b=ca.assertion(e["entity_id"],"rev","irreversible",evidence_refs=["ev:y"]);g=self.graph([e],[a,b],[x,y])
  r=dg.build_receipt(goal="decide",context_graph=g,projection_roots=[e["entity_id"]],candidates=[self.c(a,"reversibility"),self.c(b,"reversibility")])
  self.assertTrue(r["conflicts"]);self.assertEqual(r["planner_input"],{});self.assertTrue(all(x["validity"]["qualification"]=="conflict" for x in r["observations"]))

 def test_homonyms_and_independent_scope(self):
  a,b=self.ent("A","same"),self.ent("B","same");v=self.ev("x");aa=ca.assertion(a["entity_id"],"state","ready",evidence_refs=["ev:x"]);bb=ca.assertion(b["entity_id"],"state","blocked",evidence_refs=["ev:x"]);g=self.graph([a,b],[aa,bb],[v])
  r=dg.build_receipt(goal="A",context_graph=g,projection_roots=[a["entity_id"]],candidates=[self.c(aa)]);self.assertEqual(len(r["observations"]),1)
  with self.assertRaises(ValueError):dg.build_receipt(goal="A",context_graph=g,projection_roots=[a["entity_id"]],candidates=[self.c(bb)])

 def test_insufficient_evidence_and_valid_no_plan_impact(self):
  e=self.ent("A");a=ca.assertion(e["entity_id"],"rev","reversible");note=ca.assertion(e["entity_id"],"note","keep logs");g=self.graph([e],[a,note],[])
  r=dg.build_receipt(goal="decide",context_graph=g,projection_roots=[e["entity_id"]],candidates=[self.c(a,"reversibility"),self.c(note)]);by={x["assertion_ref"]:x for x in r["observations"]}
  self.assertEqual(by[a["assertion_id"]]["validity"]["qualification"],"insufficient_evidence");self.assertIsNone(by[note["assertion_id"]]["planner_influence"]);self.assertEqual(r["planner_input"],{})

 def test_multiple_convergent_provenance(self):
  e=self.ent("A");x,y=self.ev("x"),self.ev("y");a=ca.assertion(e["entity_id"],"rev","reversible",evidence_refs=["ev:x","ev:y"]);g=self.graph([e],[a],[x,y])
  r=dg.build_receipt(goal="decide",context_graph=g,projection_roots=[e["entity_id"]],candidates=[self.c(a,"reversibility")]);self.assertEqual(len(r["observations"][0]["provenance"]["evidence"]),2)

 def test_inference_never_observation(self):
  e=self.ent("A");v=self.ev("x");a=ca.assertion(e["entity_id"],"signal",7,evidence_refs=["ev:x"]);g=self.graph([e],[a],[v])
  r=dg.build_receipt(goal="infer",context_graph=g,projection_roots=[e["entity_id"]],candidates=[self.c(a)],inferences=[{"inference_id":"i1","rule":"gt5","depends_on":[a["assertion_id"]],"value":"high"}])
  self.assertEqual(r["inferences"][0]["kind"],"derived_inference");self.assertEqual(r["observations"][0]["observation"]["value"],7)

 def test_independent_root_change_does_not_invalidate(self):
  a,b=self.ent("A"),self.ent("B");v=self.ev("x");aa=ca.assertion(a["entity_id"],"rev","reversible",evidence_refs=["ev:x"]);bb=ca.assertion(b["entity_id"],"state","one",evidence_refs=["ev:x"]);g=self.graph([a,b],[aa,bb],[v]);bb2=ca.assertion(b["entity_id"],"state","two",supersedes=[bb["assertion_id"]],evidence_refs=["ev:x"]);cur=self.graph([a,b],[aa,bb2],[v])
  r=dg.build_receipt(goal="A",context_graph=g,projection_roots=[a["entity_id"]],current_context_graph=cur,candidates=[self.c(aa,"reversibility")]);self.assertEqual(r["planner_input"]["reversibility"],"reversible");self.assertTrue(r["reconciliation"]["compatible"])

 def test_retrieved_projection_is_not_automatically_decision_fact(self):
  e=self.ent("A");v=self.ev("x");a=ca.assertion(e["entity_id"],"state","ready",evidence_refs=["ev:x"]);g=self.graph([e],[a],[v])
  r=dg.build_receipt(goal="decide",context_graph=g,projection_roots=[e["entity_id"]],candidates=[])
  self.assertEqual(r["observations"],[]);self.assertEqual(r["planner_input"],{})

 def test_invalidated_and_unverifiable_remain_qualified_not_promoted(self):
  e=self.ent("A");v=self.ev("x");old=ca.assertion(e["entity_id"],"rev","reversible",evidence_refs=["ev:x"]);g=self.graph([e],[old],[v])
  inv=ca.assertion(e["entity_id"],"invalidation","unsafe",invalidates=[old["assertion_id"]],evidence_refs=["ev:x"]);cur=self.graph([e],[inv],[v])
  r=dg.build_receipt(goal="decide",context_graph=g,projection_roots=[e["entity_id"]],current_context_graph=cur,candidates=[self.c(old,"reversibility")])
  self.assertEqual(r["observations"][0]["validity"]["qualification"],"invalidated");self.assertEqual(r["planner_input"],{})

 def test_deterministic_serializable(self):
  e=self.ent("A");v=self.ev("x");a=ca.assertion(e["entity_id"],"rev","reversible",evidence_refs=["ev:x"]);g=self.graph([e],[a],[v]);kw=dict(goal="decide",context_graph=g,projection_roots=[e["entity_id"]],candidates=[self.c(a,"reversibility")])
  x,y=dg.build_receipt(**kw),dg.build_receipt(**kw);self.assertEqual(x,y);json.dumps(x);self.assertEqual(x["receipt_digest"],y["receipt_digest"])

if __name__=="__main__":unittest.main()
