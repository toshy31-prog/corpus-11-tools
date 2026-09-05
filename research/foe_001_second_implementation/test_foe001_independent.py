#!/usr/bin/env python3
import copy
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import foe001_independent as implementation


FIXTURE_PATH = HERE.parent / "fixtures" / "foundations_of_evidence_foe_001.json"
PROTOCOL_PATH = HERE.parent / "FOUNDATIONS_OF_EVIDENCE_PROTOCOL_v0.1.md"


class Foe001IndependentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        implementation.verify_frozen_inputs(PROTOCOL_PATH, FIXTURE_PATH)
        cls.fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

    def test_lineage_variants_and_procedure_divergence(self):
        result = implementation.run_fixture(self.fixture)
        cases = {item["id"]: item for item in result["lineage_results"]}
        self.assertEqual(cases["independent"]["observed"], "independent")
        self.assertEqual(cases["common_mode"]["observed"], "shared_failure_mode")
        self.assertEqual(cases["incomplete_lineage"]["observed"], "independence_unknown")
        self.assertEqual(cases["common_mode"]["procedures"], {"evaluated": "not_eligible", "control": "eligible"})
        self.assertTrue(all(item["matches_expected"] for item in cases.values()))

    def test_two_representations_preserve_core_and_extension(self):
        result = implementation.run_fixture(self.fixture)
        self.assertTrue(result["provenance"]["core_fields_preserved"])
        self.assertTrue(result["provenance"]["extension"]["preserved"])

    def test_collision_is_rejected(self):
        registry = {}
        original = self.fixture["receipt"]
        implementation.register_receipt(registry, original)
        conflicting = copy.deepcopy(original)
        conflicting["attribution"] = "not-the-original"
        with self.assertRaises(implementation.CollisionError):
            implementation.register_receipt(registry, conflicting)

    def test_migration_outcomes(self):
        result = implementation.run_fixture(self.fixture)
        self.assertTrue(all(item["matches_expected"] for item in result["migration_results"]))
        self.assertEqual([item["observed"] for item in result["migration_results"]], ["stable", "declared_rule_change", "unexplained_drift"])

    def test_missing_lineage_fields_are_not_completed(self):
        incomplete = next(case for case in self.fixture["lineage_cases"] if case["id"] == "incomplete_lineage")
        self.assertEqual(implementation.classify_lineages(incomplete["lineages"]), "independence_unknown")
        self.assertEqual(incomplete["lineages"][1]["generator_ids"], [])
        self.assertEqual(incomplete["lineages"][1]["failure_mode_ids"], [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
