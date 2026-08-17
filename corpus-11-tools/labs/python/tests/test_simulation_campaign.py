from __future__ import annotations

import unittest

from corpus_labs.simulation_campaign import (
    apply_bounded_changes,
    common_random,
    pareto_dominates,
    pareto_frontier,
    validate_budget,
)


class SimulationCampaignTests(unittest.TestCase):
    def test_common_random_is_coordinate_deterministic(self) -> None:
        self.assertEqual(common_random(7, "scene", 2).random(), common_random(7, "scene", 2).random())
        self.assertNotEqual(common_random(7, "scene", 2).random(), common_random(7, "scene", 3).random())

    def test_budget_accepts_matched_allocation(self) -> None:
        validate_budget({"observe": 0.4, "act": 0.6})

    def test_budget_rejects_mismatch_and_negative_values(self) -> None:
        with self.assertRaises(ValueError):
            validate_budget({"observe": 0.4, "act": 0.5})
        with self.assertRaises(ValueError):
            validate_budget({"observe": 1.1, "act": -0.1})

    def test_pareto_dominance_has_no_hidden_aggregate(self) -> None:
        orientations = {"loss": "min", "repair": "max"}
        self.assertTrue(pareto_dominates({"loss": 1, "repair": 3}, {"loss": 2, "repair": 3}, orientations))
        self.assertFalse(pareto_dominates({"loss": 1, "repair": 2}, {"loss": 2, "repair": 3}, orientations))

    def test_frontier_preserves_incomparable_survivors(self) -> None:
        frontier, dominated = pareto_frontier(
            {"a": {"x": 1, "y": 3}, "b": {"x": 2, "y": 2}, "c": {"x": 3, "y": 1}},
            {"x": "min", "y": "min"},
        )
        self.assertEqual(frontier, ["a", "b", "c"])
        self.assertEqual(dominated, {})

    def test_bounded_changes_copy_clamp_and_reject_unknowns(self) -> None:
        base = {"capacity": 0.9, "reserve": 0.2}
        self.assertEqual(apply_bounded_changes(base, {"capacity": 0.3}), {"capacity": 1.0, "reserve": 0.2})
        self.assertEqual(base["capacity"], 0.9)
        with self.assertRaises(ValueError):
            apply_bounded_changes(base, {"missing": 0.1})


if __name__ == "__main__":
    unittest.main()
