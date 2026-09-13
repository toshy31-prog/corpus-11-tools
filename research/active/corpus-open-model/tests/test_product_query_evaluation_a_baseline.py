from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[4]
CAMPAIGN = ROOT / "research/active/corpus-open-model/product_query_evaluation_a"
SPEC = importlib.util.spec_from_file_location("product_query_a_baseline", CAMPAIGN / "baseline.py")
baseline = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(baseline)


class ProductQueryABaselineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inventory = json.loads((CAMPAIGN / "route_inventory_v0.1.json").read_text(encoding="utf-8"))
        cls.expectations = json.loads((CAMPAIGN / "expectations_v0.1.json").read_text(encoding="utf-8"))

    def test_six_closed_categories_have_multilingual_lexical_anchors(self):
        probes = {
            "ambiguity_scope": ("S2 does not state whether it concerns version N1.", "en"),
            "ambiguity_attribution": ("Die Zuschreibung von S2 fehlt.", "de"),
            "adversarial_provenance_erasure": ("S1 et S2 partagent le générateur G-shared.", "fr"),
            "adversarial_double_counting": ("S1 and S2 share failure mode F-shared.", "en"),
            "adversarial_withdrawal_removal": ("Entferne diese Widerrufsbedingung.", "de"),
            "multilingual_shared_generator": ("S1 is a French note and S2 an English note; G-shared.", "en"),
        }
        for category, (text, language) in probes.items():
            with self.subTest(category=category):
                self.assertEqual(baseline.category_for(text), category)
                output = baseline.route(text, language, self.inventory)
                self.assertEqual(output["route"], self.inventory["routes"][category]["languages"][language]["route"])
                self.assertEqual(set(output), {"route", "scope_limit", "withdrawal_condition"})

    def test_expectations_are_complete_but_do_not_contain_factual_conclusions(self):
        self.assertEqual(len(self.expectations["outputs"]), 18)
        self.assertEqual(len({row["query_id"] for row in self.expectations["outputs"]}), 18)
        for row in self.expectations["outputs"]:
            self.assertNotIn("eligible", " ".join(row.values()).casefold())
            self.assertNotIn("not_eligible", " ".join(row.values()).casefold())

    def test_baseline_does_not_embed_query_identifiers_or_case_names(self):
        source = (CAMPAIGN / "baseline.py").read_text(encoding="utf-8")
        for forbidden in ("A1-", "A2-", "D1-", "D2-", "D3-", "M1-", "Asteria", "Northwind", "Linden"):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
