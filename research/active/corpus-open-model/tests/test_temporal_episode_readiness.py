from pathlib import Path
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from temporal_episode_readiness import MINIMUM_ELIGIBLE_EPISODES, readiness, surface_signature  # noqa: E402


def episode(path: str, surface: str = "research", relations: bool = False) -> dict:
    return {
        "materials": {"added": [{"path": path, "surface": surface}], "removed": [], "changed": []},
        "relations": {"added": [{"from": "a", "to": "b"}] if relations else [], "removed": [], "changed": []},
    }


class TemporalEpisodeReadinessTests(unittest.TestCase):
    def write(self, directory: Path, rows: list[dict]) -> Path:
        path = directory / "episodes.jsonl"
        path.write_text("".join(json.dumps(row) + "\n" for row in rows))
        return path

    def test_waits_for_real_eligible_episodes(self):
        with tempfile.TemporaryDirectory() as directory:
            events = self.write(Path(directory), [episode(".pytest_cache/a"), episode("research/notes.md")])
            result = readiness(events)
            self.assertEqual(result["eligible_episodes"], 1)
            self.assertEqual(result["excluded_episodes"], 1)
            self.assertEqual(result["status"], "not_ready_collect_real_episodes")
            self.assertFalse(result["authorization"]["automatic_training"])

    def test_marks_ready_without_freezing_or_training(self):
        with tempfile.TemporaryDirectory() as directory:
            events = self.write(Path(directory), [episode(f"research/{index}.md", relations=index % 2 == 0) for index in range(MINIMUM_ELIGIBLE_EPISODES)])
            result = readiness(events)
            self.assertEqual(result["status"], "ready_for_human_review_to_freeze_partition")
            self.assertFalse(result["authorization"]["automatic_partition_freeze"])

    def test_signature_is_structural(self):
        self.assertEqual(surface_signature(episode("product/a.md", "product", relations=True)), "product+relations")

    def test_excludes_generated_harness_runtime_from_target(self):
        self.assertEqual(surface_signature(episode("research/active/model-response-comparison-harness/runtime/a.json")), "structural_empty")


if __name__ == "__main__":
    unittest.main()
