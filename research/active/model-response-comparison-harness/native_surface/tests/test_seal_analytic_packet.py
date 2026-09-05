#!/usr/bin/env python3
from __future__ import annotations

import sys
import unittest
from argparse import Namespace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from conversation_surface import validate_packet  # noqa: E402
from seal_analytic_packet import build_packet  # noqa: E402


class SealAnalyticPacketTests(unittest.TestCase):
    def arguments(self, **changes: object) -> Namespace:
        values: dict[str, object] = {
            "raw_prompt": "Does the metric prove the organization improved?",
            "conclusion": "No. The metric alone does not prove improvement.",
            "uncertainty": ["The metric can be strategically adapted to."],
            "reversal": ["A validated construct measure would revise the conclusion."],
            "route": ["construct-validity-assessment"],
            "dependency": ["method-effect-audit"],
        }
        values.update(changes)
        return Namespace(**values)

    def test_builds_a_valid_sealed_packet(self) -> None:
        packet = build_packet(self.arguments())
        validate_packet(packet)
        self.assertEqual(packet["raw_prompt"], "Does the metric prove the organization improved?")

    def test_rejects_missing_critical_analysis(self) -> None:
        with self.assertRaisesRegex(ValueError, "uncertainty"):
            build_packet(self.arguments(uncertainty=[]))
        with self.assertRaisesRegex(ValueError, "reversal"):
            build_packet(self.arguments(reversal=[]))
        with self.assertRaisesRegex(ValueError, "route"):
            build_packet(self.arguments(route=[]))

    def test_rejects_duplicate_critical_analysis(self) -> None:
        with self.assertRaisesRegex(ValueError, "duplicates"):
            build_packet(self.arguments(route=["construct-validity-assessment", "construct-validity-assessment"]))


if __name__ == "__main__":
    unittest.main()
