#!/usr/bin/env python3
"""Pipeline invariants, deliberately not plasma-physics validation."""

from __future__ import annotations

import math
import unittest

from f0_matching import (
    apply_orbit_map,
    build_four_backgrounds,
    density,
    match_canonical_maxwellian,
    mean_energy,
    total_density,
)


ENERGIES = [0.2, 0.7, 1.5, 3.0, 6.0, 12.0]
SOURCE = [
    [[0.48, 0.70, 0.63, 0.42, 0.21, 0.08], [0.35, 0.58, 0.67, 0.48, 0.24, 0.10]],
    [[0.34, 0.55, 0.66, 0.47, 0.25, 0.11], [0.29, 0.50, 0.69, 0.51, 0.27, 0.12]],
]
RADIUS_GRID = [0.25, 0.75]
PITCH_GRID = [-0.5, 0.5]
UNITS = {"radius": "normalized_radius", "pitch": "dimensionless", "energy": "normalized_energy", "cell_mass": "normalized_alpha_number"}
QUADRATURE = {
    "representation": "cell_mass",
    "jacobian_applied": True,
    "radial_weights": [0.5, 0.5],
    "pitch_weights": [1.0, 1.0],
    "energy_weights": [0.5, 0.5, 0.8, 1.5, 3.0, 6.0],
}


def make_orbit_map(identity: bool = False):
    """Return pitch × energy × destination × source conservative maps."""
    return [
        [
            ([[1.0, 0.0], [0.0, 1.0]] if identity else [[0.82, 0.19], [0.18, 0.81]])
            for _ in ENERGIES
        ]
        for _ in range(2)
    ]


def build(matrix=None):
    return build_four_backgrounds(
        SOURCE,
        ENERGIES,
        matrix or make_orbit_map(),
        source_id="synthetic-fixture",
        orbit_operator_id="synthetic-map",
        radius_grid=RADIUS_GRID,
        pitch_grid=PITCH_GRID,
        units=UNITS,
        quadrature=QUADRATURE,
    )


class F0MatchingTests(unittest.TestCase):
    def test_source_coordinate_matching_preserves_each_cell_moments(self) -> None:
        matched, _temperatures = match_canonical_maxwellian(SOURCE, ENERGIES)
        for source_radius, matched_radius in zip(SOURCE, matched):
            for source_cell, matched_cell in zip(source_radius, matched_radius):
                self.assertTrue(math.isclose(density(source_cell), density(matched_cell), rel_tol=0, abs_tol=1e-10))
                self.assertTrue(
                    math.isclose(
                        mean_energy(source_cell, ENERGIES),
                        mean_energy(matched_cell, ENERGIES),
                        rel_tol=0,
                        abs_tol=1e-10,
                    )
                )

    def test_common_orbit_operator_conserves_each_background(self) -> None:
        matrix = make_orbit_map()
        result = build(matrix)
        backgrounds = result["backgrounds"]
        self.assertTrue(math.isclose(total_density(backgrounds["sd_zow"]), total_density(backgrounds["sd_fow"]), rel_tol=0, abs_tol=1e-10))
        self.assertTrue(math.isclose(total_density(backgrounds["m_zow"]), total_density(backgrounds["m_fow"]), rel_tol=0, abs_tol=1e-10))
        self.assertEqual(result["metadata"]["source_id"], "synthetic-fixture")
        self.assertIn("TAE eigenmode", result["metadata"]["not_established"])

    def test_identity_orbit_map_recovers_zow_exactly(self) -> None:
        result = build_four_backgrounds(
            SOURCE, ENERGIES, make_orbit_map(identity=True),
            source_id="synthetic-fixture", orbit_operator_id="identity",
            radius_grid=RADIUS_GRID, pitch_grid=PITCH_GRID,
            units=UNITS, quadrature=QUADRATURE,
        )
        backgrounds = result["backgrounds"]
        self.assertEqual(backgrounds["sd_zow"], backgrounds["sd_fow"])
        self.assertEqual(backgrounds["m_zow"], backgrounds["m_fow"])

    def test_nonconservative_orbit_map_is_refused(self) -> None:
        invalid = make_orbit_map()
        invalid[0][0][0][0] = 0.70
        with self.assertRaisesRegex(ValueError, "conserve density"):
            apply_orbit_map(SOURCE, ENERGIES, invalid)

    def test_unrepresentable_finite_grid_match_is_refused(self) -> None:
        high_energy_source = [[[0.0, 0.0, 0.0, 0.0, 0.0, 1.0]]]
        with self.assertRaisesRegex(ValueError, "positive-temperature"):
            match_canonical_maxwellian(high_energy_source, ENERGIES)

    def test_coordinate_units_and_quadrature_are_hashed(self) -> None:
        metadata = build()["metadata"]
        self.assertTrue(metadata["provenance_contract_complete"])
        self.assertEqual(metadata["scope"], "pipeline_verified")
        self.assertEqual(metadata["scope_limitations"], ["synthetic_or_supplied_input_only"])
        self.assertEqual(metadata["input_schema"], "f0-cell-mass-grid/v1")
        for field in (
            "radius_grid_hash", "pitch_grid_hash", "energy_grid_hash",
            "units_hash", "quadrature_hash", "source_content_hash", "orbit_operator_hash",
        ):
            self.assertRegex(metadata[field], r"^sha256:[0-9a-f]{64}$")

    def test_missing_or_misrepresented_quadrature_is_refused(self) -> None:
        invalid = dict(QUADRATURE)
        invalid["representation"] = "sampled_values"
        with self.assertRaisesRegex(ValueError, "cell_mass"):
            build_four_backgrounds(
                SOURCE, ENERGIES, make_orbit_map(),
                source_id="synthetic", orbit_operator_id="map",
                radius_grid=RADIUS_GRID, pitch_grid=PITCH_GRID,
                units=UNITS, quadrature=invalid,
            )
        invalid = dict(QUADRATURE)
        invalid["energy_weights"] = [1.0]
        with self.assertRaisesRegex(ValueError, "energy_weights"):
            build_four_backgrounds(
                SOURCE, ENERGIES, make_orbit_map(),
                source_id="synthetic", orbit_operator_id="map",
                radius_grid=RADIUS_GRID, pitch_grid=PITCH_GRID,
                units=UNITS, quadrature=invalid,
            )

    def test_coordinate_shapes_and_units_are_refused_when_incomplete(self) -> None:
        with self.assertRaisesRegex(ValueError, "grids"):
            build_four_backgrounds(
                SOURCE, ENERGIES, make_orbit_map(),
                source_id="synthetic", orbit_operator_id="map",
                radius_grid=[0.5], pitch_grid=PITCH_GRID,
                units=UNITS, quadrature=QUADRATURE,
            )
        with self.assertRaisesRegex(ValueError, "units"):
            build_four_backgrounds(
                SOURCE, ENERGIES, make_orbit_map(),
                source_id="synthetic", orbit_operator_id="map",
                radius_grid=RADIUS_GRID, pitch_grid=PITCH_GRID,
                units={"energy": "normalized"}, quadrature=QUADRATURE,
            )


if __name__ == "__main__":
    unittest.main()
