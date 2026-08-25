#!/usr/bin/env python3
"""Validate every tracked JSON and JSONL file without external dependencies."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def tracked_json_paths() -> list[Path]:
    output = subprocess.check_output(
        ["git", "ls-files", "*.json", "*.jsonl"], cwd=ROOT, text=True
    )
    return [ROOT / item for item in output.splitlines()]


def main() -> None:
    paths = tracked_json_paths()
    for path in paths:
        try:
            if path.suffix == ".json":
                json.loads(path.read_text(encoding="utf-8"))
            else:
                for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                    if line.strip():
                        json.loads(line)
        except Exception as exc:
            relative = path.relative_to(ROOT)
            raise SystemExit(f"FAIL: {relative}: invalid JSON: {exc}") from exc
    print(f"PASS: validated {len(paths)} tracked JSON/JSONL files")


if __name__ == "__main__":
    main()
