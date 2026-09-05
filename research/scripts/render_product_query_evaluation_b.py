#!/usr/bin/env python3
"""Render sealed B packets only; never calls a model or router."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from typing import Any


DETAILS = ("compact", "standard", "inspectable")
SURFACE_PATH = Path(__file__).resolve().parents[1] / "active/model-response-comparison-harness/native_surface/tools/conversation_surface.py"
SPEC = importlib.util.spec_from_file_location("conversation_surface", SURFACE_PATH)
surface = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(surface)


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_source(source_dir: Path) -> tuple[dict[str, Any], list[tuple[str, dict[str, Any]]]]:
    manifest_path = source_dir / "manifest.json"
    manifest = read_json(manifest_path)
    body = dict(manifest)
    declared = body.pop("manifest_sha256", None)
    if manifest.get("schema") != "product-query-evaluation-b-manifest/v1" or declared != digest(body):
        raise ValueError("source manifest is invalid")
    if manifest.get("packet_count") != 18 or len(manifest.get("packets", [])) != 18:
        raise ValueError("source manifest must declare exactly 18 packets")
    packets = []
    for item in manifest["packets"]:
        path = source_dir / item["filename"]
        packet = read_json(path)
        surface.validate_packet(packet)
        if packet["packet_sha256"] != item["sha256"]:
            raise ValueError(f"source manifest hash mismatch: {item['packet_id']}")
        packets.append((item["packet_id"], packet))
    return manifest, packets


def render_packets(source_dir: Path, output_dir: Path) -> dict[str, Any]:
    source_manifest, packets = validate_source(source_dir)
    output_paths = [output_dir / f"{packet_id}.{detail}.json" for packet_id, _ in packets for detail in DETAILS]
    manifest_path = output_dir / "manifest.json"
    if manifest_path.exists() or any(path.exists() for path in output_paths):
        raise FileExistsError("refusing to overwrite an existing render or manifest")
    output_dir.mkdir(parents=True, exist_ok=True)
    entries = []
    for packet_id, packet in packets:
        for detail in DETAILS:
            rendered = surface.render(packet, detail)
            surface.verify(packet, rendered)
            filename = f"{packet_id}.{detail}.json"
            (output_dir / filename).write_text(json.dumps(rendered, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
            entries.append({"packet_id": packet_id, "detail": detail, "filename": filename, "sha256": rendered["render_sha256"]})
    manifest = {
        "schema": "product-query-evaluation-b-render-manifest/v1",
        "source_manifest_declared_sha256": source_manifest["manifest_sha256"],
        "source_manifest_file_sha256": sha256_file(source_dir / "manifest.json"),
        "render_count": len(entries),
        "renders": entries,
    }
    manifest["manifest_sha256"] = digest(manifest)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    try:
        manifest = render_packets(args.source_dir, args.output_dir)
    except (OSError, ValueError, KeyError) as exc:
        parser.error(str(exc))
    print(json.dumps({"manifest_sha256": manifest["manifest_sha256"], "render_count": manifest["render_count"]}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
