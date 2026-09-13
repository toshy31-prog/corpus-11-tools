#!/usr/bin/env python3
"""Execute the sealed FOE-001 transversal campaign exactly once.

This runner only assembles the four pre-existing FOE-001 adapters into one
receipt. It owns no scientific rule, fixture, or adapter semantics.
"""

from __future__ import annotations

from copy import deepcopy
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import platform
import sys
from typing import Any, Mapping


ROOT = Path(__file__).resolve().parents[2]
SCHEMA = "foe-001-transversal-campaign-receipt/v1"
MANIFEST_SCHEMA = "foe-001-transversal-campaign-manifest/v1"
SEAL_SCHEMA = "foe-001-transversal-campaign-seal/v1"


class CampaignError(ValueError):
    """The sealed campaign cannot be executed as declared."""


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_file(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def sha256_value(value: object) -> str:
    return "sha256:" + hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def runtime_record() -> dict[str, str]:
    return {"implementation": platform.python_implementation(), "version": platform.python_version()}


def _load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise CampaignError(f"cannot read JSON {path}") from error
    if not isinstance(value, dict):
        raise CampaignError(f"JSON root must be an object: {path}")
    return value


def _relative_path(value: object, label: str) -> Path:
    if not isinstance(value, str) or not value:
        raise CampaignError(f"{label} must be a non-empty relative path")
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise CampaignError(f"{label} escapes the repository root")
    return path


def verify_seal(manifest_path: Path, seal_path: Path) -> dict[str, Any]:
    manifest = _load_json(manifest_path)
    seal = _load_json(seal_path)
    if manifest.get("schema") != MANIFEST_SCHEMA:
        raise CampaignError("manifest schema differs")
    if seal.get("schema") != SEAL_SCHEMA:
        raise CampaignError("seal schema differs")
    if seal.get("manifest_path") != manifest_path.name:
        raise CampaignError("seal names a different manifest")
    if seal.get("manifest_sha256") != sha256_file(manifest_path):
        raise CampaignError("sealed manifest fingerprint differs")
    if manifest.get("runtime") != runtime_record():
        raise CampaignError("runtime differs from the sealed campaign runtime")
    artifacts = manifest.get("artifacts")
    if not isinstance(artifacts, list) or not artifacts:
        raise CampaignError("manifest artifacts must be a non-empty list")
    observed_ids: set[str] = set()
    for index, item in enumerate(artifacts):
        if not isinstance(item, Mapping):
            raise CampaignError(f"artifacts[{index}] must be an object")
        identifier = item.get("id")
        expected_hash = item.get("sha256")
        if not isinstance(identifier, str) or identifier in observed_ids:
            raise CampaignError("artifact identifiers must be unique strings")
        if not isinstance(expected_hash, str):
            raise CampaignError("artifact hashes must be strings")
        path = ROOT / _relative_path(item.get("path"), f"artifacts[{index}].path")
        if not path.is_file() or sha256_file(path) != expected_hash:
            raise CampaignError(f"sealed artifact differs: {identifier}")
        observed_ids.add(identifier)
    required = {"protocol", "fixture", "runner", "evidence", "provenance", "migration", "diversity"}
    if observed_ids != required:
        raise CampaignError("manifest must seal protocol, fixture, runner, and four adapters exactly")
    return manifest


def _load_adapter(name: str, path: Path) -> Any:
    spec = importlib.util.spec_from_file_location(f"foe_001_campaign_{name}", path)
    if spec is None or spec.loader is None:
        raise CampaignError(f"cannot load adapter {name}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _core(receipt: Mapping[str, object], fields: list[str]) -> dict[str, object]:
    return {field: receipt[field] for field in fields}


def collect_observations(manifest: Mapping[str, Any]) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """Call each sealed adapter once and retain only declared FOE-001 observables."""
    artifact_paths = {item["id"]: ROOT / item["path"] for item in manifest["artifacts"]}
    fixture = _load_json(artifact_paths["fixture"])
    if fixture.get("protocol_id") != "FOE-001" or fixture.get("protocol_fixed_before_execution") is not True:
        raise CampaignError("fixture is not the frozen FOE-001 fixture")
    evidence = _load_adapter("evidence", artifact_paths["evidence"])
    provenance = _load_adapter("provenance", artifact_paths["provenance"])
    migration = _load_adapter("migration", artifact_paths["migration"])
    diversity = _load_adapter("diversity", artifact_paths["diversity"])
    expected_dependency_names = {"independent-evidence-arena", "provenance-interoperability-lab", "semantic-migration-lab", "epistemic-diversity-and-common-mode-failure-lab"}
    if set(fixture["receipt"].get("adapter_dependencies", [])) != expected_dependency_names:
        raise CampaignError("fixture adapter dependencies differ from the sealed four-control campaign")

    lineages = {case["id"]: evidence.classify(case["lineages"]) for case in fixture["lineage_cases"]}
    evidence_variants = {
        case["id"]: {
            "lineage_verdict": lineages[case["id"]],
            "evaluated": evidence.evaluated_decision(lineages[case["id"]]),
            "control": evidence.counted_source_decision(case["lineages"]),
        }
        for case in fixture["lineage_cases"]
    }

    receipt = fixture["receipt"]
    baseline = _core(receipt, fixture["core_fields"])
    roundtrips: dict[str, dict[str, bool]] = {}
    for name, encode, decode in (
        ("entity", provenance.encode_entity, provenance.decode_entity),
        ("graph", provenance.encode_graph, provenance.decode_graph),
    ):
        restored = decode(json.loads(json.dumps(encode(receipt), sort_keys=True)))
        roundtrips[name] = {"core_preserved": _core(restored, fixture["core_fields"]) == baseline}
    collision = provenance.encode_graph(receipt)
    collision["nodes"].append(deepcopy(collision["nodes"][0]))
    try:
        provenance.decode_graph(collision)
    except ValueError:
        collision_verdict = "rejected"
    else:
        collision_verdict = "absorbed"
    extended = provenance.encode_entity(receipt)
    extended[fixture["extension"]["field"]] = fixture["extension"]["value"]
    provenance_observation = {
        "roundtrips": roundtrips,
        "collision": collision_verdict,
        "extension": {"preserved": provenance.decode_entity(extended) == receipt},
    }

    migration_variants = {case["id"]: migration.classify(case) for case in fixture["migration_cases"]}
    diversity_variants = {
        case["id"]: {"cluster": sorted(diversity.cluster(case["lineages"], lineages[case["id"]]))}
        for case in fixture["lineage_cases"]
    }
    observations = {
        "evidence": {"variants": evidence_variants},
        "provenance": provenance_observation,
        "migration": {"variants": migration_variants},
        "diversity": {"variants": diversity_variants},
    }
    dependencies = [
        {"id": "python-standard-library", "fingerprint": f"{runtime_record()['implementation']} {runtime_record()['version']}"},
        *[
            {"id": item["id"], "fingerprint": item["sha256"]}
            for item in manifest["artifacts"]
            if item["id"] in {"evidence", "provenance", "migration", "diversity"}
        ],
    ]
    return observations, dependencies


def compare_controls(observations: Mapping[str, Any], expectations: Mapping[str, Any]) -> list[dict[str, Any]]:
    controls: list[dict[str, Any]] = []
    for identifier in ("evidence", "provenance", "migration", "diversity"):
        expected = expectations.get(identifier)
        observed = observations.get(identifier)
        if expected is None or observed is None:
            raise CampaignError(f"missing control {identifier}")
        conforming = canonical_json(expected) == canonical_json(observed)
        controls.append(
            {
                "id": identifier,
                "conforming": conforming,
                "expected": expected,
                "observed": observed,
                "differences": [] if conforming else [{"path": "/", "expected": expected, "observed": observed}],
            }
        )
    return controls


def campaign_decision(controls: list[Mapping[str, Any]], dependencies: list[Mapping[str, str]], declared_dependencies: list[Mapping[str, str]]) -> tuple[str, list[str]]:
    if canonical_json(dependencies) != canonical_json(declared_dependencies):
        return "arrêt_reprise", ["undeclared_or_mismatched_dependency"]
    observed = {control["id"]: control["observed"] for control in controls}
    severe_reasons: list[str] = []
    if observed["provenance"]["collision"] != "rejected":
        severe_reasons.append("silent_collision_absorption")
    if observed["evidence"]["variants"]["common_mode"]["lineage_verdict"] == "independent":
        severe_reasons.append("common_mode_counted_as_independent")
    if observed["evidence"]["variants"]["incomplete_lineage"]["lineage_verdict"] == "independent":
        severe_reasons.append("incomplete_lineage_counted_as_independent")
    if observed["migration"]["variants"]["unexplained_migration"] != "unexplained_drift":
        severe_reasons.append("unexplained_drift_not_visible")
    if severe_reasons:
        return "arrêt_reprise", severe_reasons
    if all(control["conforming"] for control in controls):
        return "passage", []
    return "réparation_ciblée", ["localized_control_difference"]


def build_receipt(manifest_path: Path, manifest: Mapping[str, Any], observations: Mapping[str, Any], dependencies: list[Mapping[str, str]]) -> dict[str, Any]:
    controls = compare_controls(observations, manifest["expectations"])
    decision, reasons = campaign_decision(controls, dependencies, manifest["declared_dependencies"])
    return {
        "schema": SCHEMA,
        "campaign_id": manifest["campaign_id"],
        "manifest_sha256": sha256_file(manifest_path),
        "runtime": runtime_record(),
        "controls": controls,
        "declared_dependencies": manifest["declared_dependencies"],
        "observed_dependencies": dependencies,
        "dependency_observation_limit": "only the sealed runner, four adapter files, and Python runtime are declared here; this does not detect undeclared host-level dependencies",
        "campaign_decision": decision,
        "decision_reasons": reasons,
        "limitations": [
            "FOE-001 is a frozen fictional fixture",
            "the receipt does not establish external independence",
            "the receipt does not authorize product integration or a general Corpus claim",
        ],
    }


def run_campaign(manifest_path: Path, seal_path: Path, output_dir: Path) -> dict[str, Any]:
    if output_dir.exists():
        raise CampaignError("refusing to overwrite a previous campaign receipt")
    manifest = verify_seal(manifest_path, seal_path)
    observations, dependencies = collect_observations(manifest)
    receipt = build_receipt(manifest_path, manifest, observations, dependencies)
    output_dir.mkdir(parents=True)
    receipt_path = output_dir / "receipt.json"
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return receipt


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--seal", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    receipt = run_campaign(args.manifest, args.seal, args.output_dir)
    print(json.dumps({"campaign_decision": receipt["campaign_decision"], "manifest_sha256": receipt["manifest_sha256"]}, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
