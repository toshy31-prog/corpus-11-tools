from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
import unittest

from p001_model import capability, simulate_p001_once, validate_budget
from run_p001 import load_config


ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "p001_config.json").read_text(encoding="utf-8"))


class P001Tests(unittest.TestCase):
    def test_equal_budgets(self) -> None:
        for mode in CONFIG["modes"].values():
            validate_budget(mode)

    def test_v2_inherits_and_has_equal_budgets(self) -> None:
        config = load_config(ROOT / "p001_config_v2.json")
        self.assertEqual(config["candidate_mode"], "bounded_continuity_cell")
        self.assertIn("base", config["protocols"])
        for mode in config["modes"].values():
            validate_budget(mode)

    def test_v3_preregisters_pareto_noninferiority(self) -> None:
        config = load_config(ROOT / "p001_config_v3.json")
        self.assertEqual(config["reversal_rule"]["type"], "pareto_noninferiority")
        self.assertEqual(config["reversal_rule"]["unserved_ratio_to_best_rival_max"], 1.05)

    def test_capability_is_monotone(self) -> None:
        self.assertLess(capability(0.1), capability(0.2))

    def test_reproducible(self) -> None:
        first = simulate_p001_once(CONFIG, "base", "capacity_gate", 8)
        second = simulate_p001_once(CONFIG, "base", "capacity_gate", 8)
        self.assertEqual(first.metrics, second.metrics)

    def test_rivals_receive_common_exogenous_shocks(self) -> None:
        config = deepcopy(CONFIG)
        config["modes"]["clone_a"] = deepcopy(config["modes"]["calendar_transfer"])
        config["modes"]["clone_b"] = deepcopy(config["modes"]["calendar_transfer"])
        first = simulate_p001_once(config, "base", "clone_a", 19)
        second = simulate_p001_once(config, "base", "clone_b", 19)
        self.assertEqual(first.metrics, second.metrics)

    def test_metrics_bounded_where_expected(self) -> None:
        for mode in CONFIG["modes"]:
            result = simulate_p001_once(CONFIG, "dense_shocks", mode, 12)
            self.assertTrue(0 <= result.metrics["mean_service"] <= 100)
            self.assertTrue(0 <= result.metrics["worst_service"] <= 100)
            self.assertTrue(0 <= result.metrics["dependency_detection_rate"] <= 1)
            self.assertGreaterEqual(result.metrics["unserved_need"], 0)

    def test_hostile_protocol_changes_gate(self) -> None:
        base = simulate_p001_once(CONFIG, "base", "capacity_gate", 5)
        hostile = simulate_p001_once(CONFIG, "hostile_to_gate", "capacity_gate", 5)
        self.assertNotEqual(base.metrics, hostile.metrics)


if __name__ == "__main__":
    unittest.main()
