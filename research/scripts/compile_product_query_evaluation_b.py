#!/usr/bin/env python3
"""Compile sealed B packets only; no router, model, render, or surface is called."""
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


def packet_from_template(template: dict[str, Any]) -> dict[str, Any]:
    packet = {
        "schema": "corpus-analytic-packet/v1",
        "raw_prompt": template["raw_prompt"],
        "analysis": {
            "material_conclusion": template["conclusion"],
            "useful_uncertainties": template["useful_uncertainties"],
            "reversal_conditions": [template["reversal_condition"]],
            "routes": template["routes"],
            "critical_dependencies": template["dependencies"],
        },
    }
    packet["packet_sha256"] = digest(packet)
    return packet


def validate_packet(packet: dict[str, Any]) -> None:
    body = dict(packet)
    supplied = body.pop("packet_sha256", None)
    if packet.get("schema") != "corpus-analytic-packet/v1" or supplied != digest(body):
        raise ValueError("invalid sealed packet")
    analysis = packet.get("analysis", {})
    if not isinstance(packet.get("raw_prompt"), str) or not packet["raw_prompt"].strip():
        raise ValueError("packet raw_prompt is required")
    if not isinstance(analysis.get("material_conclusion"), str) or not analysis["material_conclusion"].strip():
        raise ValueError("packet conclusion is required")
    for field in ("useful_uncertainties", "reversal_conditions", "routes", "critical_dependencies"):
        values = analysis.get(field)
        if not isinstance(values, list) or not values or not all(isinstance(value, str) and value.strip() for value in values):
            raise ValueError(f"packet {field} must be a non-empty string list")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compile_templates(protocol_path: Path, fixture_path: Path, output_dir: Path) -> dict[str, Any]:
    fixture_bytes = fixture_path.read_bytes()
    fixture = json.loads(fixture_bytes)
    # Deliberately access only the autonomous B section: never read A outputs.
    evaluation_b = fixture["evaluation_b"]
    if not evaluation_b.get("source_a_reference_forbidden") or evaluation_b.get("packet_schema") != "corpus-analytic-packet/v1":
        raise ValueError("fixture does not declare autonomous B packets")
    templates = evaluation_b["templates"]
    if len(templates) != 18:
        raise ValueError("exactly 18 B templates are required")
    paths = [output_dir / f"{template['packet_id']}.json" for template in templates]
    manifest_path = output_dir / "manifest.json"
    if manifest_path.exists() or any(path.exists() for path in paths):
        raise FileExistsError("refusing to overwrite an existing packet or manifest")
    packets = []
    for template in templates:
        expected_prompt = f"Référence de paquet B / {template['case_id']} / {template['language']}"
        if template["raw_prompt"] != expected_prompt:
            raise ValueError(f"non-synthetic raw_prompt: {template['packet_id']}")
        packet = packet_from_template(template)
        validate_packet(packet)
        packets.append((template["packet_id"], packet))
    output_dir.mkdir(parents=True, exist_ok=True)
    for packet_id, packet in packets:
        (output_dir / f"{packet_id}.json").write_text(json.dumps(packet, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    manifest = {
        "schema": "product-query-evaluation-b-manifest/v1",
        "protocol_sha256": sha256_file(protocol_path),
        "fixture_sha256": hashlib.sha256(fixture_bytes).hexdigest(),
        "compiler_sha256": sha256_file(Path(__file__)),
        "packet_count": len(packets),
        "packets": [{"packet_id": packet_id, "filename": f"{packet_id}.json", "sha256": packet["packet_sha256"]} for packet_id, packet in packets],
    }
    manifest["manifest_sha256"] = digest(manifest)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--protocol", type=Path, required=True)
    parser.add_argument("--fixture", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        manifest = compile_templates(args.protocol, args.fixture, args.output_dir)
    except (OSError, ValueError, KeyError) as exc:
        parser.error(str(exc))
    print(json.dumps({"packet_count": manifest["packet_count"], "manifest_sha256": manifest["manifest_sha256"]}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
