from pathlib import Path
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from ecosystem_episode_ledger import EVENTS_NAME, record  # noqa: E402


class EcosystemEpisodeLedgerTests(unittest.TestCase):
    def build_fixture(self, root: Path) -> None:
        (root / "corpus-11-tools/docs").mkdir(parents=True)
        (root / "corpus-11-tools/evals").mkdir(parents=True)
        (root / "research/active/corpus-open-model").mkdir(parents=True)
        (root / "corpus-11-tools/docs/inventory.json").write_text(json.dumps({"skills": []}))
        (root / "corpus-11-tools/evals/routing-and-nonregression.jsonl").write_text("")
        (root / "corpus-11-tools/docs/a.md").write_text("state A")
        (root / "research/active/corpus-open-model/runtime.py").write_text("observer")

    def test_records_structural_before_after_without_raw_text(self):
        with tempfile.TemporaryDirectory() as directory:
            root, artifacts = Path(directory) / "Corpus", Path(directory) / "artifacts"
            self.build_fixture(root)
            self.assertEqual(record(root, artifacts)["status"], "baseline_recorded")
            (root / "corpus-11-tools/docs/a.md").write_text("state B")
            result = record(root, artifacts)
            self.assertEqual(result["status"], "episode_recorded")
            episode = result["episode"]
            changed = episode["materials"]["changed"]
            self.assertEqual(changed[0]["before"]["path"], "corpus-11-tools/docs/a.md")
            self.assertEqual(set(changed[0]["before"]), {"path", "surface", "sha256", "size", "suffix"})
            self.assertNotIn("state A", json.dumps(episode))
            self.assertNotIn("state B", json.dumps(episode))
            self.assertTrue((artifacts / EVENTS_NAME).exists())

    def test_excludes_its_runtime_and_does_not_duplicate_an_episode(self):
        with tempfile.TemporaryDirectory() as directory:
            root, artifacts = Path(directory) / "Corpus", Path(directory) / "artifacts"
            self.build_fixture(root)
            record(root, artifacts)
            (root / "research/active/corpus-open-model/runtime.py").write_text("changed observer")
            self.assertEqual(record(root, artifacts)["status"], "no_included_change")
            (root / "corpus-11-tools/docs/a.md").write_text("real ecosystem change")
            self.assertEqual(record(root, artifacts)["status"], "episode_recorded")
            self.assertEqual(record(root, artifacts)["status"], "no_included_change")
            lines = (artifacts / EVENTS_NAME).read_text().splitlines()
            self.assertEqual(len(lines), 1)


if __name__ == "__main__":
    unittest.main()
