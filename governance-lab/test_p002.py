from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import unittest

from p002_model import generate_world, simulate_p002_once, weighted_allocate
from p001_model import validate_budget
from run_p001 import load_config

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "p002_config.json").read_text(encoding="utf-8"))


class P002Tests(unittest.TestCase):
    def test_equal_budgets(self) -> None:
        for mode in CONFIG["modes"].values():
            validate_budget(mode)

    def test_common_world(self) -> None:
        self.assertEqual(generate_world(CONFIG, "base", 4), generate_world(CONFIG, "base", 4))

    def test_reproducible(self) -> None:
        self.assertEqual(simulate_p002_once(CONFIG, "base", "corridor", 7), simulate_p002_once(CONFIG, "base", "corridor", 7))

    def test_weighted_allocation_respects_bounds(self) -> None:
        result = weighted_allocate([10, 20, 30], [3, 2, 1], 25)
        self.assertLessEqual(sum(result), 25.000001)
        self.assertTrue(all(0 <= value <= demand for value, demand in zip(result, [10, 20, 30])))

    def test_metrics_are_bounded(self) -> None:
        for mode in CONFIG["modes"]:
            result = simulate_p002_once(CONFIG, "coordinated_gaming", mode, 9)
            for metric in ("essential_unmet", "low_income_unmet", "overall_unmet"):
                self.assertTrue(0 <= result[metric] <= 100)
            for value in result.values():
                self.assertGreaterEqual(value, 0)

    def test_protocol_changes_world(self) -> None:
        self.assertNotEqual(generate_world(CONFIG, "base", 3), generate_world(CONFIG, "supply_break", 3))

    def test_unused_capacity_is_not_counted_as_overshoot(self) -> None:
        config = deepcopy(CONFIG)
        config["groups"] = {
            name: {**group, "demand": 1.0} for name, group in config["groups"].items()
        }
        result = simulate_p002_once(config, "base", "corridor", 2)
        self.assertEqual(result["eco_overshoot"], 0.0)

    def test_v2_adds_adaptive_classification_gaming(self) -> None:
        config = load_config(ROOT / "p002_config_v2.json")
        self.assertTrue(config["classification_gaming"])
        self.assertGreater(config["protocols"]["adaptive_gaming"]["learning_rate"], 0)
        self.assertIn("base", config["protocols"])


if __name__ == "__main__":
    unittest.main()
