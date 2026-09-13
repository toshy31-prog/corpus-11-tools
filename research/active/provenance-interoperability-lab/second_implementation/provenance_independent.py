#!/usr/bin/env python3
"""Separate local implementation for the frozen provenance replication package.

It uses two representations unlike the reference test: a columnar record and
a typed ledger.  It receives only the frozen protocol, fixture and output
contract supplied on the command line.
"""

from __future__ import annotations

import argparse
from copy import deepcopy
import json
from pathlib import Path
from typing import Any


def core(receipt: dict[str, Any]) -> dict[str, Any]:
    claim = receipt["claim"]
    return {
        "receipt_id": receipt["receipt_id"],
        "claim": {key: claim[key] for key in ("id", "text", "scope", "attribution")},
        "sources": sorted(
            [{"id": source["id"], "digest": source["digest"]} for source in receipt["sources"]],
            key=lambda item: item["id"],
        ),
        "transformations": sorted(
            [{"id": step["id"], "kind": step["kind"]} for step in receipt["transformations"]],
            key=lambda item: item["id"],
        ),
        "reversal_condition": {
            "id": receipt["reversal_condition"]["id"],
            "observable": receipt["reversal_condition"]["observable"],
        },
    }


def scalar_paths(value: object, prefix: tuple[object, ...] = ()) -> list[tuple[object, ...]]:
    if isinstance(value, dict):
        return [path for key, child in value.items() for path in scalar_paths(child, (*prefix, key))]
    if isinstance(value, list):
        return [path for index, child in enumerate(value) for path in scalar_paths(child, (*prefix, index))]
    return [prefix]


def mutate(value: dict[str, Any], path: tuple[object, ...]) -> dict[str, Any]:
    changed = deepcopy(value)
    cursor: Any = changed
    for item in path[:-1]:
        cursor = cursor[item]
    cursor[path[-1]] = f"{cursor[path[-1]]}__mutated"
    return changed


def pointer(path: tuple[object, ...]) -> str:
    return "/" + "/".join(str(item).replace("~", "~0").replace("/", "~1") for item in path)


def to_columnar(receipt: dict[str, Any]) -> dict[str, Any]:
    return {
        "shape": "columnar-record-v1",
        "receipt": receipt["receipt_id"],
        "claim": [receipt["claim"][key] for key in ("id", "text", "scope", "attribution")],
        "sources": [[item["id"], item["digest"]] for item in receipt["sources"]],
        "steps": [[item["id"], item["kind"]] for item in receipt["transformations"]],
        "reversal": [receipt["reversal_condition"]["id"], receipt["reversal_condition"]["observable"]],
        "loss_ledger": ["display_note"],
    }


def from_columnar(document: dict[str, Any]) -> dict[str, Any]:
    claim_id, text, scope, attribution = document["claim"]
    reversal_id, observable = document["reversal"]
    return {
        "receipt_id": document["receipt"],
        "claim": {"id": claim_id, "text": text, "scope": scope, "attribution": attribution},
        "sources": [{"id": identifier, "digest": digest} for identifier, digest in document["sources"]],
        "transformations": [{"id": identifier, "kind": kind} for identifier, kind in document["steps"]],
        "reversal_condition": {"id": reversal_id, "observable": observable},
        "loss_ledger": document["loss_ledger"],
    }


def to_typed_ledger(receipt: dict[str, Any]) -> dict[str, Any]:
    entries = [
        ["receipt", receipt["receipt_id"]],
        *[[f"claim.{key}", receipt["claim"][key]] for key in ("id", "text", "scope", "attribution")],
        *[["source", item["id"], item["digest"]] for item in receipt["sources"]],
        *[["step", item["id"], item["kind"]] for item in receipt["transformations"]],
        ["reversal", receipt["reversal_condition"]["id"], receipt["reversal_condition"]["observable"]],
    ]
    return {"shape": "typed-ledger-v1", "entries": entries, "loss_ledger": ["display_note"]}


def from_typed_ledger(document: dict[str, Any]) -> dict[str, Any]:
    entries = document["entries"]
    receipt_id = ""
    claim: dict[str, Any] = {}
    sources: list[dict[str, Any]] = []
    steps: list[dict[str, Any]] = []
    reversal_entry: list[str] | None = None
    for entry in entries:
        kind = entry[0]
        if kind == "receipt":
            receipt_id = entry[1]
        elif kind.startswith("claim."):
            claim[kind.split(".", 1)[1]] = entry[1]
        elif kind == "source":
            sources.append({"id": entry[1], "digest": entry[2]})
        elif kind == "step":
            steps.append({"id": entry[1], "kind": entry[2]})
        elif kind == "reversal":
            reversal_entry = entry
    if reversal_entry is None:
        raise ValueError("typed ledger does not contain a reversal entry")
    return {
        "receipt_id": receipt_id,
        "claim": claim,
        "sources": sources,
        "transformations": steps,
        "reversal_condition": {"id": reversal_entry[1], "observable": reversal_entry[2]},
        "loss_ledger": document["loss_ledger"],
    }


def round_trip(receipt: dict[str, Any], encode, decode) -> dict[str, Any]:
    return decode(json.loads(json.dumps(encode(receipt), sort_keys=True)))


def reject_collision(baseline: dict[str, Any], receipt: dict[str, Any]) -> str:
    registry = {baseline["receipt_id"]: baseline}
    conflicting = deepcopy(receipt)
    conflicting["claim"]["text"] = f"{conflicting['claim']['text']}__collision"
    candidate = core(conflicting)
    return "rejected" if candidate["receipt_id"] in registry and registry[candidate["receipt_id"]] != candidate else "absorbed"


def run(protocol: Path, fixture_path: Path, contract_path: Path) -> dict[str, Any]:
    protocol_text = protocol.read_text(encoding="utf-8")
    if "Mutations du noyau de provenance v0.2" not in protocol_text:
        raise ValueError("unexpected frozen provenance protocol")
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    contract = json.loads(contract_path.read_text(encoding="utf-8"))["research_contract"]
    receipt = fixture["receipt"]
    baseline = core(receipt)
    paths = scalar_paths(baseline)
    profiles = [(to_columnar, from_columnar), (to_typed_ledger, from_typed_ledger)]
    baseline_preserved = []
    extension_located = []
    mutation_results = []
    for path in paths:
        changed_core = mutate(baseline, path)
        changed_receipt = deepcopy(receipt)
        changed_receipt.update(changed_core)
        detected = []
        for encode, decode in profiles:
            restored_baseline = round_trip(receipt, encode, decode)
            baseline_preserved.append(core(restored_baseline) == baseline)
            extension_located.append(
                "display_note" not in restored_baseline and restored_baseline.get("loss_ledger") == [contract["extension_field"]]
            )
            restored = round_trip(changed_receipt, encode, decode)
            restored_core = core(restored)
            detected.append(restored_core == changed_core and restored_core != baseline)
        mutation_results.append({"path": pointer(path), "detected_by_all_profiles": all(detected)})
    if len(paths) != contract["core_scalar_count"] or len(profiles) != contract["profiles_required"]:
        raise ValueError("frozen provenance contract counts differ")
    return {
        "schema": contract["output_schema"],
        "protocol_id": contract["protocol_id"],
        "core": {
            "baseline_preserved": all(baseline_preserved),
            "core_scalar_count": len(paths),
            "profiles_tested": len(profiles),
        },
        "collision": {"verdict": reject_collision(baseline, receipt)},
        "extension": {
            "field": contract["extension_field"],
            "status": "loss_explicitly_located" if all(extension_located) else "lost_silently",
        },
        "mutation_results": mutation_results,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--protocol", type=Path, required=True)
    parser.add_argument("--fixture", type=Path, required=True)
    parser.add_argument("--contract", type=Path, required=True)
    parser.add_argument("--write-report", type=Path, required=True)
    args = parser.parse_args()
    report = run(args.protocol, args.fixture, args.contract)
    args.write_report.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
