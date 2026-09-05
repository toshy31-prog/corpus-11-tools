#!/usr/bin/env python3
"""Deterministic post-analytic conversational surface candidate."""
from __future__ import annotations

import argparse
import hashlib
import json
from copy import deepcopy
from pathlib import Path
from typing import Any

DETAILS = {"compact", "standard", "inspectable"}


class SurfaceError(RuntimeError):
    pass


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def packet_body(packet: dict[str, Any]) -> dict[str, Any]:
    body = deepcopy(packet)
    body.pop("packet_sha256", None)
    return body


def validate_packet(packet: dict[str, Any]) -> None:
    if packet.get("schema") != "corpus-analytic-packet/v1":
        raise SurfaceError("unsupported analytic packet schema")
    if packet.get("packet_sha256") != digest(packet_body(packet)):
        raise SurfaceError("analytic packet is not sealed or its hash is invalid")
    if not isinstance(packet.get("raw_prompt"), str) or not packet["raw_prompt"].strip():
        raise SurfaceError("analytic packet raw_prompt is required")
    analysis = packet.get("analysis")
    if not isinstance(analysis, dict) or not isinstance(analysis.get("material_conclusion"), str) or not analysis["material_conclusion"].strip():
        raise SurfaceError("analytic packet material_conclusion is required")
    for field in ("useful_uncertainties", "reversal_conditions", "routes", "critical_dependencies"):
        value = analysis.get(field)
        if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
            raise SurfaceError(f"analytic packet {field} must be a list of non-empty strings")
    for critical in ("useful_uncertainties", "reversal_conditions"):
        if not analysis[critical] or len(analysis[critical]) != len(set(analysis[critical])):
            raise SurfaceError(f"analytic packet {critical} must be non-empty and unique")


def bullets(values: list[str]) -> str:
    return "\n".join(f"- {value}" for value in values)


def conversation(packet: dict[str, Any], detail: str) -> str:
    analysis = packet["analysis"]
    sections = [
        "Conclusion\n" + analysis["material_conclusion"],
        "Limites et incertitudes à garder\n" + bullets(analysis["useful_uncertainties"]),
        "Ce qui ferait réviser l'analyse\n" + bullets(analysis["reversal_conditions"]),
    ]
    if detail == "standard":
        return "Voici l'essentiel.\n\n" + "\n\n".join(sections)
    if detail == "compact":
        return "\n\n".join(sections)
    return (
        "Demande d'origine\n" + packet["raw_prompt"] + "\n\n" + "\n\n".join(sections)
        + "\n\nMéthode inspectable\nRoutes : " + ", ".join(analysis["routes"])
        + "\nDépendances critiques : " + ", ".join(analysis["critical_dependencies"])
    )


def render(packet: dict[str, Any], detail: str = "standard") -> dict[str, Any]:
    validate_packet(packet)
    if detail not in DETAILS:
        raise SurfaceError("unsupported detail level")
    analysis = packet["analysis"]
    result = {
        "schema": "corpus-conversation-render/v1",
        "source_packet_sha256": packet["packet_sha256"],
        "detail": detail,
        "presentation_changes": ["language", "order", "concision", "detail_on_request"],
        "conversation": conversation(packet, detail),
        "fidelity_payload": {
            "material_conclusion": analysis["material_conclusion"],
            "useful_uncertainties": list(analysis["useful_uncertainties"]),
            "reversal_conditions": list(analysis["reversal_conditions"]),
        },
    }
    result["render_sha256"] = digest(result)
    return result


def verify(packet: dict[str, Any], rendered: dict[str, Any]) -> None:
    validate_packet(packet)
    if rendered.get("schema") != "corpus-conversation-render/v1":
        raise SurfaceError("unsupported render schema")
    if rendered.get("source_packet_sha256") != packet["packet_sha256"]:
        raise SurfaceError("render refers to a different analytic packet")
    if rendered.get("detail") not in DETAILS:
        raise SurfaceError("render has unsupported detail level")
    rendered_body = deepcopy(rendered)
    supplied_hash = rendered_body.pop("render_sha256", None)
    if supplied_hash != digest(rendered_body):
        raise SurfaceError("render hash is invalid")
    expected = render(packet, rendered["detail"])
    if rendered != expected:
        raise SurfaceError("render differs from the deterministic non-deformation contract")
    for value in [packet["analysis"]["material_conclusion"], *packet["analysis"]["useful_uncertainties"], *packet["analysis"]["reversal_conditions"]]:
        if value not in rendered["conversation"]:
            raise SurfaceError("critical analytic content is absent from conversation")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    actions = parser.add_subparsers(dest="action", required=True)
    render_parser = actions.add_parser("render")
    render_parser.add_argument("--packet", type=Path, required=True)
    render_parser.add_argument("--detail", choices=sorted(DETAILS), default="standard")
    render_parser.add_argument("--output", type=Path)
    verify_parser = actions.add_parser("verify")
    verify_parser.add_argument("--packet", type=Path, required=True)
    verify_parser.add_argument("--rendered", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.action == "render":
            result = render(read_json(args.packet), args.detail)
            if args.output:
                write_json(args.output, result)
            else:
                print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            verify(read_json(args.packet), read_json(args.rendered))
            print("PASS: deterministic conversational render preserves the sealed analytic packet")
    except (OSError, ValueError, SurfaceError) as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

