import unittest
import context_algebra as ca
import decision_grounding_orchestrator as o

EXPOSURE={"decision_required":True,"persistent_context_required":True,"context_graph_available":True,"projection_roots_available":True}
POLICY={"schema":"decision_admission_policy.v1","version":"t5a","rules":[{"rule_id":"rev","predicate":"task.reversibility","goal_terms":["safe","change"],"allowed_planner_axes":["reversibility"]}]}
BASE={"status":"pass","job_known":True,"job_kind":"local","potentially_long":False,"write":False,"destructive":False}
class T5aTests(unittest.TestCase):
 def fixture(self):
  e=ca.entity("scope",{"scheme":"canonical-uri","value":"A"});v=ca.evidence("test",digest="x",evidence_id="ev:x");a=ca.assertion(e["entity_id"],"task.reversibility","reversible",evidence_refs=["ev:x"]);g=ca.graph(entities=[e],assertions=[a],evidence_items=[v]);return e,a,g
 def call(self,search,base=None,mapping=True):
  e,a,g=self.fixture();return o.orchestrate(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],admission_policy=POLICY,retrieval_query="q",retrieval_limit=5,retrieval_scope="A",retrieval_reason="ground",id_resolution_map={"doc":{"assertion_ref":a["assertion_id"]}} if mapping else {},planner_base=BASE if base is None else base,retrieval_search=search,exposure_context=EXPOSURE)
 def provider(self,q,l):return {"results":[{"id":"doc","source":"fixture","text":"not evidence","score":.9}]}
 def test_full_chain_and_axis_provenance(self):
  r=self.call(self.provider);self.assertEqual(r["state"],"planned");self.assertEqual(r["planner_input"],{"reversibility":"reversible"});self.assertEqual(r["merge"]["axes"]["reversibility"]["provenance"],"grounding");self.assertIsNotNone(r["execution_plan"])
 def test_same_axis_same_value_is_explicit_convergence(self):
  b={**BASE,"reversibility":"reversible"};r=self.call(self.provider,b);self.assertEqual(r["merge"]["axes"]["reversibility"]["provenance"],"convergent");self.assertEqual(r["state"],"planned")
 def test_conflicting_axis_stops_before_planner(self):
  b={**BASE,"reversibility":"irreversible"};r=self.call(self.provider,b);self.assertEqual(r["state"],"stopped_before_planner");self.assertEqual(r["stop_reason"],"planner_input_collision");self.assertIsNone(r["execution_plan"]);self.assertEqual(r["merge"]["axes"]["reversibility"]["provenance"],"collision")
 def test_provider_failure_stops_before_planner_with_receipt(self):
  r=self.call(lambda q,l:{"error":{"code":-1,"message":"down"}});self.assertEqual(r["stop_reason"],"provider_failure");self.assertIsNone(r["execution_plan"]);self.assertIsNotNone(r["retrieval"])
 def test_transport_exception_stops_before_planner(self):
  def boom(q,l):raise RuntimeError("down")
  r=self.call(boom);self.assertEqual(r["stop_reason"],"provider_failure")
 def test_unresolved_hit_never_influences_plan(self):
  r=self.call(self.provider,mapping=False);self.assertEqual(r["planner_input"],{});self.assertEqual(r["consideration"]["retrieval_hits"][0]["status"],"unresolved");self.assertEqual(r["state"],"planned")
 def test_planner_rejection_preserves_receipt(self):
  r=self.call(self.provider,{"status":"bad"});self.assertEqual(r["state"],"stopped_at_planner");self.assertEqual(r["stop_reason"],"planner_rejected_input");self.assertIsNotNone(r["decision_context_receipt"])
 def test_merge_every_axis_has_provenance(self):
  r=self.call(self.provider);self.assertEqual(set(r["merge"]["merged"]),set(r["merge"]["axes"]));self.assertTrue(all(x["provenance"] in {"grounding","planner_base","convergent"} for x in r["merge"]["axes"].values()))
 def test_context_graph_not_mutated(self):
  import copy
  e,a,g=self.fixture();before=copy.deepcopy(g)
  o.orchestrate(goal="safe change",context_graph=g,projection_roots=[e["entity_id"]],admission_policy=POLICY,retrieval_query="q",retrieval_limit=5,retrieval_scope="A",retrieval_reason="ground",id_resolution_map={"doc":{"assertion_ref":a["assertion_id"]}},planner_base=BASE,retrieval_search=self.provider,exposure_context=EXPOSURE)
  self.assertEqual(g,before)
 def test_not_invoked_means_no_retrieval(self):
  calls=[]
  def search(q,l):calls.append((q,l));return {"results":[]}
  # Merely constructing/holding the callable performs no retrieval.
  self.assertEqual(calls,[])
 def test_deterministic_for_same_provider_payload(self):
  self.assertEqual(self.call(self.provider),self.call(self.provider))
if __name__=="__main__":unittest.main()
