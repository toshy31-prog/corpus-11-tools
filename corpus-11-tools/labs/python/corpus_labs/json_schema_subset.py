"""Dependency-free validation for an explicit JSON Schema subset.

This module is intentionally not a complete JSON Schema implementation.  It
supports only the structural keywords listed in ``SUPPORTED_SCHEMA_KEYWORDS``
and rejects schemas that require another keyword instead of silently accepting
them.
"""

from __future__ import annotations

from datetime import datetime
import json
import re
from typing import Any


SUPPORTED_SCHEMA_KEYWORDS = frozenset(
    {
        "$defs",
        "$id",
        "$ref",
        "$schema",
        "additionalProperties",
        "const",
        "enum",
        "format",
        "items",
        "maxItems",
        "minItems",
        "minLength",
        "minimum",
        "pattern",
        "properties",
        "required",
        "title",
        "type",
        "uniqueItems",
    }
)

SUPPORTED_JSON_TYPES = frozenset(
    {"object", "array", "string", "integer", "number", "boolean", "null"}
)


class JsonSchemaSubsetError(ValueError):
    """The supplied schema is outside the deliberately supported subset."""


def _assert_supported_schema_tree(schema: dict[str, Any], path: str = "#") -> None:
    if not isinstance(schema, dict):
        raise JsonSchemaSubsetError(f"{path}: a schema node must be an object")

    unsupported = set(schema) - SUPPORTED_SCHEMA_KEYWORDS
    if unsupported:
        raise JsonSchemaSubsetError(
            f"{path}: unsupported JSON Schema keywords: {sorted(unsupported)}"
        )

    expected_type = schema.get("type")
    if expected_type is not None and (
        not isinstance(expected_type, str) or expected_type not in SUPPORTED_JSON_TYPES
    ):
        raise JsonSchemaSubsetError(
            f"{path}.type: expected one supported type string, got {expected_type!r}"
        )

    reference = schema.get("$ref")
    if reference is not None and not isinstance(reference, str):
        raise JsonSchemaSubsetError(f"{path}.$ref: expected a string")

    expected_format = schema.get("format")
    if expected_format is not None and expected_format != "date-time":
        raise JsonSchemaSubsetError(
            f"{path}.format: only 'date-time' is supported, got {expected_format!r}"
        )

    additional = schema.get("additionalProperties")
    if additional is not None and not isinstance(additional, bool):
        raise JsonSchemaSubsetError(
            f"{path}.additionalProperties: schema-valued forms are unsupported"
        )

    properties = schema.get("properties", {})
    if not isinstance(properties, dict):
        raise JsonSchemaSubsetError(f"{path}.properties: expected an object")
    for name, child in properties.items():
        _assert_supported_schema_tree(child, f"{path}.properties.{name}")

    definitions = schema.get("$defs", {})
    if not isinstance(definitions, dict):
        raise JsonSchemaSubsetError(f"{path}.$defs: expected an object")
    for name, child in definitions.items():
        _assert_supported_schema_tree(child, f"{path}.$defs.{name}")

    items = schema.get("items")
    if items is not None:
        if not isinstance(items, dict):
            raise JsonSchemaSubsetError(
                f"{path}.items: tuple and boolean schemas are unsupported"
            )
        _assert_supported_schema_tree(items, f"{path}.items")


def _json_type_matches(value: Any, expected: str) -> bool:
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "null":
        return value is None
    return False


def _resolve_local_ref(root_schema: dict[str, Any], ref: str) -> dict[str, Any]:
    if not ref.startswith("#/"):
        raise JsonSchemaSubsetError(f"external references are unsupported: {ref}")
    node: Any = root_schema
    for raw_part in ref[2:].split("/"):
        part = raw_part.replace("~1", "/").replace("~0", "~")
        node = node[part]
    if not isinstance(node, dict):
        raise JsonSchemaSubsetError(f"the reference does not target a schema: {ref}")
    return node


def _is_datetime(value: str) -> bool:
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return "T" in value


def _validate(
    value: Any,
    schema: dict[str, Any],
    root_schema: dict[str, Any],
    path: str,
) -> list[str]:
    if "$ref" in schema:
        errors = _validate(
            value,
            _resolve_local_ref(root_schema, schema["$ref"]),
            root_schema,
            path,
        )
        siblings = {key: item for key, item in schema.items() if key != "$ref"}
        if siblings:
            errors.extend(_validate(value, siblings, root_schema, path))
        return errors

    errors: list[str] = []
    expected = schema.get("type")
    if expected and not _json_type_matches(value, expected):
        return [f"{path}: type attendu {expected}, reçu {type(value).__name__}"]

    if "const" in schema and value != schema["const"]:
        errors.append(f"{path}: valeur attendue {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: valeur {value!r} hors vocabulaire fermé")

    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            errors.append(f"{path}: chaîne trop courte")
        pattern = schema.get("pattern")
        if pattern and re.search(pattern, value) is None:
            errors.append(f"{path}: ne respecte pas le motif {pattern}")
        if schema.get("format") == "date-time" and not _is_datetime(value):
            errors.append(f"{path}: date-heure ISO 8601 invalide")

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{path}: valeur inférieure au minimum {schema['minimum']}")

    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            errors.append(f"{path}: nombre d'éléments inférieur à {schema['minItems']}")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(f"{path}: nombre d'éléments supérieur à {schema['maxItems']}")
        if schema.get("uniqueItems"):
            rendered = [json.dumps(item, ensure_ascii=False, sort_keys=True) for item in value]
            if len(rendered) != len(set(rendered)):
                errors.append(f"{path}: éléments dupliqués interdits")
        item_schema = schema.get("items")
        if item_schema:
            for index, item in enumerate(value):
                errors.extend(_validate(item, item_schema, root_schema, f"{path}[{index}]"))

    if isinstance(value, dict):
        required = schema.get("required", [])
        for key in required:
            if key not in value:
                errors.append(f"{path}: propriété obligatoire absente: {key}")
        properties = schema.get("properties", {})
        for key, item in value.items():
            if key in properties:
                errors.extend(_validate(item, properties[key], root_schema, f"{path}.{key}"))
            elif schema.get("additionalProperties") is False:
                errors.append(f"{path}: propriété non autorisée: {key}")
    return errors


def validate_json_schema_subset(
    value: Any,
    schema: dict[str, Any],
    *,
    root_schema: dict[str, Any] | None = None,
    path: str = "$",
) -> list[str]:
    """Validate a JSON value with the explicitly supported schema subset.

    Data mismatches are returned as a list.  A schema outside the supported
    subset raises ``JsonSchemaSubsetError`` so an omitted keyword can never be
    mistaken for successful validation.
    """

    root = root_schema or schema
    _assert_supported_schema_tree(root)
    if schema is not root:
        _assert_supported_schema_tree(schema, path)
    return _validate(value, schema, root, path)
