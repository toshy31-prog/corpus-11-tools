from __future__ import annotations

from pathlib import Path
import unittest

from run_p001 import load_config
from run_p005_robustness import VARIATIONS, audit, varied_config

ROOT = Path(__file__).resolve().parent


class P005RobustnessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = load_config(ROOT / "p005_config_v2.json")

    def test_variations_include_combined_pessimistic_scene(self) -> None:
        self.assertIn("combined_pessimistic", VARIATIONS)

    def test_variation_does_not_mutate_baseline(self) -> None:
        candidate = self.config["reversal_rule"]["candidate"]
        before = self.config["modes"][candidate]["complexity"]
        changed = varied_config(self.config, {"complexity": 0.15})
        self.assertEqual(self.config["modes"][candidate]["complexity"], before)
        self.assertGreater(changed["modes"][candidate]["complexity"], before)

    def test_audit_returns_every_declared_variation(self) -> None:
        results = audit(self.config, runs=4)
        self.assertEqual({item["variation"] for item in results}, set(VARIATIONS))
        self.assertTrue(all("yield_claim_status" in item for item in results))


if __name__ == "__main__":
    unittest.main()
