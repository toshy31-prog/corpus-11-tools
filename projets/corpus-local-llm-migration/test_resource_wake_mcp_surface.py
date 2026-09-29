from pathlib import Path
import unittest

HERE=Path(__file__).resolve().parent
SOURCE=(HERE/"corpus_gpt_mcp.py").read_text(encoding="utf-8")

class ResourceWakeMcpSurfaceTests(unittest.TestCase):
    def test_start_job_exposes_only_boolean_wait_opt_in(self):
        start=SOURCE.index('"name":"start_job"')
        end=SOURCE.index('"name":"async_jobs"',start)
        block=SOURCE[start:end]
        self.assertIn('"wait_for_runner":{"type":"boolean"}',block)
        self.assertNotIn('"runner_lock"',block)
        self.assertIn('"additionalProperties":False',block)

    def test_dispatch_forwards_wait_without_custom_lock_path(self):
        start=SOURCE.index('if name == "start_job":')
        end=SOURCE.index('if name == "async_jobs":',start)
        block=SOURCE[start:end]
        self.assertIn('wait_for_runner=a.get("wait_for_runner", False)',block)
        self.assertNotIn('runner_lock=',block)

if __name__=="__main__":
    unittest.main()
