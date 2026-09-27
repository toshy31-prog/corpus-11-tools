import unittest

from scenario_evaluation import freeze_fixtures
from scenario_graders import grade

BANK = {"scenarios": [{"id": "C1", "title": "x", "context": "x", "turns": [], "expected": [], "failures": [], "areas": [], "status": "not_run", "evidence": [], "user_feedback": "not_observed"}]}
LINKS = {"schema_version": 1, "links": [{"scenario_id": "C1", "required_namespaces": ["files"], "purpose": "Lire."}], "not_applicable": []}


def submission(fixtures):
    fingerprint = fixtures["fixtures"][0]["scenario_sha256"]
    return {
        "fixture_id": "C1", "fixture_sha256": fingerprint, "declared_result": "pass",
        "trace": {"run": {"id": "private-run", "status": "ok"}, "spans": [{"kind": "tool", "status": "ok", "start_ms": 0, "duration_ms": 2, "attributes": {"tool.name": "read"}}]},
        "tool_policy_receipt": {"router_mode": "enforce", "enabled_tools": [{"namespace": "files"}], "forbidden_namespaces": ["ssh"], "unknown_enabled_tools": [], "execution_permission": {"status": "not_observed_at_router"}},
        "outcome": {"reported_status": "completed"},
        "latency_budget": {"reported_wall_seconds": 2, "maximum_wall_seconds": 3},
    }


class ScenarioGraderTests(unittest.TestCase):
    def test_all_structural_axes_can_pass_without_promoting_declared_success(self):
        fixtures = freeze_fixtures(BANK)
        result = grade(BANK, fixtures, submission(fixtures), LINKS)
        self.assertEqual(result["grade_status"], "structural_checks_passed")
        self.assertEqual(result["declared_result"], "pass")
        self.assertIsNone(result["verified_result"])
        self.assertEqual(result["promotion"], "not_performed")
        self.assertNotIn("private-run", str(result))

    def test_missing_tool_policy_or_budget_is_a_failed_axis(self):
        fixtures = freeze_fixtures(BANK)
        value = submission(fixtures)
        value["tool_policy_receipt"]["enabled_tools"] = []
        value["latency_budget"]["reported_wall_seconds"] = 4
        result = grade(BANK, fixtures, value, LINKS)
        self.assertEqual(result["grade_status"], "structural_checks_failed")
        self.assertEqual(set(result["failed_axes"]), {"tools", "latency_budget"})

    def test_stale_fixture_or_ambiguous_input_is_rejected(self):
        fixtures = freeze_fixtures(BANK)
        value = submission(fixtures)
        value["fixture_sha256"] = "wrong"
        with self.assertRaises(ValueError):
            grade(BANK, fixtures, value, LINKS)

    def test_declared_pass_cannot_hide_incomplete_or_failed_recorded_execution(self):
        fixtures = freeze_fixtures(BANK)
        incomplete = submission(fixtures)
        incomplete["outcome"]["reported_status"] = "incomplete"
        result = grade(BANK, fixtures, incomplete, LINKS)
        self.assertEqual(result["grade_status"], "structural_checks_failed")
        self.assertIn("outcome", result["failed_axes"])
        self.assertFalse(result["axes"]["outcome"]["checks"]["declared_pass_reports_completed"])

        failed_span = submission(fixtures)
        failed_span["trace"]["spans"][0]["status"] = "error"
        result = grade(BANK, fixtures, failed_span, LINKS)
        self.assertEqual(result["grade_status"], "structural_checks_failed")
        self.assertEqual(result["axes"]["outcome"]["non_ok_spans"], ["s1"])


if __name__ == "__main__":
    unittest.main()
