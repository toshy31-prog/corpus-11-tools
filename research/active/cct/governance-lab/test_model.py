from __future__ import annotations

import json
from pathlib import Path
import unittest

from model import CORE_METRICS, DIAGNOSTICS, SCENARIO_FUNCTIONS, clamp, simulate_once
from run_experiment import load_config


ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "experiment.json").read_text(encoding="utf-8"))


class ModelTests(unittest.TestCase):
    def test_clamp(self) -> None:
        self.assertEqual(clamp(-1), 0)
        self.assertEqual(clamp(101), 100)
        self.assertEqual(clamp(42), 42)

    def test_config_and_dispatch_match(self) -> None:
        self.assertEqual(set(CONFIG["scenarios"]), set(SCENARIO_FUNCTIONS))

    def test_reproducible(self) -> None:
        args = (
            "cct_v08",
            CONFIG["architectures"]["cct_v08"]["traits"],
            "water_coordination",
            CONFIG["scenarios"]["water_coordination"]["severity"],
            "base",
            CONFIG["protocols"]["base"],
            17,
            CONFIG["seed"],
        )
        self.assertEqual(simulate_once(*args).metrics, simulate_once(*args).metrics)

    def test_all_outputs_are_bounded(self) -> None:
        for architecture, architecture_config in CONFIG["architectures"].items():
            for scenario, scenario_config in CONFIG["scenarios"].items():
                result = simulate_once(
                    architecture,
                    architecture_config["traits"],
                    scenario,
                    scenario_config["severity"],
                    "base",
                    CONFIG["protocols"]["base"],
                    3,
                    CONFIG["seed"],
                )
                self.assertEqual(set(result.metrics), set((*CORE_METRICS, *DIAGNOSTICS)))
                self.assertTrue(all(0 <= value <= 100 for value in result.metrics.values()))

    def test_high_shock_changes_results(self) -> None:
        architecture = CONFIG["architectures"]["cct_v08"]["traits"]
        base = simulate_once(
            "cct_v08", architecture, "external_attack", 0.86, "base",
            CONFIG["protocols"]["base"], 9, CONFIG["seed"]
        )
        high = simulate_once(
            "cct_v08", architecture, "external_attack", 0.86, "high_shock",
            CONFIG["protocols"]["high_shock"], 9, CONFIG["seed"]
        )
        self.assertNotEqual(base.metrics, high.metrics)

    def test_architectures_are_not_identical(self) -> None:
        outputs = []
        for architecture, architecture_config in CONFIG["architectures"].items():
            result = simulate_once(
                architecture,
                architecture_config["traits"],
                "planning_gaming",
                0.84,
                "base",
                CONFIG["protocols"]["base"],
                11,
                CONFIG["seed"],
            )
            outputs.append(tuple(round(result.metrics[key], 5) for key in CORE_METRICS))
        self.assertEqual(len(set(outputs)), len(outputs))

    def test_v2_inherits_and_overrides(self) -> None:
        v2 = load_config(ROOT / "experiment_v2.json")
        self.assertEqual(v2["experiment"], "CCT-7X-002")
        self.assertEqual(v2["architectures"]["central_state"], CONFIG["architectures"]["central_state"])
        self.assertEqual(v2["core_metrics"]["needs"], 70.0)


if __name__ == "__main__":
    unittest.main()
