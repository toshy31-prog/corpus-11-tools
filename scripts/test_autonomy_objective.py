import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from autonomy_objective import review


class ObjectiveTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.evidence = self.write("check.txt", "A reproducible check passed")
        self.record = {
            "id": "objective-1", "kind": "internal", "need": "Observed loss of access",
            "user_intent": "Recover the user's work", "expected_effect": "Recovery usable",
            "benefit_chain": "repair -> recovery -> user can resume",
            "selection": {"chosen_because": "Blocks the ongoing user request",
                          "alternatives": [{"id": "cosmetic", "reason_not_selected": "No blocked use"}]},
            "budget": {"estimated_cost": "medium", "review_when": "A recovery attempt fails"},
            "acceptance": [{"id": "recover", "description": "Data accessible again",
                            "status": "passed", "evidence": [self.evidence]}],
            "validation_hook": {"status": "verified", "evidence": [self.evidence]},
            "delivery": {"required": False, "not_required_reason": "Observation only"},
            "effect": {"status": "unobserved"}, "turn_ids": ["a", "b"]}
        self.trace = {"turns": [self.turn("a", 100, 60, 10), self.turn("b", 200, 150, 20)]}

    def write(self, name, value):
        (self.root / name).write_text(value)
        return {"path": name, "sha256": hashlib.sha256(value.encode()).hexdigest()}

    def turn(self, id, inputs, cache, outputs):
        return {"turn_id": id, "completed": True, "usage_status": "observed",
                "tokens": {"processed_tokens": inputs + outputs, "cached_input_tokens": cache,
                           "uncached_input_tokens": inputs-cache, "output_tokens": outputs}}

    def run_review(self):
        return review(self.record, self.trace, self.root)

    def test_whole_objective_cost_and_unobserved_effect_remain_distinct(self):
        r = self.run_review()
        self.assertTrue(r["closeable"])
        self.assertEqual(r["effect"], "unobserved")
        self.assertEqual(r["cost"]["total"]["processed_tokens"], 330)
        self.assertEqual(r["cost"]["total"]["cached_input_tokens"], 210)

    def test_recovery_resumes_unfinished_validation_before_closure(self):
        self.record["acceptance"][0]["status"] = "pending"
        self.assertEqual(self.run_review()["decision"], "finish_validation")
        self.record["acceptance"][0]["status"] = "passed"
        (self.root / "check.txt").write_text("changed")
        self.assertEqual(self.run_review()["decision"], "finish_validation")

    def test_validation_hook_is_part_of_same_objective(self):
        self.record["validation_hook"]["status"] = "pending"
        self.assertEqual(self.run_review()["decision"], "verify_validation_hook")

    def test_integration_and_changed_source_are_checked(self):
        file = self.write("product.txt", "candidate")
        receipt = {"status": "prepared", "files": [file["path"]], "after": {file["path"]: file}}
        self.record["delivery"] = {"receipt": self.write("receipt.json", json.dumps(receipt))}
        self.assertEqual(self.run_review()["decision"], "recover_delivery")
        receipt["status"] = "integrated"
        self.record["delivery"]["receipt"] = self.write("receipt.json", json.dumps(receipt))
        self.assertTrue(self.run_review()["closeable"])
        self.write("product.txt", "concurrent edit")
        self.assertEqual(self.run_review()["decision"], "review_changed_delivery")

    def test_missing_or_active_turn_does_not_become_zero_cost(self):
        self.trace["turns"][1]["completed"] = False
        r = self.run_review()
        self.assertIsNone(r["cost"]["total"])
        self.assertEqual(r["cost"]["known_subtotal"]["processed_tokens"], 110)
        self.assertEqual(r["cost"]["unknown_or_incomplete_turn_ids"], ["b"])
        self.record["turn_ids"] = []
        self.assertIsNone(self.run_review()["cost"]["known_subtotal"])

    def test_duplicate_attribution_is_rejected(self):
        self.record["turn_ids"].append("a")
        with self.assertRaises(ValueError): self.run_review()

    def test_declared_effect_needs_evidence(self):
        self.record["effect"] = {"status": "observed", "description": "User recovered work"}
        self.assertEqual(self.run_review()["decision"], "support_effect_claim")

    def test_internal_work_requires_use_and_comparison(self):
        del self.record["benefit_chain"]
        self.record["selection"] = {}
        r = self.run_review()
        self.assertFalse(r["closeable"])
        self.assertIn("benefit_chain", r["missing"])
        self.assertIn("selection.alternatives_or_reason", r["missing"])

    def test_review_is_read_only_and_rejects_evidence_outside_root(self):
        before = copy.deepcopy(self.record)
        self.run_review()
        self.assertEqual(before, self.record)
        self.record["acceptance"][0]["evidence"][0]["path"] = "../private.txt"
        self.assertFalse(self.run_review()["closeable"])


if __name__ == "__main__":
    unittest.main()
