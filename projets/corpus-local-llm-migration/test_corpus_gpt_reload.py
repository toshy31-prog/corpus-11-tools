from pathlib import Path
import subprocess
import tempfile
import unittest

import corpus_gpt_reload as reload_guard


class CorpusGptReloadTests(unittest.TestCase):
    def test_prime_and_change_detection(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw)
            source=root/"source.py"
            state=root/"state.json"
            source.write_text("a")
            first=reload_guard.prime(state,(source,))
            self.assertEqual(first["digest"], reload_guard.source_digest((source,)))
            source.write_text("b")
            calls=[]
            def fake(cmd, **kwargs):
                calls.append(cmd)
                return subprocess.CompletedProcess(cmd, 0, stdout="ok")
            result=reload_guard.reload_if_changed(
                path=state, sources=(source,), runner=fake
            )
            self.assertTrue(result["changed"])
            self.assertTrue(result["restarted"])
            self.assertEqual(len(calls),1)
            again=reload_guard.reload_if_changed(
                path=state, sources=(source,), runner=fake
            )
            self.assertFalse(again["changed"])
            self.assertEqual(len(calls),1)

    def test_failed_restart_does_not_mark_digest_loaded(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw)
            source=root/"source.py"
            state=root/"state.json"
            source.write_text("a")
            reload_guard.prime(state,(source,))
            source.write_text("b")
            def fail(cmd, **kwargs):
                return subprocess.CompletedProcess(cmd, 1, stdout="failed")
            result=reload_guard.reload_if_changed(
                path=state, sources=(source,), runner=fail
            )
            self.assertFalse(result["restarted"])
            self.assertNotEqual(
                reload_guard.read_state(state).get("digest"),
                reload_guard.source_digest((source,)),
            )


if __name__ == "__main__":
    unittest.main()
