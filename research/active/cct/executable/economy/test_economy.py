from __future__ import annotations

import csv
import json
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

from economy_model import (
    METRICS,
    PARAMETERS,
    dominates,
    generate_common_noise,
    generate_world,
    load_config,
    simulate_once,
    validate_config,
)
from run_economy import _run_possibility_campaign, run_experiment


BASE = Path(__file__).resolve().parent
CONFIG_PATH = BASE / "scenarios.json"


class EconomyModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = load_config(CONFIG_PATH)

    def test_four_rivals_have_matched_information_budgets(self) -> None:
        self.assertEqual(len(self.config["regimes"]), 4)
        self.assertEqual(
            self.config["information_budget"]["free_parameters_per_regime"],
            len(PARAMETERS),
        )
        parameter_sets = {
            tuple(regime["parameters"])
            for regime in self.config["regimes"].values()
        }
        self.assertEqual(parameter_sets, {PARAMETERS})
        input_sets = {
            tuple(scenario["inputs"])
            for scenario in self.config["scenarios"].values()
        }
        self.assertEqual(
            input_sets,
            {tuple(self.config["information_budget"]["shared_observed_inputs"])},
        )

    def test_world_and_noise_are_common_to_all_rivals(self) -> None:
        world = generate_world(self.config, "polycrise", 19)
        noise = generate_common_noise(self.config, "polycrise", 19)
        for _regime_id in self.config["regimes"]:
            self.assertEqual(world, generate_world(self.config, "polycrise", 19))
            self.assertEqual(noise, generate_common_noise(self.config, "polycrise", 19))

    def test_simulation_is_deterministic_and_bounded(self) -> None:
        first = simulate_once(
            self.config, "rupture_logistique", "communs_planifies_federes", 7
        )
        second = simulate_once(
            self.config, "rupture_logistique", "communs_planifies_federes", 7
        )
        self.assertEqual(first, second)
        self.assertEqual(tuple(first), METRICS)
        self.assertTrue(all(value >= 0 for value in first.values()))
        self.assertLessEqual(first["vital_unmet_pct"], 100)
        self.assertLessEqual(first["eco_overshoot_pct"], 100)
        self.assertLessEqual(first["inequality_gini"], 1)
        self.assertLessEqual(first["rent_capture_pct"], 100)

    def test_no_composite_score_exists(self) -> None:
        forbidden = {"score", "total_score", "weighted_score", "ranking_score"}
        for scenario_id in self.config["scenarios"]:
            for regime_id in self.config["regimes"]:
                result = simulate_once(self.config, scenario_id, regime_id, 0)
                self.assertFalse(forbidden.intersection(result))
                self.assertEqual(set(result), set(METRICS))

    def test_every_candidate_can_lose(self) -> None:
        for regime in self.config["regimes"].values():
            prediction = regime["prediction"]
            self.assertTrue(prediction["scenarios"])
            self.assertTrue(prediction["limits"])
            self.assertTrue(regime["failure_outcome"])
        self.assertIn("constitutional_gate_loss", self.config["loss_rules"])
        self.assertIn("pareto_loss", self.config["loss_rules"])

    def test_validation_rejects_extra_information(self) -> None:
        altered = deepcopy(self.config)
        altered["regimes"]["marche_socialise_borne"]["parameters"]["oracle"] = 1.0
        with self.assertRaisesRegex(ValueError, "paramètres non appariés"):
            validate_config(altered)

    def test_pareto_dominance_is_vectorial(self) -> None:
        left = {metric: 1.0 for metric in METRICS}
        right = {metric: 2.0 for metric in METRICS}
        self.assertTrue(dominates(left, right))
        left["recovery_days"] = 3.0
        self.assertFalse(dominates(left, right))

    def test_generic_runner_preserves_historical_artifacts_byte_for_byte(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            result = run_experiment(CONFIG_PATH, temp_dir)
            destination = Path(temp_dir)
            self.assertTrue((destination / "summary.csv").is_file())
            self.assertTrue((destination / "verdict.json").is_file())
            self.assertTrue((destination / "report.md").is_file())
            with (destination / "summary.csv").open(encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(
                len(rows), len(self.config["scenarios"]) * len(self.config["regimes"])
            )
            stored = json.loads((destination / "verdict.json").read_text(encoding="utf-8"))
            self.assertEqual(stored["config_sha256"], result["config_sha256"])
            self.assertTrue(stored["non_composite_metrics"])
            self.assertTrue(
                any(
                    warning["metric"] == "recovery_days"
                    for warning in stored["detectability_warnings"]
                )
            )
            report = (destination / "report.md").read_text(encoding="utf-8")
            self.assertIn("Aucun score composite", report)
            self.assertIn("Condition de renversement", report)
            self.assertIn("Limites de détectabilité", report)
            for name in ("summary.csv", "verdict.json", "report.md"):
                self.assertEqual(
                    (destination / name).read_bytes(),
                    (BASE / "results" / name).read_bytes(),
                    f"régression de l'artefact historique {name}",
                )

    def test_generic_runner_exposes_every_pair_as_a_partial_relation(self) -> None:
        campaign = _run_possibility_campaign(self.config)
        expected_pairs = len(self.config["regimes"]) * (len(self.config["regimes"]) - 1) // 2
        for scenario_id in self.config["scenarios"]:
            space = campaign["possibility_spaces"][scenario_id]
            self.assertEqual(len(space["relations"]), expected_pairs)
            self.assertTrue(
                all(
                    relation["relation"]
                    in {
                        "equivalent",
                        "left_bounded_right",
                        "right_bounded_left",
                        "incomparable",
                    }
                    for relation in space["relations"]
                )
            )


if __name__ == "__main__":
    unittest.main()
