#!/usr/bin/env python3
"""Contrôles analytiques de l'écran énergie--rayon, pas validation TAE."""

from __future__ import annotations

import math
import unittest

from low_compute_radial_screen import local_derivatives
from low_compute_resonance_screen import MomentMatchedPair


class LocalDerivativePairTests(unittest.TestCase):
    def test_critical_lambda_cancels_its_declared_proxy(self) -> None:
        pair = local_derivatives(0.4, 0.55, 0.9)
        sd_total = pair.sd_energy + pair.lambda_critical_sd * pair.sd_radial
        maxwell_total = pair.maxwell_energy + pair.lambda_critical_maxwell * pair.maxwell_radial
        self.assertAlmostEqual(sd_total, 0.0, places=13)
        self.assertAlmostEqual(maxwell_total, 0.0, places=13)

    def test_zero_critical_gradient_has_density_only_radial_derivative(self) -> None:
        c, s = 0.4, 0.55
        pair = local_derivatives(c, s, 0.0)
        moments = MomentMatchedPair.build(c)
        self.assertAlmostEqual(pair.sd_radial, -moments.slowing_down(s), places=13)
        self.assertAlmostEqual(pair.maxwell_radial, -moments.maxwellian(s), places=13)

    def test_outputs_are_finite_and_radial_derivatives_negative_in_declared_window(self) -> None:
        for c in (0.31, 0.4, 0.53):
            for s in (0.50, 0.575, 0.65):
                for k in (0.0, 0.5, 1.0, 2.0):
                    pair = local_derivatives(c, s, k)
                    for value in (
                        pair.energy_ratio,
                        pair.radial_ratio,
                        pair.lambda_critical_sd,
                        pair.lambda_critical_maxwell,
                        pair.cancellation_gap,
                    ):
                        self.assertTrue(math.isfinite(value))
                    self.assertLess(pair.sd_radial, 0.0)
                    self.assertLess(pair.maxwell_radial, 0.0)


if __name__ == "__main__":
    unittest.main()
