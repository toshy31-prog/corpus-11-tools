import unittest

from project_yield_gate import audit


def record(**changes):
    base = {
        "project": "test",
        "best_existing_alternative_checked": True,
        "distinct_delta_established": True,
        "decision_changing_outcome": True,
        "artifact_written": True,
        "tested": True,
        "authorized": True,
        "deployed": True,
        "reobserved": False,
        "external_effect_verified": False,
        "maintenance_owner_identified": True,
        "stop_condition_triggered": False,
        "retained_assets": ["tests"],
    }
    base.update(changes)
    return base


class ProjectYieldGateTests(unittest.TestCase):
    def test_abandons_when_best_existing_service_erases_delta(self):
        result = audit(record(distinct_delta_established=False))
        self.assertEqual(result["verdict"], "abandon_and_harvest")
        self.assertIn("do not claim impact", result["warnings"])

    def test_deployment_without_reobservation_is_not_effect(self):
        result = audit(record())
        self.assertEqual(result["highest_lifecycle_stage"], "deployed")
        self.assertEqual(result["verdict"], "continue_bounded_test")
        self.assertFalse(result["external_effect_verified"])

    def test_stops_work_that_cannot_change_a_decision(self):
        result = audit(record(decision_changing_outcome=False))
        self.assertEqual(result["verdict"], "stop_low_information_work")

    def test_blocks_externalization_without_maintenance_owner(self):
        result = audit(record(maintenance_owner_identified=False))
        self.assertEqual(result["verdict"], "blocked_without_maintenance")

    def test_rejects_impossible_lifecycle(self):
        result = audit(record(tested=False, authorized=True))
        self.assertEqual(result["verdict"], "invalid_record")
        self.assertTrue(result["errors"])


if __name__ == "__main__":
    unittest.main()
