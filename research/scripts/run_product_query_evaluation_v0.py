#!/usr/bin/env python3
"""Run only the admissible part of PRODUCT-QUERY-EVALUATION v0.1.

The campaign has two deliberately separated arms.  Arm B is a deterministic
surface-preservation check and can be executed locally.  Arm A is a Corpus Open
Model routing check.  This launcher pins the available router and its route
inventory, but refuses to fabricate Arm A outputs when that router has already
been rejected by its own held-out comparison.

No model training, API call, or Corpus product write occurs here.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PROTOCOL = ROOT / "research/PRODUCT_QUERY_EVALUATION_PROTOCOL_v0.1.md"
DEFAULT_FIXTURE = ROOT / "research/fixtures/product_query_evaluation_v0.1.json"
DEFAULT_ROUTER_REPORT = ROOT / "research/active/corpus-open-model/artifacts/evaluation-report.json"
DEFAULT_ROUTER_MODEL = ROOT / "research/active/corpus-open-model/artifacts/corpusnet-router-v0.json"
DEFAULT_ROUTER_SCRIPT = ROOT / "research/active/corpus-open-model/src/predict_neural_router.py"
COMPILER_PATH = ROOT / "research/scripts/compile_product_query_evaluation_b.py"
RENDERER_PATH = ROOT / "research/scripts/render_product_query_evaluation_b.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


compiler = load_module("product_query_b_compiler", COMPILER_PATH)
renderer = load_module("product_query_b_renderer", RENDERER_PATH)


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def router_binding(report_path: Path, model_path: Path, script_path: Path) -> dict[str, Any]:
    report = read_json(report_path)
    model = read_json(model_path)
    selection = report.get("selection", {})
    labels = model.get("network", {}).get("labels")
    if not isinstance(labels, list) or not labels or not all(isinstance(label, str) for label in labels):
        raise ValueError("router model has no declared route inventory")
    if selection.get("status") != "experimental_not_preferred":
        raise ValueError("this v0 launcher only accepts the explicitly non-preferred router state")
    return {
        "router_name": report.get("training", {}).get("model"),
        "selection_status": selection["status"],
        "selection_reason": selection.get("reason"),
        "report_sha256": sha256_file(report_path),
        "model_sha256": sha256_file(model_path),
        "router_script_sha256": sha256_file(script_path),
        "route_inventory_sha256": digest(labels),
        "route_count": len(labels),
    }


def run_campaign(protocol_path: Path, fixture_path: Path, report_path: Path, model_path: Path, script_path: Path, output_dir: Path) -> dict[str, Any]:
    if output_dir.exists():
        raise FileExistsError("refusing to overwrite an existing campaign")
    fixture = read_json(fixture_path)
    if fixture.get("status") != "pre_registered_before_execution":
        raise ValueError("fixture is not pre-registered")
    if fixture.get("evaluation_a", {}).get("status") != "snapshot_binding_required":
        raise ValueError("fixture no longer requires the pre-execution A binding")
    if fixture.get("execution_outputs") or fixture.get("model_results"):
        raise ValueError("fixture must not contain observed outputs")
    binding = router_binding(report_path, model_path, script_path)
    output_dir.mkdir(parents=True)

    packet_manifest = compiler.compile_templates(protocol_path, fixture_path, output_dir / "arm-b-packets")
    render_manifest = renderer.render_packets(output_dir / "arm-b-packets", output_dir / "arm-b-renders")
    manifest = {
        "schema": "product-query-evaluation-run/v1",
        "protocol_id": fixture["protocol_id"],
        "protocol_sha256": sha256_file(protocol_path),
        "fixture_sha256": sha256_file(fixture_path),
        "compiler_sha256": sha256_file(COMPILER_PATH),
        "renderer_sha256": sha256_file(RENDERER_PATH),
        "arm_a": {
            "status": "blocked_model_not_selected",
            "query_count": len(fixture["queries"]),
            "router_binding": binding,
            "outputs_attempted": 0,
            "reason": "CorpusNet-Router v0 is experimental_not_preferred after its held-out comparison; this campaign must not turn a rejected router into a factual or routing authority.",
        },
        "arm_b": {
            "status": "executed_surface_preservation_only",
            "packet_manifest_sha256": packet_manifest["manifest_sha256"],
            "packet_count": packet_manifest["packet_count"],
            "render_manifest_sha256": render_manifest["manifest_sha256"],
            "render_count": render_manifest["render_count"],
            "source_a_reference_forbidden": True,
        },
        "overall_status": "incomplete_arm_a_blocked_arm_b_verified",
        "scope_limit": "Arm B establishes deterministic preservation on pre-registered synthetic packets only. Arm A was not run; this is not evidence of routing quality, semantic reasoning, model improvement, emergence, or product readiness.",
        "authorization": {
            "automatic_training": False,
            "automatic_product_write": False,
            "automatic_model_selection": False,
        },
    }
    manifest["manifest_sha256"] = digest(manifest)
    (output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--protocol", type=Path, default=DEFAULT_PROTOCOL)
    parser.add_argument("--fixture", type=Path, default=DEFAULT_FIXTURE)
    parser.add_argument("--router-report", type=Path, default=DEFAULT_ROUTER_REPORT)
    parser.add_argument("--router-model", type=Path, default=DEFAULT_ROUTER_MODEL)
    parser.add_argument("--router-script", type=Path, default=DEFAULT_ROUTER_SCRIPT)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        manifest = run_campaign(args.protocol, args.fixture, args.router_report, args.router_model, args.router_script, args.output_dir)
    except (OSError, KeyError, ValueError) as exc:
        parser.error(str(exc))
    print(json.dumps({"status": manifest["overall_status"], "arm_a": manifest["arm_a"]["status"], "arm_b_renders": manifest["arm_b"]["render_count"], "manifest_sha256": manifest["manifest_sha256"]}, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
