import hashlib
from pathlib import Path
import tempfile
import unittest
import corpus_gpt_job_policy as p
class PolicyTests(unittest.TestCase):
 def test_managed_default_is_local(self):self.assertEqual(p.kind_from_content("#!/usr/bin/env bash\necho ok\n"),"local")
 def test_browser_must_be_explicit(self):self.assertEqual(p.kind_from_content("#!/usr/bin/env bash\n# corpus-job-kind: browser\n"),"browser")
 def test_marker_inside_payload_does_not_reclassify(self):self.assertEqual(p.kind_from_content("#!/usr/bin/env bash\necho '# corpus-job-kind: browser'\n"),"local")
 def test_unknown_legacy_fails_conservative(self):self.assertEqual(p.kind_for("old",{}),"browser")
 def test_local_skips_only_infra(self):self.assertEqual(p.runner_env("local"),{"CORPUS_BB_SKIP_INFRA":"1"})
 def test_browser_has_no_skip(self):self.assertEqual(p.runner_env("browser"),{})
 def test_legacy_effects_are_unknown(self):self.assertEqual(p.effect_projection("old",{}),{"status":"unknown","effects":[]})
 def test_attested_read_only_has_no_invented_effect(self):self.assertEqual(p.effect_projection("read",{"read":{"effects":[]}}),{"status":"attested","effects":[]})
 def test_effects_are_projected_before_execution(self):
  r={"w":{"effects":["repo_write"]},"push":{"effects":["outbound_transport"]},"svc":{"effects":["filesystem_write","service_mutation"]},"web":{"effects":["browser_interaction"]}}
  self.assertEqual(p.effect_projection("w",r)["effects"],["repo_write"])
  self.assertEqual(p.effect_projection("push",r)["effects"],["outbound_transport"])
  self.assertEqual(p.effect_projection("svc",r)["effects"],["filesystem_write","service_mutation"])
  self.assertEqual(p.effect_projection("web",r)["effects"],["browser_interaction"])
 def test_dynamic_may_effect_is_conservative(self):self.assertEqual(p.effect_projection("x",{"x":{"effects":["repo_write","outbound_transport"]}})["effects"],["outbound_transport","repo_write"])
 def test_static_write_set_is_optional_projection(self):
  self.assertEqual(p.effect_projection("x",{"x":{"effects":["repo_write"],"write_set":["b","a"]}})["write_set"],["a","b"])
  self.assertNotIn("write_set",p.effect_projection("x",{"x":{"effects":["repo_write"]}}))
 def test_invalid_effect_metadata_fails_closed(self):
  for value in ({"effects":["safe"]},{"effects":"repo_write"},{"effects":["repo_write","repo_write"]},{"effects":[],"write_set":["../x"]}):
   self.assertEqual(p.effect_projection("x",{"x":value}),{"status":"unknown","effects":[]})
 def test_effect_metadata_does_not_grant_authorization(self):
  r={"x":{"effects":[]}}
  self.assertFalse(p.requires_durable_authorization("x",r))
  self.assertEqual(p.effect_projection("x",r)["status"],"attested")
 def test_managed_job_definition_is_bounded_read_only(self):
  with tempfile.TemporaryDirectory() as raw:
   root=Path(raw)
   script=root/"demo.sh"
   source="#!/usr/bin/env bash\necho ok\n"
   script.write_text(source)
   value=p.managed_job_definition("demo",jobs_root=root)
   self.assertEqual(value["job"],"demo")
   self.assertEqual(value["source_path"],str(script.resolve()))
   self.assertEqual(value["source"],source)
   self.assertEqual(value["sha256"],hashlib.sha256(source.encode()).hexdigest())
   self.assertEqual(script.read_text(),source)

 def test_managed_job_definition_refuses_unregistered_or_pathlike_names(self):
  with tempfile.TemporaryDirectory() as raw:
   root=Path(raw)
   (root/"registered.sh").write_text("#!/usr/bin/env bash\ntrue\n")
   for name in ("missing","../registered","/tmp/registered","bad name",""):
    with self.assertRaises(ValueError):
     p.managed_job_definition(name,jobs_root=root)


if __name__=="__main__":unittest.main()
