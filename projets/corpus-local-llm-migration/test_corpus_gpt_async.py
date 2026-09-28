import json
from pathlib import Path
import tempfile
import time
import unittest

import blocker_resilience
import corpus_gpt_async as async_jobs


class CorpusGptAsyncTests(unittest.TestCase):
    def make_entry(self, root: Path, delay: float = 0.02, early: bool = False) -> Path:
        entry = root / "entry.py"
        lines = [
            "#!/usr/bin/env python3",
            "import sys,time",
        ]
        if early:
            lines.append("print('ASYNC_EARLY='+sys.argv[-1], flush=True)")
        lines += [
            f"time.sleep({delay!r})",
            "print('ASYNC_DUMMY_JOB='+sys.argv[-1], flush=True)",
        ]
        entry.write_text("\n".join(lines) + "\n")
        entry.chmod(0o700)
        return entry

    def wait_done(self, token, bb):
        deadline = time.time() + 3
        while time.time() < deadline:
            value = async_jobs.job_status(token, bb=bb)
            if value["status"] == "completed":
                return value
            time.sleep(0.02)
        self.fail("job async non terminé")

    def wait_log(self, token, bb, needle):
        deadline = time.time() + 3
        while time.time() < deadline:
            value = async_jobs.job_status(token, bb=bb, tail_lines=200)
            if needle in value.get("output_tail", ""):
                return value
            time.sleep(0.02)
        self.fail("sortie async non persistée à temps")

    def test_job_survives_caller_and_persists_result(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            bb = root / "bb"
            entry = self.make_entry(root)
            started = async_jobs.start_job("demo", allowed_jobs=["demo"], entry=entry, bb=bb, repo=root)
            self.assertTrue(started["started"])
            final = self.wait_done(started["token"], bb)
            self.assertTrue(final["completion_known"])
            self.assertEqual(final["exit_code"], 0)
            self.assertIn("ASYNC_DUMMY_JOB=demo", final["output_tail"])

    def test_causal_refs_persist_to_completion_with_run_evidence(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            bb = root / "bb"
            entry = root / "entry.py"
            entry.write_text("#!/usr/bin/env python3\nprint('RUN_ID=run-ns1')\nprint('REPORT=/tmp/report-ns1.txt')\nprint('VERIFICATION_REF=verification:final-pass')\n")
            entry.chmod(0o700)
            refs = {
                "decision_ref": "decision_context_receipt:abc",
                "parent_ref": "planner:xyz",
                "evidence_refs": ["ev:2", "ev:1", "ev:1"],
            }
            started = async_jobs.start_job("demo", allowed_jobs=["demo"], entry=entry, bb=bb, repo=root, job_kind="local", causal_refs=refs)
            final = self.wait_done(started["token"], bb)
            self.assertEqual(final["causal_refs"]["decision_ref"], "decision_context_receipt:abc")
            self.assertEqual(final["causal_refs"]["evidence_refs"], ["ev:1", "ev:2"])
            self.assertEqual(final["execution_evidence"]["run_id"], "run-ns1")
            self.assertEqual(final["execution_evidence"]["run_id_source"], "runner_stdout_prefix")
            self.assertEqual(final["execution_evidence"]["report_ref"], "/tmp/report-ns1.txt")
            self.assertEqual(final["execution_evidence"]["report_ref_source"], "runner_stdout_suffix")
            self.assertEqual(final["execution_evidence"]["verification_ref_source"], "managed_job_stdout")
            self.assertIn("verification:final-pass", final["causal_refs"]["verification_refs"])
            matches = async_jobs.find_states_by_causal_ref(bb, "decision_context_receipt:abc")
            self.assertEqual([row["token"] for row in matches], [started["token"]])
            by_verification = async_jobs.find_states_by_causal_ref(bb, "verification:final-pass")
            self.assertEqual([row["token"] for row in by_verification], [started["token"]])

    def test_active_job_with_different_causal_refs_is_refused(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            bb = root / "bb"
            entry = self.make_entry(root, 0.4)
            first = async_jobs.start_job("slow", allowed_jobs=["slow"], entry=entry, bb=bb, repo=root, causal_refs={"decision_ref":"decision:a"})
            with self.assertRaisesRegex(ValueError, "causal_refs différents"):
                async_jobs.start_job("slow", allowed_jobs=["slow"], entry=entry, bb=bb, repo=root, causal_refs={"decision_ref":"decision:b"})
            self.wait_done(first["token"], bb)

    def test_causal_refs_reject_unknown_fields(self):
        with self.assertRaisesRegex(ValueError, "causal_refs inconnues"):
            async_jobs.normalize_causal_refs({"reason":"post-hoc narrative"})

    def test_verification_refs_cannot_be_injected_at_launch(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            with self.assertRaisesRegex(ValueError, "produites par l.exécution"):
                async_jobs.start_job("demo", allowed_jobs=["demo"], entry=root/"entry", bb=root/"bb", repo=root, causal_refs={"verification_refs":["verification:invented"]})

    def test_reverse_lookup_order_is_deterministic_and_not_mtime_based(self):
        with tempfile.TemporaryDirectory() as raw:
            bb = Path(raw) / "bb"
            for token, created in [("b"*16, 2.0), ("a"*16, 1.0), ("c"*16, 1.0)]:
                async_jobs._atomic_json(async_jobs._state_path(bb, token), {
                    "schema_version":1, "token":token, "job":"historical", "status":"completed",
                    "completion_known":True, "created_at_unix":created,
                    "causal_refs":{"decision_ref":"decision:shared"},
                })
            # Perturb filesystem mtimes; causal ordering must remain created_at/token.
            async_jobs._state_path(bb, "a"*16).touch()
            rows = async_jobs.find_states_by_causal_ref(bb, "decision:shared")
            self.assertEqual([row["token"] for row in rows], ["a"*16, "c"*16, "b"*16])

    def test_runner_markers_use_prefix_run_id_suffix_report_not_job_spoofs(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); bb=root/"bb"; token="d"*16
            entry=root/"entry.py"
            entry.write_text("#!/usr/bin/env python3\nprint('RUN_ID=runner-real')\nprint('RUN_ID=job-spoof')\nprint('REPORT=/tmp/job-spoof')\nprint('VERIFICATION_REF=verification:observed')\nprint('REPORT=/tmp/runner-real-report')\n")
            entry.chmod(0o700)
            started=async_jobs.start_job("demo",allowed_jobs=["demo"],entry=entry,bb=bb,repo=root,job_kind="local",causal_refs={"decision_ref":"decision:x"})
            final=self.wait_done(started["token"],bb)
            self.assertEqual(final["execution_evidence"]["run_id"],"runner-real")
            self.assertEqual(final["execution_evidence"]["report_ref"],"/tmp/runner-real-report")
            self.assertEqual(final["causal_refs"]["verification_refs"],["verification:observed"])

    def test_same_active_job_is_not_duplicated(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            bb = root / "bb"
            entry = self.make_entry(root, 0.4)
            first = async_jobs.start_job("slow", allowed_jobs=["slow"], entry=entry, bb=bb, repo=root)
            second = async_jobs.start_job("slow", allowed_jobs=["slow"], entry=entry, bb=bb, repo=root)
            self.assertFalse(second["started"])
            self.assertTrue(second["existing"])
            self.assertEqual(second["token"], first["token"])
            self.wait_done(first["token"], bb)

    def test_unregistered_job_is_refused(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            with self.assertRaises(ValueError):
                async_jobs.start_job("other", allowed_jobs=["demo"], entry=root / "entry", bb=root / "bb", repo=root)

    def test_unknown_token_is_refused(self):
        with tempfile.TemporaryDirectory() as raw:
            with self.assertRaises(ValueError):
                async_jobs.job_status("0" * 16, bb=Path(raw) / "bb")

    def test_explicit_cancel_persists_actor_mechanism_previous_state_and_tail(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            bb = root / "bb"
            entry = self.make_entry(root, delay=5, early=True)
            started = async_jobs.start_job("slow", allowed_jobs=["slow"], entry=entry, bb=bb, repo=root, job_kind="local")
            self.wait_log(started["token"], bb, "ASYNC_EARLY=slow")
            final = async_jobs.cancel_job(started["token"], bb=bb)
            self.assertEqual(final["status"], "cancelled")
            self.assertTrue(final["completion_known"])
            self.assertEqual(final["previous_status"], "running")
            self.assertEqual(final["cancel_mechanism"], "explicit_cancel")
            self.assertEqual(final["cancel_source"], "mcp.cancel_job")
            self.assertEqual(final["cancel_actor"], "requesting_client")
            self.assertIn("ASYNC_EARLY=slow", final["output_tail"])
            assessed = blocker_resilience.assess({"message":"cancel_mechanism="+final["cancel_mechanism"],"known_completion":True})
            self.assertEqual(assessed["blocker"], "explicit_cancel")

    def test_runtime_restart_cancel_is_distinguishable_when_caller_knows_it(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            bb = root / "bb"
            entry = self.make_entry(root, delay=5, early=True)
            started = async_jobs.start_job("restartable", allowed_jobs=["restartable"], entry=entry, bb=bb, repo=root, job_kind="local")
            self.wait_log(started["token"], bb, "ASYNC_EARLY=restartable")
            final = async_jobs.cancel_job(
                started["token"], bb=bb,
                reason="runtime reload requested",
                source="runtime.reload",
                actor="corpus_runtime",
                mechanism="runtime_restart",
            )
            self.assertEqual(final["cancel_mechanism"], "runtime_restart")
            self.assertEqual(final["cancel_source"], "runtime.reload")
            self.assertIn("ASYNC_EARLY=restartable", final["output_tail"])
            assessed = blocker_resilience.assess({"message":"cancel_mechanism="+final["cancel_mechanism"],"known_completion":True})
            self.assertEqual(assessed["blocker"], "runtime_restart")

    def test_unknown_cancel_remains_explicitly_unknown(self):
        with tempfile.TemporaryDirectory() as raw:
            bb = Path(raw) / "bb"
            token = "a" * 16
            state = {
                "schema_version": 1,
                "token": token,
                "job": "historical",
                "status": "cancelled",
                "completion_known": True,
                "exit_code": None,
                "cancelled_at_unix": 1.0,
            }
            async_jobs._atomic_json(async_jobs._state_path(bb, token), state)
            async_jobs._log_path(bb, token).write_text("historical tail\n")
            final = async_jobs.job_status(token, bb=bb, tail_lines=200)
            self.assertEqual(final["cancel_reason"], "unknown")
            self.assertEqual(final["cancel_source"], "unknown")
            self.assertEqual(final["cancel_actor"], "unknown")
            self.assertEqual(final["cancel_mechanism"], "unknown")
            self.assertIn("historical tail", final["output_tail"])
            assessed = blocker_resilience.assess({"message":"cancel_mechanism="+final["cancel_mechanism"],"known_completion":True})
            self.assertEqual(assessed["blocker"], "cancelled_unknown")


if __name__ == "__main__":
    unittest.main()
