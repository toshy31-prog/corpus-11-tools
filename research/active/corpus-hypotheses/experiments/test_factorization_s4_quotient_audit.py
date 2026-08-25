#!/usr/bin/env python3
"""Regression checks for the exact S4 quotient audit."""

from __future__ import annotations

import unittest

from run_factorization_s4_quotient_audit import analyse, quotient_fixed_dimension


class QuotientAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.result = analyse()

    def test_common_fixed_line_is_removed_exactly(self) -> None:
        self.assertEqual(quotient_fixed_dimension((0,)), 3)
        self.assertEqual(quotient_fixed_dimension(tuple(range(24))), 0)

    def test_audit_is_complete_and_bounded(self) -> None:
        self.assertEqual(self.result["catalogue_matrices"], 24)
        self.assertEqual(self.result["triples_audited"], 2024)
        self.assertEqual(self.result["target_key"]["qualifying_triples"], 20)
        self.assertEqual(self.result["target_key"]["triple_dimension_counts"], {0: 16, 1: 4})

    def test_nontrivial_extension_result_is_explicit(self) -> None:
        self.assertEqual(self.result["nontrivial_extension_count"], 400)
        self.assertEqual(self.result["identity_control_count"], 20)
        self.assertEqual(self.result["outcome"], "not_supported")
        self.assertEqual(self.result["median_delta_d4"], "0")


if __name__ == "__main__":
    unittest.main()
