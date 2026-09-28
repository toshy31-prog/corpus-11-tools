import unittest
import corpus_gpt_planner as p
class PlannerTests(unittest.TestCase):
 def test_fast_local_known_short(self):
  v=p.plan({"status":"pass","job_known":True,"job_kind":"local"})
  self.assertEqual(v["calls"],["run_job"]);self.assertEqual(v["skip"],["cdp_preflight"])
 def test_long_uses_async_without_sync_probe(self):
  v=p.plan({"status":"pass","job_known":True,"job_kind":"local","potentially_long":True})
  self.assertEqual(v["calls"],["start_job","job_status"])
 def test_degraded_calls_doctor(self):
  self.assertIn("doctor",p.plan({"status":"degraded","job_known":True})["calls"])
 def test_unknown_job_discovers(self):
  self.assertIn("job_info_or_jobs",p.plan({"status":"pass","job_known":False})["calls"])
 def test_destructive_never_authorizes(self):
  v=p.plan({"status":"pass","job_known":True,"write":True,"destructive":True})
  self.assertEqual(v["authorization"],"required");self.assertIn("explicit_authorization_and_rollback_evidence",v["calls"])
 def test_blocker_reuses_resilience(self):
  v=p.plan({"status":"pass","job_known":True,"blocker":{"message":"timeout","known_completion":False}})
  self.assertEqual(v["recovery"]["blocker"],"timeout_unknown_completion")
if __name__=="__main__":unittest.main()
