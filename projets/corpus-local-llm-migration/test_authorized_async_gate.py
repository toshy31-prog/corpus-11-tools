import json
from pathlib import Path
import tempfile
import time
import unittest

import authorization_owner as owner
import authorized_async_gate as gate
import corpus_gpt_async as async_jobs


class AuthorizedAsyncGateTests(unittest.TestCase):
    def make_entry(self, root: Path, *, exit_code=0, marker=None):
        entry = root / "entry.py"
        marker_line = ""
        if marker is not None:
            marker_line = f"from pathlib import Path; Path({str(marker)!r}).write_text('effect\\n')"
        entry.write_text(
            "#!/usr/bin/env python3\n"
            "import sys\n"
            + marker_line + "\n"
            + f"raise SystemExit({exit_code})\n"
        )
        entry.chmod(0o700)
        return entry

    def wait_done(self, token, bb):
        deadline = time.time() + 4
        while time.time() < deadline:
            value = async_jobs.job_status(token, bb=bb, tail_lines=20)
            if value["status"] == "completed":
                return value
            time.sleep(0.02)
        self.fail("job async non terminé")

    def test_T1_unprotected_job_preserves_historical_no_auth_path(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); bb=root/"bb"; entry=self.make_entry(root)
            result=gate.start_job("plain",allowed_jobs=["plain"],entry=entry,bb=bb,repo=root,
                                  job_kind="local",job_registry={"plain":{"kind":"local"}})
            self.assertTrue(result["started"])
            self.assertEqual(self.wait_done(result["token"],bb)["exit_code"],0)

    def test_T2_protected_valid_launches_and_effect_occurs(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); bb=root/"bb"; store=root/"auth"; marker=root/"effect"
            entry=self.make_entry(root,marker=marker)
            auth=owner.issue_authorization(store,action="start_job",target="fixture-A",expires_at=200)
            result=gate.start_job("fixture-A",allowed_jobs=["fixture-A"],entry=entry,bb=bb,repo=root,
                                  job_kind="local",job_registry={"fixture-A":{"kind":"local","requires_durable_authorization":True}},
                                  authorization_root=store,causal_refs={"authorization_ref":auth["authorization_ref"]},now=100)
            final=self.wait_done(result["token"],bb)
            self.assertEqual(final["exit_code"],0); self.assertTrue(marker.is_file())

    def test_T3_protected_missing_ref_refuses_before_async_state(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); bb=root/"bb"; marker=root/"effect"; entry=self.make_entry(root,marker=marker)
            with self.assertRaisesRegex(ValueError,"authorization_required"):
                gate.start_job("fixture-A",allowed_jobs=["fixture-A"],entry=entry,bb=bb,repo=root,
                               job_kind="local",job_registry={"fixture-A":{"requires_durable_authorization":True}},
                               authorization_root=root/"auth")
            self.assertFalse((bb/"async-jobs").exists()); self.assertFalse(marker.exists())

    def test_T4_unknown_ref_refuses_without_launch(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); bb=root/"bb"; marker=root/"effect"; entry=self.make_entry(root,marker=marker)
            with self.assertRaisesRegex(ValueError,"authorization_unknown"):
                gate.start_job("fixture-A",allowed_jobs=["fixture-A"],entry=entry,bb=bb,repo=root,
                               job_kind="local",job_registry={"fixture-A":{"requires_durable_authorization":True}},
                               authorization_root=root/"auth",causal_refs={"authorization_ref":"authorization:"+"0"*32},now=100)
            self.assertFalse((bb/"async-jobs").exists()); self.assertFalse(marker.exists())

    def test_T5_expired_ref_refuses_without_launch(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); bb=root/"bb"; store=root/"auth"; marker=root/"effect"; entry=self.make_entry(root,marker=marker)
            auth=owner.issue_authorization(store,action="start_job",target="fixture-A",expires_at=50)
            with self.assertRaisesRegex(ValueError,"authorization_expired"):
                gate.start_job("fixture-A",allowed_jobs=["fixture-A"],entry=entry,bb=bb,repo=root,
                               job_kind="local",job_registry={"fixture-A":{"requires_durable_authorization":True}},
                               authorization_root=store,causal_refs={"authorization_ref":auth["authorization_ref"]},now=100)
            self.assertFalse((bb/"async-jobs").exists()); self.assertFalse(marker.exists())

    def test_T6_target_mismatch_refuses_without_launch(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); bb=root/"bb"; store=root/"auth"; marker=root/"effect"; entry=self.make_entry(root,marker=marker)
            auth=owner.issue_authorization(store,action="start_job",target="fixture-A",expires_at=200)
            registry={"fixture-B":{"requires_durable_authorization":True}}
            with self.assertRaisesRegex(ValueError,"authorization_scope_mismatch"):
                gate.start_job("fixture-B",allowed_jobs=["fixture-B"],entry=entry,bb=bb,repo=root,
                               job_kind="local",job_registry=registry,authorization_root=store,
                               causal_refs={"authorization_ref":auth["authorization_ref"]},now=100)
            self.assertFalse((bb/"async-jobs").exists()); self.assertFalse(marker.exists())

    def test_T7_checker_error_refuses_without_launch(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); bb=root/"bb"; marker=root/"effect"; entry=self.make_entry(root,marker=marker)
            def broken(*a,**k): raise OSError("injected")
            with self.assertRaisesRegex(ValueError,"authorization_check_failed"):
                gate.start_job("fixture-A",allowed_jobs=["fixture-A"],entry=entry,bb=bb,repo=root,
                               job_kind="local",job_registry={"fixture-A":{"requires_durable_authorization":True}},
                               authorization_root=root/"auth",authorization_checker=broken,
                               causal_refs={"authorization_ref":"authorization:"+"1"*32},now=100)
            self.assertFalse((bb/"async-jobs").exists()); self.assertFalse(marker.exists())

    def test_T8_unprotected_arbitrary_authorization_ref_is_opaque_causal_ref(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); bb=root/"bb"; entry=self.make_entry(root)
            ref="authorization:"+"2"*32
            result=gate.start_job("plain",allowed_jobs=["plain"],entry=entry,bb=bb,repo=root,
                                  job_kind="local",job_registry={"plain":{"kind":"local"}},
                                  causal_refs={"authorization_ref":ref})
            final=self.wait_done(result["token"],bb)
            self.assertEqual(final["causal_refs"]["authorization_ref"],ref)

    def test_T9_protected_valid_preserves_same_causal_ref(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); bb=root/"bb"; store=root/"auth"; entry=self.make_entry(root)
            auth=owner.issue_authorization(store,action="start_job",target="fixture-A",expires_at=200)
            result=gate.start_job("fixture-A",allowed_jobs=["fixture-A"],entry=entry,bb=bb,repo=root,
                                  job_kind="local",job_registry={"fixture-A":{"requires_durable_authorization":True}},
                                  authorization_root=store,causal_refs={"authorization_ref":auth["authorization_ref"]},now=100)
            final=self.wait_done(result["token"],bb)
            self.assertEqual(final["causal_refs"]["authorization_ref"],auth["authorization_ref"])

    def test_T10_valid_authorization_does_not_imply_execution_success(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); bb=root/"bb"; store=root/"auth"; entry=self.make_entry(root,exit_code=7)
            auth=owner.issue_authorization(store,action="start_job",target="fixture-A",expires_at=200)
            result=gate.start_job("fixture-A",allowed_jobs=["fixture-A"],entry=entry,bb=bb,repo=root,
                                  job_kind="local",job_registry={"fixture-A":{"requires_durable_authorization":True}},
                                  authorization_root=store,causal_refs={"authorization_ref":auth["authorization_ref"]},now=100)
            final=self.wait_done(result["token"],bb)
            self.assertEqual(final["exit_code"],7)
            self.assertEqual(owner.check_authorization(store,auth["authorization_ref"],action="start_job",target="fixture-A",now=100)["status"],"valid")

    def test_owner_self_coherence_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw)
            first=owner.issue_authorization(root,action="A",target="X",expires_at=200)
            second=owner.issue_authorization(root,action="A",target="X",expires_at=200)
            self.assertNotEqual(first["authorization_ref"],second["authorization_ref"])
            path=root/(first["authorization_ref"].split(":",1)[1]+".json")
            before=path.read_bytes()
            value=json.loads(path.read_text()); value["authorization_ref"]=second["authorization_ref"]
            path.write_text(json.dumps(value))
            self.assertEqual(owner.check_authorization(root,first["authorization_ref"],action="A",target="X",now=100)["status"],"error")
            path.write_bytes(before)
            self.assertEqual(path.read_bytes(),before)


if __name__ == "__main__":
    unittest.main()
