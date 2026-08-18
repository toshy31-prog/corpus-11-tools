from __future__ import annotations

import unittest

from corpus_labs import JsonSchemaSubsetError, validate_json_schema_subset


WORKSHOP_SCHEMA = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "workshop-check.schema.json",
    "$defs": {
        "label": {
            "type": "string",
            "minLength": 3,
            "pattern": "^[a-z][a-z-]+$",
        }
    },
    "type": "object",
    "required": ["label", "mode", "checkpoints", "scheduled_at"],
    "additionalProperties": False,
    "properties": {
        "label": {"$ref": "#/$defs/label"},
        "mode": {"type": "string", "enum": ["manual", "shared"]},
        "checkpoints": {
            "type": "array",
            "minItems": 1,
            "maxItems": 3,
            "uniqueItems": True,
            "items": {"type": "integer", "minimum": 0},
        },
        "scheduled_at": {"type": "string", "format": "date-time"},
    },
}


class JsonSchemaSubsetTests(unittest.TestCase):
    def test_non_cct_document_passes_supported_subset(self) -> None:
        document = {
            "label": "kiln-check",
            "mode": "shared",
            "checkpoints": [0, 2],
            "scheduled_at": "2031-01-01T10:00:00Z",
        }
        self.assertEqual([], validate_json_schema_subset(document, WORKSHOP_SCHEMA))

    def test_data_errors_remain_separate_and_attributed(self) -> None:
        document = {
            "label": "X",
            "mode": "opaque",
            "checkpoints": [-1, -1],
            "scheduled_at": "tomorrow",
            "owner": "central",
        }
        errors = validate_json_schema_subset(document, WORKSHOP_SCHEMA)
        joined = "\n".join(errors)
        self.assertIn("chaîne trop courte", joined)
        self.assertIn("hors vocabulaire fermé", joined)
        self.assertIn("éléments dupliqués interdits", joined)
        self.assertIn("valeur inférieure au minimum", joined)
        self.assertIn("date-heure ISO 8601 invalide", joined)
        self.assertIn("propriété non autorisée: owner", joined)

    def test_boolean_does_not_satisfy_integer_type(self) -> None:
        errors = validate_json_schema_subset(True, {"type": "integer"})
        self.assertTrue(any("type attendu integer" in error for error in errors))

    def test_subschema_can_resolve_a_reference_from_an_explicit_root(self) -> None:
        errors = validate_json_schema_subset(
            "X",
            {"$ref": "#/$defs/label"},
            root_schema=WORKSHOP_SCHEMA,
            path="$.label",
        )
        self.assertTrue(any(error.startswith("$.label:") for error in errors))
        self.assertTrue(any("chaîne trop courte" in error for error in errors))

    def test_reference_siblings_are_applied_instead_of_ignored(self) -> None:
        errors = validate_json_schema_subset(
            "kiln",
            {"$ref": "#/$defs/label", "minLength": 8},
            root_schema=WORKSHOP_SCHEMA,
            path="$.label",
        )
        self.assertTrue(any("chaîne trop courte" in error for error in errors))

    def test_unsupported_keyword_is_rejected_not_ignored(self) -> None:
        with self.assertRaises(JsonSchemaSubsetError):
            validate_json_schema_subset("value", {"oneOf": [{"type": "string"}]})


if __name__ == "__main__":
    unittest.main()
