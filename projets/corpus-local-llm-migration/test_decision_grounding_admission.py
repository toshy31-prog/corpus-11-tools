import ast,json,subprocess,unittest
from pathlib import Path
import context_algebra as ca
import decision_grounding_orchestrator as o

TRUE={"decision_required":True,"persistent_context_required":True,"context_graph_available":True,"projection_roots_available":True}
POLICY={"schema":"decision_admission_policy.v1","version":"t5b","rules":[]}
class T5bAdmissionTests(unittest.TestCase):
 def args(self,ctx):
  e=ca.entity("scope",{"scheme":"canonical-uri","value":"A"});g=ca.graph(entities=[e],assertions=[],evidence_items=[])
  return dict(goal="decide",context_graph=g,projection_roots=[e["entity_id"]],admission_policy=POLICY,retrieval_query="q",retrieval_limit=5,retrieval_scope="A",retrieval_reason="ground",id_resolution_map={},planner_base={"status":"pass","job_known":True,"job_kind":"local"},exposure_context=ctx)
 def reject(self,ctx):
  calls=[]
  def provider(q,l):calls.append((q,l));return {"results":[]}
  r=o.orchestrate(retrieval_search=provider,**self.args(ctx));self.assertEqual(calls,[]);self.assertEqual(r["state"],"rejected_before_retrieval");self.assertFalse(r["exposure_admission"]);self.assertIsNone(r["retrieval"]);self.assertIsNone(r["execution_plan"]);return r
 def test_four_true_admits_and_calls_provider_once(self):
  calls=[]
  def provider(q,l):calls.append((q,l));return {"results":[]}
  r=o.orchestrate(retrieval_search=provider,**self.args(TRUE));self.assertEqual(calls,[("q",5)]);self.assertTrue(r["exposure_admission"]);self.assertEqual(r["state"],"planned")
 def test_each_false_rejects(self):
  for key in TRUE:
   with self.subTest(key=key):
    ctx=dict(TRUE);ctx[key]=False;r=self.reject(ctx);self.assertIn(key,r["missing_preconditions"])
 def test_multiple_missing(self):
  r=self.reject({"decision_required":True});self.assertEqual(r["missing_preconditions"],["context_graph_available","persistent_context_required","projection_roots_available"])
 def test_absent_context(self):
  r=self.reject(None);self.assertEqual(len(r["missing_preconditions"]),4)
 def test_empty_context(self):
  r=self.reject({});self.assertEqual(len(r["missing_preconditions"]),4)
 def test_invalid_types_are_not_truthy(self):
  for bad in ("true",1,[],{}):
   with self.subTest(bad=bad):
    ctx=dict(TRUE);ctx["decision_required"]=bad;r=self.reject(ctx);self.assertIn("decision_required",r["invalid_preconditions"])
 def test_unknown_field_rejects(self):
  ctx={**TRUE,"extra":True};r=self.reject(ctx);self.assertEqual(r["unknown_preconditions"],["extra"])
 def test_successive_calls_do_not_leak(self):
  calls=[]
  def provider(q,l):calls.append(1);return {"results":[]}
  bad=o.orchestrate(retrieval_search=provider,**self.args({}))
  good=o.orchestrate(retrieval_search=provider,**self.args(TRUE))
  bad2=o.orchestrate(retrieval_search=provider,**self.args({"decision_required":False}))
  self.assertEqual((bad["state"],good["state"],bad2["state"]),("rejected_before_retrieval","planned","rejected_before_retrieval"));self.assertEqual(len(calls),1)
 def test_rejection_receipt_deterministic(self):
  self.assertEqual(self.reject({}),self.reject({}))
 def test_tools_list_static_and_ground_decision_unique(self):
  src=Path("corpus_gpt_mcp.py").read_text();tree=ast.parse(src)
  assign=next(n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=="TOOLS" for t in n.targets))
  names=[]
  for item in assign.value.elts:
   if isinstance(item,ast.Dict):
    d={k.value:v for k,v in zip(item.keys,item.values) if isinstance(k,ast.Constant)}
    if isinstance(d.get("name"),ast.Constant):names.append(d["name"].value)
  self.assertEqual(names.count("ground_decision"),1);self.assertIn('res = {"tools":TOOLS}',src)
if __name__=="__main__":unittest.main()
