#!/usr/bin/env python3
"""Build the canonical traceability registry for eval principles.

Principle IDs are content-addressed from assertion kind + exact contract text.
They are not exposed to the live routing prompt and therefore cannot leak eval
answers into model selection. Each principle is linked to the positive routing
skills of the evals that require it; purely negative evals fall back to the
routing governor as their governance source.
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
EVALS = ROOT / "evals" / "routing-and-nonregression.jsonl"


def load_records() -> list[dict]:
    return [
        json.loads(line)
        for line in EVALS.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def principle_id(kind: str, text: str) -> str:
    digest = hashlib.sha256(f"{kind}\0{text}".encode("utf-8")).hexdigest()[:16]
    return f"P-{digest}"


def build_registry(records: list[dict] | None = None) -> dict:
    records = records or load_records()
    aggregate: dict[tuple[str, str], dict[str, set[str]]] = defaultdict(
        lambda: {"eval_ids": set(), "source_skills": set()}
    )
    for record in records:
        sources = set(record.get("expect", [])) or {"corpus-11-routing"}
        for kind in ("must", "must_not"):
            for text in record.get(kind, []):
                key = (kind, text)
                aggregate[key]["eval_ids"].add(record["id"])
                aggregate[key]["source_skills"].update(sources)

    entries = []
    for (kind, text), metadata in sorted(aggregate.items(), key=lambda item: principle_id(*item[0])):
        sources = sorted(metadata["source_skills"])
        entries.append(
            {
                "id": principle_id(kind, text),
                "kind": kind,
                "text": text,
                "eval_ids": sorted(metadata["eval_ids"]),
                "source_skills": sources,
                "source_paths": [f"skills/{skill}/SKILL.md" for skill in sources],
            }
        )
    return {
        "schema_version": 1,
        "description": (
            "Content-addressed traceability registry for hard eval principles. "
            "Live routing does not consume this registry."
        ),
        "entries": entries,
    }


def main() -> int:
    print(json.dumps(build_registry(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
