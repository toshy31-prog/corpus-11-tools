from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

from run_d10_semantic_campaign import (
    REQUIRED_PATHS,
    RESULT_PATH,
    execute,
    generated_worlds,
    has_path,
    load_config,
    transition_oracle,
    write_report,
)


class D10SemanticCampaignTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = load_config()
        cls.result = execute(cls.config)

    def test_protocol_is_fixed_before_execution_and_bounded(self) -> None:
        self.assertEqual(self.config["protocol_status"], "fixed_before_execution")
        self.assertEqual(
            self.config["protocol_status_basis"],
            "self_declared_in_config_no_independent_temporal_lock",
        )
        self.assertEqual(
            self.result["protocol_status_basis"],
            "self_declared_in_config_no_independent_temporal_lock",
        )
        self.assertEqual(self.config["scope"], "model_internal")
        self.assertEqual(self.result["scope"]["deterministic_reconstruction"], "pipeline_verified")
        self.assertEqual(
            self.result["unsupported_claims"],
            ["institutional_effect", "external_transport"],
        )

    def test_complete_factorial_and_variations(self) -> None:
        self.assertEqual(len(generated_worlds(self.config)), 32)
        self.assertEqual(self.result["world_count"], 32)
        self.assertEqual(self.result["variation_count"], 4)
        self.assertEqual(self.result["row_count"], 128)
        self.assertTrue(self.result["audited_invariants"]["complete_factorial"])

    def test_all_axes_are_functional(self) -> None:
        self.assertEqual(
            self.result["audited_invariants"]["functional_axes"],
            {"load": True, "channel": True, "registration": True, "decision": True, "environment": True},
        )

    def test_rival_has_append_only_trace_recourse_and_equal_budget(self) -> None:
        rival = self.config["mechanisms"]["baseline"]
        self.assertIn("Append-only", rival["label"])
        self.assertTrue(rival["registered_trace"])
        self.assertTrue(rival["redundant_recourse"])
        self.assertEqual(
            self.config["mechanisms"]["d10"]["action_budget"],
            rival["action_budget"],
        )
        for row in self.result["rows"]:
            self.assertEqual(
                row["outcomes"]["d10"]["actual_state"]["action_budget"],
                row["outcomes"]["baseline"]["actual_state"]["action_budget"],
            )
        self.assertTrue(self.result["audited_invariants"]["action_budget_active"])

    def test_every_outcome_covers_o1_o4_and_is_evaluable(self) -> None:
        for row in self.result["rows"]:
            for mechanism in ("d10", "baseline"):
                outcome = row["outcomes"][mechanism]
                self.assertTrue(all(has_path(outcome, path) for path in REQUIRED_PATHS))
                self.assertTrue(row["assessments"][mechanism]["contract_valid"])

    def test_transition_oracle_rejects_false_content_not_only_missing_fields(self) -> None:
        row = deepcopy(self.result["rows"][0])
        outcome = row["outcomes"]["d10"]
        outcome["trace"]["reason"] = "plausible_but_false_reason"
        assessment = transition_oracle(
            row["ground_truth"], outcome, row["authorization_contracts"]["d10"]
        )
        self.assertFalse(assessment["o3_trace_truthful"])
        self.assertFalse(assessment["o3_recourse_usable"])
        self.assertFalse(assessment["contract_valid"])
        self.assertEqual(assessment["missing_fields"], [])

    def test_o3_rejects_distinct_but_unauthorized_reviewer(self) -> None:
        row = next(
            deepcopy(row) for row in self.result["rows"]
            if row["assessments"]["d10"]["o3_independent_review"]
        )
        outcome = row["outcomes"]["d10"]
        for event in outcome["transition_log"]:
            if event["event"] in {"review", "correction", "uphold"}:
                event["actor"] = "distinct_but_unauthorized_role"
        outcome["trace"]["review_actor"] = "distinct_but_unauthorized_role"
        assessment = transition_oracle(
            row["ground_truth"], outcome, row["authorization_contracts"]["d10"]
        )
        self.assertFalse(assessment["o3_actor_authority_valid"])
        self.assertFalse(assessment["o3_recourse_usable"])
        self.assertFalse(assessment["contract_valid"])

    def test_o4_rejects_false_recovery_log_content(self) -> None:
        row = deepcopy(self.result["rows"][0])
        outcome = row["outcomes"]["d10"]
        outcome["recovery_log"][0]["queue_after"] += 1
        assessment = transition_oracle(
            row["ground_truth"], outcome, row["authorization_contracts"]["d10"]
        )
        self.assertFalse(assessment["o4_recovery_log_consistent"])
        self.assertFalse(assessment["contract_valid"])

    def test_action_budget_rejects_unfunded_transition(self) -> None:
        row = next(
            deepcopy(row) for row in self.result["rows"]
            if row["variation"] == "matched_low_action_budget"
        )
        outcome = row["outcomes"]["d10"]
        outcome["actual_state"]["actions_used"] += 1
        assessment = transition_oracle(
            row["ground_truth"], outcome, row["authorization_contracts"]["d10"]
        )
        self.assertFalse(assessment["action_budget_consistent"])
        self.assertFalse(assessment["contract_valid"])

    def test_transition_oracle_detects_representation_mismatch(self) -> None:
        row = deepcopy(self.result["rows"][0])
        outcome = row["outcomes"]["d10"]
        outcome["gate_states"]["right"] = not outcome["gate_states"]["right"]
        assessment = transition_oracle(
            row["ground_truth"], outcome, row["authorization_contracts"]["d10"]
        )
        self.assertFalse(assessment["o1_gate_state_consistent"])
        self.assertFalse(assessment["contract_valid"])

    def test_budget_above_authorized_ceiling_is_rejected_even_if_balances_match(self) -> None:
        row = deepcopy(self.result["rows"][0])
        outcome = row["outcomes"]["d10"]
        delta = 92
        outcome["actual_state"]["action_budget"] += delta
        outcome["actual_state"]["actions_remaining"] += delta
        for item in outcome["action_ledger"]:
            item["balance_after"] += delta
        for item in outcome["denied_actions"]:
            item["balance_at_denial"] += delta
        assessment = transition_oracle(
            row["ground_truth"], outcome, row["authorization_contracts"]["d10"]
        )
        self.assertFalse(assessment["action_budget_consistent"])
        self.assertFalse(assessment["contract_valid"])

    def test_capacity_above_authorized_bound_is_rejected_after_coherent_rewrite(self) -> None:
        row = next(
            deepcopy(row) for row in self.result["rows"]
            if "recovery" in {
                item["action"] for item in row["outcomes"]["baseline"]["action_ledger"]
            }
        )
        outcome = row["outcomes"]["baseline"]
        recovery = outcome["recovery_log"][0]
        recovery["capacity_applied"] = 100
        recovery["queue_after"] = 0
        recovery["event"] = "restitution"
        recovery["reactivation_verified"] = True
        recovery["remaining_losses"] = []
        outcome["actual_state"]["queue_after"] = 0
        outcome["queue_below_local_threshold"] = True
        outcome["reactivation_verified"] = True
        outcome["remaining_losses"] = []
        outcome["active_repair_paths"] = []
        outcome["gate_states"]["restitution"] = True
        outcome["actual_state"]["gate_capabilities"]["restitution"] = True
        outcome["gate_narratives"]["restitution"] = "restitution:usable"
        outcome["simulated_usability_test"]["five_gate_attempts"]["restitution"] = True
        if outcome["trace"]["restitution_event"] != "unavailable":
            outcome["trace"]["restitution_event"] = "reactivated"
        for event in outcome["transition_log"]:
            if event["event"] in {"repair_due", "restitution"}:
                event["event"] = "restitution"
                event["queue_after"] = 0
        assessment = transition_oracle(
            row["ground_truth"], outcome, row["authorization_contracts"]["baseline"]
        )
        self.assertFalse(assessment["o4_recovery_log_consistent"])
        self.assertFalse(assessment["contract_valid"])

    def test_fabricated_denial_is_rejected_even_with_valid_local_balance(self) -> None:
        row = next(
            deepcopy(row) for row in self.result["rows"]
            if row["variation"] == "matched_low_action_budget"
            and row["outcomes"]["d10"]["actual_state"]["actions_remaining"] == 0
        )
        outcome = row["outcomes"]["d10"]
        attempt_count = len(outcome["action_ledger"]) + len(outcome["denied_actions"])
        outcome["denied_actions"].append(
            {
                "action": "decision",
                "cost": 1,
                "balance_at_denial": 0,
                "attempt_index": attempt_count,
            }
        )
        assessment = transition_oracle(
            row["ground_truth"], outcome, row["authorization_contracts"]["d10"]
        )
        self.assertFalse(assessment["action_budget_consistent"])
        self.assertFalse(assessment["contract_valid"])

    def test_wrong_gate_can_be_corrected_by_distinct_reviewer(self) -> None:
        corrected = [
            row for row in self.result["rows"]
            if row["ground_truth"]["correction_required"]
            and row["assessments"]["d10"]["o3_recourse_usable"]
        ]
        self.assertTrue(corrected)
        for row in corrected:
            self.assertNotEqual(row["ground_truth"]["decision_author"], row["ground_truth"]["reviewer"])
            self.assertTrue(row["outcomes"]["d10"]["actual_state"]["gate_capabilities"]["right"])
            self.assertTrue(any(event["event"] == "correction" for event in row["outcomes"]["d10"]["transition_log"]))

    def test_verdict_preserves_tradeoffs(self) -> None:
        classification = self.result["classification"]
        self.assertEqual(classification["verdict"], "compatible_survivors")
        self.assertEqual(classification["d10_pareto_wins"], 0)
        self.assertEqual(classification["baseline_pareto_wins"], 0)
        self.assertEqual(classification["ties_or_tradeoffs"], 128)
        self.assertGreater(classification["d10_protection_vector_wins"], 0)
        self.assertGreater(classification["baseline_protection_vector_wins"], 0)

    def test_no_composite_score_is_emitted(self) -> None:
        serialized = json.dumps(self.result, sort_keys=True)
        self.assertNotIn('"global_score"', serialized)
        self.assertNotIn('"success_score"', serialized)
        self.assertTrue(self.result["audited_invariants"]["no_composite_score"])

    def test_execution_is_deterministic(self) -> None:
        self.assertEqual(self.result, execute(load_config()))

    def test_report_is_bounded(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "report.md"
            write_report(self.result, path)
            text = path.read_text(encoding="utf-8")
        self.assertIn("`compatible_survivors`", text)
        self.assertIn("`model_internal`", text)
        self.assertIn("`pipeline_verified`", text)

    def test_checked_artifacts_reconstruct_exactly_when_present(self) -> None:
        if not (RESULT_PATH / "result.json").exists():
            self.skipTest("semantic campaign has not been recorded")
        expected = json.dumps(self.result, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
        self.assertEqual((RESULT_PATH / "result.json").read_text(encoding="utf-8"), expected)
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "report.md"
            write_report(self.result, report)
            self.assertEqual(
                (RESULT_PATH / "report.md").read_text(encoding="utf-8"),
                report.read_text(encoding="utf-8"),
            )
        self.assertTrue(
            (RESULT_PATH / "report.md").read_text(encoding="utf-8").startswith(
                f"# {self.config['id']} —"
            )
        )


if __name__ == "__main__":
    unittest.main()
