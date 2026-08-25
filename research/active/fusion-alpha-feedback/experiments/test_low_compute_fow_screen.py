#!/usr/bin/env python3
"""Invariants de la borne FOW/ZOW ; ils ne valident pas une physique de machine."""

from __future__ import annotations

import math
import unittest

from low_compute_fow_screen import thresholds


class FowThresholdTests(unittest.TestCase):
    def test_zero_orbit_shift_recovers_zow_exactly(self) -> None:
        for branch in (-1, 1):
            result = thresholds(0.4, 0.55, 0.4, 0.0, branch)
            self.assertAlmostEqual(result.amplitude_ratio, 1.0, places=14)
            self.assertAlmostEqual(result.eta_sd_fow, result.eta_sd_zow, places=14)
            self.assertAlmostEqual(result.eta_maxwell_fow, result.eta_maxwell_zow, places=14)

    def test_branch_symmetry_of_the_orbit_bound(self) -> None:
        minus = thresholds(0.4, 0.55, 0.4, 0.6, -1)
        plus = thresholds(0.4, 0.55, 0.4, 0.6, 1)
        self.assertAlmostEqual(minus.amplitude_ratio * plus.amplitude_ratio, 1.0, places=13)
        self.assertAlmostEqual(
            minus.eta_sd_fow + plus.eta_sd_fow,
            2.0 * minus.eta_sd_zow,
            places=13,
        )

    def test_separable_fow_shift_has_no_sd_maxwell_interaction(self) -> None:
        for c in (0.31, 0.4, 0.53):
            for s in (0.50, 0.575, 0.65):
                for pitch in (0.0, 0.4, 0.9):
                    for orbit in (0.0, 0.5, 1.0):
                        for branch in (-1, 1):
                            result = thresholds(c, s, pitch, orbit, branch)
                            self.assertAlmostEqual(result.signed_interaction, 0.0, places=13)
                            self.assertAlmostEqual(
                                result.distribution_gap_fow,
                                result.distribution_gap_zow,
                                places=13,
                            )

    def test_thresholds_are_finite_in_declared_window(self) -> None:
        for c in (0.31, 0.4, 0.53):
            for s in (0.50, 0.575, 0.65):
                for pitch in (0.0, 0.4, 0.9):
                    for orbit in (0.0, 0.5, 1.0):
                        for branch in (-1, 1):
                            result = thresholds(c, s, pitch, orbit, branch)
                            for value in (
                                result.amplitude_ratio,
                                result.eta_sd_zow,
                                result.eta_maxwell_zow,
                                result.eta_sd_fow,
                                result.eta_maxwell_fow,
                                result.distribution_gap_zow,
                                result.orbit_gap_sd,
                            ):
                                self.assertTrue(math.isfinite(value))


if __name__ == "__main__":
    unittest.main()
