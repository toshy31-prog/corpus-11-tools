from __future__ import annotations

from collections import Counter
import unittest

from limit_tests_50 import CASES, INVARIANTS, validate


class LimitTestProtocolTests(unittest.TestCase):
    def test_protocol_is_structurally_valid(self) -> None:
        validate()

    def test_exactly_five_cases_per_family(self) -> None:
        counts = Counter(case.family for case in CASES)
        self.assertEqual(set(counts.values()), {5})

    def test_every_invariant_is_exercised(self) -> None:
        exercised = {inv for case in CASES for inv in case.invariants}
        self.assertEqual(exercised, set(INVARIANTS))

    def test_every_rupture_has_a_patch_and_observable(self) -> None:
        for case in CASES:
            if case.verdict == "rupture":
                self.assertGreater(len(case.patch), 25)
                self.assertGreater(len(case.observable), 15)

    def test_verdict_vocabulary_is_closed(self) -> None:
        self.assertEqual(
            {case.verdict for case in CASES},
            {"robuste_sur_le_papier", "partiel", "rupture"},
        )


if __name__ == "__main__":
    unittest.main()
