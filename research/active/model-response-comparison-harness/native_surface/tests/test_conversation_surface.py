#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import unittest
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from conversation_surface import SurfaceError, digest, packet_body, render, validate_packet, verify  # noqa: E402


def fixture() -> dict:
    packet = json.loads((ROOT / "fixtures" / "strong-conclusion.packet.json").read_text(encoding="utf-8"))
    packet["packet_sha256"] = digest(packet_body(packet))
    return packet


class ConversationSurfaceTests(unittest.TestCase):
    def test_fixture_is_sealed(self) -> None:
        packet = fixture()
        validate_packet(packet)

    def test_all_detail_levels_preserve_every_critical_item(self) -> None:
        packet = fixture()
        for detail in ("compact", "standard", "inspectable"):
            rendered = render(packet, detail)
            verify(packet, rendered)
            self.assertEqual(rendered["fidelity_payload"], {
                "material_conclusion": packet["analysis"]["material_conclusion"],
                "useful_uncertainties": packet["analysis"]["useful_uncertainties"],
                "reversal_conditions": packet["analysis"]["reversal_conditions"],
            })

    def test_compact_does_not_hide_technical_uncertainty(self) -> None:
        packet = fixture()
        rendered = render(packet, "compact")
        for uncertainty in packet["analysis"]["useful_uncertainties"]:
            self.assertIn(uncertainty, rendered["conversation"])

    def test_tampered_packet_is_refused(self) -> None:
        packet = fixture()
        packet["analysis"]["material_conclusion"] = "Oui, le score le prouve."
        with self.assertRaisesRegex(SurfaceError, "not sealed"):
            validate_packet(packet)

    def test_tampered_render_cannot_soften_or_strengthen_conclusion(self) -> None:
        packet = fixture()
        rendered = render(packet, "standard")
        rendered["conversation"] = rendered["conversation"].replace("Non.", "Peut-être.")
        with self.assertRaisesRegex(SurfaceError, "hash is invalid"):
            verify(packet, rendered)

    def test_tampered_render_cannot_delete_reversal_condition(self) -> None:
        packet = fixture()
        rendered = render(packet, "compact")
        rendered["conversation"] = rendered["conversation"].replace(packet["analysis"]["reversal_conditions"][0], "")
        rendered["render_sha256"] = digest({key: value for key, value in rendered.items() if key != "render_sha256"})
        with self.assertRaisesRegex(SurfaceError, "differs"):
            verify(packet, rendered)

    def test_routes_are_only_exposed_on_request(self) -> None:
        packet = fixture()
        compact = render(packet, "compact")
        inspectable = render(packet, "inspectable")
        self.assertNotIn(packet["analysis"]["routes"][0], compact["conversation"])
        self.assertIn(packet["analysis"]["routes"][0], inspectable["conversation"])
        self.assertNotIn("routes", compact["fidelity_payload"])


if __name__ == "__main__":
    unittest.main()
