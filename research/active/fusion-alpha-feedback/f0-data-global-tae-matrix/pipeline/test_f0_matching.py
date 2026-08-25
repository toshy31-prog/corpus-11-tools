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


def make_orbit_map(identity: bool = False):
    """Return pitch × energy × destination × source conservative maps."""
    return [
        [
            ([[1.0, 0.0], [0.0, 1.0]] if identity else [[0.82, 0.19], [0.18, 0.81]])
            for _ in ENERGIES
        ]
        for _ in range(2)
    ]


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
        result = build_four_backgrounds(SOURCE, ENERGIES, matrix, source_id="synthetic-fixture", orbit_operator_id="synthetic-map")
        backgrounds = result["backgrounds"]
        self.assertTrue(math.isclose(total_density(backgrounds["sd_zow"]), total_density(backgrounds["sd_fow"]), rel_tol=0, abs_tol=1e-10))
        self.assertTrue(math.isclose(total_density(backgrounds["m_zow"]), total_density(backgrounds["m_fow"]), rel_tol=0, abs_tol=1e-10))
        self.assertEqual(result["metadata"]["source_id"], "synthetic-fixture")
        self.assertIn("TAE eigenmode", result["metadata"]["not_established"])

    def test_identity_orbit_map_recovers_zow_exactly(self) -> None:
        result = build_four_backgrounds(SOURCE, ENERGIES, make_orbit_map(identity=True), source_id="synthetic-fixture", orbit_operator_id="identity")
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


if __name__ == "__main__":
    unittest.main()
