#!/usr/bin/env python3
"""Contract tests for the FOE-001 campaign receipt, without running FOE-001."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "research/scripts/run_foe_001_transversal_campaign.py"
SPEC = importlib.util.spec_from_file_location("foe_campaign_runner", SCRIPT)
assert SPEC and SPEC.loader
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class FoeCampaignReceiptTests(unittest.TestCase):
    def setUp(self):
        self.observations = {
            "evidence": {"variants": {"common_mode": {"lineage_verdict": "shared_failure_mode"}, "incomplete_lineage": {"lineage_verdict": "independence_unknown"}}},
            "provenance": {"collision": "rejected", "extension": {"preserved": True}},
            "migration": {"variants": {"unexplained_migration": "unexplained_drift"}},
            "diversity": {"variants": {}},
        }
        self.dependencies = [{"id": "python-standard-library", "fingerprint": "CPython test"}]
        self.controls = [
            {"id": name, "conforming": True, "observed": self.observations[name]}
            for name in ("evidence", "provenance", "migration", "diversity")
        ]

    def test_matching_controls_produce_passage(self):
        decision, reasons = runner.campaign_decision(self.controls, self.dependencies, self.dependencies)
        self.assertEqual((decision, reasons), ("passage", []))

    def test_localized_difference_produces_reparation_ciblee(self):
        controls = [*self.controls]
        controls[-1] = {**controls[-1], "conforming": False}
        decision, reasons = runner.campaign_decision(controls, self.dependencies, self.dependencies)
        self.assertEqual((decision, reasons), ("réparation_ciblée", ["localized_control_difference"]))

    def test_silent_absorption_or_undeclared_dependency_stops_campaign(self):
        absorbed = {**self.observations, "provenance": {"collision": "absorbed", "extension": {"preserved": True}}}
        controls = [{"id": name, "conforming": True, "observed": absorbed[name]} for name in ("evidence", "provenance", "migration", "diversity")]
        decision, reasons = runner.campaign_decision(controls, self.dependencies, self.dependencies)
        self.assertEqual((decision, reasons), ("arrêt_reprise", ["silent_collision_absorption"]))
        decision, reasons = runner.campaign_decision(self.controls, self.dependencies, [])
        self.assertEqual((decision, reasons), ("arrêt_reprise", ["undeclared_or_mismatched_dependency"]))

    def test_receipt_exposes_control_differences_without_running_campaign(self):
        expectations = {name: self.observations[name] for name in self.observations}
        altered = {**self.observations, "diversity": {"variants": {"independent": {"cluster": ["wrong"]}}}}
        controls = runner.compare_controls(altered, expectations)
        diversity = next(control for control in controls if control["id"] == "diversity")
        self.assertFalse(diversity["conforming"])
        self.assertEqual(diversity["differences"][0]["path"], "/")


if __name__ == "__main__":
    unittest.main(verbosity=2)
