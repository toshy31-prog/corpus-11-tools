import unittest
import context_algebra as ca
import decision_grounding as dg

POLICY={"schema":"decision_admission_policy.v1","version":"1.0","rules":[
 {"rule_id":"rev.safe","predicate":"task.reversibility","goal_terms":["safe","change"],"allowed_planner_axes":["reversibility"]},
 {"rule_id":"note.audit","predicate":"task.note","goal_terms":["safe","change"],"allowed_planner_axes":[]},
]}

class AdmissionTests(unittest.TestCase):
 def e(self,v,n=None):return ca.entity("scope",{"scheme":"canonical-uri","value":v},display_name=n)
 def ev(self,n):return ca.evidence("test",digest=n,evidence_id="ev:"+n)
 def g(self,e,a,v):return ca.graph(entities=e,assertions=a,evidence_items=v)
 def dec(self,**kw):return dg.admission_decisions(policy=POLICY,**kw)

 def test_relevant_evidenced_scope_admitted_and_axis_from_rule(self):
  e=self.e("A");v=self.ev("x");a=ca.assertion(e["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);g=self.g([e],[a],[v])
  x=self.dec(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],considered_assertion_refs=[a["assertion_id"]])["decisions"][0]
  self.assertEqual(x["decision"],"admitted");self.assertEqual(x["allowed_planner_axes"],["reversibility"]);self.assertEqual(x["policy_rule"]["rule_id"],"rev.safe")
  r=dg.build_admitted_receipt(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],considered_assertion_refs=[a["assertion_id"]],policy=POLICY)
  self.assertEqual(r["planner_input"],{"reversibility":"reversible"});self.assertEqual(r["admission"]["policy"]["digest"],x["policy_rule"]["policy_digest"])

 def test_outside_projection_rejected_even_if_relevant(self):
  a,b=self.e("A"),self.e("B");v=self.ev("x");bb=ca.assertion(b["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);g=self.g([a,b],[bb],[v])
  x=self.dec(goal="safe change",context_graph=g,projection_roots=[a["entity_id"]],considered_assertion_refs=[bb["assertion_id"]])["decisions"][0]
  self.assertEqual((x["decision"],x["rejection_reason"]),("rejected","outside_projection"))

 def test_lexically_close_but_no_semantic_rule_rejected(self):
  e=self.e("A");v=self.ev("x");a=ca.assertion(e["entity_id"],"task.safe_change_note","safe change reversible",evidence_refs=["ev:x"]);g=self.g([e],[a],[v])
  x=self.dec(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],considered_assertion_refs=[a["assertion_id"]])["decisions"][0]
  self.assertEqual((x["decision"],x["rejection_reason"]),("rejected","not_goal_relevant_under_policy"))

 def test_relevant_without_evidence_deferred(self):
  e=self.e("A");a=ca.assertion(e["entity_id"],"task.reversibility","reversible");g=self.g([e],[a],[])
  x=self.dec(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],considered_assertion_refs=[a["assertion_id"]])["decisions"][0]
  self.assertEqual((x["decision"],x["defer_reason"]),("deferred","insufficient_evidence"))

 def test_superseded_and_stale_are_non_active(self):
  e,d=self.e("A"),self.e("dep");v=self.ev("x");old=ca.assertion(e["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);dep=ca.assertion(e["entity_id"],"task.note","keep",depends_on=[{"role":"basis","ref":d["entity_id"]}],evidence_refs=["ev:x"]);g=self.g([e,d],[old,dep],[v])
  new=ca.assertion(e["entity_id"],"task.reversibility","irreversible",supersedes=[old["assertion_id"]],evidence_refs=["ev:x"]);cur=self.g([e],[new],[v])
  ds=self.dec(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],current_context_graph=cur,considered_assertion_refs=[old["assertion_id"],dep["assertion_id"]])["decisions"]
  by={x["assertion_ref"]:x for x in ds};self.assertEqual(by[old["assertion_id"]]["rejection_reason"],"superseded");self.assertEqual(by[dep["assertion_id"]]["rejection_reason"],"stale")

 def test_conflict_conserved_without_promotion(self):
  e=self.e("A");x,y=self.ev("x"),self.ev("y");a=ca.assertion(e["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);b=ca.assertion(e["entity_id"],"task.reversibility","irreversible",evidence_refs=["ev:y"]);g=self.g([e],[a,b],[x,y])
  r=dg.build_admitted_receipt(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],considered_assertion_refs=[a["assertion_id"],b["assertion_id"]],policy=POLICY)
  self.assertTrue(r["conflicts"]);self.assertNotIn("reversibility",r["planner_input"])

 def test_homonyms_remain_canonical(self):
  a,b=self.e("A","same"),self.e("B","same");v=self.ev("x");aa=ca.assertion(a["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);bb=ca.assertion(b["entity_id"],"task.reversibility","irreversible",evidence_refs=["ev:x"]);g=self.g([a,b],[aa,bb],[v])
  ds=self.dec(goal="safe change",context_graph=g,projection_roots=[a["entity_id"]],considered_assertion_refs=[aa["assertion_id"],bb["assertion_id"]])["decisions"]
  self.assertEqual([x["decision"] for x in ds],["admitted","rejected"])

 def test_convergent_provenance_and_no_axis_rule(self):
  e=self.e("A");x,y=self.ev("x"),self.ev("y");a=ca.assertion(e["entity_id"],"task.note","keep",evidence_refs=["ev:x","ev:y"]);g=self.g([e],[a],[x,y])
  d=self.dec(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],considered_assertion_refs=[a["assertion_id"]])["decisions"][0]
  self.assertEqual(d["decision"],"admitted");self.assertEqual(d["allowed_planner_axes"],[])
  r=dg.build_admitted_receipt(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],considered_assertion_refs=[a["assertion_id"]],policy=POLICY);self.assertEqual(r["planner_input"],{});self.assertEqual(len(r["observations"]),1);self.assertIsNone(r["observations"][0]["planner_influence"])

 def test_axis_cannot_be_supplied_by_caller(self):
  e=self.e("A");v=self.ev("x");a=ca.assertion(e["entity_id"],"task.note","keep",evidence_refs=["ev:x"]);g=self.g([e],[a],[v])
  r=dg.build_admitted_receipt(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],considered_assertion_refs=[a["assertion_id"]],policy=POLICY)
  self.assertNotIn("reversibility",r["planner_input"])

 def test_permutation_determinism(self):
  e=self.e("A");x,y=self.ev("x"),self.ev("y");a=ca.assertion(e["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);b=ca.assertion(e["entity_id"],"task.note","keep",evidence_refs=["ev:y"]);g=self.g([e],[a,b],[x,y])
  kw=dict(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],policy=POLICY)
  one=dg.build_admitted_receipt(considered_assertion_refs=[a["assertion_id"],b["assertion_id"]],**kw);two=dg.build_admitted_receipt(considered_assertion_refs=[b["assertion_id"],a["assertion_id"]],**kw)
  self.assertEqual(one["receipt_digest"],two["receipt_digest"]);self.assertEqual(one,two)

 def test_independent_root_change_stable_admission_and_digest(self):
  a,b=self.e("A"),self.e("B");v=self.ev("x");aa=ca.assertion(a["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);bb=ca.assertion(b["entity_id"],"state","one",evidence_refs=["ev:x"]);g=self.g([a,b],[aa,bb],[v]);bb2=ca.assertion(b["entity_id"],"state","two",supersedes=[bb["assertion_id"]],evidence_refs=["ev:x"]);cur=self.g([a,b],[aa,bb2],[v])
  kw=dict(goal="safe change",context_graph=g,projection_roots=[a["entity_id"]],considered_assertion_refs=[aa["assertion_id"]],policy=POLICY)
  x=dg.build_admitted_receipt(**kw);y=dg.build_admitted_receipt(current_context_graph=cur,**kw)
  self.assertEqual(x["admission"]["decisions"],y["admission"]["decisions"]);self.assertEqual(x["receipt_digest"],y["receipt_digest"])

if __name__=="__main__":unittest.main()
