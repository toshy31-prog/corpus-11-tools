import unittest
import corpus_control

class StoragePressureTests(unittest.TestCase):
    def test_report_is_read_only_and_lifecycle_grounded(self):
        value = corpus_control.storage_pressure()
        self.assertEqual(value["schema_version"], 1)
        self.assertGreater(value["filesystem"]["total_bytes"], 0)
        self.assertGreaterEqual(value["filesystem"]["free_bytes"], 0)
        self.assertIn("report_only_no_deletion", value["invariants"])
        by_name = {row["territory"]: row for row in value["territories"]}
        self.assertEqual(by_name["data"]["truth"], "primary")
        self.assertFalse(by_name["data"]["automatic_delete_allowed"])
        self.assertEqual(by_name["cache"]["truth"], "none")
        self.assertTrue(all(not row["automatic_delete_allowed"] for row in value["largest_ignored_repo_paths"]))

if __name__ == "__main__":
    unittest.main()
