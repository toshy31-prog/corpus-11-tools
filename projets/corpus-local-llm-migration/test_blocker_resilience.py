import unittest

from blocker_resilience import assess, classify


class BlockerResilienceTests(unittest.TestCase):
    def test_timeout_never_duplicates_unknown_work(self):
        result = assess({"message": "Code Mode tool call timed out"})
        self.assertEqual(result["blocker"], "timeout_unknown_completion")
        self.assertEqual(result["policy"]["retry"], "never_duplicate_unknown_run")

    def test_completed_timeout_collects_existing_result(self):
        result = assess({"message": "timeout", "known_completion": True})
        self.assertEqual(result["policy"]["first_action"], "collect_existing_result")
        self.assertEqual(result["policy"]["retry"], "do_not_rerun_completed_work")

    def test_resource_pressure_preserves_primary_data_by_default(self):
        result = assess({"message": "insufficient free disk space"})
        self.assertEqual(result["blocker"], "resource_pressure")
        self.assertEqual(result["policy"]["write_policy"], "never_delete_primary_data_implicitly")

    def test_explicit_cleanup_still_limits_targets(self):
        result = assess({
            "message": "No space left on device",
            "destructive_cleanup_authorized": True,
        })
        self.assertEqual(
            result["policy"]["write_policy"],
            "cleanup_only_reconstructible_or_explicitly_authorized_targets",
        )

    def test_nested_sandbox_constraint_never_weakens_security(self):
        result = assess({"message": "bwrap: No permissions to create new namespace"})
        self.assertEqual(result["blocker"], "environment_constraint")
        self.assertEqual(
            result["policy"]["retry"],
            "use_equivalent_bounded_check_without_weakening_isolation",
        )
        self.assertEqual(
            result["policy"]["write_policy"],
            "never_disable_security_to_make_a_test_pass",
        )

    def test_transport_and_validation_are_distinct(self):
        self.assertEqual(classify("McpServerError: Session terminated"), "transport_failure")
        self.assertEqual(classify("AssertionError: test failed"), "validation_failure")

    def test_repeated_blocker_promotes_automation(self):
        result = assess({"message": "timeout", "repeated": True})
        self.assertIn("convert_root_cause_fix_into_regression_test_or_guard", result["escalation"])
        self.assertIn("prefer_reusable_automation_over_manual_repetition", result["escalation"])

    def test_concurrent_work_is_never_overwritten(self):
        result = assess({"message": "concurrent modification detected"})
        self.assertEqual(result["blocker"], "concurrent_change")
        self.assertEqual(result["policy"]["write_policy"], "never_overwrite_concurrent_work")

    def test_unknown_fields_and_kinds_fail_closed(self):
        with self.assertRaises(ValueError):
            assess({"message": "x", "surprise": True})
        with self.assertRaises(ValueError):
            assess({"message": "x", "kind": "magic"})


if __name__ == "__main__":
    unittest.main()
