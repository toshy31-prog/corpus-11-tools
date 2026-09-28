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
