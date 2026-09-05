#!/usr/bin/env python3
"""Structural pre-freeze checks; never calls a model, router, or surface."""
import json
import unittest
from pathlib import Path

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "product_query_evaluation_v0.1.json"
LANGUAGES = {"fr", "en", "de"}
PII = ("@", "phone", "email", "adresse", "address", "telefon", "telefonnummer")
ACTIONS = ("buy ", "purchase ", "contact ", "transfer money", "deploy ", "déployer", "acheter ", "contacter ")
RESULT_KEYS = {"execution_outputs", "model_results", "surface_results", "evaluation_output", "model_output", "surface_output", "model_result", "surface_result"}

class ProductQueryProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
        cls.queries = cls.fixture["queries"]
        cls.templates = cls.fixture["evaluation_b"]["templates"]

    def test_exactly_eighteen_queries_six_cases_and_three_languages(self):
        self.assertEqual(len(self.queries), 18)
        self.assertEqual({q["case_id"] for q in self.queries}, {"A1", "A2", "D1", "D2", "D3", "M1"})
        self.assertEqual({q["language"] for q in self.queries}, LANGUAGES)

    def test_each_case_has_one_translation_per_language_and_same_category(self):
        for case_id in {q["case_id"] for q in self.queries}:
            rows = [q for q in self.queries if q["case_id"] == case_id]
            self.assertEqual({q["language"] for q in rows}, LANGUAGES)
            self.assertEqual(len({q["category"] for q in rows}), 1)

    def test_a_is_non_executable_without_snapshot_binding(self):
        self.assertEqual(self.fixture["evaluation_a"]["status"], "snapshot_binding_required")
        self.assertIsNone(self.fixture["evaluation_a"]["exact_route_binding"])
        for q in self.queries:
            a = q["evaluation_a"]
            self.assertEqual(a["snapshot_binding_status"], "snapshot_binding_required")
            self.assertIsNone(a["expected_route"])
            self.assertTrue(a["expected_scope_limit"].strip())
            self.assertTrue(a["expected_withdrawal_condition"].strip())
            self.assertTrue(a["factual_conclusion_prohibited"])

    def test_no_duplicate_identifier_or_same_language_text(self):
        self.assertEqual(len(self.queries), len({q["id"] for q in self.queries}))
        pairs = {(q["language"], q["text"]) for q in self.queries}
        self.assertEqual(len(pairs), 18)

    def test_no_personal_data_or_real_action_instruction(self):
        for q in self.queries:
            text = q["text"].lower()
            self.assertFalse(any(x in text for x in PII), q["id"])
            self.assertFalse(any(x in text for x in ACTIONS), q["id"])

    def test_b_has_eighteen_synthetic_templates_without_a_text(self):
        self.assertEqual(len(self.templates), 18)
        prompts = [t["raw_prompt"] for t in self.templates]
        self.assertEqual(len(prompts), len(set(prompts)))
        a_texts = {q["text"] for q in self.queries}
        for t in self.templates:
            self.assertEqual(t["raw_prompt"], f"Référence de paquet B / {t['case_id']} / {t['language']}")
            self.assertFalse(any(text in json.dumps(t, ensure_ascii=False) for text in a_texts), t["packet_id"])
            for field in ("conclusion", "useful_uncertainties", "reversal_condition", "routes", "dependencies"):
                self.assertTrue(t[field], f"{t['packet_id']}:{field}")
        self.assertTrue(self.fixture["evaluation_b"]["source_a_reference_forbidden"])
        self.assertEqual(self.fixture["evaluation_b"]["packet_schema"], "corpus-analytic-packet/v1")

    def test_b_scope_text_is_at_designated_location(self):
        for t in self.templates:
            expected = t["scope_expectation"]
            self.assertIn(expected["location"], {"conclusion", "useful_uncertainties"})
            value = t[expected["location"]]
            text = value if isinstance(value, str) else "\n".join(value)
            self.assertIn(expected["exact_text"], text, t["packet_id"])

    def test_fixture_contains_no_observed_result_recursively(self):
        def inspect(value, location="$"):
            if isinstance(value, dict):
                for key, nested in value.items():
                    if key in RESULT_KEYS:
                        self.assertIn(nested, (None, [], {}), f"{location}.{key}")
                    inspect(nested, f"{location}.{key}")
            elif isinstance(value, list):
                for index, nested in enumerate(value):
                    inspect(nested, f"{location}[{index}]")
        inspect(self.fixture)

if __name__ == "__main__":
    unittest.main(verbosity=2)
