from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from run_d10_campaign import execute, load_config, write_report


ROOT = Path(__file__).resolve().parent


class D10CampaignTests(unittest.TestCase):
    def setUp(self) -> None:
        self.config = load_config()
        self.result = execute(self.config)

    def test_factorial_worlds_are_complete_and_paired(self) -> None:
        self.assertEqual(self.result["world_count"], 32)
        self.assertEqual(self.result["variation_count"], 5)
        rows = self.result["rows"]
        self.assertEqual(len(rows), 160)
        for row in rows:
            self.assertEqual(set(row["outcomes"]), {"d10", "baseline"})
        for variation in self.config["sensitivity_variations"]:
            ids = [row["world_id"] for row in rows if row["variation"] == variation]
            self.assertEqual(len(ids), len(set(ids)))
            self.assertEqual(len(ids), 32)

    def test_non_compensable_outputs_remain_separate(self) -> None:
        for row in self.result["rows"]:
            for outcome in row["outcomes"].values():
                self.assertEqual(
                    set(outcome["gates"]),
                    {"vital_need", "critical_ceiling", "right", "minimal_trace", "restitution"},
                )
                self.assertNotIn("score", outcome)
                self.assertIn("visible_work", outcome)
                self.assertIn("hidden_work", outcome)
                self.assertIn("lost_work", outcome)

    def test_execution_is_deterministic(self) -> None:
        self.assertEqual(self.result, execute(load_config()))

    def test_checked_artifacts_reconstruct_exactly_when_present(self) -> None:
        results = ROOT.parent / "results" / "cct-sc-d10-001"
        if not (results / "result.json").exists():
            self.skipTest("prospective result has not been executed")
        expected = json.dumps(
            self.result, indent=2, sort_keys=True, ensure_ascii=False
        ) + "\n"
        self.assertEqual((results / "result.json").read_text(encoding="utf-8"), expected)
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "report.md"
            write_report(self.result, report)
            self.assertEqual(
                (results / "report.md").read_text(encoding="utf-8"),
                report.read_text(encoding="utf-8"),
            )


if __name__ == "__main__":
    unittest.main()
