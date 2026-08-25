from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

from run_fictive_tae_matrix import (
    execute,
    load_config,
    midpoint_grid,
    write_report,
)


ROOT = Path(__file__).resolve().parent
REPORT_ROOT = ROOT.parent / "reports"


def canonical_non_operator_contract(config: dict[str, object]) -> dict[str, object]:
    """Remove only version metadata and the declared operator-specific contract."""

    canonical = deepcopy(config)
    for field in ("id", "version", "supersedes"):
        canonical.pop(field, None)
    canonical["generator"].pop("orbit_operator")
    canonical["rival_predictions"]["shape_orbit_interaction"] = "<operator-specific>"
    canonical["declared_invariants"] = [
        invariant
        for invariant in canonical["declared_invariants"]
        if invariant != "the radial displacement is fixed in normalized-radius units across grids"
    ]
    canonical["protocol_effect"] = "<operator-specific>"
    canonical["withdrawal_condition"] = "<operator-specific>"
    return canonical


class FictiveTaeMatrixTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config_v1 = load_config(ROOT / "fictive_tae_matrix_v0.1.json")
        cls.config_v2 = load_config(ROOT / "fictive_tae_matrix_v0.2.json")
        cls.v1 = execute(cls.config_v1)
        cls.v2 = execute(cls.config_v2)

    def test_protocols_are_separate_and_declare_fixed_before_execution(self) -> None:
        self.assertEqual(self.v1["protocol"], "F0-TAE-FICT-001")
        self.assertEqual(self.v2["protocol"], "F0-TAE-FICT-002")
        self.assertEqual(self.v1["protocol_status"], "fixed_before_execution")
        self.assertEqual(self.v2["protocol_status"], "fixed_before_execution")
        self.assertEqual(
            self.v1["protocol_status_basis"],
            "self_declared_in_config_no_independent_temporal_lock",
        )
        self.assertEqual(self.v1["protocol_status_basis"], self.v2["protocol_status_basis"])
        self.assertNotEqual(self.v1["generator"]["orbit_operator"], self.v2["generator"]["orbit_operator"])

    def test_v1_negative_result_is_preserved(self) -> None:
        classification = self.v1["classification"]
        self.assertEqual(classification["verdict"], "inconclusive_refinement")
        self.assertEqual(classification["stable_nonzero_kernels"], [])
        self.assertEqual(classification["control_failures"], [])

    def test_v2_changes_only_the_operator_contract(self) -> None:
        self.assertEqual(
            canonical_non_operator_contract(self.config_v1),
            canonical_non_operator_contract(self.config_v2),
        )
        self.assertEqual(self.config_v1["decision"], self.config_v2["decision"])

    def test_v2_detects_bounded_shape_orbit_interaction(self) -> None:
        classification = self.v2["classification"]
        self.assertEqual(classification["verdict"], "shape_orbit_interaction_model_internal")
        self.assertEqual(classification["stable_nonzero_kernels"], ["mid_signed", "broad_gradient"])
        self.assertEqual(classification["reference_nonzero_kernels"], ["core_low", "mid_signed", "broad_gradient"])
        self.assertEqual(classification["control_failures"], [])

    def test_all_provenance_contracts_are_complete_and_hashed(self) -> None:
        for result in (self.v1, self.v2):
            for level in result["levels"].values():
                metadata = level["metadata"]
                self.assertTrue(metadata["provenance_contract_complete"])
                for field in (
                    "source_content_hash", "radius_grid_hash", "pitch_grid_hash",
                    "energy_grid_hash", "units_hash", "quadrature_hash", "orbit_operator_hash",
                ):
                    self.assertRegex(metadata[field], r"^sha256:[0-9a-f]{64}$")

    def test_negative_controls_conservation_and_linearity_pass(self) -> None:
        for result in (self.v1, self.v2):
            for level in result["levels"].values():
                controls = level["controls"]
                self.assertTrue(controls["identity_exact"])
                for field in (
                    "matching_density_max_abs_error", "matching_mean_energy_max_abs_error",
                    "orbit_conservation_max_abs_error", "uniform_kernel_spread",
                    "affine_moment_kernel_spread", "linearity_abs_error",
                ):
                    self.assertLessEqual(controls[field], 1e-9)

    def test_three_grid_levels_are_distinct(self) -> None:
        for result in (self.v1, self.v2):
            hashes = {
                (
                    level["grid"]["radius_hash"],
                    level["grid"]["pitch_hash"],
                    level["grid"]["energy_hash"],
                )
                for level in result["levels"].values()
            }
            self.assertEqual(len(hashes), 3)

    def test_midpoint_grid_covers_fixed_domain_with_positive_weights(self) -> None:
        nodes, weights = midpoint_grid(0.0, 1.0, 5)
        self.assertEqual(len(nodes), 5)
        self.assertTrue(all(0 < node < 1 for node in nodes))
        self.assertAlmostEqual(sum(weights), 1.0)
        with self.assertRaises(ValueError):
            midpoint_grid(0.0, 1.0, 2)

    def test_scopes_never_claim_tae_stability(self) -> None:
        allowed = {"formal_exact", "model_internal", "pipeline_verified"}
        for result in (self.v1, self.v2):
            self.assertEqual(
                result["scope"],
                {
                    "fictional_linear_drive": "model_internal",
                    "matching_provenance_reconstruction": "pipeline_verified",
                },
            )
            self.assertTrue(set(result["scope"].values()).issubset(allowed))
            self.assertEqual(
                result["unsupported_claims"],
                ["tae_stability", "alpha_transport", "reactor_relevance"],
            )
            for level in result["levels"].values():
                self.assertIn(level["metadata"]["scope"], allowed)

    def test_executions_are_deterministic(self) -> None:
        self.assertEqual(self.v1, execute(load_config(ROOT / "fictive_tae_matrix_v0.1.json")))
        self.assertEqual(self.v2, execute(load_config(ROOT / "fictive_tae_matrix_v0.2.json")))

    def test_reports_are_bounded(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            for name, result in (("v1", self.v1), ("v2", self.v2)):
                path = Path(directory) / f"{name}.md"
                write_report(result, path)
                text = path.read_text(encoding="utf-8")
                self.assertTrue(text.startswith(f"# {result['protocol']} —"))
                self.assertIn("aucun verrou temporel indépendant", text)
                self.assertIn("uniquement la variation fine→référence", text)
                self.assertIn("`model_internal`", text)
                self.assertIn("`pipeline_verified`", text)

    def test_recorded_artifacts_reconstruct_exactly_when_present(self) -> None:
        for version, result in (("0.1", self.v1), ("0.2", self.v2)):
            directory = REPORT_ROOT / f"fictive-tae-matrix-v{version}"
            if not (directory / "result.json").exists():
                continue
            expected = json.dumps(result, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
            self.assertEqual((directory / "result.json").read_text(encoding="utf-8"), expected)
            with tempfile.TemporaryDirectory() as temporary:
                report = Path(temporary) / "report.md"
                write_report(result, report)
                self.assertEqual(
                    (directory / "report.md").read_text(encoding="utf-8"),
                    report.read_text(encoding="utf-8"),
                )


if __name__ == "__main__":
    unittest.main()
