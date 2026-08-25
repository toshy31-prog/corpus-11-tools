from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
import tempfile
import unittest

from audit_contestability_threshold import audit, write_report as write_audit_report
from run_d10_campaign import (
    EXECUTION_REQUIRED_FIELDS,
    OBSERVATION_REQUIRED_FIELDS,
    classify,
    execute,
    load_config,
    protocol_conformance,
    simulate,
    worlds,
    write_report,
)


ROOT = Path(__file__).resolve().parent


class D10CampaignTests(unittest.TestCase):
    def setUp(self) -> None:
        self.config = load_config()
        self.result = execute(self.config)
        self.assessment = audit(self.config, self.result)

    def test_factorial_worlds_are_complete_and_paired(self) -> None:
        self.assertEqual(self.result["world_count"], 32)
        self.assertEqual(self.result["variation_count"], 5)
        rows = self.result["rows"]
        self.assertEqual(len(rows), 160)
        for row in rows:
            self.assertEqual(set(row["outcomes"]), {"d10", "baseline"})
        for variation in self.config["sensitivity_variations"]:
            ids = [row["world_id"] for row in rows if row["variation"] == variation]
            self.assertEqual(len(ids), len(set(ids)))
            self.assertEqual(len(ids), 32)

    def test_non_compensable_outputs_remain_separate(self) -> None:
        self.assertNotIn("invariants", self.result)
        self.assertIn("five gate proxy bits and margins reported separately", self.result["audited_invariants"])
        self.assertFalse(
            any("campaign configuration" in item for item in self.result["audited_invariants"])
        )
        for row in self.result["rows"]:
            for outcome in row["outcomes"].values():
                self.assertEqual(
                    set(outcome["gate_proxy_passes"]),
                    {"vital_need", "critical_ceiling", "right", "minimal_trace", "restitution"},
                )
                self.assertNotIn("score", outcome)
                self.assertIn("visible_work", outcome)
                self.assertIn("hidden_work", outcome)
                self.assertIn("lost_work", outcome)
                self.assertIn("contestability_proxy_passes", outcome)
                self.assertIn("restitution_proxy_passes", outcome)
                self.assertNotIn("contestable", outcome)
                self.assertNotIn("restitution_usable", outcome)

    def test_construct_validity_does_not_promote_proxy_to_trace(self) -> None:
        validity = self.result["construct_validity"]
        self.assertEqual(validity["verdict"], "proxy_substitution")
        self.assertEqual(validity["computed_indicator"], "scalar contestability proxy minus a fixed threshold")
        self.assertIn("recourse_path", validity["missing_trace_fields"])
        constrained = self.result["classification"]["d10_constrained_recourse"]
        self.assertEqual(constrained["verdict"], "not_assessable_nonconformant")
        self.assertTrue(constrained["mechanical_proxy_condition"])
        self.assertIn("contestability_proxy_below_threshold", constrained["mechanical_proxy_events"])
        self.assertNotIn("d10_trace_unusable_worlds", constrained)

    def test_protocol_conformance_exposes_missing_observation_contract(self) -> None:
        conformance = self.result["protocol_conformance"]
        self.assertEqual(conformance["verdict"], "nonconformant_observation_contract")
        self.assertEqual(conformance["assessment_scope"], "pipeline_verified")
        self.assertEqual(conformance["artifact_role"], "implementation_audit_only")
        self.assertIn(
            "trace.counter_narrative",
            conformance["observation_status"]["D10-O3"]["missing_fields"],
        )
        self.assertIn(
            "simulated_usability_test",
            conformance["observation_status"]["D10-O4"]["missing_fields"],
        )
        self.assertIn(
            "gate_proxy_passes",
            conformance["observation_status"]["D10-O1"]["proxy_fields_present"],
        )
        self.assertIn(
            "execution_contract.activation_window_hours",
            conformance["execution_status"]["missing_fields"],
        )
        self.assertIn(
            "execution_contract.presentation_order_rule",
            conformance["execution_status"]["missing_fields"],
        )

    def test_protocol_conformance_is_data_driven_and_reversible(self) -> None:
        config = deepcopy(self.config)

        def set_path(record: dict[str, object], path: str) -> None:
            current = record
            parts = path.split(".")
            for part in parts[:-1]:
                current = current.setdefault(part, {})
            current[parts[-1]] = True

        for field in EXECUTION_REQUIRED_FIELDS:
            set_path(config, field)
        rows = deepcopy(self.result["rows"])
        for row in rows:
            for outcome in row["outcomes"].values():
                for fields in OBSERVATION_REQUIRED_FIELDS.values():
                    for field in fields:
                        set_path(outcome, field)
        conformance = protocol_conformance(config, rows)
        self.assertEqual(
            conformance["verdict"], "structural_fields_complete_semantics_unverified"
        )
        self.assertEqual(conformance["artifact_role"], "protocol_execution_candidate")
        self.assertIn("semantics", conformance["consequence"])
        self.assertTrue(
            all(
                item["verdict"] == "fields_complete"
                for item in conformance["observation_status"].values()
            )
        )
        complete = deepcopy(self.result)
        complete["rows"] = rows
        complete["protocol_conformance"] = conformance
        complete["classification"] = classify(rows, str(conformance["verdict"]))
        self.assertTrue(
            all(
                item["protocol_reversal_status"]
                == "not_assessable_semantics_unverified"
                for item in complete["classification"].values()
            )
        )
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "report.md"
            write_report(complete, report)
            text = report.read_text(encoding="utf-8")
            self.assertIn("`protocol_execution_candidate`", text)
            self.assertIn("`structural_fields_complete_semantics_unverified`", text)
            self.assertIn("Champs d'observation absents : aucun.", text)
            self.assertIn("Exigences d'exécution absentes : aucune.", text)
            self.assertIn("Champs O3 structurellement absents : aucun.", text)
            self.assertNotIn("`implementation_audit_only`", text)
            self.assertNotIn("ne constituent pas une exécution conforme", text)

    def test_classify_rejects_unknown_conformance_verdict(self) -> None:
        with self.assertRaisesRegex(ValueError, "unknown protocol conformance verdict"):
            classify(self.result["rows"], "unexpected_status")

    def test_threshold_is_inclusive(self) -> None:
        world = next(
            world for world in worlds(self.config)
            if world["labels"]["channel"] == "stable"
            and world["labels"]["perturbation"] == "registered"
        )
        mechanism = deepcopy(self.config["mechanisms"]["d10"])
        mechanism["contestability"] = 0.56
        outcome = simulate(self.config, world, mechanism)
        self.assertEqual(outcome["contestability_margin"], 0.0)
        self.assertTrue(outcome["contestability_proxy_passes"])

    def test_gate_proxy_event_does_not_trigger_protocol_reversal(self) -> None:
        row = deepcopy(next(row for row in self.result["rows"] if row["variation"] == "baseline"))
        row["outcomes"]["d10"]["gate_proxy_passes"]["vital_need"] = False
        verdict = classify([row])["baseline"]
        self.assertEqual(verdict["protocol_reversal_status"], "not_assessable_nonconformant")
        self.assertIn("gate_proxy_below_threshold", verdict["mechanical_proxy_events"])
        self.assertEqual(
            verdict["d10_gate_proxy_below_threshold_worlds"], [row["world_id"]]
        )

    def test_o2_o4_proxies_do_not_trigger_protocol_reversal(self) -> None:
        row = deepcopy(next(row for row in self.result["rows"] if row["variation"] == "baseline"))
        row["outcomes"]["d10"]["hidden_work"] = row["outcomes"]["baseline"]["hidden_work"] + 1
        row["outcomes"]["d10"]["restitution_proxy_passes"] = False
        verdict = classify([row])["baseline"]
        self.assertEqual(verdict["protocol_reversal_status"], "not_assessable_nonconformant")
        self.assertIn("hidden_load_scalar_worse_in_all_rows", verdict["mechanical_proxy_events"])
        self.assertIn("restitution_proxy_below_threshold", verdict["mechanical_proxy_events"])

    def test_exact_threshold_map_reconstructs_four_cells(self) -> None:
        self.assertEqual(self.assessment["unique_functional_cells"], 4)
        self.assertEqual(self.assessment["rows"], 32)
        self.assertEqual(self.assessment["multiplicity_distribution"], {"8": 4})
        self.assertEqual(self.assessment["below_threshold_rows"], 24)
        self.assertEqual(self.assessment["above_or_equal_threshold_rows"], 8)
        self.assertEqual(
            [cell["threshold_fraction"] for cell in self.assessment["cells"]],
            ["14/25", "82/125", "343/500", "391/500"],
        )
        self.assertEqual(
            [cell["margin_fraction"] for cell in self.assessment["cells"]],
            ["1/25", "-7/125", "-43/500", "-91/500"],
        )

    def test_binary_and_continuous_forms_are_non_discriminating_representations(self) -> None:
        self.assertEqual(
            self.assessment["continuous_representation"]["relationship"],
            "non_discriminating_representation_pair",
        )
        self.assertEqual(
            self.assessment["continuous_representation"]["independent_evidence_gain"],
            "none",
        )
        self.assertEqual(self.assessment["relative_comparator_margin_fractions"], ["3/25"])

    def test_threshold_map_handles_unequal_multiplicities_and_empty_input(self) -> None:
        partial = deepcopy(self.result)
        removed = next(
            row for row in partial["rows"]
            if row["variation"] == "d10_constrained_recourse"
            and row["world"]["channel"] == 0.1
            and row["world"]["perturbation"] == 0.1
        )
        partial["rows"].remove(removed)
        partial["classification"] = classify(partial["rows"])
        assessment = audit(self.config, partial)
        self.assertEqual(assessment["multiplicity_distribution"], {"7": 1, "8": 3})
        self.assertEqual(assessment["step_intervals"][1]["passing_rows"], 7)
        self.assertEqual(assessment["step_intervals"][-1]["passing_rows"], 31)
        self.assertIn("24/31", assessment["strongest_conclusion"])
        self.assertIn("7 rows in 1 cell", assessment["strongest_conclusion"])
        self.assertNotIn("24/32", assessment["strongest_conclusion"])
        assessment["relative_comparator_margin_fractions"] = ["1/7"]
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "contestability-audit.md"
            write_audit_report(assessment, report)
            text = report.read_text(encoding="utf-8")
            self.assertIn("`24/31`", text)
            self.assertIn("`7` pour 1 cellule", text)
            self.assertIn("`8` pour 3 cellules", text)
            self.assertIn("vaut `1/7`", text)
            self.assertNotIn("24/32", text)
            self.assertNotIn("3/25", text)

        empty = deepcopy(self.result)
        empty["rows"] = [
            row for row in empty["rows"] if row["variation"] != "d10_constrained_recourse"
        ]
        with self.assertRaisesRegex(ValueError, "no rows available"):
            audit(self.config, empty)

    def test_report_uses_dynamic_denominator_and_proxy_vocabulary(self) -> None:
        selected = [
            next(row for row in self.result["rows"] if row["variation"] == variation)
            for variation in self.config["sensitivity_variations"]
        ]
        tiny = deepcopy(self.result)
        tiny["world_count"] = 1
        tiny["rows"] = selected
        tiny["classification"] = classify(
            selected, str(tiny["protocol_conformance"]["verdict"])
        )
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "report.md"
            write_report(tiny, report)
            text = report.read_text(encoding="utf-8")
            self.assertIn("/1", text)
            self.assertNotIn("/32", text)
            self.assertNotIn("Trace D10 inutilisable", text)
            self.assertNotIn("Restitution D10 inutilisable", text)
            self.assertIn("Proxy de restitution D10 sous seuil", text)

    def test_execution_is_deterministic(self) -> None:
        self.assertEqual(self.result, execute(load_config()))

    def test_checked_artifacts_reconstruct_exactly_when_present(self) -> None:
        results = ROOT.parent / "results" / "cct-sc-d10-001"
        if not (results / "result.json").exists():
            self.skipTest("prospective result has not been executed")
        expected = json.dumps(
            self.result, indent=2, sort_keys=True, ensure_ascii=False
        ) + "\n"
        self.assertEqual((results / "result.json").read_text(encoding="utf-8"), expected)
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "report.md"
            write_report(self.result, report)
            self.assertEqual(
                (results / "report.md").read_text(encoding="utf-8"),
                report.read_text(encoding="utf-8"),
            )
        expected_audit = json.dumps(
            self.assessment, indent=2, sort_keys=True, ensure_ascii=False
        ) + "\n"
        self.assertEqual(
            (results / "contestability-audit.json").read_text(encoding="utf-8"),
            expected_audit,
        )
        with tempfile.TemporaryDirectory() as directory:
            report = Path(directory) / "contestability-audit.md"
            write_audit_report(self.assessment, report)
            self.assertEqual(
                (results / "contestability-audit.md").read_text(encoding="utf-8"),
                report.read_text(encoding="utf-8"),
            )


if __name__ == "__main__":
    unittest.main()
