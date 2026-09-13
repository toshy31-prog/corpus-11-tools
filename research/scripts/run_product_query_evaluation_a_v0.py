#!/usr/bin/env python3
"""Execute the single sealed run of PRODUCT-QUERY-EVALUATION A v0.1.

The runner accepts only the closed lexical baseline and a pre-execution seal.
It writes one output per frozen query, stops at the first eliminatory error,
and never trains, tunes, calls a network, or writes to a product surface.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import platform
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CAMPAIGN = ROOT / "research/active/corpus-open-model/product_query_evaluation_a"
PROTOCOL = ROOT / "research/PRODUCT_QUERY_EVALUATION_PROTOCOL_v0.1.md"
FIXTURE = ROOT / "research/fixtures/product_query_evaluation_v0.1.json"
BASELINE = CAMPAIGN / "baseline.py"
INVENTORY = CAMPAIGN / "route_inventory_v0.1.json"
EXPECTATIONS = CAMPAIGN / "expectations_v0.1.json"
MANIFEST = CAMPAIGN / "pre_execution_manifest_v0.1.json"
SEAL = CAMPAIGN / "pre_execution_seal_v0.1.json"


class EliminatoryError(ValueError):
    """A sealed campaign produced or detected a prohibited state."""


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise EliminatoryError(f"{path.name} must contain a JSON object")
    return value


def load_baseline():
    spec = importlib.util.spec_from_file_location("product_query_a_baseline", BASELINE)
    if spec is None or spec.loader is None:
        raise EliminatoryError("cannot load the sealed lexical baseline")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def verify_seal() -> dict[str, Any]:
    manifest = read_json(MANIFEST)
    seal = read_json(SEAL)
    if manifest.get("schema") != "product-query-evaluation-a-pre-execution-manifest/v1":
        raise EliminatoryError("invalid pre-execution manifest schema")
    if manifest.get("status") != "sealed_before_execution" or manifest.get("execution_limit") != 1:
        raise EliminatoryError("campaign is not sealed for one execution")
    if seal.get("schema") != "product-query-evaluation-a-seal/v1":
        raise EliminatoryError("invalid pre-execution seal schema")
    if seal.get("manifest_sha256") != sha256_file(MANIFEST):
        raise EliminatoryError("pre-execution manifest fingerprint differs from its seal")
    files = manifest.get("files")
    if not isinstance(files, dict):
        raise EliminatoryError("manifest must declare frozen files")
    for relative, expected in files.items():
        path = ROOT / relative
        if not path.is_file() or sha256_file(path) != expected:
            raise EliminatoryError(f"sealed input differs: {relative}")
    runtime = manifest.get("environment", {})
    if runtime.get("python_version") != platform.python_version() or runtime.get("python_implementation") != platform.python_implementation():
        raise EliminatoryError("runtime differs from the pre-execution declaration")
    return manifest


def validate_output(output: dict[str, Any]) -> None:
    allowed = {"query_id", "language", "route", "scope_limit", "withdrawal_condition"}
    if set(output) != allowed:
        raise EliminatoryError("A output contains a non-declared field")
    if any(not isinstance(output[key], str) or not output[key] for key in allowed):
        raise EliminatoryError("A output must contain only non-empty declared strings")
    text = " ".join(output.values()).casefold()
    if any(term in text for term in ("eligible", "not_eligible", "geeignet")):
        raise EliminatoryError("A produced a factual conclusion")


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def run(output_dir: Path) -> dict[str, Any]:
    if output_dir.exists():
        raise FileExistsError("refusing to overwrite an A evaluation run")
    manifest = verify_seal()
    fixture = read_json(FIXTURE)
    inventory = read_json(INVENTORY)
    expectations = read_json(EXPECTATIONS)
    if fixture.get("status") != "pre_registered_before_execution" or len(fixture.get("queries", [])) != 18:
        raise EliminatoryError("fixture is not the frozen 18-query set")
    expected_rows = expectations.get("outputs")
    if not isinstance(expected_rows, list) or len(expected_rows) != 18:
        raise EliminatoryError("expectations must contain exactly 18 sealed rows")
    expected = {row.get("query_id"): row for row in expected_rows if isinstance(row, dict)}
    if len(expected) != 18 or set(expected) != {query["id"] for query in fixture["queries"]}:
        raise EliminatoryError("expectations do not exactly bind the frozen query ids")
    output_dir.mkdir(parents=True)
    outputs_dir = output_dir / "outputs"
    outputs_dir.mkdir()
    baseline = load_baseline()
    records = []
    for index, query in enumerate(fixture["queries"], start=1):
        try:
            routed = baseline.route(query["text"], query["language"], inventory)
            output = {"query_id": query["id"], "language": query["language"], **routed}
            validate_output(output)
            comparison = {key: output[key] == expected[query["id"]].get(key) for key in ("route", "scope_limit", "withdrawal_condition")}
            write_json(outputs_dir / f"{index:02d}-{query['id']}.json", output)
            record = {"query_id": query["id"], "case_id": query["case_id"], "language": query["language"], "output_sha256": digest(output), "matches_expectation": all(comparison.values()), "comparison": comparison}
            records.append(record)
            if not record["matches_expectation"]:
                raise EliminatoryError(f"expectation divergence for {query['id']}")
        except Exception as error:
            failure = {
                "schema": "product-query-evaluation-a-result/v1",
                "status": "stopped_eliminatory_error",
                "execution_count": index,
                "completed_records": records,
                "failing_query_id": query["id"],
                "reason": str(error),
                "manifest_sha256": sha256_file(MANIFEST),
            }
            write_json(output_dir / "report.json", failure)
            return failure
    by_case = {case: sum(record["case_id"] == case for record in records) for case in sorted({record["case_id"] for record in records})}
    by_language = {language: sum(record["language"] == language for record in records) for language in sorted({record["language"] for record in records})}
    report = {
        "schema": "product-query-evaluation-a-result/v1",
        "status": "passed_closed_lexical_baseline",
        "execution_count": len(records),
        "records": records,
        "by_case": by_case,
        "by_language": by_language,
        "factual_conclusions": 0,
        "manifest_sha256": sha256_file(MANIFEST),
        "scope_limit": "Closed deterministic routing on 18 pre-registered synthetic queries only; not a model, intelligent interpretation, robustness result, external validation, or product integration.",
        "withdrawal_condition": "Withdraw this run if a sealed input, runtime, output contract, route inventory, or expected output differs, or if A emits a factual conclusion.",
    }
    write_json(output_dir / "report.json", report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    result = run(args.output_dir)
    print(json.dumps({"status": result["status"], "execution_count": result["execution_count"]}, ensure_ascii=False, sort_keys=True))
    return 0 if result["status"] == "passed_closed_lexical_baseline" else 2


if __name__ == "__main__":
    raise SystemExit(main())
