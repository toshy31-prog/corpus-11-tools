import copy
import unittest

from tool_context_quality import audit


def catalog():
    def tool(name, namespace, description):
        return {"name": name, "namespace": namespace, "effects": ["read"],
                "captured_description": description, "captured_schema": {"type": "object"}}
    return {"namespaces": {"files": {}, "memory": {}}, "tools": {
        "read": tool("read", "files", "Lire un fichier."),
        "memory": tool("memory", "memory", "Lire une note."),
    }}


PROFILES = {"schema_version": 1, "profiles": [
    {"id": "answer", "label": "Répondre", "description": "Sans outil", "tools": []},
    {"id": "both", "label": "Reprendre", "description": "Lire note et fichier", "tools": ["read", "memory"]},
]}
SCENARIOS = {"scenarios": [{"id": "C1"}, {"id": "C2"}]}
LINKS = {"schema_version": 1, "links": [{"scenario_id": "C1", "required_namespaces": ["files", "memory"], "purpose": "Reprise."}], "not_applicable": ["C2"]}


class ToolContextQualityTests(unittest.TestCase):
    def test_reports_profile_budget_and_explicit_scenario_coverage(self):
        result = audit(catalog(), PROFILES, SCENARIOS, LINKS, max_profile_tools=2, max_profile_chars=1000)
        self.assertEqual(result["status"], "structurally_consistent")
        covered = next(row for row in result["scenario_coverage"] if row["scenario_id"] == "C1")
        self.assertEqual(covered["matching_profiles"], ["both"])
        self.assertEqual(result["profile_budgets"][1]["measurement"], "captured_catalog_characters_not_live_tokens_or_latency")
        self.assertFalse(result["writes_performed"])

    def test_reports_duplicate_description_and_missing_profile_without_editing_catalog(self):
        value = catalog()
        value["tools"]["memory"]["captured_description"] = value["tools"]["read"]["captured_description"]
        profiles = copy.deepcopy(PROFILES)
        profiles["profiles"][1]["tools"] = ["read"]
        result = audit(value, profiles, SCENARIOS, LINKS)
        self.assertIn("duplicate_descriptions_present", result["review_items"])
        self.assertIn("scenario_profile_gap:C1", result["review_items"])

    def test_rejects_incomplete_or_overlapping_scenario_links(self):
        bad = copy.deepcopy(LINKS)
        bad["not_applicable"] = []
        with self.assertRaisesRegex(ValueError, "couvrir"):
            audit(catalog(), PROFILES, SCENARIOS, bad)


if __name__ == "__main__":
    unittest.main()
