from pathlib import Path
import subprocess
import tempfile
import unittest

import corpus_gpt_reload as reload_guard


HERE = Path(__file__).resolve().parent
WATCHER = HERE / "corpus-gpt-source-watch.path"


def watcher_path_changed(unit_path=WATCHER):
    paths = set()
    for raw in Path(unit_path).read_text().splitlines():
        line = raw.strip()
        if line.startswith("PathChanged="):
            paths.add(Path(line.split("=", 1)[1]).resolve())
    return paths


class CorpusGptReloadTests(unittest.TestCase):
    def test_digest_sources_are_covered_by_reload_watcher(self):
        digest_sources = {Path(path).resolve() for path in reload_guard.SOURCES}
        self.assertLessEqual(digest_sources, watcher_path_changed())

    def test_prime_and_change_detection(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw)
            source=root/"source.py"
            state=root/"state.json"
            source.write_text("a")
            first=reload_guard.prime(state,(source,))
            self.assertEqual(first["loaded_digest"], reload_guard.source_digest((source,)))
            source.write_text("b")
            calls=[]
            def fake(cmd, **kwargs):
                calls.append(cmd)
                return subprocess.CompletedProcess(cmd, 0, stdout="ok")
            result=reload_guard.reload_if_changed(
                path=state, sources=(source,), runner=fake, validator=lambda: {"ok":True}
            )
            self.assertTrue(result["changed"])
            self.assertTrue(result["restarted"])
            self.assertFalse(result["load_confirmed"])
            self.assertNotEqual(reload_guard.read_state(state)["loaded_digest"],
                                reload_guard.source_digest((source,)))
            self.assertEqual(len(calls),1)
            confirmed=reload_guard.confirm_loaded_runtime(state,(source,))
            self.assertTrue(confirmed["confirmed"])
            again=reload_guard.reload_if_changed(
                path=state, sources=(source,), runner=fake, validator=lambda: {"ok":True}
            )
            self.assertFalse(again["changed"])
            self.assertEqual(len(calls),1)

    def test_prime_never_promotes_over_known_loaded(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); source=root/"source.py"; state=root/"state.json"
            source.write_text("a"); first=reload_guard.prime(state,(source,))
            loaded=first["loaded_digest"]; source.write_text("b")
            second=reload_guard.prime(state,(source,))
            self.assertEqual(second["loaded_digest"],loaded)
            self.assertNotEqual(second["source_digest"],loaded)

    def test_failed_validation_does_not_reload_or_promote(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); source=root/"source.py"; state=root/"state.json"
            source.write_text("a"); first=reload_guard.prime(state,(source,)); loaded=first["loaded_digest"]
            source.write_text("b"); calls=[]
            def fake(cmd, **kwargs):
                calls.append(cmd); return subprocess.CompletedProcess(cmd,0,stdout="ok")
            result=reload_guard.reload_if_changed(path=state,sources=(source,),runner=fake,
                validator=lambda: {"ok":False,"returncode":1,"output":"bad"})
            self.assertEqual(result["reason"],"validation_failed")
            self.assertEqual(calls,[])
            self.assertEqual(reload_guard.read_state(state)["loaded_digest"],loaded)

    def test_runtime_confirmation_requires_requested_and_validated_match(self):
        with tempfile.TemporaryDirectory() as raw:
            root=Path(raw); source=root/"source.py"; state=root/"state.json"
            source.write_text("a"); first=reload_guard.prime(state,(source,))
            source.write_text("b"); current=reload_guard.source_digest((source,))
            reload_guard.write_state({"schema_version":2,"source_digest":current,
                "validated_digest":current,"reload_requested_digest":current,
                "loaded_digest":first["loaded_digest"]},state)
            result=reload_guard.confirm_loaded_runtime(state,(source,))
            self.assertTrue(result["confirmed"])
            self.assertEqual(reload_guard.read_state(state)["loaded_digest"],current)

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
                path=state, sources=(source,), runner=fail, validator=lambda: {"ok":True}
            )
            self.assertFalse(result["restarted"])
            self.assertNotEqual(
                reload_guard.read_state(state).get("loaded_digest"),
                reload_guard.source_digest((source,)),
            )


if __name__ == "__main__":
    unittest.main()
