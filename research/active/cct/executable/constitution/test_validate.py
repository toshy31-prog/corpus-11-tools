from __future__ import annotations

import copy
import unittest
from pathlib import Path

from validate import (
    CONSTITUTION_SCHEMA,
    DECISION_SCHEMA,
    load_json,
    validate_constitution_data,
    validate_decision_data,
    validate_document,
    validate_schema,
)


HERE = Path(__file__).resolve().parent


class ConstitutionExecutableTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.constitution = load_json(HERE / "constitution.json")
        cls.constitution_schema = load_json(CONSTITUTION_SCHEMA)
        cls.decision_schema = load_json(DECISION_SCHEMA)
        cls.valid_decision = load_json(HERE / "examples" / "decision-valid.json")
        cls.invalid_decision = load_json(HERE / "examples" / "decision-invalid.json")

    def test_constitution_is_structurally_and_semantically_valid(self) -> None:
        self.assertEqual([], validate_constitution_data(self.constitution, self.constitution_schema))

    def test_exactly_fifteen_unique_invariants_are_covered(self) -> None:
        invariant_ids = [item["id"] for item in self.constitution["invariants"]]
        covered = {
            invariant_id
            for disposition in self.constitution["dispositions"]
            for invariant_id in disposition["invariants"]
        }
        self.assertEqual(15, len(invariant_ids))
        self.assertEqual(15, len(set(invariant_ids)))
        self.assertEqual(set(invariant_ids), covered)

    def test_every_disposition_has_the_complete_execution_contract(self) -> None:
        required = {
            "actors", "triggers", "invariants", "required_traces", "appeals",
            "stop", "restitution", "lifecycle",
        }
        self.assertGreaterEqual(len(self.constitution["dispositions"]), 10)
        for disposition in self.constitution["dispositions"]:
            self.assertTrue(required.issubset(disposition), disposition["id"])

    def test_terminal_keys_are_pairwise_disjoint_in_all_dispositions(self) -> None:
        for disposition in self.constitution["dispositions"]:
            roles = disposition["actors"]
            self.assertTrue(set(roles["arreter"]).isdisjoint(roles["relancer"]), disposition["id"])
            self.assertTrue(set(roles["arreter"]).isdisjoint(roles["certifier_restitution"]), disposition["id"])
            self.assertTrue(set(roles["relancer"]).isdisjoint(roles["certifier_restitution"]), disposition["id"])

    def test_valid_decision_passes_both_validation_layers(self) -> None:
        self.assertEqual([], validate_schema(self.valid_decision, self.decision_schema))
        self.assertEqual([], validate_decision_data(self.valid_decision, self.constitution, self.decision_schema))

    def test_intentionally_invalid_decision_is_rejected_for_named_reasons(self) -> None:
        errors = validate_decision_data(self.invalid_decision, self.constitution, self.decision_schema)
        joined = "\n".join(errors)
        self.assertIn("invariants non vérifiés", joined)
        self.assertIn("traces obligatoires absentes", joined)
        self.assertIn("acteur d'arrêt non habilité", joined)
        self.assertIn("certificateur de restitution non habilité", joined)

    def test_unknown_actor_reference_is_rejected(self) -> None:
        candidate = copy.deepcopy(self.constitution)
        candidate["dispositions"][0]["actors"]["decider"] = ["A99"]
        errors = validate_constitution_data(candidate, self.constitution_schema)
        self.assertTrue(any("acteur inconnu A99" in error for error in errors))

    def test_duplicate_disposition_id_is_rejected(self) -> None:
        candidate = copy.deepcopy(self.constitution)
        candidate["dispositions"][1]["id"] = candidate["dispositions"][0]["id"]
        errors = validate_constitution_data(candidate, self.constitution_schema)
        self.assertTrue(any("disposition dupliqué" in error for error in errors))

    def test_terminal_key_concentration_is_rejected(self) -> None:
        candidate = copy.deepcopy(self.constitution)
        candidate["dispositions"][0]["actors"]["relancer"] = ["A06"]
        errors = validate_constitution_data(candidate, self.constitution_schema)
        self.assertTrue(any("clés d'arrêt, relance et certification" in error for error in errors))

    def test_prototype_cannot_overclaim_authorization(self) -> None:
        candidate = copy.deepcopy(self.constitution)
        candidate["artifact_status"]["state"] = "autorisee"
        errors = validate_constitution_data(candidate, self.constitution_schema)
        self.assertTrue(any("ne peut prétendre être autorisé" in error for error in errors))

    def test_decision_cannot_overclaim_activation(self) -> None:
        candidate = copy.deepcopy(self.valid_decision)
        candidate["status"] = "active"
        candidate["lifecycle"]["state"] = "active"
        errors = validate_decision_data(candidate, self.constitution, self.decision_schema)
        self.assertTrue(any("ne peut valider une décision active" in error for error in errors))

    def test_urgent_decision_requires_exceptional_power_disposition(self) -> None:
        candidate = copy.deepcopy(self.valid_decision)
        candidate["classification"] = ["urgente"]
        errors = validate_decision_data(candidate, self.constitution, self.decision_schema)
        self.assertTrue(any("D04 obligatoire" in error for error in errors))

    def test_restitution_deadline_cannot_exceed_constitutional_limit(self) -> None:
        candidate = copy.deepcopy(self.valid_decision)
        candidate["compliance"][0]["restitution_plan"]["deadline_hours"] = 999
        errors = validate_decision_data(candidate, self.constitution, self.decision_schema)
        self.assertTrue(any("délai de restitution supérieur" in error for error in errors))

    def test_unknown_property_is_rejected_by_schema(self) -> None:
        candidate = copy.deepcopy(self.valid_decision)
        candidate["autorisation_magique"] = True
        errors = validate_schema(candidate, self.decision_schema)
        self.assertTrue(any("propriété non autorisée" in error for error in errors))

    def test_historical_schema_signature_keeps_root_and_path_arguments(self) -> None:
        errors = validate_schema(
            "inconnu",
            {"$ref": "#/$defs/stringArray"},
            self.decision_schema,
            "$.status",
        )
        self.assertTrue(any(error.startswith("$.status:") for error in errors))

    def test_document_auto_detection(self) -> None:
        kind, errors = validate_document(HERE / "examples" / "decision-valid.json")
        self.assertEqual("cct_decision", kind)
        self.assertEqual([], errors)


if __name__ == "__main__":
    unittest.main()
