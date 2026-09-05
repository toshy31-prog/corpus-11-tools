#!/usr/bin/env python3
"""Seal Codex-produced Corpus analysis before conversational rendering."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def non_empty_unique(values: list[str], field: str, *, required: bool) -> list[str]:
    result = [value.strip() for value in values if value.strip()]
    if required and not result:
        raise ValueError(f"{field} is required")
    if len(result) != len(set(result)):
        raise ValueError(f"{field} must not contain duplicates")
    return result


def build_packet(args: argparse.Namespace) -> dict[str, Any]:
    if not args.raw_prompt.strip() or not args.conclusion.strip():
        raise ValueError("raw_prompt and conclusion are required")
    packet = {
        "schema": "corpus-analytic-packet/v1",
        "raw_prompt": args.raw_prompt,
        "analysis": {
            "material_conclusion": args.conclusion,
            "useful_uncertainties": non_empty_unique(args.uncertainty, "uncertainty", required=True),
            "reversal_conditions": non_empty_unique(args.reversal, "reversal", required=True),
            "routes": non_empty_unique(args.route, "route", required=True),
            "critical_dependencies": non_empty_unique(args.dependency, "dependency", required=False),
        },
    }
    packet["packet_sha256"] = digest(packet)
    return packet


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-prompt", required=True)
    parser.add_argument("--conclusion", required=True)
    parser.add_argument("--uncertainty", action="append", default=[])
    parser.add_argument("--reversal", action="append", default=[])
    parser.add_argument("--route", action="append", default=[])
    parser.add_argument("--dependency", action="append", default=[])
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        packet = build_packet(args)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(packet, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

