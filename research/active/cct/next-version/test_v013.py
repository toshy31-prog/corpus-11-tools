from __future__ import annotations

import copy
import unittest

from validate_v013 import load, validate


class V013CandidateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.document = load()

    def test_candidate_is_statically_valid(self) -> None:
        self.assertEqual(validate(self.document), [])

    def test_old_worlds_cannot_accept_the_revision(self) -> None:
        candidate = copy.deepcopy(self.document)
        candidate["design_constraints"]["future_arena"]["reuse_v1_worlds_for_acceptance"] = True
        self.assertTrue(any("mondes v1" in error for error in validate(candidate)))

    def test_terminal_key_recombination_is_rejected(self) -> None:
        candidate = copy.deepcopy(self.document)
        mechanism = candidate["mechanisms"][0]
        mechanism["authority"]["certify"] = mechanism["authority"]["stop"]
        self.assertTrue(any("doivent être disjoints" in error for error in validate(candidate)))

    def test_shared_failure_domains_are_rejected(self) -> None:
        candidate = copy.deepcopy(self.document)
        channels = candidate["mechanisms"][2]["activation"]["channels"]
        channels[1]["failure_domain"] = channels[0]["failure_domain"]
        self.assertTrue(any("domaines de panne distincts" in error for error in validate(candidate)))

    def test_symbolic_reform_without_capacity_delta_is_rejected(self) -> None:
        candidate = copy.deepcopy(self.document)
        candidate["mechanisms"][1]["capability_delta"]["granted_to_affected"] = ""
        self.assertTrue(any("delta de capacité incomplet" in error for error in validate(candidate)))

    def test_hidden_cost_omission_is_rejected(self) -> None:
        candidate = copy.deepcopy(self.document)
        candidate["mechanisms"][0]["costs"]["bearers"] = []
        self.assertTrue(any("sonde de coût caché" in error for error in validate(candidate)))

    def test_information_reconciliation_must_keep_disagreement(self) -> None:
        candidate = copy.deepcopy(self.document)
        candidate["mechanisms"][2]["traces"].remove("divergences non résolues")
        self.assertTrue(any("divergences doivent survivre" in error for error in validate(candidate)))


if __name__ == "__main__":
    unittest.main()
