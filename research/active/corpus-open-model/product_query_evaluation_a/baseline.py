"""Closed lexical baseline for PRODUCT-QUERY-EVALUATION A v0.1.

This is not a model, semantic interpreter, or general router.  It identifies
only six frozen synthetic categories from short multilingual anchors and emits
the predeclared route template for that category and declared language.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", text.casefold()).strip()


def category_for(text: str) -> str | None:
    """Match the frozen category anchors; no query id or expected output is read."""
    normalized = normalize(text)
    if "g-shared" in normalized:
        multilingual = (
            "note francaise" in normalized
            or "french note" in normalized
            or "franzosische notiz" in normalized
        )
        return "multilingual_shared_generator" if multilingual else "adversarial_provenance_erasure"
    if "f-shared" in normalized or "fehlermodus" in normalized or "failure mode" in normalized:
        return "adversarial_double_counting"
    if "condition de retrait" in normalized or "withdrawal condition" in normalized or "widerrufsbedingung" in normalized:
        return "adversarial_withdrawal_removal"
    if "attribution" in normalized or "zuschreibung" in normalized:
        return "ambiguity_attribution"
    if "n1" in normalized and (
        "ne precise pas" in normalized or "does not state" in normalized or "gibt nicht an" in normalized
    ):
        return "ambiguity_scope"
    return None


def route(text: str, language: str, inventory: dict[str, Any]) -> dict[str, str]:
    category = category_for(text)
    if category is None:
        raise ValueError("no frozen lexical category matched")
    template = inventory["routes"].get(category, {}).get("languages", {}).get(language)
    if not isinstance(template, dict):
        raise ValueError(f"no frozen route template for category={category!r}, language={language!r}")
    required = ("route", "scope_limit", "withdrawal_condition")
    if any(not isinstance(template.get(key), str) or not template[key] for key in required):
        raise ValueError("route template is incomplete")
    return {key: template[key] for key in required}
