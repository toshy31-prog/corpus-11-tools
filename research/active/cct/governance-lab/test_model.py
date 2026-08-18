from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import statistics
import unittest

from model import CORE_METRICS, DIAGNOSTICS, SCENARIO_FUNCTIONS, clamp, simulate_once
from run_experiment import load_config, run_all


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

    def test_generic_campaign_matches_the_previous_small_loop_exactly(self) -> None:
        config = deepcopy(CONFIG)
        config["protocols"] = {"base": config["protocols"]["base"]}
        config["scenarios"] = {
            "water_coordination": config["scenarios"]["water_coordination"]
        }
        config["architectures"] = {
            key: config["architectures"][key] for key in ("cct_v08", "central_state")
        }
        runs = 11
        expected = []
        for protocol, protocol_config in config["protocols"].items():
            for scenario, scenario_config in config["scenarios"].items():
                for architecture, architecture_config in config["architectures"].items():
                    results = [
                        simulate_once(
                            architecture,
                            architecture_config["traits"],
                            scenario,
                            scenario_config["severity"],
                            protocol,
                            protocol_config,
                            repetition,
                            config["seed"],
                        )
                        for repetition in range(runs)
                    ]
                    row = {
                        "protocol": protocol,
                        "scenario": scenario,
                        "architecture": architecture,
                    }
                    for metric in (*CORE_METRICS, *DIAGNOSTICS):
                        values = sorted(result.metrics[metric] for result in results)
                        for label, fraction in (("p10", 0.10), ("p90", 0.90)):
                            position = (len(values) - 1) * fraction
                            lower = int(position)
                            upper = min(lower + 1, len(values) - 1)
                            weight = position - lower
                            row[f"{metric}_{label}"] = (
                                values[lower] * (1 - weight) + values[upper] * weight
                            )
                        row[f"{metric}_median"] = statistics.median(values)
                    row["joint_pass_rate"] = sum(
                        all(
                            result.metrics[name] >= floor
                            for name, floor in config["core_metrics"].items()
                        )
                        for result in results
                    ) / runs
                    row["catastrophic_rate"] = sum(
                        any(result.metrics[name] < 40.0 for name in CORE_METRICS)
                        for result in results
                    ) / runs
                    expected.append(row)
        self.assertEqual(run_all(config, runs), expected)


if __name__ == "__main__":
    unittest.main()
