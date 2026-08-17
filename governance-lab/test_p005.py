from __future__ import annotations

import json
from pathlib import Path
import unittest

from p001_model import validate_budget
from p005_model import CORE_METRICS, generate_polycrisis, simulate_p005_once
from run_p005 import execute, make_verdict
from run_p001 import load_config

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "p005_config.json").read_text(encoding="utf-8"))


class P005Tests(unittest.TestCase):
    def test_equal_budgets(self) -> None:
        for mode in CONFIG["modes"].values():
            validate_budget(mode)

    def test_common_world_across_rivals(self) -> None:
        self.assertEqual(
            generate_polycrisis(CONFIG, "full_polycrisis", 8),
            generate_polycrisis(CONFIG, "full_polycrisis", 8),
        )

    def test_reproducible(self) -> None:
        self.assertEqual(
            simulate_p005_once(CONFIG, "full_polycrisis", "cct_v011", 5),
            simulate_p005_once(CONFIG, "full_polycrisis", "cct_v011", 5),
        )

    def test_metrics_are_nonnegative(self) -> None:
        for mode in CONFIG["modes"]:
            result = simulate_p005_once(CONFIG, "security_saturation", mode, 2)
            self.assertTrue(all(value >= 0 for value in result.values()))

    def test_core_metrics_are_not_collapsed_to_one_score(self) -> None:
        result = simulate_p005_once(CONFIG, "full_polycrisis", "cct_v011", 3)
        self.assertTrue(all(metric in result for metric in CORE_METRICS))
        self.assertNotIn("yield_score", result)

    def test_verdict_has_declared_reversal_paths(self) -> None:
        outcome = make_verdict(execute(CONFIG, runs=8), CONFIG)
        self.assertIn("gate_failure_protocols", outcome)
        self.assertIn("simple_dominance_protocols", outcome)

    def test_v2_adds_lean_candidate_and_predecessor_comparison(self) -> None:
        config = load_config(ROOT / "p005_config_v2.json")
        self.assertIn("cct_v012_lean", config["modes"])
        validate_budget(config["modes"]["cct_v012_lean"])
        outcome = make_verdict(execute(config, runs=8), config)
        self.assertIn("predecessor_improvement_protocols", outcome)


if __name__ == "__main__":
    unittest.main()
