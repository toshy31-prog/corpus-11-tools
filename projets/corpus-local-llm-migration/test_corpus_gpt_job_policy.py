import unittest
import corpus_gpt_job_policy as p
class PolicyTests(unittest.TestCase):
 def test_managed_default_is_local(self):self.assertEqual(p.kind_from_content("#!/usr/bin/env bash\necho ok\n"),"local")
 def test_browser_must_be_explicit(self):self.assertEqual(p.kind_from_content("#!/usr/bin/env bash\n# corpus-job-kind: browser\n"),"browser")
 def test_marker_inside_payload_does_not_reclassify(self):self.assertEqual(p.kind_from_content("#!/usr/bin/env bash\necho '# corpus-job-kind: browser'\n"),"local")
 def test_unknown_legacy_fails_conservative(self):self.assertEqual(p.kind_for("old",{}),"browser")
 def test_local_skips_only_infra(self):self.assertEqual(p.runner_env("local"),{"CORPUS_BB_SKIP_INFRA":"1"})
 def test_browser_has_no_skip(self):self.assertEqual(p.runner_env("browser"),{})
if __name__=="__main__":unittest.main()
