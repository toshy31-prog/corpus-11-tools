import unittest
import corpus_gpt_planner as p
class PlannerTests(unittest.TestCase):
 def test_fast_path_skips_recompute_when_fresh(self):
  v=p.plan({"status":"pass","job_known":True,"job_kind":"local","evidence_freshness":"fresh"})
  self.assertEqual(v["calls"],["run_job"]);self.assertIn("cdp_preflight",v["skip"]);self.assertIn("recompute_existing_evidence",v["skip"])
 def test_long_uses_async(self):
  self.assertEqual(p.plan({"status":"pass","job_known":True,"potentially_long":True})["calls"],["start_job","job_status"])
 def test_transversal_organism_adds_checks(self):
  v=p.plan({"status":"pass","job_known":True,"transversality":"ecosystem","abstraction":"organism"})
  self.assertIn("boundary_and_dependency_check",v["calls"]);self.assertIn("cross_surface_invariant_check",v["calls"])
 def test_irreversible_requires_authorization(self):
  self.assertEqual(p.plan({"status":"pass","job_known":True,"reversibility":"irreversible"})["authorization"],"required")
 def test_counterfield_revision_stop_are_preserved(self):
  v=p.plan({"status":"pass","job_known":True,"counterfield":"surface absente","revision_condition":"preuve nouvelle","stop_condition":"perte capacité"})
  self.assertEqual(v["decision_axes"]["counterfield"],"surface absente");self.assertEqual(v["decision_axes"]["stop_condition"],"perte capacité")
 def test_dimensions_are_not_collapsed_into_score(self):
  v=p.plan({"status":"pass","job_known":True,"uncertainty":"high","preserved_capabilities":["recovery"],"displaced_costs":["ssd_io"]})
  self.assertNotIn("score",v);self.assertIn("no_hidden_composite_score",v["invariants"])
 def test_blocker_reuses_resilience(self):
  v=p.plan({"status":"pass","job_known":True,"blocker":{"message":"timeout","known_completion":False}})
  self.assertEqual(v["recovery"]["blocker"],"timeout_unknown_completion")
if __name__=="__main__":unittest.main()
