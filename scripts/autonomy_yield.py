#!/usr/bin/env python3
"""Audit local de traces et de rendement borné à une demande utilisateur.

Ne transmet ni prompts, ni résultats d'outils, ni contenu des documents.
Les empreintes attestent les pièces liées, pas leur validité sémantique.
"""
import argparse
from collections import OrderedDict
import hashlib
import json
from pathlib import Path


TOKEN_FIELDS = ("input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens")


def integer(value):
    return type(value) is int and value >= 0


def lines(path):
    with Path(path).open(encoding="utf-8") as stream:
        yield from stream


def telemetry(path, last=8):
    turns = OrderedDict()
    current = None
    malformed = 0
    for line in lines(path):
        try:
            row = json.loads(line)
            p = row.get("payload", {})
            if not isinstance(p, dict):
                raise ValueError("payload")
        except (ValueError, AttributeError):
            malformed += 1
            continue
        kind, event = row.get("type"), p.get("type")
        if kind == "event_msg" and event == "task_started":
            current = p.get("turn_id")
            if not isinstance(current, str) or not current.strip():
                malformed += 1
                current = None
                continue
            # Replayed start events select the turn without erasing its evidence.
            turns.setdefault(current, {"turn_id": current, "started_at": p.get("started_at"),
                              "completed": False, "duration_ms": None,
                              "calls": set(), "responses": {}, "final_present": False,
                              "usage_invalid": False})
        if kind == "token_usage_record":
            turn_id = p.get("turn_id")
            if not isinstance(turn_id, str) or not turn_id.strip():
                malformed += 1
                continue
            turn = turns.get(turn_id)
        else:
            turn = turns.get(current)
        if turn is None:
            continue
        if kind == "token_usage_record":
            response = p.get("response_id")
            usage = p.get("usage")
            if not isinstance(response, str) or not response.strip() or not isinstance(usage, dict):
                malformed += 1
                turn["usage_invalid"] = True
                continue
            if response in turn["responses"] and turn["responses"][response] != usage:
                turn["usage_invalid"] = True
            turn["responses"][response] = usage
        elif kind == "response_item" and event in ("function_call", "custom_tool_call"):
            turn["calls"].add(p.get("call_id") or p.get("id") or f"unidentified-{len(turn['calls'])}")
        elif kind == "response_item" and event == "message" and p.get("role") == "assistant":
            if p.get("phase") == "final_answer" or p.get("channel") == "final":
                turn["final_present"] = any(c.get("text", "").strip() for c in p.get("content", []) if isinstance(c, dict))
        elif kind == "event_msg" and event == "task_complete":
            turn["completed"] = True
            turn["duration_ms"] = p.get("duration_ms")
            turn["final_present"] |= bool(p.get("last_agent_message"))
    results = []
    for turn in list(turns.values())[-last:]:
        usages = list(turn.pop("responses").values())
        values = {}
        invalid = turn.pop("usage_invalid")
        for usage in usages:
            if any(key in usage and not integer(usage[key]) for key in TOKEN_FIELDS):
                invalid = True
            if all(integer(usage.get(key)) for key in ("input_tokens", "cached_input_tokens")):
                invalid |= usage["cached_input_tokens"] > usage["input_tokens"]
            if all(integer(usage.get(key)) for key in ("output_tokens", "reasoning_output_tokens")):
                invalid |= usage["reasoning_output_tokens"] > usage["output_tokens"]
        for key in TOKEN_FIELDS:
            values[key] = (sum(u[key] for u in usages)
                           if usages and not invalid and all(integer(u.get(key)) for u in usages) else None)
        inp, cached, out = (values[k] for k in TOKEN_FIELDS[:3])
        values["processed_tokens"] = inp + out if inp is not None and out is not None else None
        values["uncached_input_tokens"] = inp - cached if inp is not None and cached is not None else None
        calls = len(turn.pop("calls"))
        results.append({**turn, "tool_calls": calls, "model_responses": len(usages),
                        "tokens": values, "usage_status": "invalid" if invalid else "observed" if usages else "unknown",
                        "empty_completed_cycle": turn["completed"] and not calls and not turn["final_present"]})
    return {"schema_version": 1, "turns": results, "malformed_lines": malformed,
            "scope": "observed_trace_only", "cost_currency": None,
            "note": "Entrées cache incluses dans input ; raisonnement inclus dans output. Ne pas les additionner deux fois."}


def evidence_valid(root, item):
    if not isinstance(item, dict) or not isinstance(item.get("path"), str):
        return False
    path = Path(item["path"])
    if path.is_absolute() or ".." in path.parts:
        return False
    target = (root / path).resolve()
    if not target.is_relative_to(root.resolve()) or not target.is_file():
        return False
    return hashlib.sha256(target.read_bytes()).hexdigest() == item.get("sha256")


def assess(contract, receipts, trace, root):
    """Le contrat est fixé AVANT l'étape ; unités = critères d'acceptation distincts."""
    for field in ("request_id", "request", "quality_contract"):
        if not isinstance(contract.get(field), str) or not contract[field].strip():
            raise ValueError(f"Contrat incomplet : {field}")
    criteria = contract.get("criteria")
    if not isinstance(criteria, dict) or not criteria or any(
        not isinstance(k, str) or not k or not isinstance(v, str) or not v.strip() for k, v in criteria.items()
    ):
        raise ValueError("Critères préalables requis")
    if not isinstance(receipts, list) or not isinstance(trace.get("turns"), list):
        raise ValueError("Reçus ou traces invalides")
    contract_hash = hashlib.sha256(json.dumps(contract, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    turns = {t["turn_id"]: t for t in trace["turns"]}
    if len(turns) != len(trace["turns"]):
        raise ValueError("Tours de trace dupliqués")
    used_turns, achieved, rows = set(), set(), []
    for record in receipts:
        if record.get("request_id") != contract["request_id"] or record.get("contract_sha256") != contract_hash:
            raise ValueError("Reçu non lié au contrat courant")
        ids = record.get("turn_ids")
        if not isinstance(ids, list) or not ids or any(not isinstance(i, str) for i in ids):
            raise ValueError("Tours de l'étape requis")
        if len(set(ids)) != len(ids) or used_turns.intersection(ids):
            raise ValueError("Tokens déjà attribués à une autre étape")
        used_turns.update(ids)
        declared = record.get("criteria", [])
        if not isinstance(declared, list) or any(not isinstance(c, str) or c not in criteria for c in declared):
            raise ValueError("Critère inconnu")
        if len(set(declared)) != len(declared):
            raise ValueError("Critère dupliqué")
        evidence = record.get("evidence", [])
        bound = isinstance(evidence, list) and bool(evidence) and all(evidence_valid(root, e) for e in evidence)
        quality = record.get("quality_passed") is True
        invalidated = achieved.intersection(declared) if not (bound and quality) else set()
        achieved.difference_update(invalidated)
        accepted = set(declared) - achieved if bound and quality else set()
        achieved.update(accepted)
        costs = [turns.get(i, {}).get("tokens", {}).get("processed_tokens") for i in ids]
        complete = all(i in turns and turns[i].get("completed") for i in ids)
        known = complete and all(integer(n) for n in costs) and not trace.get("malformed_lines", 0)
        tokens = sum(costs) if known else None
        rows.append({"step_id": record.get("step_id"), "new_supported_criteria": sorted(accepted),
                     "invalidated_criteria": sorted(invalidated),
                     "evidence_bound": bound, "quality_declared_passed": quality,
                     "processed_tokens": tokens,
                     "tokens_per_new_supported_criterion": tokens / len(accepted) if tokens and accepted else None,
                     "decision": "repair_quality_or_evidence" if not (bound and quality) else
                                 "review_marginal_value" if not accepted else "progress_supported"})
    costs = [row["processed_tokens"] for row in rows]
    total = sum(costs) if costs and all(integer(c) for c in costs) else None
    unattributed = sorted(set(turns) - used_turns)
    return {"request_id": contract["request_id"], "contract_sha256": contract_hash,
            "steps": rows, "supported_criteria": sorted(achieved),
            "remaining_criteria": sorted(set(criteria) - achieved), "attributed_processed_tokens": total,
            "unattributed_turn_ids": unattributed,
            "tokens_per_supported_criterion": total / len(achieved) if total and achieved and not unattributed else None,
            "scope": "evidence_binding_and_declared_quality_not_independent_semantic_validation",
            "comparison_rule": "Comparer seulement à demande, contrat, critères et qualité identiques ; pas de score global."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest="command", required=True)
    scan = subs.add_parser("trace")
    scan.add_argument("rollout", type=Path)
    scan.add_argument("--last", type=int, default=8)
    review = subs.add_parser("assess")
    review.add_argument("contract", type=Path)
    review.add_argument("receipts", type=Path)
    review.add_argument("trace", type=Path)
    review.add_argument("--root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    try:
        if args.command == "trace":
            if args.last < 1 or args.last > 100:
                raise ValueError("--last doit être compris entre 1 et 100")
            result = telemetry(args.rollout, args.last)
        else:
            result = assess(*(json.loads(p.read_text()) for p in (args.contract, args.receipts, args.trace)), args.root)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, OSError, KeyError, TypeError) as error:
        print(json.dumps({"status": "invalid", "error": str(error)}, ensure_ascii=False))
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
