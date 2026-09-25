#!/usr/bin/env python3
"""Read-only review of one whole objective; never select by a global score."""

import argparse
import json
from pathlib import Path

from autonomy_yield import evidence_valid, integer


def text(value):
    return isinstance(value, str) and bool(value.strip())


def bound(root, evidence):
    return isinstance(evidence, list) and bool(evidence) and all(evidence_valid(root, e) for e in evidence)


def costs(record, trace):
    ids = record.get("turn_ids", [])
    if not isinstance(ids, list) or any(not text(i) for i in ids) or len(ids) != len(set(ids)):
        raise ValueError("Identifiants de tours absents, invalides ou dupliqués.")
    rows = trace.get("turns", [])
    turns = {t["turn_id"]: t for t in rows}
    if len(turns) != len(rows):
        raise ValueError("Tours de trace dupliqués.")
    fields = ("processed_tokens", "cached_input_tokens", "uncached_input_tokens", "output_tokens")
    unknown = [i for i in ids if i not in turns or not turns[i].get("completed")
               or turns[i].get("usage_status") != "observed"
               or not all(integer(turns[i].get("tokens", {}).get(f)) for f in fields)]
    known = [i for i in ids if i not in unknown]
    subtotal = {f: sum(turns[i]["tokens"][f] for i in known) for f in fields}
    complete = bool(ids) and not unknown and not trace.get("malformed_lines", 0)
    return {"turn_ids": ids, "unknown_or_incomplete_turn_ids": unknown,
            "known_subtotal": subtotal if known else None,
            "total": subtotal if complete else None, "currency": None,
            "scope": "Declared objective turns only; attribution is not independently verified."}


def review(record, trace, root):
    root = Path(root)
    missing = [f for f in ("id", "need", "user_intent", "expected_effect") if not text(record.get(f))]
    selection = record.get("selection", {})
    alternatives = selection.get("alternatives", [])
    if not text(selection.get("chosen_because")):
        missing.append("selection.chosen_because")
    if not isinstance(alternatives, list) or len(alternatives) > 2 or any(
            not isinstance(a, dict) or not text(a.get("id")) or not text(a.get("reason_not_selected"))
            for a in alternatives):
        missing.append("selection.alternatives")
    elif not alternatives and not text(selection.get("no_alternative_reason")):
        missing.append("selection.alternatives_or_reason")
    budget = record.get("budget", {})
    if budget.get("estimated_cost") not in {"low", "medium", "high", "unknown"} or not text(budget.get("review_when")):
        missing.append("budget")
    if record.get("kind") not in {"user_facing", "internal"}:
        missing.append("kind")
    if record.get("kind") == "internal" and not text(record.get("benefit_chain")):
        missing.append("benefit_chain")
    criteria = record.get("acceptance", [])
    if (not isinstance(criteria, list) or not criteria
            or any(not isinstance(c, dict) or not text(c.get("id")) or not text(c.get("description")) for c in criteria)
            or len({c["id"] for c in criteria}) != len(criteria)):
        missing.append("acceptance")
    result = {"objective_id": record.get("id"), "cost": costs(record, trace),
              "scope": "Contract and evidence checks, not independent judgement of usefulness.",
              "missing": missing}
    if missing:
        return {**result, "decision": "complete_contract", "closeable": False}
    pending = [c["id"] for c in criteria if c.get("status") != "passed" or not bound(root, c.get("evidence"))]
    if pending:
        return {**result, "decision": "finish_validation", "pending": pending, "closeable": False}
    validation = record.get("validation_hook", {})
    if validation.get("status") != "verified" or not bound(root, validation.get("evidence")):
        return {**result, "decision": "verify_validation_hook", "closeable": False}
    delivery = record.get("delivery", {})
    if delivery.get("required", True):
        receipt = delivery.get("receipt")
        if not isinstance(receipt, dict) or not evidence_valid(root, receipt):
            return {**result, "decision": "deliver_or_verify_receipt", "closeable": False}
        data = json.loads((root / receipt["path"]).read_text())
        if data.get("status") != "integrated" or not data.get("files"):
            return {**result, "decision": "recover_delivery", "closeable": False}
        changed = [p for p in data["files"] if not evidence_valid(root, {
            "path": p, "sha256": data.get("after", {}).get(p, {}).get("sha256")})]
        if changed:
            return {**result, "decision": "review_changed_delivery", "files": changed, "closeable": False}
    elif not text(delivery.get("not_required_reason")):
        return {**result, "decision": "explain_delivery_scope", "closeable": False}
    effect = record.get("effect", {})
    observed = effect.get("status") == "observed" and text(effect.get("description")) and bound(root, effect.get("evidence"))
    if effect.get("status") == "observed" and not observed:
        return {**result, "decision": "support_effect_claim", "closeable": False}
    return {**result, "decision": "close_objective", "closeable": True,
            "effect": "observed_with_declared_evidence" if observed else "unobserved",
            "cost_complete": result["cost"]["total"] is not None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("record", type=Path)
    parser.add_argument("trace", type=Path)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    try:
        result = review(json.loads(args.record.read_text()), json.loads(args.trace.read_text()), args.root)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, KeyError, TypeError, AttributeError, OSError) as exc:
        print(json.dumps({"decision": "repair_record", "error": str(exc)}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
