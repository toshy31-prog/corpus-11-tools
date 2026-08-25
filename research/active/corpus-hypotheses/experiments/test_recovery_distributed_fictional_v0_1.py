#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
from copy import deepcopy
import json
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
RUNNER = HERE / "run_recovery_distributed_fictional_v0_1.py"
SPEC = importlib.util.spec_from_file_location("recovery_distributed_v01", RUNNER)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class RecoveryDistributedFictionalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = MODULE.load_config()
        cls.result = MODULE.evaluate(cls.config)
        cls.rows, _, _, _ = MODULE.enumerate_cells(cls.config)

    def test_protocol_is_fixed_and_scoped_internally(self) -> None:
        self.assertEqual(self.config["protocol_status"], "fixed_before_execution")
        self.assertEqual(
            self.config["protocol_status_basis"],
            "self_declared_in_config_no_independent_temporal_lock",
        )
        self.assertEqual(set(self.config["scope"]), {"formal_exact", "pipeline_verified"})
        self.assertEqual(self.result["theorem"]["status"], "formal_exact")
        self.assertEqual(self.result["scope"], ["formal_exact", "pipeline_verified"])
        self.assertEqual(self.result["unsupported_claims"], self.config["unsupported_claims"])

    def test_vector_clock_contract(self) -> None:
        clocks = self.config["clocks"]
        self.assertFalse(MODULE._clock_le(clocks["A"], clocks["B"]))
        self.assertFalse(MODULE._clock_le(clocks["B"], clocks["A"]))
        self.assertTrue(MODULE._clock_le(clocks["A"], clocks["AB"]))
        self.assertTrue(MODULE._clock_le(clocks["B"], clocks["AB"]))

    def test_exact_population_and_schedules(self) -> None:
        population = self.result["population"]
        self.assertEqual(population["worlds"], 7680)
        self.assertEqual(population["unique_world_ids"], 7680)
        self.assertEqual(population["schedules_per_scenario"], 120)
        self.assertEqual(population["scenarios"], 64)
        self.assertEqual(population["monte_carlo_draws"], 0)

    def test_outcome_is_nonconstant(self) -> None:
        distribution = self.result["outcomes"]["C_erase_deadline_distribution"]
        self.assertGreaterEqual(len(distribution), 2)
        self.assertEqual(sum(distribution.values()), 7680)

    def test_causal_signature_matches_endogenous_reference_enumeration(self) -> None:
        score = self.result["model_scores"]["causal_frontier"]
        self.assertEqual(score["exact"], score["total"])
        self.assertEqual(score["mean_absolute_error"], 0)
        self.assertEqual(
            self.result["controls"]["causal_signature_reference_mismatches"], 0
        )
        self.assertEqual(
            self.result["theorem"]["qualification"],
            "endogenous_generator_identity",
        )

    def test_graph_and_schedule_rivals_are_not_sufficient(self) -> None:
        sufficiency = self.result["sufficiency"]
        self.assertGreater(sufficiency["graph_only"]["ambiguous_strata"], 0)
        self.assertGreater(sufficiency["schedule_artifact"]["ambiguous_strata"], 0)
        self.assertEqual(sufficiency["causal_frontier"]["ambiguous_strata"], 0)
        self.assertLess(
            self.result["model_scores"]["graph_only"]["exact"], 7680
        )
        self.assertLess(
            self.result["model_scores"]["schedule_artifact"]["exact"], 7680
        )

    def test_comparisons_are_nested_ablations_not_matched_budgets(self) -> None:
        comparison = self.result["comparison"]
        self.assertEqual(comparison["kind"], "nested_information_ablations")
        self.assertFalse(comparison["matched_budgets"])
        budgets = {name: set(fields) for name, fields in comparison["information_budgets"].items()}
        self.assertLess(budgets["graph_only"], budgets["schedule_artifact"])
        self.assertLess(budgets["schedule_artifact"], budgets["causal_frontier"])

    def test_versions_schedules_and_recovery_are_discriminating(self) -> None:
        outcomes = self.result["outcomes"]
        self.assertGreater(outcomes["version_discriminating_strata"], 0)
        self.assertGreater(outcomes["schedule_sensitive_scenarios"], 0)
        self.assertGreater(outcomes["recovery_mode_discriminating_pairs"], 0)

    def test_descendant_and_negative_controls(self) -> None:
        controls = self.result["controls"]
        self.assertGreater(controls["descendant_invariance_pairs"], 0)
        self.assertEqual(controls["descendant_invariance_mismatches"], 0)
        self.assertEqual(controls["negative_version_control_failures"], 0)

    def test_cut_position_control(self) -> None:
        self.assertEqual(self.result["controls"]["cut_position_mismatches"], 0)

    def test_robust_all_schedule_frontier(self) -> None:
        self.assertEqual(
            self.result["controls"]["robust_causal_signature_mismatches"], 0
        )
        self.assertEqual(len(self.result["robust_scenarios"]), 64)

    def test_verdict_and_withdrawal_condition(self) -> None:
        self.assertEqual(self.result["verdict"], "endogenous_causal_signature_identity")
        self.assertEqual(
            self.result["withdrawal_condition"],
            "withdraw_the_generator_identity_on_any_mismatch_between_exhaustive_transition_enumeration_and_the_declared_causal_signature",
        )
        self.assertEqual(self.result["next_action"], "stop_same_family_local_expansion")

    def test_unmeasured_information_axis_is_absent(self) -> None:
        serialized = MODULE.canonical_json(self.result)
        self.assertNotIn('"C_info"', serialized)

    def test_quotient_reconstructs_population_and_detects_mutation(self) -> None:
        quotient = self.result["quotient"]
        self.assertEqual(quotient["cell_count"], 7680)
        self.assertLess(quotient["signature_count"], 7680)
        self.assertEqual(quotient["multiplicity_sum"], 7680)
        self.assertEqual(quotient["key_fields"], self.config["quotient_key_fields"])
        self.assertTrue(
            MODULE.validate_quotient(quotient["signatures"], self.rows)
        )
        mutation = deepcopy(quotient["signatures"])
        mutation[0]["multiplicity"] += 1
        self.assertFalse(MODULE.validate_quotient(mutation, self.rows))
        balanced = deepcopy(quotient["signatures"])
        balanced[0]["multiplicity"] += 1
        balanced[1]["multiplicity"] -= 1
        self.assertFalse(MODULE.validate_quotient(balanced, self.rows))
        duplicate = deepcopy(quotient["signatures"])
        duplicate.append(deepcopy(duplicate[0]))
        self.assertFalse(MODULE.validate_quotient(duplicate, self.rows))

    def test_historical_v01_artifact_is_preserved_and_requalified(self) -> None:
        old_result = HERE.parent / "reports" / "recovery-distributed-fictional-v0.1" / "result.json"
        old_config = HERE / "recovery-distributed-fictional-v0.1.json"
        self.assertTrue(old_result.exists())
        self.assertTrue(old_config.exists())
        historical = json.loads(old_result.read_text(encoding="utf-8"))
        self.assertEqual(
            historical["protocol_status_basis"],
            "self_declared_in_config_no_independent_temporal_lock",
        )
        self.assertIn("independent_oracle", historical["qualification_correction"]["unsupported_claims"])

    def test_recorded_artifact_reconstructs(self) -> None:
        artifact_path = HERE.parent / "reports" / "recovery-distributed-fictional-v0.2" / "result.json"
        self.assertTrue(artifact_path.exists(), "run the fixed protocol with --record")
        artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
        self.assertEqual(artifact, self.result)
        self.assertEqual(artifact["generator"]["runner_sha256"], MODULE.sha256_file(RUNNER))


if __name__ == "__main__":
    unittest.main()
