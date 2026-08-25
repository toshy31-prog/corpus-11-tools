#!/usr/bin/env python3
"""Contrôles de l'écran léger : invariants de moments, pas validation physique."""

import math
import unittest

from low_compute_resonance_screen import MomentMatchedPair


class MomentMatchedPairTests(unittest.TestCase):
    def test_slowing_down_is_normalized(self) -> None:
        for critical_ratio in (0.05, 0.2, 0.5, 0.8, 0.95):
            pair = MomentMatchedPair.build(critical_ratio)
            self.assertAlmostEqual(pair.number_density_sd(), 1.0, places=10)

    def test_second_moment_is_consistent(self) -> None:
        for critical_ratio in (0.05, 0.2, 0.5, 0.8, 0.95):
            pair = MomentMatchedPair.build(critical_ratio)
            self.assertAlmostEqual(pair.second_moment_sd(), pair.second_moment, places=10)
            self.assertAlmostEqual(1.5 * pair.thermal_speed_sq, pair.second_moment, places=13)

    def test_slope_ratio_is_finite_and_positive(self) -> None:
        for critical_ratio in (0.05, 0.2, 0.5, 0.8, 0.95):
            pair = MomentMatchedPair.build(critical_ratio)
            for resonance_ratio in (0.05, 0.25, 0.5, 0.75, 0.95):
                ratio = pair.energy_slope_ratio(resonance_ratio)
                self.assertTrue(math.isfinite(ratio))
                self.assertGreater(ratio, 0.0)


if __name__ == "__main__":
    unittest.main()
