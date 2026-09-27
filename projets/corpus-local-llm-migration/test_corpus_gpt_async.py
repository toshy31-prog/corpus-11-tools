import os
from pathlib import Path
import tempfile
import time
import unittest

import corpus_gpt_async as async_jobs


class CorpusGptAsyncTests(unittest.TestCase):
    def make_entry(self, root: Path, delay: float = 0.02) -> Path:
        entry = root / "entry.py"
        entry.write_text(
            "#!/usr/bin/env python3\n"
            "import sys,time\n"
            f"time.sleep({delay!r})\n"
            "print('ASYNC_DUMMY_JOB='+sys.argv[-1])\n"
        )
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

    def test_job_survives_caller_and_persists_result(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            bb = root / "bb"
            entry = self.make_entry(root)
            started = async_jobs.start_job(
                "demo", allowed_jobs=["demo"], entry=entry, bb=bb, repo=root
            )
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
            first = async_jobs.start_job(
                "slow", allowed_jobs=["slow"], entry=entry, bb=bb, repo=root
            )
            second = async_jobs.start_job(
                "slow", allowed_jobs=["slow"], entry=entry, bb=bb, repo=root
            )
            self.assertFalse(second["started"])
            self.assertTrue(second["existing"])
            self.assertEqual(second["token"], first["token"])
            self.wait_done(first["token"], bb)

    def test_unregistered_job_is_refused(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            with self.assertRaises(ValueError):
                async_jobs.start_job(
                    "other", allowed_jobs=["demo"],
                    entry=root / "entry", bb=root / "bb", repo=root,
                )

    def test_unknown_token_is_refused(self):
        with tempfile.TemporaryDirectory() as raw:
            with self.assertRaises(ValueError):
                async_jobs.job_status("0" * 16, bb=Path(raw) / "bb")


if __name__ == "__main__":
    unittest.main()
