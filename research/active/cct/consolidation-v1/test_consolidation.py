from __future__ import annotations

import copy
import unittest

from validate_consolidation import DEFAULT_CANDIDATE, DEFAULT_LEDGER, load, validate


class ConsolidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.candidate = load(DEFAULT_CANDIDATE)
        self.ledger = load(DEFAULT_LEDGER)

    def test_canonical_consolidation_is_valid(self) -> None:
        self.assertEqual(validate(self.candidate, self.ledger), [])

    def test_global_name_cannot_be_given_to_runtime_only(self) -> None:
        candidate = copy.deepcopy(self.candidate)
        candidate["object_partition"].pop("CCT-NCE")
        self.assertTrue(any("partition" in error for error in validate(candidate, self.ledger)))

    def test_promotion_cannot_be_claimed(self) -> None:
        candidate = copy.deepcopy(self.candidate)
        candidate["lifecycle"]["promotion_blocked"] = False
        self.assertTrue(any("non promue" in error for error in validate(candidate, self.ledger)))

    def test_fifteen_invariants_are_required(self) -> None:
        candidate = copy.deepcopy(self.candidate)
        candidate["invariant_register"].pop()
        self.assertTrue(any("quinze invariants" in error for error in validate(candidate, self.ledger)))

    def test_narrative_remainder_cannot_disappear(self) -> None:
        candidate = copy.deepcopy(self.candidate)
        candidate["invariant_register"][12]["execution"] = "local_tested"
        self.assertTrue(any("I13" in error for error in validate(candidate, self.ledger)))

    def test_composed_robustness_cannot_be_claimed(self) -> None:
        candidate = copy.deepcopy(self.candidate)
        candidate["invariant_register"][14]["execution"] = "local_tested"
        self.assertTrue(any("I15" in error for error in validate(candidate, self.ledger)))

    def test_missing_intermediate_snapshots_remain_a_gap(self) -> None:
        ledger = copy.deepcopy(self.ledger)
        next(item for item in ledger["entries"] if item["source_version"] == "0.2-0.7")["status"] = "retained"
        self.assertTrue(any("trou de provenance" in error for error in validate(self.candidate, ledger)))

    def test_v014_cannot_be_relabelled_as_the_whole_cct(self) -> None:
        ledger = copy.deepcopy(self.ledger)
        entry = next(item for item in ledger["entries"] if item["source_version"] == "0.14")
        entry["status"] = "retained"
        entry["targets"] = ["CCT"]
        self.assertTrue(any("sous-ensemble" in error for error in validate(self.candidate, ledger)))


if __name__ == "__main__":
    unittest.main()
