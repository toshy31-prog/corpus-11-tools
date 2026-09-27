import copy
import unittest

from retrieval_scope_contract import SCHEMA, evaluate


class RetrievalScopeContractTests(unittest.TestCase):
    def manifest(self):
        return {
            "schema": SCHEMA,
            "purpose": "conversation",
            "allow_tiers": ["core", "recall", "procedural"],
            "records": [
                {"id": "decision.local", "tier": "core", "review_state": "reviewed", "provenance_state": "verified"},
                {"id": "import.untrusted", "tier": "quarantine", "review_state": "not_reviewed", "provenance_state": "declared"},
                {"id": "archive.old", "tier": "archive", "review_state": "reviewed", "provenance_state": "verified"},
            ],
            "result_ids": ["decision.local"],
        }

    def test_admits_reviewed_declared_pool_member_without_execution(self):
        result = evaluate(self.manifest())
        self.assertEqual(result["result"], "pass")
        self.assertEqual(result["metrics"], {"result_count": 1, "admitted": 1, "rejected": 0})
        self.assertFalse(result["writes_performed"])
        self.assertEqual(result["network"], "not_used")

    def test_quarantine_unknown_and_disallowed_tier_fail_closed_with_reasons(self):
        payload = self.manifest()
        payload["result_ids"] = ["import.untrusted", "archive.old", "unknown.id"]
        result = evaluate(payload)
        self.assertEqual(result["result"], "fail_closed")
        self.assertIn("quarantined", result["rows"][0]["reasons"])
        self.assertIn("tier_not_allowed", result["rows"][1]["reasons"])
        self.assertEqual(result["rows"][2]["reasons"], ["unknown_identifier"])

    def test_rejects_attempt_to_admit_quarantine_or_ambiguous_metadata(self):
        payload = self.manifest()
        payload["allow_tiers"].append("quarantine")
        with self.assertRaisesRegex(ValueError, "quarantaine"):
            evaluate(payload)
        payload = copy.deepcopy(self.manifest())
        payload["records"][0]["provenance_state"] = "invented"
        with self.assertRaises(ValueError):
            evaluate(payload)


if __name__ == "__main__":
    unittest.main()
